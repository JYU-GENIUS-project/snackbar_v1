<!-- markdownlint-disable MD013 MD036 -->
# Phase 10 Load Testing Results

## Summary

Automated reporting benchmark executed to validate API response times for analytics and transactions endpoints.

## Execution

- Date: 2026-03-19
- Environment: Local (stack running at [http://localhost:3000](http://localhost:3000))
- Tool: server/scripts/reportingBenchmark.ts

## Results

| Label | Duration (ms) | Status |
| --- | --- | --- |
| summary-last-7-days | 160 | 200 OK |
| top-products-last-7-days | 27 | 200 OK |
| revenue-daily-last-7-days | 17 | 200 OK |
| summary-last-30-days | 12 | 200 OK |
| top-products-last-30-days | 9 | 200 OK |
| revenue-daily-last-30-days | 17 | 200 OK |
| transactions-page-1 | 13 | 200 OK |

## Notes

- Results confirm sub-200ms latency for benchmarked endpoints under current dataset.
- Robot suite executed: `admin_monitoring_troubleshooting.robot` (US-053) with 3/3 passing. Outputs saved under [tests/results/phase10_2](tests/results/phase10_2).
- Robot suite executed: `customer_product_browsing.robot` with 7/8 passing (US-005-Edge failed).
- Robot suite executed: `customer_shopping_cart.robot` with 5/7 passing (US-007, US-008 failed).
- Robot suite executed: `customer_payment_checkout.robot` with 6/6 passing (QR prompt timing met).
- Rerun (headless) after fixes: `customer_product_browsing.robot` 8/8 pass and `customer_shopping_cart.robot` 7/7 pass. Outputs saved under [tests/results/phase10_2_fix2](tests/results/phase10_2_fix2).
- Remaining Phase 10.2 scenarios (UI filter/cart timing under sustained load) require interactive or dedicated load tooling.

<!-- markdownlint-enable MD013 MD036 -->
