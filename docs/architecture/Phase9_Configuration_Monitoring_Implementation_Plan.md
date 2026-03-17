# Phase 9 Implementation Plan: Configuration & Monitoring Suite

## Purpose

Deliver operational controls and observability for Phase 9, aligned with the architecture and requirements defined in:

- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md)
- [docs/architecture/Phase4_Inventory_Technical_Design.md](docs/architecture/Phase4_Inventory_Technical_Design.md)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)

## Architectural & Technical Guardrails

- **PERN stack** with RESTful API and stateless server per [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
- **Configuration vs secrets**: SMTP credentials remain in environment variables; only recipient lists/flags are persisted, per [docs/architecture/Phase4_Inventory_Technical_Design.md](docs/architecture/Phase4_Inventory_Technical_Design.md).
- **Immediate config propagation** within 10 seconds (FR-11.1.2 in [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)).
- **Email validation** must follow RFC 5322 (FR-11.1.3).
- **Maintenance precedence** over operating hours (FR-4.2.1).
- **Log access** must be secured and admin-only (US-053), using PM2/Nginx log sources described in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).

## Implementation Phases (Sequential)

### Phase 9.1 — Data Model & Configuration Baseline

**Goal:** Extend configuration and notification storage to support operating hours, maintenance scheduling, notification recipients, and system flags.

#### Key tasks (Phase 9.1)

1. Add/extend configuration storage for:
   - Operating hours per day + breaks + holidays.
   - 24/7 flag and copy-Monday-to-weekdays helper.
   - Maintenance mode flag, message, and scheduled window.
   - Notification recipients per alert type, with verification status and primary contact.
2. Add system status history persistence (online/offline/maintenance), heartbeat timestamp, and metrics snapshot storage for dashboard trends.
3. Add notification log entries with rate-limiting metadata and acknowledgment tracking.

#### Acceptance tests covered (Phase 9.1)

- US-048 (operating hours, breaks, holidays, 24/7, copy Monday)
- US-049 (maintenance toggle, custom message, scheduling)
- US-050 (notification recipients, verification, recipient limits)
- US-051 (alert routing, rate limiting, escalation & acknowledgment)

#### Relevant test suites (Phase 9.1)

- [tests/acceptance/admin_system_configuration.robot](tests/acceptance/admin_system_configuration.robot)

---

### Phase 9.2 — Configuration API & Validation Layer

**Goal:** Provide secure admin APIs to manage operating hours, maintenance, and notification recipients with validation and audit logging.

#### Key tasks (Phase 9.2)

1. Implement configuration endpoints for:
   - Operating hours CRUD (per day, breaks, holidays, 24/7).
   - Maintenance mode enable/disable, custom message, and scheduling.
   - Notification recipients per alert type (add/remove/verify/primary).
2. Add RFC 5322 email validation and recipient limits (max 10 per alert type).
3. Enforce maintenance precedence over operating hours in status evaluation.
4. Ensure configuration changes propagate within 10 seconds to kiosk/admin clients.

#### Acceptance tests covered (Phase 9.2)

- US-048, US-049, US-050 (primary coverage)

#### Relevant test suites (Phase 9.2)

- [tests/acceptance/admin_system_configuration.robot](tests/acceptance/admin_system_configuration.robot)

---

### Phase 9.3 — Kiosk & Admin UI Configuration Screens

**Goal:** Expose operating hours, maintenance scheduling, and notification management screens in the admin portal.

#### Key tasks (Phase 9.3)

1. Build admin UI flows:
   - Operating hours form with day-specific configuration, breaks, holidays, copy Monday button.
   - Maintenance panel with toggle, custom message, schedule + reminder setup.
   - Notification settings with alert-type routing, recipient verification status, primary contact, and removal.
2. Add success/error messaging, validation display, and audit trail entries.

#### Acceptance tests covered (Phase 9.3)

- US-048, US-049, US-050

#### Relevant test suites (Phase 9.3)

- [tests/acceptance/admin_system_configuration.robot](tests/acceptance/admin_system_configuration.robot)

---

### Phase 9.4 — Real-Time Status & Health Dashboard

**Goal:** Deliver real-time kiosk status with heartbeat, outage detection, and multi-metric health dashboard.

#### Key tasks (Phase 9.4)

1. Add kiosk heartbeat reporting (client ping + server timestamp storage).
2. Create server-side status evaluator combining:
   - Heartbeat freshness (online/offline).
   - Maintenance mode.
   - Outage detection and last transaction time.
3. Build admin dashboard widgets with:
   - Online/offline/maintenance indicators + color coding.
   - Uptime %, last heartbeat time.
   - Metrics (manual confirmation service, DB status, disk usage, sessions, response time).
   - 10-second auto-refresh and 24-hour trends.
4. Add status history timeline and offline alerting after 5 minutes.

#### Acceptance tests covered (Phase 9.4)

- US-052 (status monitoring + comprehensive dashboard)

#### Relevant test suites (Phase 9.4)

- [tests/acceptance/admin_system_configuration.robot](tests/acceptance/admin_system_configuration.robot)

---

### Phase 9.5 — Monitoring Jobs: Storage & Backup

**Goal:** Implement automated monitoring jobs for storage thresholds and backup confirmations with alerts and email routing.

#### Key tasks (Phase 9.5)

1. Storage monitoring job:
   - Use PostgreSQL metrics to compute DB size and capacity utilization.
   - Trigger alerts at 75% (info), 80% (warning), 90% (critical).
   - Provide analytics details (table breakdown, growth trends) and cleanup suggestions.
2. Backup confirmation pipeline:
   - Integrate with existing backup process to capture timestamp, size, location, checksum.
   - Emit success notifications and failure alerts; enable manual retry.
3. Wire notifications to configured recipients with retries and rate limiting.

#### Acceptance tests covered (Phase 9.5)

- US-054 (storage alerts and analytics)
- US-055 (backup confirmations and failure handling)

#### Relevant test suites (Phase 9.5)

- [tests/acceptance/admin_monitoring_troubleshooting.robot](tests/acceptance/admin_monitoring_troubleshooting.robot)
- [tests/acceptance/system_integration_communication.robot](tests/acceptance/system_integration_communication.robot)

---

### Phase 9.6 — Log Viewer & Diagnostics

**Goal:** Provide secured access to PM2 and Nginx logs with filtering, search, export, and analytics.

#### Key tasks (Phase 9.6)

1. Implement log access API (admin-only) to read PM2 and Nginx logs safely.
2. Add filters (date range, level), keyword search, pagination (100/page).
3. Implement export to CSV with filter metadata and 10-second performance target.
4. Add log analytics dashboard (frequency, distribution, trends) and auto-refresh (30 seconds).
5. Support log cleanup (older than 90 days).

#### Acceptance tests covered (Phase 9.6)

- US-053 (log viewer, filters, export, analytics)

#### Relevant test suites (Phase 9.6)

- [tests/acceptance/admin_monitoring_troubleshooting.robot](tests/acceptance/admin_monitoring_troubleshooting.robot)

---

### Phase 9.7 — Email Test & Diagnostics Endpoint

**Goal:** Provide admin-triggered email tests with detailed results and diagnostics.

#### Key tasks (Phase 9.7)

1. Implement test email endpoint that allows selecting alert types and recipients.
2. Add test notification history entries and confirmation messaging.
3. Implement SMTP configuration diagnostics with success/failure reporting and optional diagnostic report email.

#### Acceptance tests covered (Phase 9.7)

- US-056 (test emails on demand + diagnostics)

#### Relevant test suites (Phase 9.7)

- [tests/acceptance/admin_monitoring_troubleshooting.robot](tests/acceptance/admin_monitoring_troubleshooting.robot)

---

### Phase 9.8 — End-to-End Verification

**Goal:** Validate Phase 9 functionality against acceptance criteria and ensure compatibility with existing integrations.

#### Key tasks (Phase 9.8)

1. Run system configuration suite: US-048–US-052.
2. Run monitoring & troubleshooting suite: US-053–US-056.
3. Re-check notification retry behavior for backup confirmations and system error alerts.

#### Acceptance tests covered (Phase 9.8)

- admin_system_configuration.robot (US-048–US-052)
- admin_monitoring_troubleshooting.robot (US-053–US-056)

#### Relevant test suites (Phase 9.8)

- [tests/acceptance/admin_system_configuration.robot](tests/acceptance/admin_system_configuration.robot)
- [tests/acceptance/admin_monitoring_troubleshooting.robot](tests/acceptance/admin_monitoring_troubleshooting.robot)

## Notes

- Phase 9 depends on prior authentication, inventory notifications, and reporting infrastructure per [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md).
- SMTP credentials remain environment-driven; only recipient and verification metadata is stored.
- Any new scheduled jobs must follow the same containerized runtime constraints defined in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
