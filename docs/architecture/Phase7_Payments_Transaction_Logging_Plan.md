<!-- markdownlint-disable MD013 -->
# Phase 7 Implementation Plan - Manual Payment Confirmation & Transaction Logging

## Purpose

Deliver kiosk-driven manual payment confirmation with reliable transaction logging and reconciliation for Issue #9, while strictly adhering to the Phase 6.5 UX contract and the Phase 7 backend handoff contract already defined in the workspace.

## Progress Tracker

- [x] Phase 0 - Readiness & Contract Verification (completed 2026-03-10)
- [x] Phase 1 - Transaction Confirmation API Surface (Backend) (completed 2026-03-10)
- [x] Phase 2 - Confirmation Persistence & Inventory Side Effects (completed 2026-03-10)
- [x] Phase 3 - Audit Logging & Retry/Backoff (completed 2026-03-10)
- [x] Phase 4 - Downtime Handling & Customer Guidance (completed 2026-03-10)
- [x] Phase 5 - Admin Reconciliation & Transaction Queries (completed 2026-03-10)
- [x] Phase 6 - Kiosk Integration With Confirmation API (completed 2026-03-10)
- [ ] Phase 7 - Observability, Metrics, and Monitoring Hooks
- [ ] Phase 8 - Validation & Regression Coverage

## Source of Truth (Must Not Diverge)

- [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md)
- [docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md)
- [docs/architecture/manual_payment_confirmation_plan.md](docs/architecture/manual_payment_confirmation_plan.md)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md)
- [tests/acceptance/customer_payment_checkout.robot](tests/acceptance/customer_payment_checkout.robot)
- [tests/acceptance/system_technical_security.robot](tests/acceptance/system_technical_security.robot)
- [tests/acceptance/system_integration_communication.robot](tests/acceptance/system_integration_communication.robot)

## Scope Summary

### In scope

- Kiosk manual confirmation workflow integration with backend confirmation API (no UX redesign).
- Transaction status transitions: $PENDING \rightarrow COMPLETED | FAILED | PAYMENT\_UNCERTAIN$.
- Confirmation persistence, audit logging, and inventory deduction rules.
- Admin-facing reconciliation support and audit/transaction list endpoints.
- Structured logs/metrics for confirmation attempts and reconciliation events.
- Retry/backoff behavior for audit writes and graceful confirmation-service downtime handling.

### Out of scope

- New payment provider integration (explicitly excluded).
- Any schema changes that introduce new payment statuses beyond the existing enum.
- Any changes to Phase 6.5 UX selectors, copy, or timer overlap rules.

## Architectural Guardrails

- Remain within the PERN stack and REST boundaries defined in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
- Use the existing transaction persistence model and status enum documented in [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md).
- Keep manual confirmation kiosk-driven, with no third-party callbacks (SRS FR-3.x).
- Inventory deduction happens only for `COMPLETED` confirmations (FR-3.4, handoff contract).
- Timeouts persist as `FAILED` with `reason: "timeout"` in metadata (handoff contract).

## Acceptance Criteria & Test Mapping (Issue #9)

| Issue Requirement | Acceptance Tests |
| --- | --- |
| Manual confirmation modal + accessibility + timer overlap | customer_payment_checkout.robot (US-011–US-015) |
| Persist confirmation with audit metadata | system_technical_security.robot (US-059), system_integration_communication.robot (US-068) |
| PAYMENT_UNCERTAIN + admin reconciliation | customer_payment_checkout.robot (US-015, US-015-Edge) |
| Confirmation downtime handling + retry/backoff | system_integration_communication.robot (US-065, US-066) |
| Structured logging/monitoring hooks | system_integration_communication.robot (US-068) |

## Sequential Implementation Plan

### Phase 0 - Readiness & Contract Verification

**Goal:** Confirm prerequisites and prevent contract drift.

**Status:** Completed 2026-03-10

#### Phase 0 Tasks

1. Verify Phase 6.5 UX contract surfaces remain unchanged (IDs, copy, timers).
2. Confirm backend contract in [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md) is treated as the API source of truth.
3. Confirm dependencies from Issue #24 are complete (UX prerequisites already delivered).

#### Phase 0 Completion evidence

- UX selectors, copy, and timer overlap are defined in [docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md) and remain unchanged.
- Backend confirmation contract is documented in [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md) and referenced as the API source of truth.
- Phase 6.5 prerequisite completion is recorded in [docs/architecture/Phase6_5_Manual_Confirmation_UX_Prerequisites_Implementation_Plan.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Prerequisites_Implementation_Plan.md).

#### Phase 0 Acceptance linkage

- Issue #9 constraints: Phase 6 UX prerequisites complete.
- FR-3.1, FR-3.2, FR-3.5.1.

#### Phase 0 Tests

- customer_payment_checkout.robot (US-011, US-012) for prompt presence and CTA prominence.

---

### Phase 1 - Transaction Confirmation API Surface (Backend)

**Goal:** Implement the Phase 7 confirmation API surface exactly as defined by the backend handoff.

**Status:** Completed 2026-03-10

#### Phase 1 Tasks

1. Add `POST /api/transactions/:id/confirm` for kiosk confirmation outcomes.
2. Add `GET /api/transactions` with pagination and status filters for admin reconciliation queues.
3. Add `GET /api/transactions/:id/audit` to expose audit history for reconciliation.
4. Normalize response DTOs for kiosk and admin clients (no direct DB column leakage).
5. Enforce strict enum validation for `declaredOutcome`, `confirmationChannel`, and `paymentStatus`.

#### Phase 1 Acceptance linkage

- FR-3.3, FR-3.4, FR-3.5, FR-3.6.
- Issue #9 checklist items 2, 3, 5.

#### Phase 1 Tests

- system_technical_security.robot (US-059) for persistence timing and data completeness.
- system_integration_communication.robot (US-068) for detailed transaction logging.

#### Phase 1 Completion evidence

- Added transaction confirmation endpoint: [server/src/routes/transactions.ts](server/src/routes/transactions.ts)
- Added transaction listing and audit endpoints: [server/src/routes/transactions.ts](server/src/routes/transactions.ts)
- Added service scaffolding for confirmation, list filters, and audit retrieval: [server/src/services/transactionService.ts](server/src/services/transactionService.ts)

---

### Phase 2 - Confirmation Persistence & Inventory Side Effects

**Goal:** Persist manual confirmation outcomes and apply inventory rules atomically.

**Status:** Completed 2026-03-10

#### Phase 2 Tasks

1. Implement `confirmTransaction(...)` in transaction service with atomic boundary:
   - Status update
   - Confirmation metadata persistence
   - Inventory deduction for `COMPLETED` only
   - Audit write scheduling
2. Persist timeout as `FAILED` with metadata `{ reason: "timeout" }`.
3. Persist ambiguous outcomes as `PAYMENT_UNCERTAIN` without inventory changes.

#### Phase 2 Acceptance linkage

- FR-3.3, FR-3.4, FR-3.5, FR-3.5.1, FR-3.5.2.
- Issue #9 checklist items 2, 3.

#### Phase 2 Tests

- customer_payment_checkout.robot (US-012–US-015).
- system_integration_communication.robot (US-068, status transition logging).

#### Phase 2 Completion evidence

- Implemented confirmation persistence with inventory side effects in [server/src/services/transactionService.ts](server/src/services/transactionService.ts)

---

### Phase 3 - Audit Logging & Retry/Backoff

**Goal:** Ensure confirmation audit events are durable and resilient to transient failures.

**Status:** Completed 2026-03-10

#### Phase 3 Tasks

1. Extend `auditService` with required confirmation actions and entity types:
   - `TRANSACTION_CONFIRMATION_ATTEMPTED`, `TRANSACTION_CONFIRMED`, `TRANSACTION_FAILED`, `TRANSACTION_MARKED_UNCERTAIN`, `CONFIRMATION_SERVICE_UNAVAILABLE`, etc.
2. Implement retry logic for audit writes with exponential backoff (1s, 2s, 4s), max 3 retries.
3. Persist retry attempt counts, timestamps, and final outcome for observability.

#### Phase 3 Acceptance linkage

- FR-3.3, FR-3.6.
- Issue #9 checklist item 5.

#### Phase 3 Tests

- system_integration_communication.robot (US-065) retry/backoff logic.
- system_integration_communication.robot (US-068) audit trail detail requirements.

#### Phase 3 Completion evidence

- Added retryable audit logging helpers and confirmation actions in [server/src/services/auditService.ts](server/src/services/auditService.ts)
- Added confirmation audit write/retry handling in [server/src/services/transactionService.ts](server/src/services/transactionService.ts)

---

### Phase 4 - Downtime Handling & Customer Guidance

**Goal:** Keep kiosk usable when confirmation persistence is unavailable and provide clear guidance.

**Status:** Completed 2026-03-10

#### Phase 4 Tasks

1. Detect confirmation persistence failures and return standardized error codes (`confirmation_unavailable`, `confirmation_persist_failed`).
2. Surface kiosk error state that matches the Phase 6.5 contract and preserves cart state.
3. Log confirmation unavailability events and trigger admin notifications per FR-3.6.

#### Phase 4 Acceptance linkage

- FR-3.6, FR-3.5.
- Issue #9 checklist item 3.

#### Phase 4 Tests

- system_integration_communication.robot (US-066) downtime handling.
- customer_payment_checkout.robot (US-014) for retry and cart preservation.

#### Phase 4 Completion evidence

- Added standardized confirmation error codes and 503 handling in [server/src/services/transactionService.ts](server/src/services/transactionService.ts)

---

### Phase 5 - Admin Reconciliation & Transaction Queries

**Goal:** Provide admin reconciliation flows for `PAYMENT_UNCERTAIN` outcomes.

**Status:** Completed 2026-03-10

#### Phase 5 Tasks

1. Provide transaction list filtering by `PAYMENT_UNCERTAIN`, `FAILED`, `PENDING`, `COMPLETED`.
2. Provide audit detail retrieval for reconciliation.
3. Implement reconciliation actions (confirmed/refunded) and update inventory accordingly.
4. Ensure reconciliation writes audit events with actor metadata.

#### Phase 5 Acceptance linkage

- FR-3.5.2, FR-8.2.4 (reconciliation), audit requirements.
- Issue #9 checklist item 3.

#### Phase 5 Tests

- customer_payment_checkout.robot (US-015-Edge) admin reconciliation scenarios.
- system_integration_communication.robot (US-068) status transition logging.

#### Phase 5 Completion evidence

- Added reconciliation endpoint and auth guard in [server/src/routes/transactions.ts](server/src/routes/transactions.ts)
- Added reconciliation processing and audit logging in [server/src/services/transactionService.ts](server/src/services/transactionService.ts)

---

### Phase 6 - Kiosk Integration With Confirmation API

**Goal:** Wire the kiosk UX states to the confirmation API without altering the Phase 6.5 UX contract.

**Status:** Completed 2026-03-10

#### Phase 6 Tasks

1. On checkout: create a `PENDING` transaction (POST /api/transactions).
2. On confirm: call `POST /api/transactions/:id/confirm` and map outcomes to UI states:
   - `COMPLETED` → success message
   - `FAILED` → failure message with retry + cancel
   - `PAYMENT_UNCERTAIN` → uncertain message
3. Respect timer overlap and retry visibility as defined in the UX contract.

#### Phase 6 Acceptance linkage

- FR-3.1, FR-3.2, FR-3.4, FR-3.5, FR-3.5.1, FR-3.5.2.
- Issue #9 checklist items 1, 4.

#### Phase 6 Tests

- customer_payment_checkout.robot (US-011–US-015).

#### Phase 6 Completion evidence

- Added transaction creation + confirmation API wiring in [client/src/components/KioskApp.tsx](client/src/components/KioskApp.tsx)

---

### Phase 7 - Observability, Metrics, and Monitoring Hooks

**Goal:** Emit structured logs/metrics for confirmation attempts and reconciliation.

#### Phase 7 Tasks

1. Emit structured logs for confirmation attempts, retries, outcomes, and reconciliation results.
2. Include transaction ID, kiosk session ID, confirmation reference, outcome reason, and timing metrics.
3. Wire logs to existing monitoring hooks referenced in the roadmap (Phase 9 dependency).

#### Phase 7 Acceptance linkage

- FR-3.3, FR-3.6.
- Issue #9 checklist item 5.

#### Phase 7 Tests

- system_integration_communication.robot (US-068).

---

### Phase 8 - Validation & Regression Coverage

**Goal:** Validate performance, security, and acceptance coverage in the required suites.

#### Phase 8 Tasks

1. Ensure transaction persistence is within 1 second under normal and concurrent load.
2. Validate HTTPS/TLS usage for confirmation calls (per security requirements).
3. Run acceptance suites required by Issue #9.

#### Phase 8 Acceptance linkage

- FR-3.3, FR-3.6.
- Issue #9 checklist item 6.

#### Phase 8 Tests

- customer_payment_checkout.robot (US-011–US-015).
- system_technical_security.robot (US-059).
- system_integration_communication.robot (US-065, US-066, US-068).

## Deliverables Checklist

- Confirmation API endpoints implemented and documented.
- Transaction/audit logging expanded with explicit confirmation actions.
- Inventory deductions limited to `COMPLETED` outcomes.
- Admin reconciliation endpoints and audit visibility implemented.
- Structured logging and retry/backoff behavior in place.
- Acceptance suites pass for payment checkout, technical security, and integration communication.

<!-- markdownlint-enable MD013 -->
