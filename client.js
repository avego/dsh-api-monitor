/**
 * API Monitor — Client half.
 *
 * Three contributions:
 *   1. a right-Sidebar tab type `api-monitor` with a guide card, so the Start
 *      page shows an "Api monitor" capsule that opens the monitor in place;
 *   2. the tab body, a master/detail inspector over the Host's captured calls;
 *   3. a rail button at the sidebar foot that opens the same tab.
 *
 * The data comes from the Host half's routes under `/api/api-monitor/*`.
 * The Host folds a streamed answer back into readable text; this half only
 * decides how to show it and where to highlight a search hit.
 */
window.__ModuleLoader__.load({
  id: 'dsh-api-monitor',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Tab kind the guide card opens and the body is dispatched under. */
    const KIND = 'api-monitor'
    /** Implementation identity: the tab type id and the body/title slot key. */
    const ID = 'dsh-api-monitor'
    /** Copy namespace registered in the Client locale service. */
    const NS = 'apiMonitor'
    /** Host routes owned by the Host half. */
    const ROUTE_LIST = '/api/api-monitor/requests'
    const ROUTE_CLEAR = '/api/api-monitor/clear'
    /** Highlight ceiling: past this many hits the pane stays readable. */
    const MAX_HITS = 2000

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
        'action.prev': 'Previous match',
        'action.next': 'Next match',
        'filter.placeholder': 'Filter by URL, method, or header',
        'search.placeholder': 'Search in this tab',
        'search.none': 'No matches',
        'tab.request': 'Request JSON',
        'tab.headers': 'Headers',
        'tab.curl': 'cURL',
        'tab.response': 'Response',
        'view.assembled': 'Assembled',
        'view.raw': 'Raw stream',
        'label.reasoning': 'Reasoning',
        'label.usage': 'tokens',
        'meta.chunks': 'chunks',
        'state.pending': 'pending',
        'state.error': 'error',
        'state.noBody': 'This request carried no body.',
        'state.noHeaders': 'No headers were recorded.',
        'state.noResponse': 'The response has not arrived yet.',
        'state.noAssembled': 'This response carries no readable answer to assemble.',
        'state.partial': 'assembly stopped early: the capture is incomplete',
        'state.previewCut': 'the raw preview is cut here',
        'headers.request': 'Request headers',
        'headers.response': 'Response headers',
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
        'action.prev': 'Предыдущее совпадение',
        'action.next': 'Следующее совпадение',
        'filter.placeholder': 'Фильтр по URL, методу или заголовку',
        'search.placeholder': 'Поиск по вкладке',
        'search.none': 'Совпадений нет',
        'tab.request': 'JSON запроса',
        'tab.headers': 'Заголовки',
        'tab.curl': 'cURL',
        'tab.response': 'Ответ',
        'view.assembled': 'Собранный',
        'view.raw': 'Сырой поток',
        'label.reasoning': 'Рассуждение',
        'label.usage': 'токенов',
        'meta.chunks': 'чанков',
        'state.pending': 'в процессе',
        'state.error': 'ошибка',
        'state.noBody': 'У этого запроса нет тела.',
        'state.noHeaders': 'Заголовки не записаны.',
        'state.noResponse': 'Ответ ещё не пришёл.',
        'state.noAssembled': 'В этом ответе нет читаемого текста для сборки.',
        'state.partial': 'сборка остановлена: перехват неполный',
        'state.previewCut': 'сырое превью обрезано здесь',
        'headers.request': 'Заголовки запроса',
        'headers.response': 'Заголовки ответа',
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
.dsh-api-monitor__search--narrow { flex: none; width: 180px; }
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
.dsh-api-monitor__seg {
  display: inline-flex;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  overflow: hidden;
  flex: none;
}
.dsh-api-monitor__segbtn {
  padding: 3px 8px;
  font: inherit;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  border: 0;
  cursor: pointer;
  white-space: nowrap;
}
.dsh-api-monitor__segbtn--active {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-api-monitor__hit {
  background: #ffe066;
  color: #161616;
  border-radius: 2px;
  padding: 0 1px;
}
.dsh-api-monitor__hit--active {
  background: #ffb020;
  box-shadow: 0 0 0 2px rgba(255, 176, 32, .45);
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
  align-items: center;
  gap: 2px;
  padding: 4px 8px 0;
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
.dsh-api-monitor__answer { line-height: 1.6; }
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
.dsh-api-monitor__details {
  margin-top: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  padding: 6px 8px;
}
.dsh-api-monitor__details > summary {
  cursor: pointer;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  user-select: none;
}
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

    /** The assembled view of a record, when the Host produced one with text. */
    function assembledOf(record) {
      const assembled = record.responseAssembled
      if (!assembled || typeof assembled !== 'object') return null
      const text = typeof assembled.text === 'string' ? assembled.text : ''
      const reasoning = typeof assembled.reasoning === 'string' ? assembled.reasoning : ''
      if (text === '' && reasoning === '') return null
      return { ...assembled, text, reasoning }
    }

    /** Tokens summary from a usage object, whichever provider wrote it. */
    function usageText(usage) {
      if (!usage || typeof usage !== 'object') return ''
      const prompt = usage.prompt_tokens ?? usage.input_tokens
      const completion = usage.completion_tokens ?? usage.output_tokens
      const total = usage.total_tokens
      const parts = []
      if (typeof prompt === 'number') parts.push(`in ${prompt}`)
      if (typeof completion === 'number') parts.push(`out ${completion}`)
      if (typeof total === 'number') parts.push(`total ${total}`)
      return parts.join(' · ')
    }

    /** Count matches of `query` in one string, bounded by MAX_HITS. */
    function countMatches(text, query) {
      if (query === '') return 0
      const haystack = text.toLowerCase()
      const needle = query.toLowerCase()
      let at = 0
      let found = 0
      while (found < MAX_HITS) {
        const index = haystack.indexOf(needle, at)
        if (index < 0) break
        found += 1
        at = index + needle.length
      }
      return found
    }

    /**
     * Render one string with every match wrapped in a mark.
     * @param text - the string to render.
     * @param query - lower-case search text; empty renders the string as is.
     * @param cursor - shared counter, so marks carry a tab-wide index.
     * @param activeIndex - the mark to emphasize, or -1.
     */
    function marked(text, query, cursor, activeIndex) {
      if (query === '' || text === '') return text
      const haystack = text.toLowerCase()
      const nodes = []
      let at = 0
      let local = 0
      while (true) {
        const index = haystack.indexOf(query, at)
        if (index < 0) break
        if (local >= MAX_HITS) break
        if (index > at) nodes.push(text.slice(at, index))
        const globalIndex = cursor.offset
        cursor.offset += 1
        nodes.push(h('mark', {
          key: `hit-${globalIndex}`,
          className: globalIndex === activeIndex
            ? 'dsh-api-monitor__hit dsh-api-monitor__hit--active'
            : 'dsh-api-monitor__hit',
        }, text.slice(index, index + query.length)))
        at = index + query.length
        local += 1
      }
      if (nodes.length === 0) return text
      if (at < text.length) nodes.push(text.slice(at))
      return nodes
    }

    /** The strings a tab shows, in reading order: the search index and the renderer share them. */
    function tabStrings(record, tab, view) {
      if (tab === 'request') return [JSON.stringify(fullJson(record), null, 2)]
      if (tab === 'curl') return [curlOf(record)]
      if (tab === 'headers') {
        const out = []
        for (const [name, value] of Object.entries(record.headers || {})) out.push(name, String(value))
        for (const [name, value] of Object.entries(record.responseHeaders || {})) out.push(name, String(value))
        return out
      }
      if (view === 'raw') return [asText(record.responsePreview)]
      const assembled = assembledOf(record)
      if (assembled === null) return [asText(record.responsePreview)]
      return assembled.reasoning === '' ? [assembled.text] : [assembled.text, assembled.reasoning]
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
          incomplete: record.responseIncomplete === true,
          assembled: record.responseAssembled === undefined ? null : record.responseAssembled,
        },
        error: record.error === undefined ? null : record.error,
      }
    }

    /** A two-column header table, or the empty notice. */
    function headerTable(headers, t, query, cursor, activeIndex) {
      const entries = Object.entries(headers || {})
      if (entries.length === 0) return h('div', { className: 'dsh-api-monitor__muted' }, t('state.noHeaders'))
      return h('table', { className: 'dsh-api-monitor__table' },
        h('tbody', null, entries.map(([name, value]) =>
          h('tr', { key: name },
            h('td', null, marked(name, query, cursor, activeIndex)),
            h('td', null, marked(String(value), query, cursor, activeIndex)),
          ))),
      )
    }

    /** The Response tab: the assembled answer, or the raw stream on request. */
    function ResponsePane({ record, t, query, activeIndex, view, onChangeView, text, reasoning }) {
      const cursor = { offset: 0 }

      if (record.error) {
        return h('pre', { className: 'dsh-api-monitor__code' }, marked(record.error, query, cursor, activeIndex))
      }
      if (record.pending || record.responseStatus === null || record.responseStatus === undefined) {
        return h('div', { className: 'dsh-api-monitor__muted' }, t('state.noResponse'))
      }

      const assembled = assembledOf(record)
      const effective = assembled === null ? 'raw' : view
      const usage = assembled === null ? '' : usageText(assembled.usage)

      return h('div', null,
        h('div', {
          className: 'dsh-api-monitor__bar',
          style: { padding: '0 0 8px', background: 'transparent', flexWrap: 'wrap' },
        },
          h('div', { className: 'dsh-api-monitor__meta' },
            h('span', null, `${record.responseStatus} ${record.responseStatusText || ''}`),
            record.durationMs === null || record.durationMs === undefined ? null : h('span', null, `${record.durationMs} ms`),
            assembled && assembled.model ? h('span', null, assembled.model) : null,
            assembled && assembled.finishReason ? h('span', null, `finish: ${assembled.finishReason}`) : null,
            usage === '' ? null : h('span', null, usage),
            assembled && typeof assembled.frames === 'number'
              ? h('span', null, `${assembled.frames} ${t('meta.chunks')}`)
              : null,
          ),
          assembled === null ? null : h('div', { className: 'dsh-api-monitor__seg', style: { marginLeft: 'auto' } },
            h('button', {
              type: 'button',
              className: `dsh-api-monitor__segbtn${effective === 'assembled' ? ' dsh-api-monitor__segbtn--active' : ''}`,
              onClick: () => { onChangeView('assembled') },
            }, t('view.assembled')),
            h('button', {
              type: 'button',
              className: `dsh-api-monitor__segbtn${effective === 'raw' ? ' dsh-api-monitor__segbtn--active' : ''}`,
              onClick: () => { onChangeView('raw') },
            }, t('view.raw')),
          ),
        ),

        assembled && record.responseIncomplete === true
          ? h('div', { className: 'dsh-api-monitor__muted', style: { marginBottom: 6 } }, t('state.partial'))
          : null,

        effective === 'assembled' && assembled !== null
          ? h('div', null,
              h('pre', { className: 'dsh-api-monitor__code dsh-api-monitor__answer' },
                marked(text, query, cursor, activeIndex)),
              reasoning === ''
                ? null
                : h('details', { className: 'dsh-api-monitor__details' },
                    h('summary', null, `${t('label.reasoning')} · ${reasoning.length}`),
                    h('pre', { className: 'dsh-api-monitor__code' },
                      marked(reasoning, query, cursor, activeIndex)),
                  ),
              assembled.toolCalls && assembled.toolCalls.length > 0
                ? h('details', { className: 'dsh-api-monitor__details' },
                    h('summary', null, `tool calls · ${assembled.toolCalls.length}`),
                    h('pre', { className: 'dsh-api-monitor__code' }, JSON.stringify(assembled.toolCalls, null, 2)),
                  )
                : null,
            )
          : h('div', null,
              h('pre', { className: 'dsh-api-monitor__code' },
                marked(text, query, cursor, activeIndex)),
              record.responsePreviewTruncated === true
                ? h('div', { className: 'dsh-api-monitor__muted', style: { marginTop: 6 } },
                    `${t('state.previewCut')} · ${record.responseBytes} B`)
                : null,
            ),
      )
    }

    /** The monitor body: a request list, and the selected request's detail. */
    function ApiMonitor({ t }) {
      const [requests, setRequests] = React.useState([])
      const [selectedId, setSelectedId] = React.useState(null)
      const [filter, setFilter] = React.useState('')
      const [tab, setTab] = React.useState('request')
      const [query, setQuery] = React.useState('')
      const [hitIndex, setHitIndex] = React.useState(0)
      const [responseView, setResponseView] = React.useState('assembled')
      const [live, setLive] = React.useState(true)
      const [copied, setCopied] = React.useState(false)
      const paneRef = React.useRef(null)
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
        const needle = filter.trim().toLowerCase()
        if (needle === '') return requests
        return requests.filter((record) => {
          if ((record.url || '').toLowerCase().includes(needle)) return true
          if ((record.method || '').toLowerCase().includes(needle)) return true
          try {
            return JSON.stringify(record.headers || {}).toLowerCase().includes(needle)
          } catch {
            return false
          }
        })
      }, [requests, filter])

      const selected = selectedId === null ? undefined : requests.find(record => record.id === selectedId)

      const needle = query.trim().toLowerCase()

      const strings = React.useMemo(
        () => (selected === undefined ? [] : tabStrings(selected, tab, responseView)),
        [selected, tab, responseView],
      )

      const hits = React.useMemo(() => {
        if (needle === '') return 0
        let total = 0
        for (const text of strings) total += countMatches(text, needle)
        return total
      }, [strings, needle])

      // A new search, tab, or record restarts from the first hit.
      React.useEffect(() => { setHitIndex(0) }, [needle, tab, selectedId, responseView])

      // A record without an assembled answer can only show its raw stream.
      React.useEffect(() => {
        if (selected === undefined) return
        setResponseView(assembledOf(selected) === null ? 'raw' : 'assembled')
      }, [selectedId])

      React.useEffect(() => {
        if (needle === '' || hits === 0) return
        const pane = paneRef.current
        if (!pane || typeof pane.querySelector !== 'function') return
        const active = pane.querySelector('.dsh-api-monitor__hit--active')
        if (active && typeof active.scrollIntoView === 'function') {
          active.scrollIntoView({ block: 'center' })
        }
      }, [hitIndex, hits, needle, tab])

      const move = (step) => {
        if (hits === 0) return
        setHitIndex(current => ((current + step) % hits + hits) % hits)
      }

      const copyActive = () => {
        if (!selected) return
        copyText((strings.length > 0 ? strings : tabStrings(selected, tab, responseView)).join('\n\n'))
        setCopied(true)
        setTimeout(() => { setCopied(false) }, 1200)
      }

      if (selected) {
        const cursor = { offset: 0 }
        const activeIndex = needle === '' || hits === 0 ? -1 : Math.min(hitIndex, hits - 1)

        return h('div', { className: 'dsh-api-monitor' },
          h('div', { className: 'dsh-api-monitor__bar' },
            h('button', {
              type: 'button', className: 'dsh-api-monitor__btn dsh-api-monitor__btn--ghost',
              onClick: () => { setSelectedId(null); setQuery('') },
            }, '← ', t('action.back')),
            h('span', { className: 'dsh-api-monitor__count dsh-api-monitor__grow' }, selected.method),
            h('input', {
              className: 'dsh-api-monitor__search dsh-api-monitor__search--narrow',
              placeholder: t('search.placeholder'),
              value: query,
              onChange: (event) => { setQuery(event.target.value) },
              onKeyDown: (event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  move(event.shiftKey ? -1 : 1)
                }
                if (event.key === 'Escape') { setQuery('') }
              },
            }),
            needle === ''
              ? null
              : h('span', { className: 'dsh-api-monitor__count' },
                  hits === 0 ? t('search.none') : `${activeIndex + 1}/${hits}`),
            h('button', {
              type: 'button', className: 'dsh-api-monitor__btn dsh-api-monitor__btn--ghost',
              title: t('action.prev'), 'aria-label': t('action.prev'),
              disabled: hits === 0, onClick: () => { move(-1) },
            }, '‹'),
            h('button', {
              type: 'button', className: 'dsh-api-monitor__btn dsh-api-monitor__btn--ghost',
              title: t('action.next'), 'aria-label': t('action.next'),
              disabled: hits === 0, onClick: () => { move(1) },
            }, '›'),
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
          h('div', { className: 'dsh-api-monitor__pane', ref: paneRef },
            tab === 'request' && h('pre', { className: 'dsh-api-monitor__code' },
              marked(strings[0] ?? '', needle, cursor, activeIndex)),
            tab === 'headers' && h('div', null,
              h('div', { className: 'dsh-api-monitor__muted', style: { marginBottom: 6 } }, t('headers.request')),
              headerTable(selected.headers, t, needle, cursor, activeIndex),
              h('div', { className: 'dsh-api-monitor__muted', style: { margin: '12px 0 6px' } }, t('headers.response')),
              headerTable(selected.responseHeaders, t, needle, cursor, activeIndex),
            ),
            tab === 'curl' && h('pre', { className: 'dsh-api-monitor__code' },
              marked(strings[0] ?? '', needle, cursor, activeIndex)),
            tab === 'response' && h(ResponsePane, {
              record: selected,
              t,
              query: needle,
              activeIndex,
              view: responseView,
              onChangeView: setResponseView,
              text: strings[0] ?? '',
              reasoning: strings[1] ?? '',
            }),
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
                onClick: () => { setSelectedId(record.id); setTab('response'); setQuery('') },
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
