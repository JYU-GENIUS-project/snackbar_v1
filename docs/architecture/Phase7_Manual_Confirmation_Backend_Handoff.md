<!-- markdownlint-disable MD013 -->
# Phase 7 Backend Handoff - Manual Confirmation Contract

## Purpose

This document is the Phase 4 handoff artifact for Issue #24. It translates the completed Phase 6.5 kiosk UX into a concrete backend contract for Phase 7 so transaction confirmation, audit logging, inventory side effects, and admin reconciliation can be implemented against the current server codebase without re-deciding the API surface.

## Source Alignment

- [docs/architecture/Phase6_5_Manual_Confirmation_UX_Prerequisites_Implementation_Plan.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Prerequisites_Implementation_Plan.md)
- [docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md)
- [docs/architecture/manual_payment_confirmation_plan.md](docs/architecture/manual_payment_confirmation_plan.md)
- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md)
- [server/README.md](server/README.md)
- [server/src/routes/transactions.ts](server/src/routes/transactions.ts)
- [server/src/services/transactionService.ts](server/src/services/transactionService.ts)
- [server/src/services/auditService.ts](server/src/services/auditService.ts)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md)
- [tests/acceptance/customer_payment_checkout.robot](tests/acceptance/customer_payment_checkout.robot)

## Current Backend Baseline

### Implemented today

The current server already has a usable transaction creation baseline:

- `POST /api/transactions` exists in [server/src/routes/transactions.ts](server/src/routes/transactions.ts)
- `transactionService.createTransaction(...)` exists in [server/src/services/transactionService.ts](server/src/services/transactionService.ts)
- the persistence layer already supports these payment statuses:
  - `PENDING`
  - `COMPLETED`
  - `FAILED`
  - `PAYMENT_UNCERTAIN`
- transaction rows already persist:
  - `payment_method`
  - `payment_status`
  - `confirmation_channel`
  - `confirmation_reference`
  - `confirmation_metadata`
- inventory deduction is already atomic with transaction creation and only applies when the status is `COMPLETED`

### Gaps still open for Phase 7

The current backend does **not** yet implement the full Phase 7 confirmation workflow promised by the roadmap and README:

- no `POST /api/transactions/:id/confirm` route exists yet
- no paginated transaction read endpoint exists yet
- no `GET /api/transactions/:id/audit` endpoint exists yet
- no confirmation timeout processor or service-unavailability handling exists yet
- [server/src/services/auditService.ts](server/src/services/auditService.ts) does not yet define transaction-specific audit action constants for confirmation outcomes
- [server/README.md](server/README.md) currently describes a richer confirmation API than the route implementation actually exposes

## Contract Decision

Phase 7 should build on the **existing** transaction row and status fields rather than introducing a second confirmation persistence model.

The kiosk flow should therefore be split into two backend operations:

1. create a pending transaction snapshot when checkout starts
2. finalize that transaction when the kiosk receives a manual confirmation outcome

This preserves the Phase 6.5 UX contract while keeping inventory deduction, audit writes, and reconciliation attached to one transaction record.

## Status Model

### Canonical status progression

Use this status model for Phase 7:

| Stage | Status | Meaning | Inventory |
| --- | --- | --- | --- |
| Initial checkout snapshot | `PENDING` | Checkout started, awaiting kiosk-side confirmation | Not deducted |
| Successful kiosk confirmation | `COMPLETED` | Payment confirmed and accepted | Deduct immediately |
| Customer failure / decline / timeout | `FAILED` | Payment not confirmed in time or explicitly failed | Not deducted |
| Processor/audit ambiguity | `PAYMENT_UNCERTAIN` | Customer may have been charged but durable confirmation is incomplete | Not deducted |

### Timeout decision

The current transaction service does not define `TIMEOUT` or `ABANDONED` as separate persisted statuses. To avoid unnecessary schema churn in Phase 7:

- persist timeout as `FAILED`
- include `reason: "timeout"` inside confirmation metadata and audit payloads
- reserve any future `ABANDONED` or archival status for later migrations if product owners explicitly require it

This keeps the implementation aligned with the existing enum support while still satisfying FR-3.5.1.

## API Contract for Phase 7

### 1. Create pending checkout transaction

#### Create route

- `POST /api/transactions`

#### Create usage rule

The kiosk should call this endpoint when the manual confirmation modal becomes ready, not after the payment is already resolved.

#### Create request body

```json
{
  "items": [
    { "productId": "uuid", "quantity": 2 }
  ],
  "paymentStatus": "PENDING",
  "paymentMethod": "manual",
  "confirmationChannel": "kiosk",
  "confirmationReference": "CONF-20260309-ABCD",
  "confirmationMetadata": {
    "kioskSessionId": "session-uuid",
    "cartTotal": 5.0,
    "basketHash": "sha256-or-equivalent",
    "promptShownAt": "2026-03-09T12:00:00.000Z"
  }
}
```

#### Create response shape

```json
{
  "success": true,
  "message": "Transaction recorded successfully",
  "data": {
    "transaction": {
      "id": "uuid",
      "transactionNumber": "TXN-...",
      "paymentStatus": "PENDING",
      "confirmationReference": "CONF-20260309-ABCD"
    },
    "confirmationTimeoutSeconds": 60,
    "inventoryApplied": false
  }
}
```

#### Create implementation note

The current service already supports `PENDING`; Phase 7 should normalize the response DTO so the client does not rely on raw database column names.

### 2. Finalize manual confirmation

#### Confirm route

- `POST /api/transactions/:id/confirm`

#### Confirm purpose

Finalize an existing `PENDING` transaction using the kiosk-declared outcome.

#### Confirm request body

```json
{
  "declaredOutcome": "COMPLETED",
  "declaredTender": "mobile_app",
  "confirmationChannel": "kiosk",
  "confirmationReference": "CONF-20260309-ABCD",
  "confirmationMetadata": {
    "kioskSessionId": "session-uuid",
    "confirmedAt": "2026-03-09T12:00:30.000Z",
    "clientState": "success",
    "notes": null,
    "attendantCode": null
  }
}
```

**Allowed `declaredOutcome` values**

- `COMPLETED`
- `FAILED`
- `PAYMENT_UNCERTAIN`

#### Confirm behavior by outcome

- `COMPLETED`
  - update transaction from `PENDING` to `COMPLETED`
  - persist confirmation timestamp and tender metadata
  - deduct inventory atomically
  - create success audit log entry
- `FAILED`
  - update transaction from `PENDING` to `FAILED`
  - preserve cart-related evidence and failure reason
  - do **not** deduct inventory
  - create failure audit log entry
- `PAYMENT_UNCERTAIN`
  - update transaction from `PENDING` to `PAYMENT_UNCERTAIN`
  - do **not** deduct inventory
  - create uncertain-payment audit log entry
  - trigger admin follow-up workflow/notification

### 3. Transaction list for admin follow-up

#### List route

- `GET /api/transactions?status=PENDING|FAILED|PAYMENT_UNCERTAIN|COMPLETED&page=1&pageSize=25`

#### List purpose

Provide the admin portal with a paginated queue for failed and uncertain confirmations.

#### List filters

- status
- date range
- transaction number/reference
- kiosk session ID

### 4. Audit trail for reconciliation

#### Audit route

- `GET /api/transactions/:id/audit`

#### Audit purpose

Return the confirmation and reconciliation trail used by FR-3.3 and FR-3.5.2.

#### Audit response fields

- transaction identifiers
- confirmation reference
- event timestamps
- outcome transitions
- actor/channel (`kiosk`, `staff`, `system`)
- stored metadata snapshots

## Frontend Outcome Mapping

Phase 7 backend responses must map cleanly to the Phase 6.5 kiosk states already implemented in [client/src/components/KioskApp.tsx](client/src/components/KioskApp.tsx).

| Kiosk UI state | Backend result | Transaction status | Inventory |
| --- | --- | --- | --- |
| `payment-success-message` | HTTP 200 + confirmed payload | `COMPLETED` | Deducted |
| `payment-error-message` | HTTP 409/422 style failure payload | `FAILED` | Not deducted |
| `payment-uncertain-message` | HTTP 202 or explicit uncertain payload | `PAYMENT_UNCERTAIN` | Not deducted |
| confirmation unavailable / checkout disabled | HTTP 503 or health failure | unchanged or `FAILED` with service metadata | Not deducted |

### Error contract

Phase 7 should standardize these machine-readable error codes:

- `confirmation_persist_failed`
- `confirmation_timeout`
- `confirmation_unavailable`
- `transaction_not_pending`
- `transaction_not_found`

The kiosk can map these codes to the already-defined Phase 6.5 messages and retry rules.

## Audit Contract

### Required transaction audit actions

Add explicit audit actions to [server/src/services/auditService.ts](server/src/services/auditService.ts):

- `TRANSACTION_CREATED`
- `TRANSACTION_CONFIRMATION_ATTEMPTED`
- `TRANSACTION_CONFIRMED`
- `TRANSACTION_FAILED`
- `TRANSACTION_MARKED_UNCERTAIN`
- `TRANSACTION_RECONCILED_CONFIRMED`
- `TRANSACTION_RECONCILED_REFUNDED`
- `CONFIRMATION_SERVICE_UNAVAILABLE`

### Required entity types

Add at least:

- `TRANSACTION`
- `CONFIRMATION_SERVICE`

### Minimum audit payload fields

Every confirmation-related audit event should retain:

- transaction ID
- transaction number
- kiosk session ID
- confirmation reference
- total amount snapshot
- declared payment method / tender
- resulting status
- outcome reason (`success`, `timeout`, `declined`, `persist_failed`, `service_unavailable`)
- actor/channel metadata

## Required Server Implementation Surfaces

### [server/src/routes/transactions.ts](server/src/routes/transactions.ts)

Phase 7 should:

- keep `POST /api/transactions` for creating pending transaction snapshots
- add `POST /api/transactions/:id/confirm`
- add `GET /api/transactions`
- add `GET /api/transactions/:id/audit`
- tighten validation so kiosk DTOs use explicit enums rather than free-form status strings

### [server/src/services/transactionService.ts](server/src/services/transactionService.ts)

Phase 7 should split the current create-only flow into service methods such as:

- `createPendingTransaction(...)`
- `confirmTransaction(...)`
- `listTransactions(...)`
- `getTransactionAudit(...)`
- `reconcileTransaction(...)` for later admin flows

The `confirmTransaction(...)` path must own the atomic write boundary for:

- transaction status update
- confirmation metadata persistence
- inventory deduction for `COMPLETED`
- audit write scheduling/dispatch

### [server/src/services/auditService.ts](server/src/services/auditService.ts)

Phase 7 should extend the audit service so transaction confirmation events become first-class audit records rather than ad hoc log strings.

### Inventory touchpoints

Inventory should remain coordinated through [server/src/services/transactionService.ts](server/src/services/transactionService.ts) and [server/src/services/inventoryService.ts](server/src/services/inventoryService.ts) so only confirmed completions deduct stock.

## Test Targets for Phase 7

Phase 7 implementation should add or update tests covering:

- pending transaction creation with manual confirmation metadata
- successful confirmation to `COMPLETED`
- timeout-to-`FAILED` with `reason=timeout`
- `PAYMENT_UNCERTAIN` fallback when confirmation persistence is ambiguous
- confirmation-service unavailability (`503` / downtime logging)
- admin reconciliation transitions from `PAYMENT_UNCERTAIN`
- audit payload integrity for FR-3.3

## Completion Statement

Phase 4 is complete when this handoff document is the authoritative backend contract for Phase 7 manual confirmation work and the implementation plan points to it as the recorded backend dependency artifact.

Completed on 2026-03-09 for Issue #24.

<!-- markdownlint-enable MD013 -->
