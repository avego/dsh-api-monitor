/**
 * API Monitor — Client half.
 *
 * Three contributions:
 *   1. a right-Sidebar tab type `api-monitor` with a guide card, so the Start
 *      page shows an "API monitor" capsule that opens the monitor in place;
 *   2. the tab body, a master/detail inspector over the Host's captured calls;
 *   3. a rail button at the sidebar foot that opens the same tab.
 *
 * The data comes from the Host half's routes under `/api/api-monitor/*`.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-api-monitor',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Tab kind the guide card opens and the body is dispatched under. */
    const KIND = 'api-monitor'
    /** Implementation identity: the tab type id and the body/title slot key. */
    const ID = '@local/dsh-api-monitor'
    /** Copy namespace registered in the Client locale service. */
    const NS = 'apiMonitor'
    /** Host routes owned by the Host half. */
    const ROUTE_LIST = '/api/api-monitor/requests'
    const ROUTE_CLEAR = '/api/api-monitor/clear'

    const COPY = {
      en: {
        'title': 'Api monitor',
        'guide.description': 'Inspect outbound API requests and their headers',
        'footer.title': 'Api monitor',
        'empty.title': 'No requests captured yet',
        'empty.hint': 'Outbound API calls appear here as soon as one is sent.',
        'empty.filter': 'Nothing matches this filter.',
        'action.clear': 'Clear',
        'action.export': 'Export',
        'action.copy': 'Copy',
        'action.copied': 'Copied',
        'action.back': 'Back',
        'action.refresh': 'Refresh',
        'filter.placeholder': 'Filter by URL, method, or header',
        'tab.request': 'Request JSON',
        'tab.headers': 'Headers',
        'tab.curl': 'cURL',
        'tab.response': 'Response',
        'state.pending': 'pending',
        'state.error': 'error',
        'state.noBody': 'This request carried no body.',
        'state.noHeaders': 'No headers were recorded.',
        'state.noResponse': 'The response has not arrived yet.',
        'count.requests': 'requests',
      },
      ru: {
        'title': 'Api monitor',
        'guide.description': 'Просмотр исходящих API-запросов и их заголовков',
        'footer.title': 'Api monitor',
        'empty.title': 'Запросы пока не пойманы',
        'empty.hint': 'Исходящие запросы к API появятся здесь сразу после отправки.',
        'empty.filter': 'По этому фильтру ничего не найдено.',
        'action.clear': 'Очистить',
        'action.export': 'Экспорт',
        'action.copy': 'Копировать',
        'action.copied': 'Скопировано',
        'action.back': 'Назад',
        'action.refresh': 'Обновить',
        'filter.placeholder': 'Фильтр по URL, методу или заголовку',
        'tab.request': 'JSON запроса',
        'tab.headers': 'Заголовки',
        'tab.curl': 'cURL',
        'tab.response': 'Ответ',
        'state.pending': 'в процессе',
        'state.error': 'ошибка',
        'state.noBody': 'У этого запроса нет тела.',
        'state.noHeaders': 'Заголовки не записаны.',
        'state.noResponse': 'Ответ ещё не пришёл.',
        'count.requests': 'запросов',
      },
    }

    /** Glyph: a pulse trace, drawn with `currentColor` so the host theme colors it. */
    function ApiMonitorGlyph({ size = 16 }) {
      return h('svg', {
        viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
        stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true, style: { display: 'block' },
      },
        h('path', { d: 'M2 12h4l3-8 6 16 3-8h4' }),
      )
    }

    const CSS = `
.dsh-api-monitor {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
}
.dsh-api-monitor * { box-sizing: border-box; }
.dsh-api-monitor__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  flex: none;
}
.dsh-api-monitor__bar--stack { flex-wrap: wrap; }
.dsh-api-monitor__grow { flex: 1; min-width: 0; }
.dsh-api-monitor__count {
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dsh-api-monitor__search {
  flex: 1;
  min-width: 0;
  padding: 4px 8px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  outline: none;
}
.dsh-api-monitor__search:focus { border-color: var(--dsw-alias-brand-primary); }
.dsh-api-monitor__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font: inherit;
  color: var(--dsw-alias-label-primary);
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-api-monitor__btn:hover { background: var(--dsw-alias-bg-layer-2); }
.dsh-api-monitor__btn:disabled { opacity: .45; cursor: default; }
.dsh-api-monitor__btn--ghost { border-color: transparent; }
.dsh-api-monitor__btn--on {
  color: var(--dsw-alias-brand-primary);
  border-color: var(--dsw-alias-brand-primary);
}
.dsh-api-monitor__list { flex: 1; overflow-y: auto; min-height: 0; }
.dsh-api-monitor__row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding: 7px 10px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  cursor: pointer;
}
.dsh-api-monitor__row:hover { background: var(--dsw-alias-bg-layer-1); }
.dsh-api-monitor__row--active { background: var(--dsw-alias-bg-layer-2); }
.dsh-api-monitor__rowline {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.dsh-api-monitor__method {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .04em;
  padding: 1px 5px;
  border-radius: 4px;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  flex: none;
}
.dsh-api-monitor__status {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
  flex: none;
}
.dsh-api-monitor__status--ok { color: var(--dsw-alias-state-success-primary); }
.dsh-api-monitor__status--bad { color: var(--dsw-alias-state-error-primary); }
.dsh-api-monitor__status--wait { color: var(--dsw-alias-state-warn-primary); }
.dsh-api-monitor__url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dsh-api-monitor__meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
}
.dsh-api-monitor__meta--right { margin-left: auto; }
.dsh-api-monitor__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
}
.dsh-api-monitor__tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  flex: none;
  overflow-x: auto;
}
.dsh-api-monitor__tab {
  padding: 5px 8px;
  font: inherit;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-api-monitor__tab--active {
  color: var(--dsw-alias-label-primary);
  border-bottom-color: var(--dsw-alias-brand-primary);
}
.dsh-api-monitor__pane { flex: 1; overflow: auto; min-height: 0; padding: 8px 10px; }
.dsh-api-monitor__code {
  margin: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
}
.dsh-api-monitor__table { width: 100%; border-collapse: collapse; }
.dsh-api-monitor__table td { padding: 4px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1); vertical-align: top; }
.dsh-api-monitor__table td:first-child {
  width: 40%;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--dsw-alias-label-secondary);
  word-break: break-word;
}
.dsh-api-monitor__table td:last-child { word-break: break-word; user-select: text; }
.dsh-api-monitor__muted { color: var(--dsw-alias-label-secondary); }
.dsh-api-monitor__railbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}
.dsh-api-monitor__railbtn:hover {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
`

    /** JSON text for a captured value, keeping plain strings readable. */
    function asText(value) {
      if (value === null || value === undefined) return ''
      if (typeof value === 'string') return value
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return String(value)
      }
    }

    /** Copy through the clipboard API, falling back to a throwaway textarea. */
    function copyText(text) {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => copyViaTextarea(text))
        return
      }
      copyViaTextarea(text)
    }

    function copyViaTextarea(text) {
      if (typeof document === 'undefined') return
      const area = document.createElement('textarea')
      area.value = text
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try {
        document.execCommand('copy')
      } catch {
        /* nothing else to try */
      }
      document.body.removeChild(area)
    }

    /** Path plus host of a captured URL, for the one-line row label. */
    function labelOf(url) {
      try {
        const parsed = new URL(url)
        return `${parsed.host}${parsed.pathname}`
      } catch {
        return url
      }
    }

    /** A `curl` command that reproduces the captured call. */
    function curlOf(record) {
      const parts = [`curl -X ${record.method || 'GET'} '${record.url}'`]
      for (const [name, value] of Object.entries(record.headers || {})) {
        parts.push(`  -H '${name}: ${String(value).replace(/'/g, `'\\''`)}'`)
      }
      if (record.body !== null && record.body !== undefined && record.body !== '') {
        const body = typeof record.body === 'string' ? record.body : JSON.stringify(record.body)
        parts.push(`  --data-raw '${body.replace(/'/g, `'\\''`)}'`)
      }
      return parts.join(' \\\n')
    }

    /** Status class for a row badge. */
    function statusClass(record) {
      const status = record.responseStatus
      if (record.error || (typeof status === 'number' && status >= 400)) return 'dsh-api-monitor__status--bad'
      if (record.pending || status === null || status === undefined) return 'dsh-api-monitor__status--wait'
      return 'dsh-api-monitor__status--ok'
    }

    /** Human status for a row badge. */
    function statusText(record, t) {
      if (record.error) return t('state.error')
      if (record.pending || record.responseStatus === null || record.responseStatus === undefined) return t('state.pending')
      return String(record.responseStatus)
    }

    /** The monitor body: a request list, and the selected request's detail. */
    function ApiMonitor({ t }) {
      const [requests, setRequests] = React.useState([])
      const [selectedId, setSelectedId] = React.useState(null)
      const [filter, setFilter] = React.useState('')
      const [tab, setTab] = React.useState('request')
      const [live, setLive] = React.useState(true)
      const [copied, setCopied] = React.useState(false)
      const liveRef = React.useRef(true)
      liveRef.current = live

      React.useEffect(() => {
        let disposed = false

        const load = async () => {
          try {
            const response = await fetch(ROUTE_LIST, { cache: 'no-store' })
            if (!response.ok) return
            const data = await response.json()
            if (disposed || !data || !Array.isArray(data.requests)) return
            setRequests(data.requests)
          } catch {
            /* the Host may restart; the next poll retries */
          }
        }

        load()

        let source
        try {
          source = new EventSource('/api/api-monitor/events')
          source.addEventListener('init', (event) => {
            try {
              const data = JSON.parse(event.data)
              if (Array.isArray(data.requests)) setRequests(data.requests)
            } catch {
              /* ignore a malformed frame */
            }
          })
          source.addEventListener('new-request', (event) => {
            try {
              const record = JSON.parse(event.data)
              setRequests(previous => [record, ...previous.filter(entry => entry.id !== record.id)].slice(0, 500))
            } catch {
              /* ignore a malformed frame */
            }
          })
          source.addEventListener('update-request', (event) => {
            try {
              const record = JSON.parse(event.data)
              setRequests(previous => previous.map(entry => (entry.id === record.id ? record : entry)))
            } catch {
              /* ignore a malformed frame */
            }
          })
          source.addEventListener('cleared', () => { setRequests([]) })
        } catch {
          source = undefined
        }

        const timer = setInterval(() => {
          if (liveRef.current) void load()
        }, 2500)

        return () => {
          disposed = true
          clearInterval(timer)
          if (source) source.close()
        }
      }, [])

      const clear = async () => {
        try {
          await fetch(ROUTE_CLEAR, { method: 'POST' })
        } catch {
          /* clear is best effort; the poll reflects the Host's buffer */
        }
        setRequests([])
        setSelectedId(null)
      }

      const exportAll = () => {
        const blob = new Blob([JSON.stringify(requests, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `api-monitor-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        anchor.click()
        URL.revokeObjectURL(url)
      }

      const visible = React.useMemo(() => {
        const query = filter.trim().toLowerCase()
        if (query === '') return requests
        return requests.filter((record) => {
          if ((record.url || '').toLowerCase().includes(query)) return true
          if ((record.method || '').toLowerCase().includes(query)) return true
          try {
            return JSON.stringify(record.headers || {}).toLowerCase().includes(query)
          } catch {
            return false
          }
        })
      }, [requests, filter])

      const selected = selectedId === null ? undefined : requests.find(record => record.id === selectedId)

      const copyActive = () => {
        if (!selected) return
        let text = ''
        if (tab === 'request') text = JSON.stringify(fullJson(selected), null, 2)
        else if (tab === 'headers') text = JSON.stringify(selected.headers || {}, null, 2)
        else if (tab === 'curl') text = curlOf(selected)
        else text = asText(selected.responsePreview)
        copyText(text)
        setCopied(true)
        setTimeout(() => { setCopied(false) }, 1200)
      }

      if (selected) {
        return h('div', { className: 'dsh-api-monitor' },
          h('div', { className: 'dsh-api-monitor__bar' },
            h('button', {
              type: 'button', className: 'dsh-api-monitor__btn dsh-api-monitor__btn--ghost',
              onClick: () => { setSelectedId(null) },
            }, '← ', t('action.back')),
            h('span', { className: 'dsh-api-monitor__count dsh-api-monitor__grow' }, selected.method),
          ),
          h('div', { className: 'dsh-api-monitor__bar dsh-api-monitor__bar--stack' },
            h('div', { className: 'dsh-api-monitor__url dsh-api-monitor__grow', title: selected.url }, selected.url),
          ),
          h('div', { className: 'dsh-api-monitor__tabs' },
            ...[['request', t('tab.request')], ['headers', t('tab.headers')], ['curl', t('tab.curl')], ['response', t('tab.response')]]
              .map(([key, text]) => h('button', {
                key,
                type: 'button',
                className: `dsh-api-monitor__tab${tab === key ? ' dsh-api-monitor__tab--active' : ''}`,
                onClick: () => { setTab(key) },
              }, text)),
          ),
          h('div', { className: 'dsh-api-monitor__pane' },
            tab === 'request' && h('pre', { className: 'dsh-api-monitor__code' },
              JSON.stringify(fullJson(selected), null, 2)),
            tab === 'headers' && headerTable(selected.headers, t),
            tab === 'curl' && h('pre', { className: 'dsh-api-monitor__code' }, curlOf(selected)),
            tab === 'response' && responsePane(selected, t),
          ),
          h('div', { className: 'dsh-api-monitor__bar' },
            h('span', { className: 'dsh-api-monitor__count dsh-api-monitor__grow' },
              `${statusText(selected, t)}${selected.durationMs === null || selected.durationMs === undefined ? '' : ` · ${selected.durationMs} ms`}`),
            h('button', { type: 'button', className: 'dsh-api-monitor__btn', onClick: copyActive },
              copied ? t('action.copied') : t('action.copy')),
          ),
        )
      }

      return h('div', { className: 'dsh-api-monitor' },
        h('div', { className: 'dsh-api-monitor__bar' },
          h('input', {
            className: 'dsh-api-monitor__search',
            placeholder: t('filter.placeholder'),
            value: filter,
            onChange: (event) => { setFilter(event.target.value) },
          }),
          h('button', {
            type: 'button',
            className: `dsh-api-monitor__btn${live ? ' dsh-api-monitor__btn--on' : ''}`,
            title: 'Live',
            onClick: () => { setLive(value => !value) },
          }, live ? '●' : '○'),
        ),
        h('div', { className: 'dsh-api-monitor__bar' },
          h('span', { className: 'dsh-api-monitor__count dsh-api-monitor__grow' }, `${requests.length} ${t('count.requests')}`),
          h('button', {
            type: 'button', className: 'dsh-api-monitor__btn', disabled: requests.length === 0,
            onClick: exportAll,
          }, t('action.export')),
          h('button', {
            type: 'button', className: 'dsh-api-monitor__btn', disabled: requests.length === 0,
            onClick: clear,
          }, t('action.clear')),
        ),
        visible.length === 0
          ? h('div', { className: 'dsh-api-monitor__empty' },
              h(ApiMonitorGlyph, { size: 22 }),
              h('div', null, requests.length === 0 ? t('empty.title') : t('empty.filter')),
              h('div', { className: 'dsh-api-monitor__count' }, requests.length === 0 ? t('empty.hint') : ''),
            )
          : h('div', { className: 'dsh-api-monitor__list' },
              visible.map((record) => h('button', {
                key: record.id,
                type: 'button',
                className: 'dsh-api-monitor__row',
                onClick: () => { setSelectedId(record.id); setTab('request') },
              },
                h('div', { className: 'dsh-api-monitor__rowline' },
                  h('span', { className: 'dsh-api-monitor__method' }, record.method),
                  h('span', { className: 'dsh-api-monitor__url' }, labelOf(record.url)),
                  h('span', { className: `dsh-api-monitor__status ${statusClass(record)}` }, statusText(record, t)),
                ),
                h('div', { className: 'dsh-api-monitor__meta' },
                  h('span', null, new Date(record.timestamp).toLocaleTimeString()),
                  h('span', { className: 'dsh-api-monitor__meta--right' },
                    record.durationMs === null || record.durationMs === undefined ? '' : `${record.durationMs} ms`),
                ),
              )),
            ),
      )
    }

    /** The whole captured exchange as one JSON document. */
    function fullJson(record) {
      return {
        id: record.id,
        timestamp: record.timestamp,
        method: record.method,
        url: record.url,
        headers: record.headers || {},
        body: record.body === undefined ? null : record.body,
        response: {
          status: record.responseStatus,
          statusText: record.responseStatusText,
          durationMs: record.durationMs,
          headers: record.responseHeaders || {},
          body: record.responsePreview === undefined ? null : record.responsePreview,
          bytes: record.responseBytes,
        },
        error: record.error === undefined ? null : record.error,
      }
    }

    /** A two-column header table, or the empty notice. */
    function headerTable(headers, t) {
      const entries = Object.entries(headers || {})
      if (entries.length === 0) return h('div', { className: 'dsh-api-monitor__muted' }, t('state.noHeaders'))
      return h('table', { className: 'dsh-api-monitor__table' },
        h('tbody', null, entries.map(([name, value]) =>
          h('tr', { key: name },
            h('td', null, name),
            h('td', null, String(value)),
          ))),
      )
    }

    /** The response pane: status, timing, headers, then the captured body. */
    function responsePane(record, t) {
      if (record.error) {
        return h('pre', { className: 'dsh-api-monitor__code' }, record.error)
      }
      if (record.pending || record.responseStatus === null || record.responseStatus === undefined) {
        return h('div', { className: 'dsh-api-monitor__muted' }, t('state.noResponse'))
      }
      return h('div', null,
        h('div', { className: 'dsh-api-monitor__meta', style: { marginBottom: 8 } },
          h('span', null, `${record.responseStatus} ${record.responseStatusText || ''}`),
          h('span', null, record.durationMs === null || record.durationMs === undefined ? '' : `${record.durationMs} ms`),
        ),
        headerTable(record.responseHeaders, t),
        h('pre', { className: 'dsh-api-monitor__code', style: { marginTop: 10 } },
          asText(record.responsePreview) || ''),
      )
    }

    /** The tab chip's label. */
    function ApiMonitorTitle({ t }) {
      return h('span', null, t('title'))
    }

    /** The sidebar-foot rail button that opens the monitor. */
    function ApiMonitorFooterButton({ wide, t, open }) {
      return h('button', {
        type: 'button',
        className: 'dsh-api-monitor__railbtn',
        title: t('footer.title'),
        'aria-label': t('footer.title'),
        onClick: open,
      }, h(ApiMonitorGlyph, { size: 16 }))
    }

    return {
      inject: ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, COPY), 'api-monitor: copy')

        const style = document.createElement('style')
        style.dataset.plugin = ID
        style.textContent = CSS
        ctx.effect(() => {
          document.head.appendChild(style)
          return () => { style.remove() }
        }, 'api-monitor: styles')

        const open = () => {
          try {
            ctx.sidebarRight.openTab(KIND)
          } catch (error) {
            console.error('api-monitor: opening the tab failed', error)
          }
        }

        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: ID,
          kind: KIND,
          title: () => 'Api monitor',
          guide: [{
            id: 'open',
            order: 40,
            title: () => 'Api monitor',
            description: () => t('guide.description'),
            icon: ApiMonitorGlyph,
          }],
        }), 'api-monitor: tab type')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab',
          key: ID,
        }, (props) => h(ApiMonitor, { t: props.t || t }))), 'api-monitor: tab body')

        ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title',
          key: ID,
        }, () => h(ApiMonitorTitle, { t }))), 'api-monitor: tab title')

        ctx.effect(() => ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
          name: 'sidebar.footer.action',
          id: 'api-monitor',
          order: 20,
          label: () => t('footer.title'),
        }, (props) => h(ApiMonitorFooterButton, { wide: props.wide, t, open }))), 'api-monitor: rail button')
      },
    }
  },
})
