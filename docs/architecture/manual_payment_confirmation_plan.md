<!-- markdownlint-disable MD013 -->
# Manual Payment Confirmation Implementation Plan

## Objective

Align all planning artefacts with Issue [#22](https://github.com/JYU-GENIUS-project/snackbar_v1/issues/22) by replacing legacy third-party payment integration work with a manual customer payment confirmation flow while preserving the PERN architecture, security controls, and acceptance coverage already established in the roadmap and requirements.

## Status Tracker

- [x] Phase 1 – Requirements and Story Realignment _(SRS, user stories, initial test case conversion complete)_
- [x] Phase 2 – Roadmap and Phase Plan Updates _(Implementation roadmap + Phase 6 plan adjusted for manual confirmation)_
- [x] Phase 3 – Architecture and ADR Revisions _(C4 diagrams and ADRs updated for manual confirmation)_
- [x] Phase 4 – Operational and Configuration Documentation _(compose/.env cleaned, manual confirmation config documented, schema metadata shifted)_
- [x] Phase 5 – Frontend/Backend Planning Notes _(client/server READMEs document manual confirmation UI+API contract)_
- [x] Phase 6 – Acceptance Test Plan Alignment
- [x] Phase 7 – Repository Sweep and Quality Gate _(legacy provider references removed; manual confirmation payload validated via server test suite)_

## Completion Verification

| Phase | Evidence |
| ----- | -------- |
| Phase 1 | Manual flow requirements captured in [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md) and aligned stories in [reqeng/user_stories.md](reqeng/user_stories.md); traceability links refreshed in [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md). |
| Phase 2 | Manual confirmation milestones scheduled in [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md) and delivery steps elaborated in [docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md](docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md). |
| Phase 3 | C4 context and sequence diagrams updated in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md); ADR set reflects manual confirmation in [docs/architecture/decisions](docs/architecture/decisions). |
| Phase 4 | Legacy variables removed from [docker-compose.yml](docker-compose.yml) and configuration guidance refreshed in [server/README.md](server/README.md) and [client/README.md](client/README.md); schema notes adjusted through [init-db](init-db). |
| Phase 5 | Manual confirmation contracts documented in workspace READMEs and process docs: [client/README.md](client/README.md), [server/README.md](server/README.md), and shared guidance in [docs/architecture](docs/architecture). |
| Phase 6 | Acceptance narrative updated in [tests/acceptance/customer_payment_checkout.robot](tests/acceptance/customer_payment_checkout.robot) with manual confirmation keywords; summary synced in [tests/TEST_SUMMARY.md](tests/TEST_SUMMARY.md) and supporting resources. |
| Phase 7 | Repository search confirmed no active legacy provider references; lint and workspace tests run per project scripts (markdownlint, npm test --workspace server) with clean results. |

## Guiding References

- Implementation cadence in docs/architecture/Implementation_Roadmap.md (Phases 6–8)
- Shopping cart delivery details in docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md
- C4 architecture baseline in docs/architecture/C4_Architecture.md
- ADR series under docs/architecture/decisions/
- Requirements set in reqeng/Software_Requirements_Specification_v1.2.md and reqeng/user_stories.md
- Automated acceptance coverage in tests/acceptance/customer_payment_checkout.robot, tests/TEST_SUMMARY.md, and test fixtures under tests/resources/

## Sequential Work Breakdown

### Phase 1 – Requirements and Story Realignment

1. Completed: FR-3.x and related requirements now describe kiosk-driven confirmation and no longer list external providers in [reqeng/Software_Requirements_Specification_v1.2.md](reqeng/Software_Requirements_Specification_v1.2.md).
2. Completed: Stories US-011 through US-015 and acceptance bullets reflect manual confirmation in [reqeng/user_stories.md](reqeng/user_stories.md).
3. Completed: Payment traceability references point at manual confirmation steps in [reqeng/Test_Cases_v1.1.md](reqeng/Test_Cases_v1.1.md).

**Acceptance/Test Hooks:** requirements documentation updated; cross-check docs/audits/traceability_audit_report.md remains consistent; note impacted Robot suites for later Phases (customer_payment_checkout.robot).

### Phase 2 – Roadmap and Phase Plan Updates

1. Completed: Roadmap Phase 6/7 milestones track manual confirmation deliverables in [docs/architecture/Implementation_Roadmap.md](docs/architecture/Implementation_Roadmap.md).
2. Completed: Phase 7 deliverables focus on manual reconciliation, offline logging, and monitoring without webhooks.
3. Completed: Payment confirmation UX prerequisites documented in [docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md](docs/architecture/Phase6_Shopping_Cart_Implementation_Plan.md).

**Acceptance/Test Hooks:** Implementation roadmap table references manual confirmation; checklist items reference kiosk confirmation UX; `customer_shopping_cart.robot` remains valid after verifying references in Step 3.

### Phase 3 – Architecture and ADR Revisions

1. Completed: C4 diagrams and narrative highlight the manual confirmation loop and omit third-party providers in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
2. Completed: Container interactions show kiosk-to-API confirmation without external callbacks in [docs/architecture/C4_Architecture.md](docs/architecture/C4_Architecture.md).
3. Completed: ADR set references manual confirmation rationale in [docs/architecture/decisions/ADR-003-pern-technology-stack.md](docs/architecture/decisions/ADR-003-pern-technology-stack.md) and related records.

**Acceptance/Test Hooks:** Architecture assets match the new flow; diagrams re-render without the legacy provider nodes; ADRs approved per governance process defined in docs/architecture/decisions/README (if present).

### Phase 4 – Operational and Configuration Documentation

1. Completed: Legacy payment environment variables removed from [docker-compose.yml](docker-compose.yml) and workspace env docs.
2. Completed: Manual confirmation configuration documented for onboarding in [README.md](README.md), [client/README.md](client/README.md), and [server/README.md](server/README.md).
3. Completed: Schema commentary in [init-db](init-db) scripts reflects manual confirmation metadata and no legacy provider columns remain.

**Acceptance/Test Hooks:** Compose file validated via `docker-compose config`; init-db scripts reviewed with psql dry run; README bootstrap commands unaffected by missing legacy provider variables.

### Phase 5 – Frontend/Backend Planning Notes

1. Completed: Manual confirmation UI and API guidance documented in [client/README.md](client/README.md) and [server/README.md](server/README.md).
2. Completed: Vite/server configuration expectations note confirmation routes and middleware alignment in workspace documentation.
3. Completed: Monitoring and logging sections emphasise manual confirmation audit events per roadmap alignment.

**Acceptance/Test Hooks:** Dev onboarding instructions reference manual confirmation; API documentation consistent with Express route guidelines in server/src routes.

### Phase 6 – Acceptance Test Plan Alignment

1. Completed: Manual confirmation scenarios validated in [tests/acceptance/customer_payment_checkout.robot](tests/acceptance/customer_payment_checkout.robot).
2. Completed: Acceptance documentation reflects manual confirmation in [tests/TEST_SUMMARY.md](tests/TEST_SUMMARY.md) and supporting guides.
3. Completed: Traceability audit in [docs/audits/traceability_audit_report.md](docs/audits/traceability_audit_report.md) maps updated stories to tests.

**Acceptance/Test Hooks:** Robot suites execute in dry run mode (`robot --dryrun`) without legacy provider keywords; traceability report regenerated with new terminology.

### Phase 7 – Repository Sweep and Quality Gate

1. Completed: Repository searches confirm legacy provider references only exist in historical context.
2. Completed: Formatting checks (markdownlint, prettier, npm test --workspace server) executed with clean results.
3. Completed: Release communication drafted describing manual confirmation rollout and documentation updates.

**Status:** Completed 2026‑02‑17 — backend transaction payloads now use confirmation metadata, repository searches return no active legacy provider references, and the server workspace tests passed (npm test --workspace server) to validate the updated API contract.

**Acceptance/Test Hooks:** No functional tests fail in CI because only docs/config guidance changed; markdownlint and prettier scripts pass per package scripts; repository-level grep returns zero active mentions of the legacy payment provider.

## Dependencies and Coordination

- Coordinate with stakeholders owning acceptance tests to review manual confirmation keyword changes before merging.
- Ensure database migration plans (init-db/004+, Phase 6+ documents) remain compatible with manual confirmation metadata to avoid conflicting future migrations.
- Monitor Issue #21 branch work to prevent divergent assumptions about checkout flows.

## Deliverables

- Updated documentation and configuration notes that fully reflect manual payment confirmation.
- Acceptance test narratives and requirements aligned with the new flow.
- Verified removal of legacy payment provider references throughout planning materials.
