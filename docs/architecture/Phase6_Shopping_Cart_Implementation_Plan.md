<!-- markdownlint-disable MD013 -->
# Phase 6 Implementation Plan - Shopping Cart Experience

## Source References

- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md) (Phase 6 scope and dependencies)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md) (PERN stack, API boundaries, security)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md) (FR-2.1–FR-2.5.3, NFR-1.2, FR-4.3)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md) (TC-FR-2.1–TC-FR-2.5)
- [reqeng/user_stories.md](reqeng/user_stories.md) (US-006 to US-010)
- [tests/acceptance/customer_shopping_cart.robot](tests/acceptance/customer_shopping_cart.robot) (US-006 to US-010)

## Acceptance Coverage

| Workstream | Acceptance Tests | Related Requirements |
| --- | --- | --- |
| Cart creation, add items, running total | customer_shopping_cart.robot – US-006, US-007 | FR-2.1, FR-2.2, NFR-1.2 |
| Quantity adjustment and limits | customer_shopping_cart.robot – US-008 | FR-2.2, FR-2.3, FR-2.4, FR-4.3 |
| Remove item and clear cart | customer_shopping_cart.robot – US-009 | FR-2.2 |
| Inactivity timeout and reset | customer_shopping_cart.robot – US-010, US-010-Edge, US-010-Boundary | FR-2.5, FR-2.5.1, FR-2.5.2, FR-2.5.3 |

## Constraints and Assumptions

- Must remain within the PERN architecture and API boundaries described in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
- Cart state must be persisted server-side, keyed by kiosk session, and mirrored in client state for UX responsiveness.
- Purchase limits originate from admin-managed product configuration (FR-2.3) and must be enforced in both UI and API.
- Currency calculations must be deterministic and safe (use integer cents or a decimal library shared across client/server).
- Cart updates must reflect in the UI within 200ms (90th percentile) per NFR-1.2.
- All cart controls must satisfy the 44x44px touch target requirement (FR-4.3).

## Sequential Implementation Plan

## Progress Tracker

- [x] Step 1 – Domain and data model alignment
- [x] Step 2 – API layer and session persistence
- [x] Step 3 – Client cart state service
- [x] Step 4 – Quantity controls and purchase limits
- [x] Step 5 – Totals, subtotals, and currency safety
- [x] Step 6 – Remove and clear cart operations
- [x] Step 7 – Inactivity timer and auto-clear
- [x] Step 8 – Performance and UX hardening
- [x] Step 9 – Testing and validation *(customer shopping cart acceptance suite green: 7/7 scenarios passing on 2026-02-10)*

1. **Domain and Data Model Alignment**
   - Review existing product and session data structures to determine cart persistence strategy.
   - Define cart storage model (e.g., `cart_sessions`, `cart_items`) with session key, product ID, quantity, unit price snapshot, and timestamps.
   - Add audit log events for cart actions: add, remove, clear, and timeout (FR-2.2, checklist item 4).
   - **Acceptance linkage:** Preconditions for US-006/US-007 and auditability expectations.

2. **API Layer and Session Persistence**
   - Implement server endpoints to create/retrieve/update cart by kiosk session.
   - Enforce purchase limits on the server (FR-2.3/FR-2.4) with explicit error responses for limit breaches.
   - Implement cart clear endpoint and remove-item endpoint that log audit events.
   - **Acceptance linkage:** US-006, US-007, US-008, US-009.

3. **Client Cart State Service**
   - Build or extend a cart state service (React context or store) that hydrates from the server and persists updates.
   - Implement optimistic updates for add/remove/adjust with rollback on API validation errors.
   - Ensure cart badge and cart view update within 200ms for add/remove/edit operations.
   - **Acceptance linkage:** US-006, US-007, NFR-1.2.

### Manual Payment Confirmation UX Prerequisites *(Phase 6 dependency for Phase 7)*

- Draft kiosk checkout copy that instructs customers to scan with their preferred payment app and tap "I have paid" to confirm.
- Add UI gate logic so the confirmation control only enables after the QR code renders and cart data is synchronized.
- Capture provisional confirmation payload on the client (session ID, basket hash) to send atomically once the button is pressed.
- Provide immediate visual feedback states (waiting, success, failure) that comply with FR-3.4/3.5 timing and accessibility rules.
- **Acceptance linkage:** Sets preconditions for US-011–US-014 and the forthcoming manual confirmation robot steps.

<!-- markdownlint-disable MD029 -->
4. **Quantity Controls and Purchase Limits**
   - Add +/- controls per cart item with disabled state when limit is reached (FR-2.4).
   - Display the exact limit message: “Maximum [X] of this item per purchase.”
   - Ensure controls satisfy 44x44px minimum size (FR-4.3) and are accessible.
   - **Acceptance linkage:** US-008, TC-FR-2.3/2.4, touch-target checks in US-008.

5. **Totals, Subtotals, and Currency Safety**
   - Standardize price arithmetic (integer cents or decimal utility shared in client/server).
   - Compute per-item subtotals and cart total in real time, keeping formatting consistent (FR-2.2).
   - Add unit tests for rounding and display formatting to prevent regressions.
   - **Acceptance linkage:** US-007, TC-FR-2.2-P01.

6. **Remove and Clear Cart Operations**
   - Implement remove item flow (per-item “Remove” button) and “Clear Cart” button.
   - Ensure removal updates total immediately and persists to server.
   - Log audit entries for each action (checklist item 4).
   - **Acceptance linkage:** US-009, TC-FR-2.2-P01.

7. **Inactivity Timer and Auto-Clear**
   - Implement 5-minute inactivity timer on the client and reset on any interaction (touch, scroll, button press, cart edit) per FR-2.5.2.
   - Trigger auto-clear on timeout: clear client state, call server clear endpoint, return to home screen.
   - Optional: implement the 30-second countdown warning (FR-2.5.3) without breaking the required behavior.
   - **Acceptance linkage:** US-010, US-010-Edge, US-010-Boundary, TC-FR-2.5-P01/N01.

8. **Performance and UX Hardening**
   - Verify cart operations update in <200ms (NFR-1.2) with instrumentation in dev builds.
   - Ensure touch targets and contrast requirements for cart controls comply with FR-4.3.
   - Handle empty cart state gracefully (TC-FR-2.1-N01).
   - **Acceptance linkage:** US-006–US-010 and edge cases from Test_Cases_v1.1.

9. **Testing and Validation**
   - Unit tests: cart service reducers, currency utilities, timer reset logic.
   - Integration tests: cart API endpoints with session persistence and limit enforcement.
   - Run acceptance suite [tests/acceptance/customer_shopping_cart.robot](tests/acceptance/customer_shopping_cart.robot) (US-006–US-010).
   - **Status – 2026-02-10:** Acceptance suite executed with 7/7 scenarios passing after cart UI synchronization fixes; no blocking defects remain.

<!-- markdownlint-enable MD029 -->

## Phase-to-Test Mapping

| Phase | Scope | Acceptance Tests |
| --- | --- | --- |
| Phase A | Cart persistence, add items, totals | US-006, US-007; TC-FR-2.1/2.2 |
| Phase B | Quantity controls, purchase limits | US-008; TC-FR-2.3/2.4 |
| Phase C | Remove and clear cart | US-009; TC-FR-2.2-P01 |
| Phase D | Inactivity timeout + reset | US-010; TC-FR-2.5-P01/N01; FR-2.5.3 optional |
| Phase E | Performance + accessibility hardening | NFR-1.2, FR-4.3; touch target checks in US-008/US-009 |

## Risks and Follow-Ups

- **Session identification:** Ensure kiosk session key is stable and survives refresh without cross-user leakage.
- **Timer reset coverage:** Any interaction path must reset the timeout (scrolls, modal opens, cart edits) to satisfy FR-2.5.2.
- **Currency accuracy:** Avoid floating-point arithmetic; ensure server and client use the same calculation strategy.
- **Limit enforcement parity:** UI and API must both enforce limits to prevent bypassing via stale client state.
