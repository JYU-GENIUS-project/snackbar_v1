# TypeScript Migration Plan

## Current Context Snapshot

- Client: React 18 app bundled with Vite, source under `client/src`, tests with Vitest + Testing Library, linting via ESLint (JS/JSX).
- Server: Express 5 API under `server/src`, Jest for unit/integration tests, ESLint + Prettier toolchain.
- Shared contracts currently implicit; no TypeScript configuration or typings present in either package.
- End-to-end coverage handled by Robot Framework suites in `tests/`; these interact with built artifacts and will validate functional parity after migration.

## Objectives

- Introduce TypeScript tooling for both client and server without breaking existing build/test flows.
- Convert code incrementally while keeping the main branch releasable.
- Establish shared type definitions where client and server overlap (e.g., DTOs, enums, API responses).
- Maintain or improve automated test coverage throughout the migration.

## Non-Goals

- Large-scale feature rewrites outside of typing-related refactors.
- Changing bundler/runtime choices (Vite for client, Node/Express for server).
- Replacing existing test frameworks.

## Guiding Principles

1. **Parallel Workstreams**: Client and server teams can advance independently once shared foundations are set.
2. **Incremental Commits**: Prefer small, reviewable PRs converting related modules with clear typing wins.
3. **Compatibility First**: Keep JS entry points operational until their TypeScript counterparts are ready and verified.
4. **Automation Support**: Ensure lint/test/build pipelines run in CI for both JS and TS during the transition.
5. **Documentation**: Update README or internal docs alongside code changes to reflect new commands or standards.

## Phase 0 – Project Preparation

- [ ] Audit existing tooling versions for TypeScript compatibility (Node >=18 already satisfied).
- [ ] Decide on minimum TypeScript version (recommended: 5.3+) and linting strategy (ESLint with `@typescript-eslint`).
- [ ] Establish branch strategy for migration (feature branches per module, merge via PR with mandatory review/tests).
- [ ] Communicate migration guidelines to all contributors (coding standards, null handling, type strictness).

## Phase 1 – Shared Foundation

- [ ] Add root-level documentation describing coding conventions (`docs/TypeScript_Guidelines.md`).
- [ ] Introduce shared type package (e.g., new workspace folder `packages/shared-types`) with initial scaffolding and tsconfig references.
- [ ] Configure pnpm/npm workspaces if shared types will be published locally; otherwise plan for path aliases.
- [ ] Define base tsconfig templates (`tsconfig.base.json`) reused by client/server to enforce consistent compiler options.
- [ ] Decide on strictness level (target `"strict": true`) and document exceptions policy.

## Phase 2 – Client Tooling Enablement

- [ ] Install TypeScript, React type packages, and ESLint TypeScript plugins in `client`.
- [ ] Create `client/tsconfig.json` extending base config; configure Vite to respect TS paths.
- [ ] Update Vite config (`client/vite.config.js`) to TypeScript (`vite.config.ts`) and ensure plugin settings compile.
- [ ] Adjust npm scripts (e.g., `build`, `dev`, `test`) if needed for TypeScript entry files.
- [ ] Update ESLint configuration to include `.ts`/`.tsx` extensions and TypeScript parser.

## Phase 3 – Client Code Migration

- [ ] Convert entry points (`main.jsx`, `App.jsx`) to `.tsx`, adding minimal types for props/state.
- [ ] Migrate top-level providers/hooks (`hooks/useAuth.js`, `useCategories.js`, etc.) to TypeScript with explicit return types.
- [ ] Convert components directory iteratively; prioritize shared primitives (forms, tables) before specialized views.
  - [ ] `components/ProductManager.jsx`
  - [ ] `components/ProductTable.jsx`
  - [ ] `components/ProductDetailModal.jsx`
  - [ ] `components/ProductForm.jsx`
  - [ ] `components/ProductMediaManager.jsx`
  - [ ] `components/InventoryPanel.jsx`
  - [ ] `components/AdminAccountsManager.jsx`
  - [ ] `components/AuditTrailViewer.jsx`
  - [ ] `components/CategoryManager.jsx`
  - [ ] `components/KioskApp.jsx`
  - [ ] `components/KioskPreview.jsx`
  - [ ] `components/LoginPanel.jsx`
- [ ] Update utility modules in `client/src/utils` and API layer `services/apiClient.js` to TypeScript, leveraging shared DTOs.
- [ ] Migrate test files to `.tsx`/`.ts` and ensure Vitest typings are configured via `vitest.config.ts` and `vitest.setup.ts` updates.
- [ ] Remove residual `.js/.jsx` files once equivalents exist and imports updated.

## Phase 4 – Server Tooling Enablement

- [ ] Install TypeScript, `ts-node`, and `@types` packages for Node/Express ecosystem in `server`.
- [ ] Create `server/tsconfig.json` extending base config; configure outDir (e.g., `dist`).
- [ ] Migrate build scripts: introduce `build` script running `tsc`, update `start` to launch compiled output (`node dist/server.js`).
- [ ] Update Jest config (`jest.config.js`) to support TypeScript (e.g., use `ts-jest` or `babel-jest`).
- [ ] Configure ESLint with TypeScript parser and updated ruleset.

## Phase 5 – Server Code Migration

- [ ] Convert `server.js` entry point to `server.ts`, defining types for Express app, middleware, and error handling.
- [ ] Migrate middleware modules under `server/src/middleware`, ensuring `Request`/`Response` generics are applied.
- [ ] Update route handlers under `server/src/routes` to TypeScript, aligning response schemas with shared DTOs.
- [ ] Convert service layer modules to TypeScript, especially those interacting with the database (ensure `pg` typings are used).
- [ ] Introduce type-safe models/interfaces for entities (products, categories, inventory, users) in shared types package.
- [ ] Refine utility modules to TypeScript, handling environment config via typed `process.env` wrappers.
- [ ] Update Jest tests to `.ts` or keep `.js` with TypeScript-aware transpilation; ensure mocks provide types.

## Phase 6 – Data & Script Updates

- [ ] Evaluate `init-db` SQL scripts for needing TypeScript-driven generation; if none, document no changes required.
- [ ] Convert `server/scripts/seed.js` to TypeScript (`seed.ts`) and adjust package scripts accordingly.
- [ ] Ensure any ad-hoc utilities (e.g., backup, nginx scripts) remain compatible; document if TypeScript is unnecessary.

## Phase 7 – CI/CD and Toolchain Alignment

- [ ] Update Dockerfiles (client/server) to install TypeScript dependencies and use compiled artifacts where needed.
- [ ] Adjust docker-compose to reference compiled server build if applicable.
- [ ] Ensure lint/test steps in CI run both TypeScript-aware tooling and existing suites.
- [ ] Add type-check command to CI to catch compilation errors (`tsc --noEmit`).
- [ ] Update documentation (`README.md`, deployment guides) with new commands and prerequisites.

## Phase 8 – Validation & Clean-up

- [ ] Run full automated test stack (unit, integration, Robot suites) against TypeScript builds.
- [ ] Perform manual smoke testing on critical flows (admin product management, kiosk browsing, checkout).
- [ ] Remove deprecated configs (old ESLint rules, Babel settings if any) and ensure no JS-specific tooling remains.
- [ ] Monitor runtime logs for type-related regressions post-deployment and adjust typings as necessary.

## Risk & Mitigation Log

- [ ] **Risk**: Divergent typing standards between teams. *Mitigation*: Enforce shared tsconfig + lint rules, hold migration kick-off workshop.
- [ ] **Risk**: Build pipeline drift (JS vs TS). *Mitigation*: Maintain dual entry points until TS pipeline proven, add CI gates.
- [ ] **Risk**: Legacy tests failing due to module path changes. *Mitigation*: Update path aliases centrally, run tests at each increment.

## Tracking & Communication

- [ ] Establish weekly sync to review checklist progress and blockers.
- [ ] Maintain this document as the source of truth; update checkboxes and add notes per item as tasks complete.
- [ ] Capture decisions or exceptions in `docs/decisions` (ADR-style) for posterity.

## Ready-to-Start Checklist

- [ ] Assign owners for each phase/workstream.
- [ ] Confirm dependency installation strategy (npm, pnpm, yarn).
- [ ] Schedule initial PR to introduce base TypeScript configs (Phase 1 & partial Phase 2/4 groundwork).
