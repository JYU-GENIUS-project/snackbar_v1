# Manual Payment Confirmation Implementation Plan

## Objective

Align all planning artefacts with Issue [#22](https://github.com/JYU-GENIUS-project/snackbar_v1/issues/22) by replacing MobilePay-specific integration work with a manual customer payment confirmation flow while preserving the PERN architecture, security controls, and acceptance coverage already established in the roadmap and requirements.

## Guiding References

- Implementation cadence in docs/architecture/Implementation_Roadmap.md (Phases 6–8)
- Shopping cart delivery details in docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md
- C4 architecture baseline in docs/architecture/C4_Architecture.md
- ADR series under docs/architecture/decisions/
- Requirements set in reqeng/Software_Requirements_Specification_v1.2.md and reqeng/user_stories.md
- Automated acceptance coverage in tests/acceptance/customer_payment_checkout.robot, tests/TEST_SUMMARY.md, and test fixtures under tests/resources/

## Sequential Work Breakdown

### Phase 1 – Requirements and Story Realignment

1. Rewrite FR-3.x payment requirements in reqeng/Software_Requirements_Specification_v1.2.md to describe manual confirmation after QR scan and to remove MobilePay APIs while retaining non-functional guarantees (timeouts, accessibility, audit). 
2. Update customer payment user stories (US-011–US-015) and linked acceptance criteria in reqeng/user_stories.md so that confirmations happen via kiosk UI and admin audit rather than MobilePay callbacks.
3. Synchronise traceability references in reqeng/Test_Cases_v1.1.md so payment test cases cite manual confirmation steps.

**Acceptance/Test Hooks:** requirements documentation updated; cross-check docs/audits/traceability_audit_report.md remains consistent; note impacted Robot suites for later Phases (customer_payment_checkout.robot).

### Phase 2 – Roadmap and Phase Plan Updates

1. Replace MobilePay entries in docs/architecture/Implementation_Roadmap.md Phase 6 and Phase 7 with manual confirmation milestones (e.g., confirmation prompt UX, audit logging, admin reconciliation tooling). 
2. Adjust the Phase 7 deliverables to track manual reconciliation workflow, offline confirmation logging, and monitoring alerts that no longer use MobilePay webhooks.
3. Extend docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md with a new subsection covering payment confirmation UX prerequisites (modal design, confirmation button, inactivity timer overlap).

**Acceptance/Test Hooks:** Implementation roadmap table references manual confirmation; checklist items reference kiosk confirmation UX; `customer_shopping_cart.robot` remains valid after verifying references in Step 3.

### Phase 3 – Architecture and ADR Revisions

1. Update C4 diagrams and narrative in docs/architecture/C4_Architecture.md to reflect the kiosk-driven confirmation loop (remove MobilePay system boundary, add manual confirmation notes, highlight audit trail storage). 
2. Amend container interactions and sequence diagrams so the kiosk confirmation call hits the API directly, emphasising transaction persistence without third-party callbacks.
3. Revise ADR-003 (PERN Technology Stack) and any other ADRs mentioning MobilePay to justify the confirmed manual approach; introduce a short addendum referencing the operational rationale (cost, constraints).

**Acceptance/Test Hooks:** Architecture assets match the new flow; diagrams re-render without MobilePay nodes; ADRs approved per governance process defined in docs/architecture/decisions/README (if present).

### Phase 4 – Operational and Configuration Documentation

1. Remove MobilePay environment variables and secrets from docker-compose.yml inline documentation and server/.env expectations. 
2. Document new configuration keys (if any) required to support manual confirmation audit logging in README.md and server/client onboarding docs.
3. Adjust database schema commentary in init-db/*.sql files to drop MobilePay-specific columns and propose fields for manual confirmation metadata if needed (e.g., confirmation timestamp, kiosk attendant ID fields).

**Acceptance/Test Hooks:** Compose file validated via `docker-compose config`; init-db scripts reviewed with psql dry run; README bootstrap commands unaffected by missing MobilePay variables.

### Phase 5 – Frontend/Backend Planning Notes

1. Document the manual confirmation UI elements and API endpoints in client/README.md and server/README.md (or equivalent) so developers understand the new interaction contract. 
2. Annotate Vite/server configuration expectations (e.g., server routes like POST /api/transactions/{id}/confirm) aligned with existing Express middleware patterns.
3. Ensure monitoring/logging sections emphasise manual confirmation audit events and admin dashboards outlined in Phase 8 of the roadmap.

**Acceptance/Test Hooks:** Dev onboarding instructions reference manual confirmation; API documentation consistent with Express route guidelines in server/src routes.

### Phase 6 – Acceptance Test Plan Alignment

1. Replace MobilePay terms in tests/acceptance/customer_payment_checkout.robot with manual confirmation narratives while preserving timing and accessibility assertions. 
2. Update tests/TEST_SUMMARY.md and tests/README.md to describe the manual confirmation workflow; ensure any MobilePay-specific fixtures or keywords in tests/resources/common.robot are refactored or flagged for removal.
3. Verify the traceability matrix in docs/audits/traceability_audit_report.md still maps user stories to updated tests after terminology changes.

**Acceptance/Test Hooks:** Robot suites execute in dry run mode (`robot --dryrun`) without MobilePay keywords; traceability report regenerated with new terminology.

### Phase 7 – Repository Sweep and Quality Gate

1. Perform a controlled search (`git grep mobilepay`) to confirm all remaining references are either historical notes or migration logs scheduled for removal. 
2. Run lint/format checks (markdownlint, prettier configurations as defined in package.json) on updated documentation to ensure formatting remains compliant.
3. Prepare a summary changelog entry (if applicable) and draft PR notes describing the scope of documentation updates and manual confirmation adoption.

**Acceptance/Test Hooks:** No functional tests fail in CI because only docs/config guidance changed; markdownlint and prettier scripts pass per package scripts; repository-level grep returns zero active MobilePay mentions.

## Dependencies and Coordination

- Coordinate with stakeholders owning acceptance tests to review manual confirmation keyword changes before merging.
- Ensure database migration plans (init-db/004+, Phase 6+ documents) remain compatible with manual confirmation metadata to avoid conflicting future migrations.
- Monitor Issue #21 branch work to prevent divergent assumptions about checkout flows.

## Deliverables

- Updated documentation and configuration notes that fully reflect manual payment confirmation.
- Acceptance test narratives and requirements aligned with the new flow.
- Verified removal of MobilePay references throughout planning materials.
