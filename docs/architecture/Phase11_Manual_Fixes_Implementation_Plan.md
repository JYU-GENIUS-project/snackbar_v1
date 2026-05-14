<!-- markdownlint-disable MD013 -->
# Phase 11 Implementation Plan - Manual Fixes for Persistent Edits

## Purpose

Make the application customer ready by ensuring that all admin and kiosk edits are saved to PostgreSQL and load correctly after refresh or navigation, while staying within the PERN architecture, REST API boundaries, and existing acceptance contracts.

## Source Alignment

- docs/architecture/C4_Architecture.md
- docs/architecture/Implementation_Roadmap.md (Phase 6-10 constraints)
- docs/architecture/Phase4_Inventory_Technical_Design.md
- docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md
- docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md
- docs/architecture/manual_payment_confirmation_plan.md
- docs/TypeScript_Guidelines.md

## Scope

- Admin edits: products, media, categories, inventory, configuration, and transaction reconciliation.
- Kiosk edits: cart, checkout, and manual confirmation outcomes.
- Read-after-write correctness and persistence across refreshes for all supported UI surfaces.
- Audit logging and reconciliation traceability for changes that affect inventory or payments.

## Non-Goals

- Changing the architecture or adding new external payment providers.
- Replacing existing tech stack choices or rewriting UI flows not related to persistence.

## Architectural Guardrails

- Preserve the PERN boundaries and REST API surface defined in C4 architecture.
- Keep transaction status progression and confirmation API contract defined in the Phase 7 handoff.
- Use shared DTOs from packages/shared-types and strict typing rules from docs/TypeScript_Guidelines.md.
- Keep database writes transactional when a change impacts inventory, confirmation state, or audit logs.

## Progress Tracker

- [x] Phase 1 - Persistence Audit and Gap Map
- [ ] Phase 2 - Database Integrity and Transactional Writes
- [ ] Phase 3 - API Read-After-Write and Cache Invalidation
- [ ] Phase 4 - UI Synchronization and Reload Safety
- [ ] Phase 5 - Reconciliation and Audit Review
- [ ] Phase 6 - Regression and Release Validation

## Sequential Implementation Plan

### Phase 1 - Persistence Audit and Gap Map

Goal: identify any read or write path where a UI edit does not persist or does not reload correctly.

Subtasks:

1. Inventory and product edits: verify API writes, response payloads, and subsequent GET responses match (products, media, categories, inventory).
2. Configuration edits: verify system config writes (operating hours, maintenance, notifications) and confirm read-after-write in admin UI.
3. Transaction and confirmation edits: verify transaction creation, confirmation updates, and reconciliation updates persist and reload.
4. Audit coverage: verify that each edit that mutates data creates an audit entry when required by the roadmap and handoff docs.

Acceptance linkage:

- admin_authentication_products.robot (US-023 to US-028)
- admin_category_management.robot (US-029 to US-031)
- admin_inventory_management.robot (US-032 to US-038)
- admin_system_configuration.robot (US-048 to US-052)
- customer_payment_checkout.robot (US-011 to US-015)
- admin_transactions_statistics.robot (US-039 to US-047)

Status: Completed 2026-05-14

Phase 1 Findings (Gap Map):

| Area | Status | Notes |
| --- | --- | --- |
| Admin product edits | Gap | Admin products query polls every 5s, which can reset in-progress edits. Use pause/slow polling and decouple form state. |
| Admin product listing | Gap | Refetch interval is hardcoded in the products hook; needs edit-aware override. |
| Admin config edits | OK | Config routes persist changes and return updated payloads for reload. |
| Inventory edits | OK | Inventory routes update and return snapshots; no refresh gap found in server routes. |
| Transaction confirmation | OK | Confirm route exists and returns confirmation payload; ensure UI uses server response (Phase 4). |

### Phase 2 - Database Integrity and Transactional Writes

Goal: ensure writes that affect inventory, confirmations, or reconciliation are atomic and consistent.

Subtasks:

1. Confirm transaction write flow aligns with Phase 7 handoff: create PENDING, confirm via POST /api/transactions/:id/confirm, update status and metadata in one transaction.
2. Ensure inventory deductions for completed transactions and reconciliation actions are part of the same database transaction as the status update.
3. Validate foreign keys and constraints for product, category, and inventory updates, and map errors to API validation responses.
4. Ensure audit rows are written within the same transaction as the edit they describe.

Acceptance linkage:

- customer_payment_checkout.robot (US-012 to US-015)
- admin_transactions_statistics.robot (US-040 to US-041)
- system_technical_security.robot (US-059 to US-063)
- system_integration_communication.robot (US-064 to US-068)

### Phase 3 - API Read-After-Write and Cache Invalidation

Goal: guarantee that after any successful edit, subsequent reads show the new data in both admin and kiosk views.

Subtasks:

1. Standardize API responses to return the updated resource or minimal identifiers required for refetch.
2. Ensure feed endpoints used by the kiosk invalidate any cached data after product or inventory edits.
3. Add regression checks for list endpoints (pagination, filters) to confirm updated data appears in the next fetch.
4. Align DTO shapes between client and server to prevent dropped fields on reload.

Acceptance linkage:

- admin_authentication_products.robot (US-023 to US-028)
- admin_category_management.robot (US-029 to US-031)
- admin_inventory_management.robot (US-032 to US-038)
- customer_product_browsing.robot (US-001 to US-005)
- admin_transactions_statistics.robot (US-039)

### Phase 4 - UI Synchronization and Reload Safety

Goal: ensure client state and server state remain consistent after edits and across refreshes.

Subtasks:

1. Admin UI: confirm all edit forms use consistent mutation flows and reload the updated data after success.
2. Pause product polling while edit forms are open to prevent refetch resets; resume polling after save/cancel.
3. Increase or disable the admin products refetch interval when editing to avoid short refresh loops.
4. Decouple edit form state from query data so refetches do not overwrite in-progress edits.
5. Kiosk UI: confirm cart and checkout state rehydrates from server session and reflects inventory changes after refresh.
6. Confirmation UI: ensure manual confirmation outcomes use server results to drive success/failure/uncertain states and preserve references.
7. Provide explicit empty and error states when a persisted item is missing or deleted to avoid silent failures.

Acceptance linkage:

- customer_shopping_cart.robot (US-006 to US-010)
- customer_payment_checkout.robot (US-011 to US-015)
- admin_authentication_products.robot (US-023 to US-028)
- admin_inventory_management.robot (US-032 to US-038)
- admin_transactions_statistics.robot (US-039 to US-041)

### Phase 5 - Reconciliation and Audit Review

Goal: make sure reconciliation edits and audit trails load correctly for admin review workflows.

Subtasks:

1. Implement or validate transaction list and detail views used for reconciliation with pagination and filters.
2. Ensure reconciliation edits write audit records with admin identity, notes, and timestamps.
3. Confirm uncertain payments move out of the uncertain list after reconciliation and persist on reload.
4. Align reconciliation statuses with the expected acceptance wording (COMPLETED, REFUNDED, PAYMENT_UNCERTAIN).

Acceptance linkage:

- admin_transactions_statistics.robot (US-039 to US-041)
- customer_payment_checkout.robot (US-015 and US-015-Edge)

### Phase 6 - Regression and Release Validation

Goal: prove persistence fixes do not regress performance, security, or monitoring requirements.

Subtasks:

1. Run acceptance suites covering admin edits and kiosk checkout workflows.
2. Validate error logging for failed writes and surface errors in admin monitoring UI.
3. Verify persistence changes do not degrade response times for kiosk checkout or admin pages.

Acceptance linkage:

- admin_monitoring_troubleshooting.robot (US-053 to US-058)
- system_technical_security.robot (US-059 to US-063)
- system_integration_communication.robot (US-064 to US-068)
- customer_payment_checkout.robot (US-011 to US-015)

## Deliverables

- Persistence gap map with affected endpoints and UI surfaces.
- Verified transactional write paths for confirmation, inventory, and reconciliation.
- Read-after-write validation for admin and kiosk flows.
- Updated acceptance evidence with the suites listed above.
