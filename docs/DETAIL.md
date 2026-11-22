# Api monitor

Shows every outbound request that leaves the [DSH] Host for an API endpoint: address, method, **all** HTTP headers (including `Authorization`, `x-goog-api-key`, `Content-Type`), the request body as the original JSON, plus status, timing and the response body.

## Where to look

- **Right sidebar, Start page**: the **Api monitor** card, right after *Browser*. Clicking it opens the monitor in that same panel.
- **Left sidebar, bottom**: a pulse button next to Settings — opens the same monitor.

## What is inside

- **Request JSON** — one document: `id`, `timestamp`, `host`, `url`, `method`, `headers`, `body`, `response` (`status`, `statusText`, `durationMs`, `headers`, `body`, `bytes`, `assembled`) and `error`.
- **Headers** — tables of every request header and every response header.
- **cURL** — a ready-to-run command that reproduces the call from a terminal.
- **Response** — the **assembled answer** of a streamed reply: deltas folded into readable text, with reasoning collapsed, tool calls listed, and model, finish reason, token usage and frame count in the header row. The **Raw stream** switch shows the original frames.
- **Search** — every tab has a search box: matches are highlighted, `Enter` / `Shift+Enter` step through them, and the counter reads `3/17`.

The list updates by itself (SSE, with a 2.5 s poll as a fallback). There is a filter over URL, method and headers, a pause switch, buffer clearing and a `.json` export.

## How it works

The Host half wraps `globalThis.fetch` and the `node:http` / `node:https` request entry points, keeps what it catches in a bounded in-memory buffer (100 records by default), and folds streamed responses into their final text. The Client reads that buffer over `/api/api-monitor/requests`, `/api/api-monitor/clear` and `/api/api-monitor/events`.

## Limitations

- Requests a library makes through a `fetch` reference captured before this plugin loaded, and traffic that bypasses `fetch` / `http.request` (native HTTP/2 clients, raw sockets, subprocesses) are not intercepted.
- Assembly covers chat-completion chunks ([OI]), Gemini `candidates`, Anthropic typed events and Responses events; an unusual stream shows raw frames and may assemble to empty text.
- The raw preview is 256 KiB and assembly reads up to 4 MiB of stream; past that the record is marked incomplete and the answer stops where the capture stopped.
- The buffer lives in Host memory and is never written to disk.
- The routes answer loopback requests only; the data does not leave the machine, but it does contain secrets (`Authorization`), so do not publish an export.

---

# Api monitor (по-русски)

Плагин показывает все исходящие запросы, которые уходят на API-эндпоинты: адрес, метод, **полные HTTP-заголовки** (включая `Authorization` / `x-goog-api-key` / `Content-Type`), тело запроса в виде исходного JSON, а также статус, время и тело ответа.

## Где смотреть

- **Правая панель, страница Start**: карточка **Api monitor** — сразу после карточки *Browser*. Нажатие открывает монитор в этой же панели.
- **Левая панель, внизу**: кнопка с пульсом рядом с шестерёнкой настроек — открывает тот же монитор.

## Что внутри

- **JSON запроса** — один документ: `id`, `timestamp`, `host`, `url`, `method`, `headers`, `body`, `response` (`status`, `statusText`, `durationMs`, `headers`, `body`, `bytes`, `assembled`) и `error`.
- **Заголовки** — таблицы заголовков запроса и ответа.
- **cURL** — готовая команда, воспроизводящая запрос из терминала.
- **Ответ** — **собранный ответ** потокового стрима: дельты склеены в читаемый текст, рассуждение свёрнуто, вызовы инструментов перечислены, а модель, причина остановки, расход токенов и число кадров видны в строке состояния. Переключатель **Сырой поток** показывает исходные кадры.
- **Поиск** — во всех вкладках: совпадения подсвечиваются, `Enter` / `Shift+Enter` переходят по ним, счётчик показывает `3/17`.

Список обновляется автоматически (SSE, с опросом раз в 2,5 с). Есть фильтр по URL/методу/заголовкам, пауза обновления, очистка буфера и экспорт в `.json`.

## Как это устроено

Host-часть подменяет `globalThis.fetch` и точки входа `node:http` / `node:https`, складывает пойманное в кольцевой буфер в памяти (по умолчанию 100 записей) и склеивает потоковые ответы в итоговый текст. Клиент читает буфер по маршрутам `/api/api-monitor/requests`, `/api/api-monitor/clear` и `/api/api-monitor/events`.

## Ограничения

- Запросы, которые библиотека выполнила через закешированную на импорте ссылку `fetch`, и трафик, идущий мимо `fetch`/`http.request` (нативные HTTP/2-клиенты, сокеты, подпроцессы), не перехватываются.
- Склейка покрывает кадры chat-completion ([OI]), `candidates` Gemini, типизированные события Anthropic и события Responses; необычный поток покажет сырые кадры и может дать пустой текст.
- Сырое превью — 256 КиБ, на склейку читается до 4 МиБ потока; дальше запись помечается неполной, и ответ обрывается там же.
- Буфер живёт в памяти процесса и не сохраняется на диск.
- Маршруты отвечают только loopback-запросам; данные не покидают машину, но содержат секреты (`Authorization`), поэтому не выкладывайте экспорт в открытый доступ.
