# Phase 4 Inventory & Alerting Backbone - Technical Design Note

## Purpose

This note captures architectural decisions required before implementing Phase 4 work. It aligns the upcoming inventory and alerting features with the approved C4 architecture, the Implementation Roadmap, and the SRS (FR-8.x, FR-11.x). It focuses on:

- Inventory domain modelling and persistence strategy
- Real-time event propagation between API, admin portal, and kiosk
- Notification delivery and retry orchestration
- Operational considerations for SMTP credentials and clustered background workers

## Existing Baseline

- **Backend stack**: Node.js (Express 5.1) behind Nginx, with PostgreSQL 18 and PM2 clustering per docs/architecture/C4_Architecture.md.
- **Current schema**: products table tracks `stock_quantity` with non-negative constraint; no ledger or notification tables exist yet (init-db/001 and 002 migrations).
- **Configuration**: system_config stores JSON values and supports runtime toggles. SMTP credentials are injected via environment variables in docker-compose.yml (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ADMIN_NOTIFICATION_EMAILS).
- **Frontend**: Admin ProductManager currently uses mock inventory data; no SSE/WebSocket wiring implemented.

## Inventory Domain Model

### Options Considered

1. **Inline Counters Only** (status quo)
   - Pros: minimal schema changes
   - Cons: lacks history for reconciliation, cannot explain negative stock origins, complicates audit trail
2. **Event Ledger + Materialized Summary** (proposed)
   - Pros: immutable history for discrepancies, supports adjustments and purchases uniformly, enables analytics; summary view can be indexed for fast UI queries
   - Cons: requires additional aggregation logic and migration effort

### Decision

Adopt **Inventory Ledger + Summary** approach.

- **Schema Additions**
  - `inventory_ledger` table: columns `id`, `product_id`, `delta`, `source`, `reason`, `admin_id`, `transaction_id`, `created_at`. `source` enum values: `purchase`, `manual_adjustment`, `reconciliation`, `system`.
  - `inventory_snapshot` materialized view (or table maintained via trigger) providing `current_stock`, `low_stock_flag`, `negative_flag`, `tracking_enabled`, `last_activity_at` per product.
  - Relax `products.stock_quantity` constraint (allow negative) while keeping column as cached view for compatibility until UI migrates fully to snapshot.
- **Business Rules**
  - Ledger writes must be transactional with the originating action (purchase, adjustment) to guarantee consistency.
  - Negative stock allowed to surface discrepancies (FR-8.2.1, FR-8.2.3).
  - Inventory toggle disables ledger writes from purchases but preserves data; manual adjustments remain allowed for reconciliation.

## Real-Time Event Propagation

### Options

1. **Server-Sent Events (SSE)**
   - Pros: simple one-way stream, aligns with Implementation_Roadmap step 27; easy to share across kiosk and admin clients; works through current Nginx configuration with keepalive tweaks.
   - Cons: Each client maintains separate HTTP connection; limited browser support for custom reconnection strategies.
2. **WebSocket**
   - Pros: bi-directional; scalable for future interactive features.
   - Cons: Higher complexity, requires additional infrastructure for PM2 clustering (sticky sessions) and fallback logic.

### Decision

Use **SSE** for Phase 4 inventory events.

- Endpoint: `/api/inventory/events` streaming JSON payloads containing event type (`stock-updated`, `tracking-toggled`, `threshold-breach`) and data snapshots.
- Admin and kiosk clients subscribe via EventSource, triggering UI refreshes.
- Nginx requires `proxy_buffering off` and appropriate timeout extensions for this location; include in later steps.
- Future upgrade path: encapsulate emitter logic so switching to WebSocket later only impacts transport layer.

## Notification Delivery & Retry

### Requirements

- FR-8.4 mandates low-stock notifications once per threshold breach.
- FR-11.2.1 dictates retry windows of 1, 5, and 15 minutes with delivery logging.
- US-067 acceptance tests expect visibility into retry attempts and failure handling.

### Design

- **NotificationService** abstraction with responsibilities:
  - Persist notification intents to `email_notification_log` table: `id`, `type`, `payload`, `status`, `attempt_count`, `last_attempt_at`, `next_attempt_at`, `error_details`.
  - Dispatch emails via SMTP client (Nodemailer) and respect retry schedule (1, 5, 15 minutes). Configurable constants stored centrally to accommodate test harness expectations via environment override.
  - Guard against duplicate alerts by checking for existing active log entries per product/threshold until restock.
- **Worker Execution**
  - Background job loop runs inside API process but must be single-instance across PM2 cluster. Use PostgreSQL advisory lock (`pg_try_advisory_lock`) to elect one worker per cluster; releases lock on shutdown.
  - Worker polls due notifications every 30 seconds, executes send, updates log. On failure increments counter and schedules next attempt until max (3) reached.
  - Expose admin API endpoint for querying notification logs and retry statistics for monitoring and acceptance tests.

## SMTP Credential Strategy

- **Secrets** (SMTP host, port, username, password, from address) remain in environment variables injected via Docker/PM2. No storage in database to avoid exposing credentials through admin UI.
- **Configurable Fields** (notification recipient list, feature toggles) are stored in `system_config` under keys `notification_recipients` and `inventory_tracking_enabled`.
- Admin UI updates recipients and toggles via protected API endpoints; changes take effect within 10 seconds to satisfy FR-11.1.2.
- Provide validation layer enforcing RFC 5322 via existing configuration service.

## PM2 Clustering Considerations

- API runs in cluster mode (two instances). To avoid duplicated background tasks:
  - Background worker module attempts to acquire advisory lock; only the holder processes notification retries and SSE heartbeat tasks.
  - SSE endpoint uses shared in-memory publisher per instance; ledger mutations emit events to Redis Pub/Sub-like shim or database NOTIFY/LISTEN. Preferred lightweight approach: PostgreSQL `LISTEN/NOTIFY` on `inventory_events` channel ensures all instances receive updates without shared memory state.
  - Health metrics log when lock is held to aid troubleshooting.

## Next Actions

- Confirm stakeholders accept ledger + snapshot model, SSE transport, and advisory lock strategy.
- Once approved, proceed with database migration design (Implementation Plan Step 2) using the decisions above.
