<!-- markdownlint-disable MD013 -->
# Phase 6.5 Implementation Plan - Manual Confirmation UX Prerequisites

## Purpose

Implement and validate the Phase 6 manual confirmation UX prerequisites that unblock Phase 7 manual payment confirmation rollout for Issue #24. This plan is intentionally limited to the Phase 6.5 dependency slice: kiosk checkout UX, confirmation prompt affordances, timer overlap, and the acceptance/documentation work needed to hand off a stable baseline to Phase 7.

## Progress Tracker

- [x] Phase 1 - UX Contract and Artifact Baseline *(completed 2026-03-09)*
- [x] Phase 2 - Checkout Modal Refactor in Kiosk UI *(completed 2026-03-09)*
- [x] Phase 3 - Timer Overlap and Confirmation-State Orchestration *(completed 2026-03-09)*
- [x] Phase 4 - Phase 7 Backend Handoff Tasks for UX Dependencies *(completed 2026-03-09)*
- [x] Phase 5 - Acceptance, Traceability, and Documentation Closure *(completed 2026-03-09)*

## Source References

- [docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md](docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md)
- [docs/architecture/manual_payment_confirmation_plan.md](docs/architecture/manual_payment_confirmation_plan.md)
- [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md)
- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md)
- [reqeng/user_stories.md](reqeng/user_stories.md)
- [tests/acceptance/customer_shopping_cart.robot](tests/acceptance/customer_shopping_cart.robot)
- [tests/acceptance/customer_payment_checkout.robot](tests/acceptance/customer_payment_checkout.robot)
- [tests/acceptance/admin_monitoring_troubleshooting.robot](tests/acceptance/admin_monitoring_troubleshooting.robot)
- [docs/audits/traceability_audit_report.md](docs/audits/traceability_audit_report.md)
- [tests/TEST_SUMMARY.md](tests/TEST_SUMMARY.md)

## Architectural Guardrails

- Stay within the PERN architecture and REST API boundaries described in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
- Reuse the existing kiosk cart/session model already implemented in `client/src/hooks/useCart.ts`, `server/src/routes/cart.ts`, and `server/src/services/cartService.ts`.
- Do not reintroduce any third-party payment provider workflow; the UX must remain customer-agnostic and kiosk-driven per FR-3.x.
- Treat the Phase 6.5 work as a prerequisite layer for Phase 7, not as a replacement for the full confirmation persistence, retry, alerting, and reconciliation work scheduled in the roadmap.
- Preserve existing cart timeout behavior from FR-2.5/FR-2.5.2 and make the confirmation experience compatible with it rather than creating a second unrelated inactivity model.

## Current-State Audit

### Confirmed in workspace

- The kiosk already implements cart persistence, quantity controls, checkout entry, and inactivity warning/reset behavior.
- The checkout surface already exists in `client/src/components/KioskApp.tsx`, but it is still a generic checkout dialog with `Pay with mobile`, `Print receipt`, and `Cancel` actions.
- The shopping cart acceptance suite already validates timeout, warning, and cart reset behavior in `customer_shopping_cart.robot`.
- The payment acceptance suite already expects a manual confirmation modal and kiosk-controlled success/failure/uncertain states in `customer_payment_checkout.robot`.
- The roadmap already places full manual confirmation implementation in Phase 7 and explicitly states that Phase 6 provides UX prerequisites.

### Gaps discovered during review

1. **Missing manual confirmation component contract in the kiosk UI**
   - No `manual-confirmation-modal` or `confirm-payment-button` implementation currently exists in the kiosk code.
   - The current checkout dialog content and CTA hierarchy do not match FR-3.2 or the Robot selectors already documented.
2. **Missing timer overlap behavior in the checkout/confirmation state**
   - The cart inactivity warning exists globally, but the checkout dialog does not explicitly incorporate the countdown/timeout overlap required for the manual confirmation prompt experience.
3. **Missing test hook alignment for manual confirmation simulation**
   - Acceptance tests expect `window.simulateManualConfirmationSuccess()`, `window.simulateManualConfirmationFailure()`, and `window.simulateManualConfirmationPending()` hooks, but the current kiosk surface does not expose them.
4. **Missing documentation handoff for Phase 7 implementation owners**
   - The architectural intent is documented, but there is no dedicated Phase 6.5 work plan mapping the prerequisite UX changes to the specific Phase 7 backend, QA, and traceability follow-up tasks.
5. **No separate tracking spreadsheet artifact exists in the workspace**
   - No `.csv`, `.xlsx`, `.xls`, or `.ods` tracking sheet was found. The current traceability/tracking artifacts are `docs/audits/traceability_audit_report.md` and `tests/TEST_SUMMARY.md`.

## Delivery Goal

Deliver a Phase 6.5 baseline where the kiosk checkout flow visibly matches the manual confirmation architecture and the existing acceptance contract, so Phase 7 can focus on persistence, transaction state transitions, alerting, and reconciliation instead of redesigning the customer-facing UX.

## Sequential Work Plan

### Phase 1 - UX Contract and Artifact Baseline

**Owner:** Frontend + UX/Documentation

**Status:** Completed 2026-03-09

#### Phase 1 Objective

Define the exact Phase 6.5 confirmation UX artifact that Phase 7 must implement without changing the documented flow.

#### Phase 1 Subtasks

1. Replace the generic checkout action concept with a manual confirmation prompt specification aligned to FR-3.1 and FR-3.2.
2. Produce a lightweight UX artifact in one of these accepted forms:
   - annotated mockup under `docs/architecture/`, or
   - implementation-ready component state specification tied to `client/src/components/KioskApp.tsx`.
3. Lock the required customer-facing copy for the confirmation prompt:
   - QR/payment instruction text,
   - primary CTA text (`I have paid` / equivalent confirmation wording),
   - timer overlap text,
   - cancel/retry/support text.
4. Define the required DOM/test contract for the prompt and status states:
   - `manual-confirmation-modal`
   - `confirm-payment-button`
   - `payment-success-message`
   - `payment-error-message`
   - `payment-uncertain-message`
5. Confirm CTA prominence, placement, and touch-target sizing satisfy FR-4.3 and the existing Robot expectations.

#### Phase 1 Acceptance linkage

- Issue AC 1: UX artifacts exist for prompt, button prominence, and timer overlap.
- FR-3.1, FR-3.2, FR-4.3.
- US-011, US-012, US-018.

#### Phase 1 Tests / validation

- `customer_payment_checkout.robot`: US-011, US-012.
- `admin_monitoring_troubleshooting.robot`: US-057, US-057-Comprehensive.
- `reqeng/Test_Cases_v1.1.md`: TC-FR-3.1-P01, TC-FR-3.2-P01.

#### Phase 1 Deliverables

- UX artifact/spec captured in docs.
- Selector/state contract documented for frontend and QA.
- Deliverable completed in [docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Contract.md).

#### Phase 1 Completion Notes

- Replaced the generic checkout concept with a documented manual confirmation prompt contract aligned to FR-3.1 and FR-3.2.
- Locked the customer-facing copy, primary CTA hierarchy, selector contract, reference-code requirement, and timer overlap rules.
- Captured the required success, failure, and uncertain state expectations plus browser test hooks used by the Robot suites.

---

### Phase 2 - Checkout Modal Refactor in Kiosk UI

**Owner:** Frontend

**Status:** Completed 2026-03-09

#### Phase 2 Objective

Convert the current generic checkout dialog in `client/src/components/KioskApp.tsx` into the Phase 6.5 manual confirmation surface.

#### Phase 2 Subtasks

1. Replace the current checkout modal content with a manual confirmation modal that:
   - keeps the QR code region,
   - shows clear payment guidance,
   - promotes the confirmation action as the primary CTA,
   - retains a secondary cancel/close path.
2. Ensure the confirmation action remains disabled until the QR/prompt is ready, matching the roadmap note that the button is locked until checkout data is ready.
3. Preserve focus management, escape handling, and backdrop interaction patterns already used by existing kiosk dialogs.
4. Keep touch targets at or above 44x44px for all modal actions.
5. Ensure trust-mode/inventory warning messaging remains visible or intentionally restated in checkout contexts per the earlier Phase 5 guidance.

#### Phase 2 Acceptance linkage

- Issue AC 1.
- FR-3.1, FR-3.2, FR-4.3.
- US-011, US-012, US-017, US-018.

#### Phase 2 Tests / validation

- `customer_payment_checkout.robot`: US-011, US-012.
- `customer_shopping_cart.robot`: confirm checkout refactor does not regress cart access/entry flow.
- `reqeng/Test_Cases_v1.1.md`: TC-FR-3.1-P01, TC-FR-3.2-P01, TC-FR-3.2-N01.

#### Phase 2 Implementation targets

- `client/src/components/KioskApp.tsx`
- `client/src/styles.css`

#### Phase 2 Completion Notes

- Replaced the generic checkout dialog with the manual confirmation prompt surface defined in the Phase 1 UX contract.
- Added the required prompt copy, `manual-confirmation-modal` container, `confirm-payment-button`, confirmation reference block, timeout summary, and trust-mode warning treatment.
- Implemented prompt readiness gating so the primary CTA stays disabled until the payment area is ready, while preserving existing modal focus and backdrop behavior.

---

### Phase 3 - Timer Overlap and Confirmation-State Orchestration

**Owner:** Frontend

**Status:** Completed 2026-03-09

#### Phase 3 Objective

Make the checkout/manual confirmation experience compatible with the existing cart inactivity model and the documented waiting/error states.

#### Phase 3 Subtasks

1. Define how the cart inactivity timer behaves while the manual confirmation modal is open:
   - warning remains visible, or
   - warning is restated inside the confirmation prompt,
   - but the user must still receive a clear timeout signal.
2. Ensure the confirmation flow resets or respects the existing activity timer consistently on:
   - modal open,
   - QR render completion,
   - tapping `I have paid`,
   - retry/cancel interactions.
3. Add explicit UI state handling for:
   - waiting/pending confirmation,
   - success,
   - failure,
   - uncertain outcome.
4. Expose deterministic browser test hooks for the acceptance suite (`simulateManualConfirmationSuccess/Failure/Pending`).
5. Avoid creating a conflicting second timeout source; the Phase 7 confirmation timeout must build on the same user-visible interaction model.

#### Phase 3 Acceptance linkage

- Issue AC 1.
- FR-2.5, FR-2.5.2, FR-2.5.3, FR-3.4, FR-3.5, FR-3.5.1, FR-3.5.2.
- US-010, US-011, US-013, US-014, US-015.

#### Phase 3 Tests / validation

- `customer_shopping_cart.robot`: US-010, US-010-Edge, US-010-Boundary.
- `customer_payment_checkout.robot`: US-013, US-014, US-015.
- `admin_monitoring_troubleshooting.robot`: US-057-Comprehensive.
- `reqeng/Test_Cases_v1.1.md`: TC-FR-3.4-P01, TC-FR-3.5-P01, TC-FR-3.5.1-P01, TC-FR-3.5.2-P01.

#### Phase 3 Implementation targets

- `client/src/components/KioskApp.tsx`
- optional new state helpers under `client/src/components/` or `client/src/hooks/`
- `client/src/styles.css`

#### Phase 3 Completion Notes

- Added manual confirmation state orchestration for prompt, pending, success, failure, and uncertain outcomes directly in the kiosk checkout flow.
- Reworked the prompt timers to show live cart inactivity and confirmation countdowns, while resetting the shared cart activity window on checkout open, prompt readiness, confirm, retry, and cancel interactions.
- Exposed deterministic browser simulation hooks for success, failure, and pending/uncertain scenarios, and added the required `payment-success-message`, `payment-error-message`, `retry-payment-button`, `cancel-payment-button`, and `payment-uncertain-message` surfaces.

---

### Phase 4 - Phase 7 Backend Handoff Tasks for UX Dependencies

**Owner:** Backend

**Status:** Completed 2026-03-09

#### Phase 4 Objective

Record the backend work items that Phase 7 must pick up so the Phase 6.5 UX does not stall waiting for contract decisions.

#### Phase 4 Subtasks

1. Define the transaction/confirmation API contract that the Phase 6.5 modal will call once Phase 7 starts.
2. Confirm the transaction state model and audit payload fields align with FR-3.3 through FR-3.6:
   - kiosk session ID,
   - timestamp,
   - cart total,
   - declared payment method,
   - transaction status progression.
3. Identify the server implementation surfaces that Phase 7 must update:
   - `server/src/routes/transactions.ts`
   - `server/src/services/transactionService.ts`
   - `server/src/services/auditService.ts`
   - inventory deduction touchpoints in transaction/inventory services.
4. Lock the API/error contract needed by the frontend states for success, failed, pending/uncertain, and confirmation-unavailable outcomes.
5. Capture the retry/alerting dependency from the roadmap without implementing it in Phase 6.5.

#### Phase 4 Acceptance linkage

- Issue AC 2: implementation work items/tasks are linked for discovered gaps.
- FR-3.3, FR-3.4, FR-3.5, FR-3.6.
- US-012, US-013, US-014, US-015, US-059, US-065, US-066, US-068.

#### Phase 4 Tests / validation

- `customer_payment_checkout.robot`: US-012 through US-015.
- `system_technical_security.robot`: US-059.
- `system_integration_communication.robot`: US-065, US-066, US-068.
- `reqeng/Test_Cases_v1.1.md`: TC-FR-3.3-P01, TC-FR-3.4-P01, TC-FR-3.5-P01, TC-FR-3.6-P01.

#### Phase 4 Implementation targets

- `server/src/routes/transactions.ts`
- `server/src/services/transactionService.ts`
- `server/src/services/auditService.ts`
- related tests under `server/src/__tests__/`

#### Phase 4 Deliverables

- Backend handoff contract captured in [docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md](docs/architecture/Phase7_Manual_Confirmation_Backend_Handoff.md).
- Server implementation/documentation baseline clarified in `server/README.md` so implemented transaction creation behavior is separated from planned Phase 7 confirmation/list/audit endpoints.

#### Phase 4 Completion Notes

- Locked the Phase 7 backend contract around the existing transaction row and current supported statuses (`PENDING`, `COMPLETED`, `FAILED`, `PAYMENT_UNCERTAIN`) instead of inventing a separate confirmation persistence model.
- Mapped the completed kiosk UX states to explicit backend outcomes, error codes, inventory side effects, and audit payload expectations for FR-3.3 through FR-3.6.
- Recorded the concrete server surfaces that must be extended in Phase 7 and highlighted the current gap between documented planned endpoints and the route implementation that exists today.

---

### Phase 5 - Acceptance, Traceability, and Documentation Closure

**Owner:** QA + Documentation

**Status:** Completed 2026-03-09

#### Phase 5 Objective

Close the gap between the Phase 6.5 UX prerequisite work and the acceptance/tracking artifacts that govern Phase 7 readiness.

#### Phase 5 Subtasks

1. Update acceptance coverage if any selector, copy, or state naming changes are required after Phase 1/2 design decisions.
2. Keep `customer_payment_checkout.robot` as the primary customer-facing acceptance suite for the new prompt and state transitions.
3. Cross-check that cart timeout coverage remains valid after the modal/timer overlap decisions.
4. Update `tests/TEST_SUMMARY.md` with the final suite ownership and status for the new UX prerequisite scope.
5. Update `docs/audits/traceability_audit_report.md` if story-to-test mappings change.
6. Because no dedicated tracking spreadsheet exists in the repository, record plan/coverage status in the existing Markdown tracking artifacts rather than inventing a new spreadsheet outside the documented process.

#### Phase 5 Acceptance linkage

- Issue AC 3: required updates to tests, documentation, or tracking artifacts are identified and assigned.
- FR traceability across FR-2.5 and FR-3.x.

#### Phase 5 Tests / validation

- `customer_shopping_cart.robot`: US-010, US-010-Edge, US-010-Boundary.
- `customer_payment_checkout.robot`: US-011 through US-015.
- `admin_monitoring_troubleshooting.robot`: US-057 and confirmation prompt quality checks.
- `reqeng/Test_Cases_v1.1.md`: confirm TC-FR-3.1 through TC-FR-3.6 references remain accurate.

#### Phase 5 Documentation targets

- `tests/TEST_SUMMARY.md`
- `docs/audits/traceability_audit_report.md`
- optional note-back to `docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md` if implementation details diverge from the current prerequisite bullets

#### Phase 5 Deliverables

- Acceptance ownership and prerequisite-scope status recorded in `tests/TEST_SUMMARY.md`.
- FR-2.5 and FR-3.x traceability addendum captured in `docs/audits/traceability_audit_report.md`.
- No note-back to `docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md` was required because the implemented Phase 6.5 behavior remained aligned with the current shopping cart roadmap assumptions.

#### Phase 5 Completion Notes

- Re-read the authoritative UX contract before closing documentation so the acceptance summary and traceability audit match the current selector, copy, timer, and outcome-state contract.
- Recorded explicit suite ownership for the manual confirmation prompt, cart timeout overlap, and monitoring/performance expectations instead of leaving those responsibilities implied across the broader acceptance inventory.
- Added a targeted traceability addendum linking FR-2.5 and FR-3.x to the Phase 6.5 artifacts and the existing acceptance/system suites that will govern Phase 7 readiness.

## Work Items by Discipline

### Frontend work items

- Refactor `KioskApp.tsx` checkout dialog into a manual confirmation modal.
- Add prominent confirmation CTA and explicit modal/status IDs required by acceptance tests.
- Integrate timer overlap messaging and expose deterministic browser test hooks.
- Update `styles.css` for visual hierarchy, contrast, and touch-target compliance.

### Backend work items

- Finalize transaction confirmation API contract before Phase 7 coding begins.
- Persist manual confirmation metadata atomically and align audit/inventory side effects with FR-3.3 to FR-3.6.
- Provide response payloads that map directly to kiosk success/failure/pending/uncertain states.

### QA work items

- Validate selector contract against `customer_payment_checkout.robot`.
- Reconfirm cart timeout overlap behavior in `customer_shopping_cart.robot`.
- Extend test summary and traceability records once the prerequisite UX is implemented.

### Documentation work items

- Preserve one authoritative Phase 6.5 plan in architecture docs.
- Update test summary and traceability audit instead of introducing a new spreadsheet artifact.
- Record any Phase 7 contract decisions that become fixed during prerequisite implementation.

## Phase-to-Acceptance Matrix

| Phase | Primary Outcome | Issue Acceptance Criteria | Requirements / Stories | Tests |
| --- | --- | --- | --- | --- |
| Phase 1 | UX artifact and DOM/state contract | AC 1 | FR-3.1, FR-3.2, FR-4.3; US-011, US-012, US-018 | US-011, US-012, US-057 |
| Phase 2 | Manual confirmation modal replaces generic checkout dialog | AC 1 | FR-3.1, FR-3.2, FR-4.3; US-011, US-012, US-017, US-018 | US-011, US-012; TC-FR-3.1/3.2 |
| Phase 3 | Timer overlap and state orchestration | AC 1 | FR-2.5, FR-3.4, FR-3.5, FR-3.5.1, FR-3.5.2; US-010, US-013, US-014, US-015 | US-010, US-013, US-014, US-015 |
| Phase 4 | Backend dependency tasks linked for Phase 7 | AC 2 | FR-3.3 to FR-3.6; US-059, US-065, US-066, US-068 | TC-FR-3.3 to TC-FR-3.6; system suites |
| Phase 5 | Tests/docs/tracking artifacts updated and assigned | AC 3 | Traceability across FR-2.5 and FR-3.x | `customer_payment_checkout.robot`, `customer_shopping_cart.robot`, `tests/TEST_SUMMARY.md`, `docs/audits/traceability_audit_report.md` |

## Exit Criteria for Issue #24

Issue #24 can be considered ready to close when all of the following are true:

1. A reviewed UX artifact or component-level implementation exists for the manual confirmation prompt, CTA prominence, and timer overlap.
2. The kiosk checkout surface is planned to use the acceptance-test IDs/states already documented for manual confirmation.
3. Timer overlap behavior is explicitly defined against the existing cart inactivity model.
4. Phase 7 backend tasks are linked to concrete server routes/services and no longer blocked on frontend contract ambiguity.
5. The affected acceptance, summary, and traceability artifacts are identified with responsible disciplines and update points.

## Recommended Execution Order

1. Phase 1 - lock UX contract.
2. Phase 2 - refactor kiosk checkout surface.
3. Phase 3 - add timer overlap and manual-confirmation states.
4. Phase 4 - finalize backend contract handoff for Phase 7.
5. Phase 5 - update acceptance and traceability artifacts.

<!-- markdownlint-enable MD013 -->
