# Implementation Roadmap

## Roadmap Table

| Phase | Goal / Focus Theme | Key Architecture Tasks | Acceptance Tests (IDs) | Dependencies |
| --- | --- | --- | --- | --- |
| Phase 1 – Platform & Security Foundation | Stand up secure PERN infrastructure and core auth | Provision Docker stack (Nginx, Express API, PostgreSQL, PM2) with TLS per `C4_Architecture.md`; wire health/metrics endpoints and secrets handling; scaffold migrations and nightly backups; implement admin account lifecycle (create/manage) with bcrypt hashing, JWT/session timeout, audit seeds; add CI lint/unit gates | `admin_authentication_products.robot` (US-019–US-022); `system_technical_security.robot` (US-060, US-061, US-063) | – |
| Phase 2 – Admin Product Catalog Core | Deliver product CRUD with secure media handling | Model products/media (UUID keys, constraints); build product CRUD APIs with validation, soft delete, audit logging; ship image pipeline (conversion, EXIF strip, storage); implement React admin forms with live updates; expose cached product feed for kiosk | `admin_authentication_products.robot` (US-023–US-028); `system_integration_communication.robot` (US-064) | Phase 1 |
| Phase 3 – Category Management | Support category governance | Create categories and product–category mapping; enforce deletion guards; add admin UI for category lifecycle; propagate category metadata to kiosk | `admin_category_management.robot` (US-029–US-031) | Phases 1–2 |
| Phase 4 – Inventory & Alerting Backbone | Implement stock tracking and notifications | Add inventory tables, toggle, and discrepancy handling; build reconciliation views and adjustments; integrate SMTP client, notification routing, and retry policy; publish inventory events for UI banners | `admin_inventory_management.robot` (US-032–US-038); `system_integration_communication.robot` (US-067) | Phases 1–3 |
| Phase 5 – Customer Catalog & Status UX | Launch kiosk browsing & status surfaces | Build kiosk React UI (grid, filters, allergen modal); consume inventory flags for out-of-stock flows and warnings; implement operating hours & maintenance APIs with kiosk messaging; enforce accessibility sizing/contrast | `customer_product_browsing.robot` (US-001–US-005); `customer_system_status.robot` (US-016–US-018) | Phases 2–4 |
| Phase 6 – Shopping Cart Experience | Finalize cart behaviour & guardrails | Implement cart state service with session persistence; enforce purchase limits and quantity controls; compute real-time totals with currency safety; add inactivity timer warnings and auto-clear hooks | `customer_shopping_cart.robot` (US-006–US-010) | Phase 5 |
| Phase 7 – Payments & Transaction Logging | Complete MobilePay checkout and persistence | Integrate MobilePay QR flow, webhooks, and retries; ensure <1s transaction persistence; atomically update inventory with uncertain-state handling; surface failure paths; trigger downtime alerts and payment logging | `customer_payment_checkout.robot` (US-011–US-015); `system_technical_security.robot` (US-059); `system_integration_communication.robot` (US-065, US-066, US-068) | Phases 4–6 |
| Phase 8 – Reporting & Analytics | Provide admin insights and exports | Implement transaction history search/filter; deliver uncertain payment resolution tooling; build analytics aggregations (popular products, revenue periods) with indexes; generate CSV exports within SLA | `admin_transactions_statistics.robot` (US-039–US-047) | Phases 2, 7 |
| Phase 9 – Configuration & Monitoring Suite | Operational controls and observability | Build operating hours scheduler, maintenance toggle, notification recipients; surface real-time kiosk status; implement log viewer, storage threshold alerts, backup confirmations, email test trigger | `admin_system_configuration.robot` (US-048–US-052); `admin_monitoring_troubleshooting.robot` (US-053–US-056) | Phases 1, 4, 7–8 |
| Phase 10 – Performance Hardening & Release Readiness | Certify performance, resilience, compliance | Execute load/performance tuning (QR <1s, UI <300 ms); finalize log rotation & retention; validate backup restore drills and DR plan; perform security pen test; lock deployment automation and observability dashboards | `admin_monitoring_troubleshooting.robot` (US-057–US-058); `system_technical_security.robot` (US-060–US-063 regression); `system_integration_communication.robot` (US-064–US-068 regression) | Phases 1–9 |

## Sequenced Technical Checklist

1. Phase 1 – Create secure secrets management setup by adding `.env.example`, Git-ignored `.env`, and documenting required environment variables for Docker, PostgreSQL, MobilePay, and SMTP.
2. Phase 1 – Author `docker-compose.yml` with Nginx, Express API, PostgreSQL, and PM2 services, including health checks, persistent volumes, and bridge network defined in `C4_Architecture.md`.
3. Phase 1 – Scaffold infrastructure directories (`server/`, `client/`, `nginx/`, `init-db/`) and add baseline Dockerfiles plus PM2 ecosystem file for the API container.
4. Phase 1 – Configure Nginx TLS termination by generating local dev certificates, mapping `/api` proxy rules, static asset serving, and security headers per architecture spec.
5. Phase 1 – Initialize PostgreSQL schema migrations (e.g., using Prisma/Knex) covering admin, audit, and configuration tables with UUID primary keys and timestamps.
6. Phase 1 – Implement nightly backup job script and cron configuration within the Docker stack, ensuring backups stored to dedicated volume with retention policy.
7. Phase 1 – Implement Express bootstrap with helmet, CORS, request logging, health endpoint, and centralized error handling middleware.
8. Phase 1 – Build authentication module: bcrypt hashing, JWT issuance/refresh, session timeout middleware, admin CRUD service, and audit log entries for credential events.
9. Phase 1 – Integrate CI pipeline (GitHub Actions) running lint, unit tests, and `robot --dryrun` for `admin_authentication_products.robot` plus `system_technical_security.robot`.
10. Phase 1 – Deploy local stack, seed primary admin account, and execute Robot suites `admin_authentication_products.robot` (US-019–US-022) and `system_technical_security.robot` (US-060, US-061, US-063).
11. Phase 2 – Design product and media tables with constraints (price validation, ENUMs, foreign keys) through migrations.
12. Phase 2 – Implement media storage pipeline with upload directory segregation, filename sanitization, and integrity checks.
13. Phase 2 – Develop image processing worker (Sharp/Libvips) for WebP/JPEG generation, compression, and EXIF stripping triggered post-upload.
14. Phase 2 – Build product API endpoints (list/create/update/delete) enforcing validation, soft deletes, audit trails, and cache invalidation.
15. Phase 2 – Implement optimistic UI forms in admin React portal using React Query to sync product mutations within 5 seconds.
16. Phase 2 – Expose real-time product feed endpoint for kiosk consumption with ETag caching support.
17. Phase 2 – Run Robot suites `admin_authentication_products.robot` (US-023–US-028) and `system_integration_communication.robot` (US-064) to validate product and media workflows.
18. Phase 3 – Add category and product-category join tables with unique constraints and referential integrity.
19. Phase 3 – Implement category API endpoints with validation, prevention of deleting assigned categories, and audit logging.
20. Phase 3 – Extend admin UI with category management screens, including conflict messaging and multi-select assignment.
21. Phase 3 – Update kiosk product fetch to include category metadata for filtering.
22. Phase 3 – Execute `admin_category_management.robot` suite (US-029–US-031) to verify category features.
23. Phase 4 – Introduce inventory tables capturing stock counts, low-stock thresholds, and tracking toggle status.
24. Phase 4 – Build inventory toggle endpoint affecting kiosk banners and admin portal warnings while preserving stock values.
25. Phase 4 – Implement stock adjustment APIs with discrepancy reports and negative stock handling.
26. Phase 4 – Integrate SMTP client (e.g., Nodemailer) with retry logic and templates for low-stock notifications.
27. Phase 4 – Create event dispatcher broadcasting stock updates to kiosk/admin clients via WebSocket or SSE.
28. Phase 4 – Run Robot suites `admin_inventory_management.robot` (US-032–US-038) and `system_integration_communication.robot` (US-067) to confirm inventory behaviors.
29. Phase 5 – Build kiosk React shell with responsive grid, accessibility-compliant typography/touch targets, and offline handling.
30. Phase 5 – Implement product listing view with category filters, allergen modal, and real-time availability indicators.
31. Phase 5 – Wire maintenance and operating hours endpoints to kiosk status overlay, ensuring precedence logic.
32. Phase 5 – Surface inventory-tracking-off warning banner at checkout and log display events for auditing.
33. Phase 5 – Execute `customer_product_browsing.robot` (US-001–US-005) and `customer_system_status.robot` (US-016–US-018) suites.
34. Phase 6 – Implement cart service with client-side state, server-side persistence keyed by kiosk session, and inactivity timer.
35. Phase 6 – Build quantity control components with purchase limit enforcement and disabled state when limit reached.
36. Phase 6 – Implement running total calculations with currency-safe decimal handling and UI updates.
37. Phase 6 – Add clear cart and remove item operations, ensuring audit logging for session events.
38. Phase 6 – Execute `customer_shopping_cart.robot` suite (US-006–US-010) to validate cart flows.
39. Phase 7 – Integrate MobilePay API for payment creation, QR code retrieval, and webhook signature validation.
40. Phase 7 – Implement transaction persistence workflow with ACID guarantees, idempotent webhook handling, and <=1s writes.
41. Phase 7 – Build payment status polling/subscribe mechanism in kiosk UI to display success/failure states.
42. Phase 7 – Implement payment failure and uncertain status handling with admin reconciliation hooks and email alerts.
43. Phase 7 – Add exponential backoff for payment retries and downtime detection alerts.
44. Phase 7 – Execute `customer_payment_checkout.robot` (US-011–US-015), `system_technical_security.robot` (US-059), and `system_integration_communication.robot` (US-065, US-066, US-068) suites.
45. Phase 8 – Create transaction history API with pagination, filters, and authorization controls.
46. Phase 8 – Build uncertain payment resolution endpoints allowing confirm/refund actions with audit trail.
47. Phase 8 – Implement analytics aggregation layer (popular products, revenue by period) optimized with indexes/materialized views.
48. Phase 8 – Develop admin dashboard visualizations (charts, KPIs) with configurable date range selectors.
49. Phase 8 – Implement CSV export service for transactions with streaming response and completion logging.
50. Phase 8 – Execute `admin_transactions_statistics.robot` suite (US-039–US-047).
51. Phase 9 – Build configuration management endpoints for operating hours, maintenance mode, notification recipients, and system flags.
52. Phase 9 – Implement real-time kiosk status dashboard combining heartbeat, maintenance, and outage indicators.
53. Phase 9 – Develop log viewer with secured access to PM2/Nginx logs and filtering capabilities.
54. Phase 9 – Add storage threshold monitoring job with alerts at 80% database usage and backup completion confirmations.
55. Phase 9 – Create admin-triggered email test endpoint with result reporting.
56. Phase 9 – Execute `admin_system_configuration.robot` (US-048–US-052) and `admin_monitoring_troubleshooting.robot` (US-053–US-056) suites.
57. Phase 10 – Conduct end-to-end load testing ensuring QR generation and UI updates meet performance SLAs.
58. Phase 10 – Finalize log rotation policies, backup restore drill documentation, and disaster recovery runbooks.
59. Phase 10 – Perform security penetration testing, remediate findings, and re-run technical security Robot suite (US-060–US-063).
60. Phase 10 – Harden deployment automation (CI/CD to staging/production) with observability dashboards and alert routing.
61. Phase 10 – Execute regression Robot suites `admin_monitoring_troubleshooting.robot` (US-057–US-058) and `system_integration_communication.robot` (US-064–US-068) plus targeted reruns for prior suites before release.
