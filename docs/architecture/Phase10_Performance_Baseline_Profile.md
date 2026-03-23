<!-- markdownlint-disable MD013 MD036 -->
# Phase 10 Baseline Performance Profiling & Test Harness

## Purpose

Provide a reproducible baseline for Phase 10 performance hardening aligned with SRS NFR-1 targets and Issue #12.

## Scope

- QR generation latency (FR-3.1, NFR-1.4)
- UI update latency for filters and cart operations (NFR-1.1, NFR-1.2)
- Product grid initial load (NFR-1.3)
- Page transition latency (NFR-1.5)
- API latency for critical endpoints (products, transactions, status)

## Baseline Test Scenarios

### Scenario A — QR Generation Latency

**Target:** QR appears within 1s (1000ms).

**Steps**

1. Seed cart with 2 items totaling 5.00€.
2. Trigger checkout.
3. Measure time from checkout action to QR rendered.
4. Repeat 100 times; compute 90th percentile.

**References**

- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md)

---

### Scenario B — Filter Update Latency

**Target:** 300ms (90th percentile).

**Steps**

1. Load kiosk with ~50 products.
2. Perform 100 category filter changes.
3. Measure from click to grid update.
4. Compute 90th percentile.

---

### Scenario C — Cart Operation Latency

**Target:** 200ms (90th percentile).

**Steps**

1. Start with cart containing 5 items.
2. Perform 100 add/remove/edit operations.
3. Measure time to UI update.
4. Compute 90th percentile.

---

### Scenario D — Product Grid Initial Load

**Target:** 2s (95th percentile).

**Steps**

1. Clear cache.
2. Load kiosk home 100 times.
3. Measure time until grid rendered and images loaded (or lazy-loading initiated).
4. Compute 95th percentile.

---

### Scenario E — Page Transition Latency

**Target:** 500ms.

**Steps**

1. Navigate between kiosk/admin pages 50 times.
2. Measure time between navigation and page ready state.
3. Compute 90th percentile.

---

### Scenario F — API Latency Snapshot

**Target:** Endpoint response times within SRS thresholds and prior Phase 9 monitoring expectations.

**Endpoints**

- `GET /api/products`
- `GET /api/transactions?page=1&pageSize=50`
- `GET /api/analytics/summary?startDate=...&endDate=...`
- `GET /api/system/status`

**Notes**

- Use `server/scripts/reportingBenchmark.ts` as baseline for analytics endpoints.
- Capture results to a local report (CSV/markdown) for Phase 10.2 tuning.

## Instrumentation Sources

- PM2 logs and API timing metrics (Phase 9 monitoring dashboard)
- PostgreSQL query duration and connection pool metrics
- Browser performance timing for UI interactions

## Baseline Dataset

- 10k–50k transactions to align with SRS performance tests.
- 50 products with optimized images (<200KB per image).

## Output Template

Record the following per scenario:

- Date/time
- Environment (staging/local)
- Dataset size
- Iterations
- P90/P95 timings
- Pass/fail vs target
- Notes on anomalies

## Status

**Completed (2026-03-19):** Baseline harness defined for Phase 10.1. Measurements will be captured in Phase 10.2 during tuning.

<!-- markdownlint-enable MD013 MD036 -->
