<!-- markdownlint-disable MD013 -->
# Phase 5 Implementation Plan - Customer Catalog & Status UX

## Source References

- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md) (Phase 5 scope, dependencies, acceptance suites)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md) (Kiosk web application container, data flows through Nginx and API)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md) (FR-1.1 to FR-1.6, FR-4.1 to FR-4.3, FR-11.1.2 performance expectations, NFR-4 availability)
- [reqeng/user_stories.md](reqeng/user_stories.md) (US-001 to US-005, US-016 to US-018 narratives)
- [tests/acceptance/customer_product_browsing.robot](tests/acceptance/customer_product_browsing.robot) (US-001 to US-005 scenarios and edge cases)
- [tests/acceptance/customer_system_status.robot](tests/acceptance/customer_system_status.robot) (US-016 to US-018 scenarios and edge cases)
- [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx) (current kiosk shell, catalog rendering, trust-mode banner)
- [client/src/hooks/useProductFeed.js](client/src/hooks/useProductFeed.js) (product feed retrieval and caching)
- [server/src/routes/feed.js](server/src/routes/feed.js) (product feed API and cache headers)
- [server/src/services/inventoryService.js](server/src/services/inventoryService.js) (inventory snapshot, tracking toggle, SSE events)

## Acceptance Coverage

| Workstream | Acceptance Tests | Related Requirements |
| --- | --- | --- |
| Catalog grid, filtering, and empty states | customer_product_browsing.robot – US-001, US-002, US-002-Edge | FR-1.1, FR-1.2, FR-1.3, NFR-2 (sub-300 ms response)
| Product details and allergen surfacing | customer_product_browsing.robot – US-003, US-003-Edge | FR-1.4, WCAG compliance from FR-4.3
| Inventory availability and out-of-stock confirmations | customer_product_browsing.robot – US-004, US-005, US-005-Edge | FR-1.5, FR-1.6, Implementation_Roadmap step 30
| Operating hours and maintenance overlays | customer_system_status.robot – US-016, variants | FR-4.1, FR-4.2, FR-4.2.1, NFR-4
| Trust-mode inventory warning banner | customer_system_status.robot – US-017, variants | FR-1.5, FR-11.1.2 (10 s propagation requirement)
| Accessibility, touch targets, and contrast | customer_system_status.robot – US-018 suites; customer_product_browsing.robot – touch target checks | FR-4.3, SRS accessibility baseline

## Constraints and Assumptions

- Reuse the existing product feed contract that merges catalog data with inventory snapshot flags (out-of-stock, low stock, tracking toggle) surfaced by [server/src/routes/feed.js](server/src/routes/feed.js).
- Inventory tracking state continues to originate from `system_config` via [server/src/services/inventoryService.js](server/src/services/inventoryService.js); plan assumes Phase 4 SSE broadcasting is active for real-time updates.
- Operating hours and maintenance configuration values are already managed in admin workflows (per Phase 9 roadmap); interim status APIs must consume current storage strategy without duplicating configuration sources.
- Kiosk UI must satisfy 44x44 px touch targets and 16/24 px typography using existing design tokens in [client/src/styles.css](client/src/styles.css), expanding tokens when necessary.
- Category data is delivered with each product; plan presumes multi-category assignments per FR-1.3 and US-029 to US-031 are available via the feed.
- Filtering and status transitions must respect kiosk hardware constraints: <300 ms perceived response for filter switches (US-002) and <10 s for closed/open transition (US-016 boundary case).
- Offline cache behaviour handled via [client/src/utils/offlineCache.js](client/src/utils/offlineCache.js) remains in scope for resiliency messaging; enhancements should not break existing cache invalidation.

## Sequential Implementation Plan

1. **Discovery and UX Baseline Alignment**
   - Audit current kiosk UI components in [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx) against FR-1.x and FR-4.x to identify gaps (e.g., missing closed overlay, allergen modal behaviour, contrast tokens).
   - Validate available dataset fields from [server/src/routes/feed.js](server/src/routes/feed.js) and confirm inventory snapshot contains flags required by US-004 and US-005.
   - Capture UI states (catalog, closed, maintenance, offline) in low-fidelity wireframes or storybook notes to guide subsequent implementation.

2. **Status and Configuration API Layer**
   - Introduce a dedicated status service/controller on the API (e.g., `server/src/routes/status.js`) that computes kiosk state (open, closed, maintenance) using operating hours and maintenance flags from configuration tables; expose GET `/api/status/kiosk` with precedence handling per FR-4.2.1.
   - Implement helper utilities for timezone-aware schedule evaluation (consider `luxon` already used? otherwise add) ensuring server honours configured timezone from SRS assumptions.
   - Emit status change events through the existing SSE broadcaster (extend [server/src/services/inventoryEvents.js](server/src/services/inventoryEvents.js) or create `statusEvents`) so the kiosk can react within 5–10 seconds.
   - Add unit coverage for schedule resolution and precedence logic; plan Robot coverage via customer_system_status.robot after UI integration.

3. **Inventory Feed Enhancements and Real-Time Hooks**
   - Extend product feed payloads to include allergen metadata (if not already surfaced) and availability flags required for UI conditional rendering (low-stock, maintenance gating) while preserving ETag generation.
   - Ensure SSE stream publishes inventory tracking toggle and out-of-stock updates, allowing the kiosk to adjust trust-mode warnings without full page reload.
   - Add regression tests around feed contract (Jest + supertest) to guard the shape consumed by [client/src/hooks/useProductFeed.js](client/src/hooks/useProductFeed.js).

4. **Kiosk Data Hooks and Offline Strategy**
   - Create a `useKioskStatus` React Query hook that polls `/api/status/kiosk` (with SSE fallback when available) and persists last known state for offline scenarios.
   - Reconcile product feed and status fetch lifecycles so that offline storage (`OFFLINE_FEED_STORAGE_KEY`) includes status metadata; ensure stale data triggers `customer_system_status.robot` warnings when tracking disabled.
   - Implement instrumentation to measure filter response time in development builds, keeping within US-002 expectations.

5. **Catalog Grid and Category Filtering Iteration**
   - Finalize responsive grid layout using CSS grid with explicit min/max sizing and fallback for small screens; confirm 2–3 column requirement and touch spacing in tests US-001 and US-002.
   - Enhance category filter controls to include active-state accessibility attributes (`aria-pressed`, focus outlines) and ensure empty state messaging matches US-002-Edge.
   - Add loading skeleton states and ETag-based quick refetch for sub-300 ms filter updates, instrumented via React Profiler in development.

6. **Product Detail and Allergen Surfacing**
   - Implement dedicated product detail modal/component that surfaces allergen, description, and nutritional metadata with 16 px minimum text size and accessible headings (FR-1.4, FR-4.3).
   - Handle missing allergen data gracefully per US-003-Edge; ensure modal remains navigable via keyboard to satisfy accessibility audit.
   - Add Jest/React Testing Library coverage verifying allergen text rendering and absence fallback.

7. **Inventory-Aware Interactions and Trust Mode**
   - Refine out-of-stock card styling (greyed state, red badge) tied to current stock field, ensuring data attributes align with Robot selectors in US-004.
   - Implement confirmation dialog flow for out-of-stock purchases with `focusTrap` behaviour and analytics logging; ensure US-005 happy and cancel paths maintain cart state.
   - Keep trust-mode banner visible across navigation by lifting state to kiosk root and persisting to session storage; confirm updates arrive within 5 seconds after toggling tracking (customer_system_status.robot – US-017-Edge/Bondary).

8. **Closed and Maintenance Overlays**
   - Build a full-screen overlay component triggered by status hook that blocks product grid when kiosk is closed or under maintenance, showing iconography and next opening time messaging per FR-4.1 and FR-4.2.
   - Implement precedence (maintenance > closed) and make overlay update in place without reload; integrate countdown or reopen ETA per SRS guidance.
   - Ensure overlay toggles checkout disabled state and product visibility as asserted in customer_system_status.robot – US-016 cases.

9. **Accessibility, Styling, and Performance Hardening**
   - Audit typography tokens and button components to guarantee 16/24 px minimums and WCAG AA contrast ratios; add CSS variables or clases as needed in [client/src/styles.css](client/src/styles.css).
   - Introduce automated linting via `eslint-plugin-jsx-a11y` rules or axe integration in CI for kiosk bundle to catch regressions targeted by US-018 suites.
   - Optimize image loading (lazy loading, aspect-ratio boxes) and reduce layout shifts to maintain <300 ms perceived responsiveness during filter interactions.

10. **Testing, QA, and Rollout**
   - Expand unit and integration tests on both client and server for new hooks, reducers, and endpoints; cover schedule edge cases (overnight transitions) and SSE propagation.
   - Execute targeted Robot suites: [tests/acceptance/customer_product_browsing.robot](tests/acceptance/customer_product_browsing.robot) and [tests/acceptance/customer_system_status.robot](tests/acceptance/customer_system_status.robot) on staging before merge; incorporate into CI pipeline gating per Implementation_Roadmap step 33.
   - Finalize the kiosk status API runbook: document `KIOSK_TIMEZONE` and `system_config` dependencies, call out the `Cache-Control: no-cache` requirement for `/api/status/kiosk`, and note the reverse-proxy settings (`proxy_buffering off`, `X-Accel-Buffering off`) needed to keep `/api/status/events` SSE connections alive. Mirror the checklist in the README.

## Risks and Follow-Ups

- **Time zone handling for operating hours:** Misalignment between server time and configured schedule could break US-016 boundary tests; consider centralizing date utilities and adding integration tests with mocked time.
- **SSE resiliency on kiosk hardware:** Long-lived connections may drop; design a reconnection strategy with exponential backoff and fallback polling to maintain US-017 warning persistence.
- **Accessibility regressions:** Visual updates must undergo contrast and touch-target audits; schedule manual QA with assistive tooling (e.g., axe) before acceptance sign-off.
- **Offline cache staleness:** Ensure cached status does not falsely display open when kiosk is closed; store timestamps and expire stale data within 2 minutes when offline.
