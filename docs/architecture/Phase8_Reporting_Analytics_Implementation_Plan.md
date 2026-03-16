<!-- markdownlint-disable MD013 MD036 -->
# Phase 8 Implementation Plan - Reporting & Analytics

## Purpose

Deliver admin reporting, analytics, and exports for Issue #10 while staying aligned with the PERN architecture and the data/UX requirements in the SRS and acceptance suite.

## Source of Truth (Must Not Diverge)

- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md)
- [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md) (transaction status + reconciliation)
- [docs/architecture/Phase7_Payments_Transaction_Logging_Plan.md](docs/architecture/Phase7_Payments_Transaction_Logging_Plan.md)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md)
- [tests/acceptance/admin_transactions_statistics.robot](tests/acceptance/admin_transactions_statistics.robot)

## Scope Summary

### In scope

- Transaction history API with pagination, search, and multi-criteria filters.
- Uncertain payment reconciliation tooling with audit trail and inventory side effects.
- Analytics aggregation for popular products and revenue by period with <2s SLA.
- Admin dashboard charts/KPIs with preset and custom date ranges.
- CSV export (streaming response) respecting filters and performance targets.
- Retention policy visibility and archive/export support for 3-year policy and storage alerts.

### Out of scope

- JSON export (deferred per FR-10.3).
- Any change to core payment confirmation UX or status enums beyond SRS definitions.
- New non-admin reporting channels (email digests, external integrations).

## Progress Tracker

- [x] Phase 0 - Readiness & Contract Alignment (completed 2026-03-11)
- [x] Phase 1 - Data Model & Indexing for Reporting (completed 2026-03-11)
- [x] Phase 2 - Transaction History API + Search/Filter (completed 2026-03-11)
- [x] Phase 3 - Uncertain Payment Resolution & Audit Trail (completed 2026-03-11)
- [x] Phase 4 - Analytics Aggregations + KPIs (completed 2026-03-11)
- [x] Phase 5 - Admin Dashboard UI (Charts + Filters) (completed 2026-03-11)
- [x] Phase 6 - CSV Export + Retention/Storage UI (completed 2026-03-11)
- [x] Phase 7 - Performance Validation & Regression (completed 2026-03-16)

## Architectural Guardrails

- Remain within PERN stack and REST boundaries in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
- Use existing transaction persistence and status enum (includes `REFUNDED`) from SRS Section 8.1.3.
- Enforce admin authorization on all reporting endpoints (no kiosk access).
- Keep performance budgets: statistics queries <2s for 10k transactions (FR-10.1.3) and transaction history pagination at 50 per page (FR-9.4.1).
- Respect data privacy: no customer PII in transaction history (FR-9.2).

## Acceptance Criteria & Test Mapping (Issue #10)

| Requirement | Acceptance Tests |
| --- | --- |
| Transaction history with filtering/search, pagination | admin_transactions_statistics.robot (US-039, US-039-Edge, US-039-Comprehensive) |
| Uncertain payment list and detail | admin_transactions_statistics.robot (US-040, US-040-Edge, US-040-Comprehensive) |
| Manual reconciliation confirm/refund + notes validation | admin_transactions_statistics.robot (US-041, US-041-Edge, US-041-Boundary) |
| Retention policy + archive/export + storage alerts | admin_transactions_statistics.robot (US-042, US-042-Edge, US-042-Comprehensive) |
| Popular products + KPIs + export | admin_transactions_statistics.robot (US-043, US-043-Edge, US-043-Comprehensive) |
| Revenue charts day/week/month + interactivity | admin_transactions_statistics.robot (US-044, US-044-Edge, US-044-Comprehensive) |
| Date range presets + custom validation | admin_transactions_statistics.robot (US-045, US-045-Edge, US-045-Comprehensive) |
| CSV export with filters + large dataset SLA | admin_transactions_statistics.robot (US-046, US-046-Edge, US-046-Comprehensive) |
| Performance for stats + complex filters | admin_transactions_statistics.robot (US-047, US-047-Edge, US-047-Comprehensive) |

## Sequential Implementation Plan

### Phase 0 - Readiness & Contract Alignment

**Goal:** Validate reporting requirements and confirm existing transaction logging contract.

**Status:** Completed 2026-03-11

#### Tasks

1. Reconfirm transaction status enum and reconciliation expectations in SRS (FR-9.x, FR-10.x, FR-8.2.4) and Phase 7 handoff.
2. Inventory existing transaction/list endpoints and schemas for gaps vs. reporting requirements.
3. Confirm admin authorization middleware requirements for reporting endpoints.

#### Acceptance linkage

- US-039–US-047 (all depend on accurate transaction logging and admin-only access).

#### Tests

- admin_transactions_statistics.robot (all suites) as final validation only.

---

### Phase 1 - Data Model & Indexing for Reporting

**Goal:** Ensure the database supports fast filtering/aggregation at scale.

**Status:** Completed 2026-03-11

**Tasks**

1. Add or verify indexes for transaction filters (timestamp, status, amount, product joins) per SRS Section 8.1.3.
2. Add covering indexes for transaction items on product name/ID for search and product filters.
3. Define materialized views or summary tables for:
   - Daily/weekly/monthly revenue
   - Top products by quantity
4. Document refresh strategy for aggregates (on-demand refresh or scheduled).

**Acceptance linkage**

- FR-9.4.x filtering/sorting
- FR-10.1 / FR-10.1.3 performance
- US-039, US-043, US-044, US-047

**Tests**

- US-039 (pagination/filter/sort)
- US-043/US-044 (analytics)
- US-047 (performance)

---

### Phase 2 - Transaction History API + Search/Filter

**Goal:** Provide admin endpoints that back the history table with all filters.

**Status:** Completed 2026-03-11

**Tasks**

1. Implement paginated `GET /api/transactions` with page size 50 default and sorting by date/amount/status.
2. Implement filters: date range, status, product (name/ID), amount range.
3. Add search across transaction ID, product names, and confirmation reference.
4. Enforce admin authorization and ensure no PII leaks (FR-9.2).

**Acceptance linkage**

- FR-9.1–FR-9.4.3
- US-039, US-039-Edge, US-039-Comprehensive

**Tests**

- US-039 (base + edge + comprehensive)

---

### Phase 3 - Uncertain Payment Resolution & Audit Trail

**Goal:** Provide admin UI + API to resolve `PAYMENT_UNCERTAIN` transactions.

**Status:** Completed 2026-03-11

**Tasks**

1. Surface `PAYMENT_UNCERTAIN` list with badge/warning states and details.
2. Implement reconciliation endpoints to mark confirmed or refunded with required notes (min 10 chars) and audit logging.
3. Update inventory on confirmed reconciliations; no inventory change on refund.
4. Capture reconciler admin identity and timestamps.

**Acceptance linkage**

- FR-8.2.4
- US-040, US-041 (including edge/boundary cases)

**Tests**

- US-040 (uncertain list)
- US-041 (confirm/refund/notes validation)

---

### Phase 4 - Analytics Aggregations + KPIs

**Goal:** Provide stats endpoints that feed dashboard KPIs and charts.

**Status:** Completed 2026-03-11

**Tasks**

1. Implement analytics endpoints for:
   - Top 10 products by quantity
   - Revenue by day/week/month
   - Total revenue, transaction count, average transaction value
2. Support preset ranges and custom ranges (max 1 year per FR-10.1) with validation.
3. Ensure stats update within 30 seconds of new transactions (FR-10.1.2).

**Acceptance linkage**

- FR-10.1–FR-10.1.3
- US-043, US-044, US-045, US-047

**Tests**

- US-043/US-044 (charts + metrics)
- US-045 (date range validation)
- US-047 (performance)

---

### Phase 5 - Admin Dashboard UI (Charts + Filters)

**Goal:** Deliver admin visuals and controls that match acceptance steps.

**Status:** Completed 2026-03-11

**Tasks**

1. Build transaction history table with pagination controls, filters, sort, and search.
2. Build statistics page with:
   - KPI tiles (revenue, transactions, average)
   - Top products chart
   - Revenue charts with daily/weekly/monthly views
   - Preset and custom date range selectors
3. Implement chart interactivity (tooltips, hover, zero-data days) and export actions.

**Acceptance linkage**

- US-039–US-045

**Tests**

- US-039–US-045

---

### Phase 6 - CSV Export + Retention/Storage UI

**Goal:** Support CSV export at scale and retention/archival requirements.

**Status:** Completed 2026-03-11

**Tasks**

1. Implement streaming CSV export endpoint that respects filters and date ranges.
2. Use SRS-defined headers and filename format `transactions_YYYY-MM-DD_to_YYYY-MM-DD.csv`.
3. Add export completion logging and notifications for large exports (US-046-Comprehensive).
4. Surface retention policy and storage usage; add archive flow for >3 years data.
5. Add alerts for storage thresholds (75%, 80%, 90%) per US-042 expectations.

**Acceptance linkage**

- FR-9.3, FR-10.2.x
- US-042, US-046

**Tests**

- US-042 (retention + archive + storage alerts)
- US-046 (CSV export variants)

---

### Phase 7 - Performance Validation & Regression

**Goal:** Validate SLA and acceptance coverage under scale.

**Status:** Completed 2026-03-16 (benchmark + admin_transactions_statistics.robot passed)

**Tasks**

1. Populate datasets (10k–50k transactions) and confirm all queries return within 2 seconds.
2. Validate pagination, filters, and export performance (30s SLA for 1k+ exports).
3. Run `admin_transactions_statistics.robot` for US-039–US-047.
4. Use `npm run benchmark:reporting` (requires `ADMIN_TOKEN`) to capture API latency snapshots.

**Acceptance linkage**

- US-047 performance criteria
- Issue #10 checklist item 6

**Tests**

- admin_transactions_statistics.robot (US-039–US-047)

## Deliverables Checklist

- Transaction history API with pagination, filters, sorting, and search.
- Uncertain payment resolution workflow with audit logging.
- Analytics aggregation layer with performance-optimized queries/indexes.
- Admin dashboard with charts, KPIs, and date range selection.
- Streaming CSV export with filters and filename conventions.
- Retention/archival UI and storage capacity alerts.
- Acceptance suite `admin_transactions_statistics.robot` green.

<!-- markdownlint-enable MD013 -->
