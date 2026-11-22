/**
 * API Monitor — Host half.
 *
 * Captures every outbound HTTP call the Host makes (globalThis.fetch plus the
 * node:http / node:https `request` entry points) together with the exact URL,
 * method, request headers, JSON request body and a response preview, then
 * serves that buffer to the Client half over three WebServer routes:
 *
 *   GET  /api/api-monitor/requests   → { ok, count, requests }
 *   POST /api/api-monitor/clear      → { ok }
 *   GET  /api/api-monitor/events     → text/event-stream (init / new-request /
 *                                      update-request / cleared)
 *
 * The routes live outside the Remote gateway on purpose: the Client needs a
 * raw EventSource, which cannot carry the Remote authentication headers.
 * They are therefore reachable by anything that can talk to the loopback Web
 * server, which is why the buffer is capped and never persisted.
 */
import http from 'node:http';
import https from 'node:https';

export const inject = ['webServer'];

/** Per-body safety cap, well above a real chat request. */
const MAX_BODY_CHARS = 8 * 1024 * 1024;
/** How much of a response body is captured for the preview. */
const MAX_PREVIEW_BYTES = 64 * 1024;
/** Default ceiling for the whole in-memory buffer, in characters. */
const DEFAULT_MAX_TOTAL_CHARS = 48 * 1024 * 1024;
/** Marks a patched module entry point so a reload never double-wraps. */
const WRAPPED = Symbol.for('dsh.apiMonitor.wrapped');

/** Render anything the wire can carry as a JSON-safe value of bounded size. */
function clampText(text) {
  if (text.length <= MAX_BODY_CHARS) return text;
  return `${text.slice(0, MAX_BODY_CHARS)}\n…[truncated, ${text.length} characters total]`;
}

/** Parse a request body into JSON when it is JSON, keeping the raw text otherwise. */
function parseBody(raw) {
  if (raw === undefined || raw === null) return null;

  if (typeof raw === 'string') return parseText(raw);

  if (Buffer.isBuffer(raw) || raw instanceof Uint8Array) {
    try {
      return parseText(new TextDecoder('utf-8').decode(raw));
    } catch {
      return `[binary body: ${raw.byteLength ?? raw.length} bytes]`;
    }
  }

  if (typeof raw.entries === 'function') {
    try {
      return Object.fromEntries(raw.entries());
    } catch {
      return '[unreadable form body]';
    }
  }

  try {
    const text = JSON.stringify(raw);
    return text === undefined ? String(raw) : clampJson(JSON.parse(text));
  } catch {
    return '[unserializable body]';
  }
}

/** Parse JSON text, or keep the text when it is not JSON. */
function parseText(text) {
  const trimmed = text.trim();
  if (trimmed === '') return '';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return clampJson(JSON.parse(trimmed));
    } catch {
      return clampText(text);
    }
  }
  return clampText(text);
}

/** Bound an already-parsed value by its serialized size. */
function clampJson(value) {
  let text;
  try {
    text = JSON.stringify(value);
  } catch {
    return '[unserializable body]';
  }
  if (typeof text !== 'string' || text.length <= MAX_BODY_CHARS) return value;
  return { truncated: true, characters: text.length, preview: text.slice(0, MAX_BODY_CHARS) };
}

/** Flatten Headers, a header array, or a plain object into lower-cased JSON. */
function normalizeHeaders(raw) {
  const out = {};
  if (!raw) return out;

  if (typeof raw.entries === 'function' && !Array.isArray(raw)) {
    try {
      for (const [key, value] of raw.entries()) out[String(key).toLowerCase()] = String(value);
      return out;
    } catch {
      return out;
    }
  }

  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (Array.isArray(entry) && entry.length >= 2) {
        out[String(entry[0]).toLowerCase()] = String(entry[1]);
      }
    }
    return out;
  }

  if (typeof raw === 'object') {
    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined || value === null) continue;
      out[String(key).toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
    }
  }
  return out;
}

/** Best-effort host name for list grouping; never throws. */
function hostOf(url) {
  try {
    return new URL(url, 'http://localhost').host || url;
  } catch {
    return url;
  }
}

export function apply(ctx, config = {}) {
  const maxEntries = Number.isFinite(config.maxEntries) && config.maxEntries > 0
    ? Math.min(Math.floor(config.maxEntries), 2000)
    : 100;
  const maxTotalChars = Number.isFinite(config.maxTotalChars) && config.maxTotalChars > 0
    ? Math.min(Math.floor(config.maxTotalChars), 512 * 1024 * 1024)
    : DEFAULT_MAX_TOTAL_CHARS;

  /** Newest first; the Client renders it in this order. */
  const requests = [];
  const sseClients = new Set();
  let sequence = 0;
  let totalChars = 0;

  /** Rough weight of one record: what its bodies contribute to the budget. */
  const weightOf = (record) => {
    let weight = 0;
    try {
      weight += JSON.stringify(record.body ?? null).length;
    } catch {
      /* unserializable bodies were already flattened */
    }
    try {
      weight += JSON.stringify(record.responsePreview ?? null).length;
    } catch {
      /* same */
    }
    return weight;
  };

  const forget = (record) => {
    totalChars -= record.weight ?? 0;
    if (totalChars < 0) totalChars = 0;
  };

  /** Keep the budget bookkeeping off the wire: the Client never sees it. */
  const setWeight = (record, weight) => {
    Object.defineProperty(record, 'weight', {
      value: weight, enumerable: false, writable: true, configurable: true,
    });
  };

  const emit = (event, data) => {
    let frame;
    try {
      frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    } catch {
      return;
    }
    for (const client of sseClients) {
      try {
        client.write(frame);
      } catch {
        sseClients.delete(client);
      }
    }
  };

  const add = (record) => {
    setWeight(record, weightOf(record));
    totalChars += record.weight;
    requests.unshift(record);
    // Trim oldest first, by count and by the shared byte budget.
    while (requests.length > maxEntries || (totalChars > maxTotalChars && requests.length > 1)) {
      const dropped = requests.pop();
      if (dropped === undefined) break;
      forget(dropped);
    }
    emit('new-request', record);
  };

  const update = (id, patch) => {
    const found = requests.find(entry => entry.id === id);
    if (!found) return;
    totalChars -= found.weight ?? 0;
    Object.assign(found, patch);
    setWeight(found, weightOf(found));
    totalChars += found.weight;
    emit('update-request', found);
  };

  const clear = () => {
    requests.length = 0;
    totalChars = 0;
    emit('cleared', {});
  };

  /**
   * Requests made by the harness UI itself are noise: bundles, hot reload,
   * the monitor's own routes, and the Remote multiplexer.
   */
  const isInternal = (url) => {
    if (!url) return true;
    let pathname;
    try {
      pathname = new URL(url, 'http://localhost').pathname;
    } catch {
      return false;
    }
    return pathname.startsWith('/api/api-monitor')
      || pathname.startsWith('/api/remote.mux')
      || pathname.startsWith('/api/client/')
      || pathname.includes('hot-update')
      || pathname.startsWith('/hmr');
  };

  const newRecord = (url, method, headers) => {
    const record = {
      id: `req_${Date.now().toString(36)}_${(++sequence).toString(36)}`,
      timestamp: new Date().toISOString(),
      host: hostOf(url),
      url,
      method,
      headers,
      body: null,
      durationMs: null,
      pending: true,
      responseStatus: null,
      responseStatusText: null,
      responseHeaders: null,
      responsePreview: null,
      responseBytes: null,
      error: null,
    };
    add(record);
    return record;
  };

  /** Read at most MAX_PREVIEW_BYTES from a cloned response, then cancel it. */
  const previewResponse = async (response, id) => {
    if (typeof response.clone !== 'function') return;
    let clone;
    try {
      clone = response.clone();
    } catch {
      return;
    }

    const reader = clone.body && typeof clone.body.getReader === 'function' ? clone.body.getReader() : null;
    if (!reader) {
      try {
        const text = await clone.text();
        update(id, { responsePreview: parseText(text), responseBytes: text.length });
      } catch {
        /* the preview is optional */
      }
      return;
    }

    const chunks = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          total += value.byteLength;
        }
        if (total >= MAX_PREVIEW_BYTES) break;
      }
    } catch {
      /* streams can fail after the head arrived */
    }
    try {
      await reader.cancel();
    } catch {
      /* already closed */
    }

    if (total === 0) return;
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let text = '';
    try {
      text = new TextDecoder('utf-8').decode(bytes);
    } catch {
      text = '[binary response]';
    }
    update(id, {
      responsePreview: parseText(text),
      responseBytes: total >= MAX_PREVIEW_BYTES ? `>=${total}` : total,
    });
  };

  // ---------------------------------------------------------------------
  // Hook 1: globalThis.fetch — every SDK (Gemini, Anthropic, OpenAI, pi-ai)
  // reaches the network through it.
  // ---------------------------------------------------------------------
  const originalFetch = globalThis.fetch;
  if (typeof originalFetch === 'function' && originalFetch[WRAPPED] !== true) {
    const monitoredFetch = async function monitoredFetch(input, init) {
      let url = '';
      let method = 'GET';
      let headers = {};
      let body = null;

      try {
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof URL) {
          url = input.href;
        } else if (input && typeof input === 'object') {
          url = typeof input.url === 'string' ? input.url : String(input.url ?? '');
          method = input.method || 'GET';
          headers = normalizeHeaders(input.headers);
        }

        if (init) {
          if (init.method) method = String(init.method).toUpperCase();
          if (init.headers) Object.assign(headers, normalizeHeaders(init.headers));
          if (init.body !== undefined) body = parseBody(init.body);
        }

        // A Request without an init body still carries one; clone it to read.
        if (!body && input && typeof input === 'object' && typeof input.clone === 'function') {
          try {
            const text = await input.clone().text();
            if (text) body = parseText(text);
          } catch {
            /* unreadable or already consumed */
          }
        }
      } catch {
        /* capture is best effort and must never break the call */
      }

      if (isInternal(url)) return originalFetch.call(globalThis, input, init);

      const record = newRecord(url, method, headers);
      record.body = body;
      const startedAt = Date.now();

      try {
        const response = await originalFetch.call(globalThis, input, init);
        update(record.id, {
          durationMs: Date.now() - startedAt,
          pending: false,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          responseHeaders: normalizeHeaders(response.headers),
        });
        void previewResponse(response, record.id);
        return response;
      } catch (error) {
        update(record.id, {
          durationMs: Date.now() - startedAt,
          pending: false,
          responseStatus: 0,
          responseStatusText: 'Network error',
          error: error && error.message ? error.message : String(error),
        });
        throw error;
      }
    };
    monitoredFetch[WRAPPED] = true;
    monitoredFetch[Symbol.for('dsh.apiMonitor.original')] = originalFetch;
    globalThis.fetch = monitoredFetch;
  }

  // ---------------------------------------------------------------------
  // Hook 2: node:http / node:https `request` — SDKs that bypass fetch.
  // ---------------------------------------------------------------------
  const patchRequestFunction = (target, original, defaultProtocol) => {
    if (typeof original !== 'function' || original[WRAPPED] === true) return;

    const monitored = function monitoredRequest(...args) {
      let url = '';
      let options = {};
      let callback = null;

      try {
        if (typeof args[0] === 'string' || args[0] instanceof URL) {
          url = String(args[0]);
          if (typeof args[1] === 'object' && args[1] !== null) {
            options = args[1];
            callback = typeof args[2] === 'function' ? args[2] : null;
          } else if (typeof args[1] === 'function') {
            callback = args[1];
          }
        } else if (args[0] && typeof args[0] === 'object') {
          options = args[0];
          callback = typeof args[1] === 'function' ? args[1] : null;
          const protocol = options.protocol || defaultProtocol;
          const host = options.hostname || options.host || 'localhost';
          const port = options.port ? `:${options.port}` : '';
          const pathname = options.path || '/';
          url = `${protocol}//${host}${port}${pathname}`;
        }
      } catch {
        return original.apply(this, args);
      }

      if (isInternal(url)) return original.apply(this, args);

      const record = newRecord(url, String(options.method || 'GET').toUpperCase(), normalizeHeaders(options.headers));
      const startedAt = Date.now();
      const chunks = [];
      let settled = false;

      const call = [...args];
      if (callback) {
        const wrapped = (response) => {
          settled = true;
          update(record.id, {
            durationMs: Date.now() - startedAt,
            pending: false,
            responseStatus: response.statusCode ?? null,
            responseStatusText: response.statusMessage ?? null,
            responseHeaders: normalizeHeaders(response.headers),
          });
          return callback.call(this, response);
        };
        call[typeof args[1] === 'function' ? 1 : 2] = wrapped;
      }

      const request = original.apply(this, call);

      const originalWrite = request.write;
      request.write = function write(chunk, ...rest) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return originalWrite.call(this, chunk, ...rest);
      };

      const originalEnd = request.end;
      request.end = function end(chunk, ...rest) {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        if (chunks.length > 0) {
          update(record.id, { body: parseBody(Buffer.concat(chunks)) });
        }
        return originalEnd.call(this, chunk, ...rest);
      };

      request.once('close', () => {
        if (settled) return;
        settled = true;
        update(record.id, {
          durationMs: Date.now() - startedAt,
          pending: false,
          error: 'connection closed before a response arrived',
        });
      });

      return request;
    };

    monitored[WRAPPED] = true;
    target.request = monitored;
  };

  patchRequestFunction(https, https.request, 'https:');
  patchRequestFunction(http, http.request, 'http:');

  // ---------------------------------------------------------------------
  // Routes for the Client half.
  // ---------------------------------------------------------------------
  // These routes bypass the Remote gateway, so they carry no session token:
  // refuse anything that does not arrive over loopback.
  const isLoopback = (req) => {
    const address = req.socket && req.socket.remoteAddress;
    if (typeof address !== 'string') return false;
    return address === '::1'
      || address === '127.0.0.1'
      || address.startsWith('127.')
      || address.startsWith('::ffff:127.');
  };

  const refuse = (res) => {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'loopback only' }));
  };

  ctx.effect(() => {
    const disposers = [

      ctx.webServer.register({
        kind: 'exact',
        path: '/api/api-monitor/requests',
        handler: async (req, res) => {
          if (!isLoopback(req)) return refuse(res);
          if (req.method === 'POST' || req.method === 'DELETE') {
            clear();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ ok: false, error: 'method not allowed' }));
            return;
          }
          let payload;
          try {
            payload = JSON.stringify({ ok: true, count: requests.length, requests });
          } catch {
            payload = JSON.stringify({ ok: false, error: 'buffer is not serializable' });
          }
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          });
          res.end(payload);
        },
      }),

      ctx.webServer.register({
        kind: 'exact',
        path: '/api/api-monitor/clear',
        handler: async (req, res) => {
          if (!isLoopback(req)) return refuse(res);
          clear();
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true }));
        },
      }),

      ctx.webServer.register({
        kind: 'exact',
        path: '/api/api-monitor/events',
        handler: async (req, res) => {
          if (!isLoopback(req)) return refuse(res);
          res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
          });
          res.write(`retry: 3000\n\n`);
          res.write(`event: init\ndata: ${JSON.stringify({ count: requests.length, requests })}\n\n`);
          sseClients.add(res);

          const heartbeat = setInterval(() => {
            try {
              res.write(': keepalive\n\n');
            } catch {
              clearInterval(heartbeat);
              sseClients.delete(res);
            }
          }, 15000);

          req.on('close', () => {
            clearInterval(heartbeat);
            sseClients.delete(res);
          });
        },
      }),
    ];

    return () => {
      for (const dispose of disposers) {
        try {
          dispose();
        } catch {
          /* already released */
        }
      }
    };
  }, 'api-monitor: routes');

  // Restore the process entry points when the plugin unloads.
  ctx.effect(() => () => {
    if (typeof originalFetch === 'function' && globalThis.fetch && globalThis.fetch[WRAPPED] === true) {
      globalThis.fetch = originalFetch;
    }
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
        /* already closed */
      }
    }
    sseClients.clear();
  }, 'api-monitor: restore');
}
