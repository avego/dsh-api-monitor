# Api monitor

Shows every outbound request that leaves the [DSH] Host for an API endpoint: address, method, **all** HTTP headers (including `Authorization`, `x-goog-api-key`, `Content-Type`), the request body as the original JSON, plus status, timing and the response body.

## Where to look

- **Right sidebar, Start page**: the **Api monitor** card, right after *Browser*. Clicking it opens the monitor in that same panel.
- **Left sidebar, bottom**: a pulse button next to Settings — opens the same monitor.

## What is inside

- **Request JSON** — one document: `id`, `timestamp`, `host`, `url`, `method`, `headers`, `body`, `response` (`status`, `statusText`, `durationMs`, `headers`, `body`, `bytes`) and `error`.
- **Headers** — a table of every request header.
- **cURL** — a ready-to-run command that reproduces the call from a terminal.
- **Response** — status, timing, response headers and the first 64 KiB of the body.

The list updates by itself (SSE, with a 2.5 s poll as a fallback). There is a filter over URL, method and headers, a pause switch, buffer clearing and a `.json` export.

## How it works

The Host half wraps `globalThis.fetch` and the `node:http` / `node:https` request entry points and keeps what it catches in a bounded in-memory buffer (100 records by default). The Client reads that buffer over `/api/api-monitor/requests`, `/api/api-monitor/clear` and `/api/api-monitor/events`.

## Limitations

- Requests a library makes through a `fetch` reference captured before this plugin loaded, and traffic that bypasses `fetch` / `http.request` (native HTTP/2 clients, raw sockets, subprocesses) are not intercepted.
- The buffer lives in Host memory and is never written to disk.
- The routes answer loopback requests only; the data does not leave the machine, but it does contain secrets (`Authorization`), so do not publish an export.

---

# Api monitor (по-русски)

Плагин показывает все исходящие запросы, которые уходят на API-эндпоинты: адрес, метод, **полные HTTP-заголовки** (включая `Authorization` / `x-goog-api-key` / `Content-Type`), тело запроса в виде исходного JSON, а также статус, время и тело ответа.

## Где смотреть

- **Правая панель, страница Start**: карточка **Api monitor** — сразу после карточки *Browser*. Нажатие открывает монитор в этой же панели.
- **Левая панель, внизу**: кнопка с пульсом рядом с шестерёнкой настроек — открывает тот же монитор.

## Что внутри

- **JSON запроса** — один документ: `id`, `timestamp`, `host`, `url`, `method`, `headers`, `body`, `response` (`status`, `statusText`, `durationMs`, `headers`, `body`, `bytes`) и `error`.
- **Заголовки** — таблица всех заголовков запроса.
- **cURL** — готовая команда, воспроизводящая запрос из терминала.
- **Ответ** — статус, время, заголовки ответа и первые 64 КиБ тела.

Список обновляется автоматически (SSE, с опросом раз в 2,5 с). Есть фильтр по URL/методу/заголовкам, пауза обновления, очистка буфера и экспорт в `.json`.

## Как это устроено

Host-часть подменяет `globalThis.fetch` и точки входа `node:http` / `node:https` и складывает пойманное в кольцевой буфер в памяти (по умолчанию 100 записей). Клиент читает буфер по маршрутам `/api/api-monitor/requests`, `/api/api-monitor/clear` и `/api/api-monitor/events`.

## Ограничения

- Запросы, которые библиотека выполнила через закешированную на импорте ссылку `fetch`, и трафик, идущий мимо `fetch`/`http.request` (нативные HTTP/2-клиенты, сокеты, подпроцессы), не перехватываются.
- Буфер живёт в памяти процесса и не сохраняется на диск.
- Маршруты отвечают только loopback-запросам; данные не покидают машину, но содержат секреты (`Authorization`), поэтому не выкладывайте экспорт в открытый доступ.
