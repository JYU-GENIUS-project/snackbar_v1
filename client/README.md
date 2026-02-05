# Client – Snackbar Kiosk Frontend

React front-end for the Snackbar kiosk experience. The kiosk consumes the public feed and status APIs exposed by the Express server and renders product browsing, availability overlays, and trust-mode messaging. The client codebase is TypeScript-first.

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on <http://localhost:3000> by default. The kiosk expects the API gateway at `/api`; the Vite dev proxy in `vite.config.ts` forwards requests to the backend container during development.

### Available Scripts

- `npm run dev` – start the kiosk in development mode with hot reload
- `npm run build` – produce a production bundle under `dist/`
- `npm run preview` – serve the built bundle locally for smoke testing
- `npm run test` – execute unit tests (Vitest + Testing Library)
- `npm run lint` – run linting with React, hooks, and a11y rules enforced

## Status & Availability Data

- `GET /api/feed/products` returns the combined product feed, inventory tracking flag, and the current kiosk status snapshot used by `useProductFeed`.
- `GET /api/status/kiosk` exposes the resolved kiosk state (open, closed, maintenance) consumed by `useKioskStatus`.
- `GET /api/status/events` streams Server-Sent Events for status, tracking toggle, and inventory deltas. The kiosk falls back to polling if SSE is unavailable.

The kiosk also persists the latest feed and status fingerprint to `localStorage` under the `OFFLINE_FEED_STORAGE_KEY`, enabling offline messaging when the network drops.

## Trust Mode Warning Banner

When inventory tracking is disabled, the kiosk displays `#inventory-warning-banner` and immediately logs the analytics event `kiosk.inventory_tracking_warning_displayed` with context about the active status overlay. This satisfies roadmap Step 32.

## Category Filter Instrumentation

Selecting a category triggers timing instrumentation; the kiosk records the filter duration (from tap to render) and logs a `kiosk.category_filter_render_complete` event. In development builds a concise timing log is emitted to the console for quick verification against the <300 ms target.

## Acceptance Coverage

Phase 5 requires both customer-facing suites:

- `robot tests/acceptance/customer_product_browsing.robot`
- `robot tests/acceptance/customer_system_status.robot`

The first suite already passes with the current UI. Re-run the status suite after making status or telemetry changes to document compliance with Implementation Roadmap Step 33.

## Deployment Checklist

- Ensure the backend exposes the status and feed routes behind `/api` with CORS enabled for the kiosk origin.
- Provide `KIOSK_TIMEZONE` and system configuration rows for operating hours and maintenance messaging.
- Configure the analytics endpoint via `VITE_KIOSK_ANALYTICS_ENDPOINT` if beacon uploads should be shipped server-side; otherwise events remain in the in-memory buffer.
- Rebuild the kiosk (`npm run build`) and copy the `dist/` output to the Nginx container volume expected by the compose stack.

### Status API Runbook

- **Environment inputs**: set `KIOSK_TIMEZONE` to the kiosk’s local IANA zone and seed `system_config` keys `operating_hours` and `maintenance_mode`; the status service falls back to Helsinki defaults if these records are missing.
- **Cache policy**: `/api/status/kiosk` must return `Cache-Control: no-cache` so intermediaries do not serve stale availability. Double-check CDN or Nginx rules preserve this header.
- **SSE transport**: `/api/status/events` streams Server-Sent Events and expects `Content-Type: text/event-stream`, `Cache-Control: no-cache`, and `Connection: keep-alive`. On Nginx add `proxy_buffering off;` and `proxy_set_header Connection 'keep-alive';` (optionally `X-Accel-Buffering off;`) for that route to prevent buffering.
- **Health verification**: curl the endpoints after deploy. You should see `success: true` JSON from `/api/status/kiosk` and the `: connected` comment when tailing `/api/status/events`.
