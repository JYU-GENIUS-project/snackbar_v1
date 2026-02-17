<!-- markdownlint-disable MD013 -->
# Phase 5 Step 1 – Discovery & Baseline Audit

## Summary

- Reviewed the existing kiosk experience in [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx) against Phase 5 functional requirements (FR-1.x, FR-4.x) and user stories (US-001 to US-005, US-016 to US-018).
- Confirmed product feed payload structure from [server/src/services/productService.js](server/src/services/productService.js#L503-L536) and inventory tracking indicators exposed by [server/src/services/inventoryService.js](server/src/services/inventoryService.js#L185-L247) align with planned UI behaviours.
- Documented gaps requiring new UX work: closed/maintenance overlays, dedicated allergen detail surfaces, status precedence messaging, and accessibility validation.
- Captured target kiosk UI states to inform design and development tasks in subsequent steps.

## Requirement & Story Audit

| Requirement / Story | Coverage Status | Evidence | Gaps / Follow-Up |
| --- | --- | --- | --- |
| FR-1.1, US-001 – Grid layout with images | ✅ Implemented | Product grid rendered via `div#product-grid` with responsive CSS grid; see [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx) and [client/src/styles.css](client/src/styles.css#L176-L259). | Verify minimum two-column layout on kiosk hardware once responsive breakpoints are finalized. |
| FR-1.2 – Product card contents | ✅ Implemented | Cards show name, price, image placeholder, category tags via derived data; see [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx). | Ensure price typography meets 18 px requirement during accessibility pass. |
| FR-1.3, US-002 – Category filtering | ⚠️ Partially implemented | Dynamic filter buttons exist with active-state styling; empty category shows placeholder messaging; confirmed at [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx). | Need performance instrumentation to guarantee <300 ms switch time, plus deterministic ordering for default categories. |
| FR-1.4, US-003 – Allergen surfacing | ❌ Missing | Feed includes `allergens` field (see [server/src/services/productService.js](server/src/services/productService.js#L509-L524)) but kiosk UI does not render allergen information. | Design and build product detail modal with allergen section and fallback messaging. |
| FR-1.5, US-017 – Trust-mode warning | ✅ Implemented | Banner rendered when inventory tracking disabled; state derived from product feed; see [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx). | Confirm persistence across future navigation flows (checkout) after new screens are introduced. |
| FR-1.6, US-004/US-005 – Out-of-stock handling | ⚠️ Partially implemented | Cards grey out and show badge; confirmation dialog exists; see [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx) and [client/src/styles.css](client/src/styles.css#L214-L331). | Need analytics/logging hook, ensure dialog text matches acceptance copy exactly, and add accessibility focus trapping. |
| FR-4.1, US-016 – Closed message | ❌ Missing | No overlay or routing to hide catalog outside operating hours. | Build status overlay using new status API (Step 2) and include schedule messaging. |
| FR-4.2, FR-4.2.1 – Maintenance precedence | ❌ Missing | No maintenance flag handling in kiosk UI. | Introduce precedence logic once status endpoint exists. |
| FR-4.3, US-018 – Accessibility (touch targets, fonts, contrast) | ⚠️ Needs validation | Many controls meet touch target size (48 px buttons in [client/src/styles.css](client/src/styles.css#L310-L356)), but typography tokens not explicitly measured; contrast not yet audited. | Run axe/JSX a11y tooling, define design tokens guaranteeing font-size minima and WCAG AA ratios. |
| US-002 Edge – Empty category message | ✅ Implemented | Placeholder text "No products in this category" present; see [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx). | None. |
| US-003 Edge – No allergen info | ❌ Missing | Modal not available, so messaging absent. | Covered by allergen modal work above. |
| US-005 Edge – Cancel out-of-stock purchase | ⚠️ Partially implemented | Dialog cancel path removes modal without adding to cart; see [client/src/components/KioskApp.jsx](client/src/components/KioskApp.jsx). | Ensure cart badge stays in sync when multiple prompts triggered sequentially. |
| US-017 Edge/Boundary – Banner persistence & toggle response | ⚠️ Pending validation | UI shows banner while feed states caching; rely on manual testing. | Add automated test hooks once SSE/polling built in later steps. |
| US-018 Comprehensive/Accessibility – Touch target validation | ⚠️ Needs tooling | Controls sized appropriately but no automated verification. | Integrate testing harness (axe, custom measurements) in later steps. |

## Data Contract Verification

- `/feed/products` merges catalog records with inventory tracking state. The payload includes `stockQuantity`, `lowStockThreshold`, `allergens`, and `primaryMedia` per [server/src/services/productService.js](server/src/services/productService.js#L503-L536). Current kiosk normalization in [client/src/hooks/useProductFeed.js](client/src/hooks/useProductFeed.js#L9-L83) retains category arrays, purchase limits, and availability flags.
- Inventory tracking toggle defaults to `true` if config value missing; lookup handled in [server/src/services/inventoryService.js](server/src/services/inventoryService.js#L185-L247). Banner logic in the kiosk already consumes this boolean but lacks event-driven refresh (addressed in later steps).
- Offline cache stored via `OFFLINE_FEED_STORAGE_KEY`; snapshot contains product list and `inventoryTrackingEnabled`; see [client/src/hooks/useProductFeed.js](client/src/hooks/useProductFeed.js#L27-L83). Need to extend snapshot to include status metadata during future work.

## Target UI State Inventory

1. **Operational Catalog** – Default grid with category filters, trust banner (if applicable), cart sidebar. Enhancements: allergen modal, low-stock styling, instrumentation.
2. **Closed Hours Overlay** – Full-screen lock message showing schedule ("🔒 Closed - Open 08:00 to 19:00"), hides grid, disables cart. Requires status hook and countdown logic.
3. **Maintenance Overlay** – Takes precedence over closed state, with tooling message and contact info; toggles from admin configuration.
4. **Inventory Tracking Disabled (Trust Mode)** – Persistent warning across catalog, cart, checkout screens; ensure state sync via SSE/polling.
5. **Offline / Stale Data Banner** – Already present but needs pairing with status fallback messaging to avoid stale open/closed states.
6. **Out-of-Stock Confirmation Dialog** – Existing modal requiring accessibility refinements and copy alignment.

## Follow-Up Actions for Step 2 Onward

- Define API contract for `/api/status/kiosk` (operating hours, maintenance, message text) and coordinate with backend team.
- Produce low-fidelity wireframes (separate design artifact) for closed/maintenance overlays and allergen modal, incorporating banner placement and typography tokens.
- Schedule accessibility audit tooling integration (axe-core, eslint-plugin-jsx-a11y) into client build pipeline.
- Outline analytics hooks needed for out-of-stock confirmations and banner impressions to satisfy future audit requirements.
