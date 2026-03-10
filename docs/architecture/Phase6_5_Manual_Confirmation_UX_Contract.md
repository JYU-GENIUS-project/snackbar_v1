<!-- markdownlint-disable MD013 -->
# Phase 6.5 UX Contract - Manual Confirmation Prompt

## Purpose

This document is the Phase 1 UX artifact for Issue #24. It defines the customer-facing manual confirmation prompt that Phase 7 must implement in the kiosk UI without changing the architectural flow, acceptance-test contract, or accessibility requirements already established in the workspace.

## Source Alignment

- [docs/architecture/Phase6_5_Manual_Confirmation_UX_Prerequisites_Implementation_Plan.md](docs/architecture/Phase6_5_Manual_Confirmation_UX_Prerequisites_Implementation_Plan.md)
- [docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md](docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md)
- [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md)
- [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md)
- [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md)
- [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md)
- [tests/acceptance/customer_payment_checkout.robot](tests/acceptance/customer_payment_checkout.robot)
- [tests/acceptance/admin_monitoring_troubleshooting.robot](tests/acceptance/admin_monitoring_troubleshooting.robot)

## Scope

This contract covers the Phase 6.5 prerequisite UX only:

- checkout-to-confirmation prompt transition
- prompt layout and content
- primary and secondary actions
- timer overlap expectations with the existing cart inactivity timer
- DOM IDs/classes required by acceptance tests
- visible customer states for success, failure, and uncertain outcomes
- browser test hooks required to simulate manual confirmation flows

This contract does not implement the Phase 7 backend confirmation persistence, retry, alerting, or admin reconciliation workflows.

## Existing Baseline

Current kiosk behavior in `client/src/components/KioskApp.tsx` exposes a generic checkout dialog with:

- a QR placeholder
- `Pay with mobile`
- `Print receipt`
- `Cancel`

That baseline does not satisfy the documented manual confirmation UX because the acceptance suite already expects:

- `manual-confirmation-modal`
- `confirm-payment-button`
- `payment-success-message`
- `payment-error-message`
- `payment-uncertain-message`
- manual confirmation guidance text
- a visible reference code
- timer/timeout visibility

## Target UX Outcome

When a customer taps checkout, the kiosk must transition to a manual confirmation prompt within 1 second. The prompt must guide the customer to pay using their preferred method, then explicitly confirm the payment on the kiosk using a single prominent primary action.

The prompt must preserve the trust-based kiosk interaction model:

1. customer reviews the total
2. customer scans or follows payment instructions
3. customer returns attention to the kiosk
4. customer taps `I have paid`
5. kiosk transitions to a visible outcome state

## Prompt Structure

### Modal identity

- Container ID: `manual-confirmation-modal`
- Required class: `manual-confirmation-modal`
- Modal role: `dialog`
- `aria-modal="true"`
- Focus must land on the primary confirmation action when the modal opens, unless that action is intentionally disabled while the QR/reference is still loading

### Minimum dimensions

The rendered prompt must be at least 300x300 pixels to satisfy the monitoring acceptance contract.

### Layout sections

The modal should render these sections in this order:

1. **Title**
   - Clear, action-oriented payment heading
2. **Instruction block**
   - Explains that the customer should complete payment and then confirm on the kiosk
3. **Reference and QR/payment area**
   - QR placeholder or equivalent payment area
   - machine-readable/visually readable reference code beginning with `CONF-`
4. **Cart summary**
   - total due
   - optional line-item summary or purchased items preview
5. **Timer information**
   - visible inactivity/confirmation timeout indicator
6. **Actions**
   - primary confirm action
   - secondary cancel action
   - later failure state may replace or augment with retry

## Recommended Wireframe

```text
+----------------------------------------------------+
| Confirm your payment                               |
| Complete payment using your preferred method.      |
| Show receipt to staff if requested.                |
|                                                    |
| [ QR / payment area ]                              |
| Reference: CONF-20260309-0001                      |
|                                                    |
| Total due: 5.00€                                   |
| Cart clears after inactivity: 00:30                |
| Confirmation timeout: 60 seconds                   |
|                                                    |
| [ I have paid ]   [ Cancel ]                       |
+----------------------------------------------------+
```

## Required Customer Copy

### Prompt title

Use copy that includes the phrase:

- `Confirm your payment`

### Prompt instructions

The body text must contain the following concepts because the Robot suites already assert them:

- `Confirm your payment on this kiosk`
- `Show receipt to staff`

Recommended copy:

> Confirm your payment on this kiosk after completing payment with your preferred method. Show receipt to staff if requested.

### Prompt primary action

- Button ID: `confirm-payment-button`
- Text: `I have paid`
- Required styling intent: primary button class containing `primary`

### Prompt secondary action

- Button text: `Cancel`
- Purpose: close the prompt and return the customer to cart review without clearing the cart

### Reference copy

The prompt must show a reference code prefixed with:

- `CONF-`

### Timer copy

The prompt must include visible timer language for both:

- cart inactivity overlap
- confirmation timeout

Recommended phrasing:

- `Cart clears after inactivity: 00:30`
- `Confirmation timeout: 60 seconds`

## Action Hierarchy

### Action hierarchy primary action

`I have paid` is the only primary action in the prompt.

Requirements:

- visually dominant over all other actions
- minimum 44x44px touch target
- initial focus target when enabled
- remains disabled until the prompt has fully rendered the QR/payment area and reference data

### Action hierarchy secondary action

`Cancel` is the only secondary action in the normal prompt state.

Requirements:

- visible but less prominent than the confirm action
- minimum 44x44px touch target
- closes the prompt without mutating cart contents

### Removed actions from current generic dialog

The following generic actions should not remain as top-level CTAs in the manual confirmation prompt:

- `Pay with mobile`
- `Print receipt`

If a receipt workflow is needed later, it should be nested or deferred so that it does not compete with the confirmation CTA.

## DOM and Selector Contract

### Prompt state

- Modal container: `#manual-confirmation-modal`
- Confirm button: `#confirm-payment-button`
- Confirm button class must include `primary`
- Modal class must include `.manual-confirmation-modal`

### Outcome states

- Success container: `#payment-success-message`
- Failure container: `#payment-error-message`
- Retry button: `#retry-payment-button`
- Cancel button in error state: `#cancel-payment-button`
- Uncertain state container: `#payment-uncertain-message`

### Supporting content

- Reference code text must include `CONF-`
- Success text must include `Payment Complete`
- Failure text must include `Payment Failed`
- Uncertain text must include `Manual confirmation pending`

## State Model

### State 1 - Prompt loading/readying

Purpose:

- show the prompt immediately while QR/reference data becomes ready

Rules:

- modal appears within 1 second of checkout click
- confirm button may be disabled briefly during setup
- a skeleton/loading indicator is acceptable inside the QR/reference area
- cancel remains available

### State 2 - Prompt ready

Purpose:

- customer can review instructions, QR/reference, and total, then confirm

Rules:

- confirm button enabled
- reference code visible
- timer indicators visible
- confirm button remains the dominant visual action

### State 3 - Success

Container:

- `#payment-success-message`

Required content:

- `✅`
- `Payment Complete`
- purchased items
- total amount

Rules:

- green visual treatment with WCAG AA contrast
- visible for at least 3 seconds
- represents transition to the completed purchase flow described in FR-3.4

### State 4 - Failure

Container:

- `#payment-error-message`

Required content:

- `❌`
- `Payment Failed`
- retry action
- cancel action

Rules:

- red visual treatment
- visible for at least 5 seconds
- cart contents remain unchanged
- inventory is not deducted

### State 5 - Uncertain/pending

Container:

- `#payment-uncertain-message`

Required content:

- `⚠️`
- `Manual confirmation pending`
- `If you were charged, you may take your items`
- visible admin contact information

Rules:

- does not automatically deduct inventory
- explicitly hands off to admin reconciliation flow in later phases

## Timer Overlap Contract

### Design decision

The manual confirmation prompt does not replace the existing cart inactivity model. Instead, it overlaps with it and makes the remaining time visible inside the prompt.

### Required behavior

1. Opening the manual confirmation modal counts as customer activity and resets the existing cart inactivity timer.
2. While the modal is open, the customer must still see a clear inactivity indicator.
3. The existing cart warning state from Phase 6 may continue to render globally, but the prompt itself must also surface the remaining time so the modal does not hide that information.
4. The prompt must show a visible confirmation timeout target of 60 seconds, matching FR-3.5.1 and the monitoring acceptance language.
5. Tapping `I have paid`, `Cancel`, or `Try Again` counts as activity and resets the cart inactivity counter.
6. If the cart inactivity path fires while the prompt is open, the cart-clear behavior wins and the kiosk must leave checkout cleanly.

### UX presentation rule

Use two separate but visually grouped timer lines:

- cart inactivity countdown
- confirmation timeout countdown

This avoids conflating session/cart inactivity with payment confirmation waiting time.

## Accessibility and Localisation

### Accessibility

The prompt must satisfy:

- 44x44px minimum touch targets
- high contrast styling
- accessible button labels
- focus trapping consistent with current kiosk dialog patterns
- readable reference code and timer text

### Localisation

All customer-facing strings in the prompt and outcome states should be sourced from localisation-friendly constants rather than embedded inline literals where practical.

## Browser Test Hooks

The kiosk must expose deterministic browser hooks for acceptance simulation:

- `window.simulateManualConfirmationSuccess()`
- `window.simulateManualConfirmationFailure()`
- `window.simulateManualConfirmationPending()`

These hooks are Phase 6.5 prerequisites because the current Robot contract already depends on them.

## Implementation Notes for Phase 2

When the team implements this contract in `client/src/components/KioskApp.tsx`, the first refactor should:

1. replace the current `checkout-dialog` markup with `manual-confirmation-modal`
2. replace generic payment action buttons with `I have paid` and `Cancel`
3. add reference and timer blocks
4. preserve modal focus/backdrop behavior already present in the kiosk
5. add the success/failure/uncertain display surfaces required by the Robot suites

## Out of Scope for Phase 1

The following remain Phase 7 work and are intentionally not locked here beyond UI contract expectations:

- final transaction API payload schema
- durable audit persistence details
- retry backoff policy implementation
- admin notification plumbing
- admin reconciliation UI

## Phase 1 Completion Statement

Phase 1 is complete when this UX contract remains the authoritative source for:

- manual confirmation prompt copy
- CTA hierarchy
- selector contract
- timer overlap behavior
- visible state expectations

Completed on 2026-03-09 for Issue #24.

<!-- markdownlint-enable MD013 -->
