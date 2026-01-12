# Phase 4 Implementation Plan - Inventory & Alerting Backbone

## Source References

- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md) (phase 4 scope and dependencies)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md) (Inventory API, Email Service, data flow)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md) (FR-8.1 to FR-8.5, FR-11.1 to FR-11.2.1)
- [reqeng/user_stories.md](reqeng/user_stories.md) (US-032 to US-038, US-067 traceability)
- [tests/acceptance/admin_inventory_management.robot](tests/acceptance/admin_inventory_management.robot) (US-032 to US-038)
- [tests/acceptance/system_integration_communication.robot](tests/acceptance/system_integration_communication.robot) (US-067)

## Acceptance Coverage

| Workstream | Acceptance Tests | Related Requirements |
| --- | --- | --- |
| Inventory toggle, UI banners, kiosk warning | admin_inventory_management.robot - US-032 | FR-8.1, FR-1.5, FR-11.1 |
| Inventory table, manual stock updates | admin_inventory_management.robot - US-033, US-034 | FR-8.2 |
| Threshold configuration and low-stock highlighting | admin_inventory_management.robot - US-035 | FR-8.2, FR-8.5 |
| Low-stock email notifications and retries | admin_inventory_management.robot - US-036; system_integration_communication.robot - US-067 | FR-8.4, FR-11.2, FR-11.2.1 |
| Inventory discrepancy surfacing and reconciliation | admin_inventory_management.robot - US-037, US-038 | FR-8.2.1, FR-8.2.3 |
| Notification retry fallbacks and logging | system_integration_communication.robot - US-067 | FR-11.2.1 |

## Constraints and Assumptions

- Must reuse Docker, Express, PostgreSQL, and SMTP architecture established in prior phases.
- Inventory tracking toggle must preserve historical stock values when disabled, per FR-8.1.3.
- Stock quantities must remain non-negative; discrepancies are recorded separately rather than allowing negative values.
- Notification retries follow FR-11.2.1 (1 min, 5 min, 15 min) even though current Robot script expects 30, 60, 120 seconds; plan includes aligning the suite to the requirement or introducing a configurable schedule.
- Real-time inventory banners must leverage SSE or WebSocket as called out in Implementation_Roadmap.md and the C4 data flow diagram.

## Sequential Implementation Plan

1. **Architecture and Domain Alignment**
   - Review existing Express route scaffolding and service abstractions in server/src to design inventory service modules and notification drivers.
   - Produce a concise technical design note covering inventory data model choices (stock ledger versus inline counters), event propagation channel (SSE versus WebSocket), and retry mechanism, and circulate for approval.
   - Confirm SMTP provider credentials strategy via system_config (FR-11.1) and validate PM2 clustering implications for background workers.

2. **Database and Migration Foundations**
   - Author migration 004 to:
   - Retain products.stock_quantity CHECK constraint to prevent negative values; enforce zero floor inside mutation services.
   - Introduce inventory_ledger table capturing product_id, delta, source (purchase, manual_adjustment, reconciliation), reason, admin_id, transaction_id, and resulting discrepancy balance to support reconciliation while keeping stock non-negative.
   - Create inventory_snapshots or a materialized view for admin inventory table aggregations (current_stock, low_stock_flag, discrepancy_flag).
     - Add system_config keys for inventory_tracking_enabled (default true) and notification email list if not already present.
     - Create email_notification_log table to store notification attempts, outcomes, and retry counts for FR-11.2.1 compliance.
   - Update init-db scripts and seed data to reflect new structures while keeping previous migrations idempotent.

3. **Server Domain Services**
   - Implement InventoryRepository within server/src/services leveraging node-postgres with transactional helpers for stock adjustments and ledger inserts.
   - Build InventoryService API handling:
     - Toggle enable or disable: persist in system_config, preserve quantities (FR-8.1.3).
     - Retrieval of inventory summary with filtering and sorting (FR-8.2).
     - Manual update endpoint with audit log emission and ledger entry (US-034, FR-8.2).
   - Adjustment endpoint capturing reason text, linking to admin user, clearing discrepancy flags without permitting sub-zero stock (US-038).
     - Discrepancy report endpoint exposing negative stock and uncertain payments (ties to FR-8.2.4 for future phases).
   - Extend existing product purchase flow (likely in transactions service) to deduct stock via InventoryService when tracking enabled, clamping results at zero and logging any shortfall as a discrepancy event (FR-8.3).
   - Ensure all inventory mutations emit domain events (for example, via EventEmitter) consumed by notification and real-time modules.

4. **Notification Pipeline and Retry Logic**
   - Integrate SMTP client (Nodemailer) wiring environment variables defined in server/.env schema.
   - Implement NotificationService with queue abstraction that:
     - Persists pending notifications in email_notification_log.
     - Retries failed sends using FR-11.2.1 intervals (configurable constants) with exponential backoff scheduler (setTimeout or cron worker).
     - Exposes metrics for success rate and unresolved failures (needed for US-067 logging assertions).
   - Hook InventoryService low-stock detection to NotificationService, ensuring single alert per threshold breach until restock (FR-8.4.2).
   - Provide admin endpoint to fetch notification logs for observability and Robot verifications.

5. **Real-Time Event Propagation**
   - Add SSE endpoint /api/inventory/events (or WebSocket channel) broadcasting stock changes, discrepancy raises/clears, and tracking toggle updates.
   - Implement server heartbeat with retry or backoff to avoid PM2 worker duplication; potentially leverage shared Redis or in-memory guard.
   - Update kiosk and admin clients to subscribe to events, showing banners and immediate table refresh (Implementation_Roadmap step 27).

6. **Admin Portal UX Enhancements**
   - Replace mock inventory data in client/src/components/ProductManager.jsx with API-backed hooks (new useInventory hook in hooks/useInventory.js).
    - Implement UI states per acceptance tests:
     - Inventory toggle banner and messaging (US-032).
       - Sortable inventory table with low-stock and discrepancy highlighting using explicit flags instead of negative values (US-033, US-037).
       - Stock update and adjustment dialogs integrated with API, showing optimistic updates and error handling without displaying negative quantities (US-034, US-038).
     - Threshold configuration inputs tied to product data, with validations (FR-8.5, US-035).
   - Introduce audit log capturing (integration with existing audit viewer) to reflect inventory actions in UI feedback.

7. **Kiosk UI Updates**
   - Ensure kiosk React app consumes stock availability flags from feed endpoint, showing out-of-stock or warning states (FR-1.6, FR-8.3).
   - Display checkout warning banner when inventory tracking disabled (FR-1.5, US-032), fed via configuration endpoint or SSE event.
   - Add offline fallback messaging or caching adjustments to respect new stock data.

8. **System Configuration Surface**
   - Expand admin settings section to edit notification email list and inventory toggle with live validation (FR-11.1, FR-11.1.3).
   - Persist settings to system_config via new /api/config endpoints or extend existing configuration route.
   - Provide immediate feedback (within 10 seconds) that settings took effect, aligning with FR-11.1.2, possibly using SSE confirmations.

9. **Testing Strategy**
   - Unit tests: Inventory service, notification retry logic, SSE broadcaster.
   - Integration tests: API endpoints for stock updates, toggles, and email logging (using supertest and SMTP stub).
   - Contract tests: Ensure kiosk feed includes inventory fields, maintain backward compatibility for future phases.
   - Acceptance: Run admin_inventory_management.robot and system_integration_communication.robot suites in CI after backend and frontend updates.
   - Adjust system_integration_communication.robot retry timing to accept configuration-driven intervals or update expected schedule to FR-11.2.1.

10. **Deployment and Rollout**
    - Apply migrations in staging; backfill ledger entries from existing product stock quantities (default zero delta entry).
    - Rotate environment variables to include SMTP credentials and notification email list.
    - Deploy API and clients; verify SSE connections through nginx proxy configuration (ensure /api/inventory/events proxied with keepalive).

- Monitor logs for inventory adjustments, discrepancy events, and email retries post-release; confirm no duplicate alerts.

## Risks and Follow-Ups

- **Retry interval mismatch**: Decide whether to update Robot suite expectations or implement configurable retry schedule defaulting to FR-11.2.1 values.
- **PM2 clustering and background jobs**: Need coordination to prevent duplicate retry workers; may require distributed lock or single worker process.
- **Inventory discrepancy auditing**: Ensure audit trail schema can store delta and reason; add indexes for discrepancy queries.
- **Real-time channel scaling**: If SSE chosen, confirm compatibility with nginx buffering and consider upgrade path to WebSocket if future requirements demand bidirectional messaging.
