<!-- markdownlint-disable MD013 MD036 -->
# Phase 10 Load Testing & Performance Tuning Plan

## Purpose

Execute end-to-end load testing for Phase 10 and provide a structured tuning workflow to achieve QR <1s and UI <300ms targets.

## Preconditions

- Baseline harness defined in [docs/architecture/Phase10_Performance_Baseline_Profile.md](docs/architecture/Phase10_Performance_Baseline_Profile.md)
- Dataset seeded with 10k–50k transactions and ~50 products
- Monitoring available via PM2 logs and Phase 9 dashboards

## Load Test Scenarios

### Scenario 1 — QR Generation Under Load

**Target:** QR rendering within 1s at 90th percentile.

**Steps**

1. Simulate concurrent checkout events (burst of 10–20).
2. Measure time to QR rendering for each checkout.
3. Compute 90th percentile and note outliers.

---

### Scenario 2 — UI Filter Responsiveness Under Load

**Target:** Filter changes within 300ms (90th percentile).

**Steps**

1. Load kiosk with 50 products.
2. Run 100 filter changes while background API traffic is active.
3. Measure time from filter selection to grid update.

---

### Scenario 3 — Cart Operation Responsiveness Under Load

**Target:** Cart updates within 200ms (90th percentile).

**Steps**

1. Perform 100 add/remove/edit operations during active API traffic.
2. Measure UI update time for each operation.

---

### Scenario 4 — API Latency Snapshot

**Target:** Critical endpoints within SRS thresholds.

**Endpoints**

- `GET /api/products`
- `GET /api/transactions?page=1&pageSize=50`
- `GET /api/analytics/summary?startDate=...&endDate=...`
- `GET /api/system/status`

**Notes**

- Use existing `server/scripts/reportingBenchmark.ts` for analytics endpoints.

## Tuning Workflow

1. Identify top latency contributors (API, DB, client bundle).
2. Apply targeted optimizations within architecture guardrails:
   - Add or refine DB indexes for slow queries.
   - Adjust PM2 cluster settings and Node.js memory limits.
   - Enable Nginx gzip/brotli and static caching headers.
   - Optimize client bundles (code splitting, lazy loading).
3. Re-run relevant load scenarios to confirm improvements.

## Reporting Template

Capture for each scenario:

- Date/time
- Environment
- Dataset size
- Concurrency level
- P90/P95 timings
- Pass/fail vs target
- Tuning actions taken
- Follow-up actions

## Status

**In progress (2026-03-19):** Reporting benchmark executed and recorded. Remaining UI and QR latency scenarios pending.

<!-- markdownlint-enable MD013 MD036 -->
