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

- [x] Audit existing tooling versions for TypeScript compatibility (Node >=18 already satisfied).
  - Node 18+ verified via `server/package.json` engines field; Vite 5 and Express 5 toolchains support TS 5.x without upgrades.
- [x] Decide on minimum TypeScript version (recommended: 5.3+) and linting strategy (ESLint with `@typescript-eslint`).
  - Adopt TypeScript 5.4.x baseline with ESLint + `@typescript-eslint` plugin suite; align formatting with Prettier where already used.
- [x] Establish branch strategy for migration (feature branches per module, merge via PR with mandatory review/tests).
  - Enforce feature branches per logical module (e.g., `chore/ts-client-hooks`), require green CI (lint, test, type-check) before merge.
- [x] Communicate migration guidelines to all contributors (coding standards, null handling, type strictness).
  - Published baseline in `docs/TypeScript_Guidelines.md`; share link in next team sync and keep updated as rules evolve.

## Phase 1 – Shared Foundation

- [x] Add root-level documentation describing coding conventions (`docs/TypeScript_Guidelines.md`).
  - Shared standards published in `docs/TypeScript_Guidelines.md`; treat as living document.
- [x] Introduce shared type package (e.g., new workspace folder `packages/shared-types`) with initial scaffolding and tsconfig references.
  - `@snackbar/shared-types` scaffolded with placeholder export and build script; ready for incremental DTO additions.
- [x] Configure pnpm/npm workspaces if shared types will be published locally; otherwise plan for path aliases.
  - Root `package.json` now defines npm workspaces (`client`, `server`, `packages/*`) enabling local linking and shared scripts.
- [x] Define base tsconfig templates (`tsconfig.base.json`) reused by client/server to enforce consistent compiler options.
  - Added `tsconfig.base.json` and project reference root `tsconfig.json`; shared settings include strict nullability and node resolution.
- [x] Decide on strictness level (target `"strict": true`) and document exceptions policy.
  - Base config enforces strict mode plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes`; deviations require ADR per guidelines.

## Phase 2 – Client Tooling Enablement

- [x] Install TypeScript, React type packages, and ESLint TypeScript plugins in `client`.
  - Added `typescript`, `tslib`, React type definitions, and `@typescript-eslint` tooling to `client/package.json`; shared types package linked via workspace.
- [x] Create `client/tsconfig.json` extending base config; configure Vite to respect TS paths.
  - Introduced project config referencing base settings plus path mapping to `@snackbar/shared-types`; supplemental `tsconfig.node.json` covers Vite/Vitest configs.
- [x] Update Vite config (`client/vite.config.js`) to TypeScript (`vite.config.ts`) and ensure plugin settings compile.
  - Converted Vite and Vitest configs to `.ts` preserving proxy setup and test environment options.
- [x] Adjust npm scripts (e.g., `build`, `dev`, `test`) if needed for TypeScript entry files.
  - Updated lint target to include `.ts`/`.tsx` and added `type-check` script invoking `tsc --noEmit`.
- [x] Update ESLint configuration to include `.ts`/`.tsx` extensions and TypeScript parser.
  - Switched parser to `@typescript-eslint` and enabled recommended rule set while retaining existing React/A11y policies.

## Phase 3 – Client Code Migration

- [x] Convert entry points (`main.jsx`, `App.jsx`) to `.tsx`, adding minimal types for props/state.
  - `main.tsx` and `App.tsx` now type the auth/session state, API error handling, and history wrappers; HTML entry updated.
- [x] Migrate top-level providers/hooks (`hooks/useAuth.js`, `useCategories.js`, etc.) to TypeScript with explicit return types.
  - Converted `useAuth` and `useCategories` to `.ts` with typed payloads and React Query generics; JS shims now re-export from TS.
- [x] Migrate remaining data hooks to TypeScript.
  - [x] `hooks/useDebouncedValue.js`
  - [x] `hooks/useInventory.js`
  - [x] `hooks/useProducts.js`
  - [x] `hooks/useProductMedia.js`
  - [x] `hooks/useProductFeed.js`
  - [x] `hooks/useKioskStatus.js`
- [ ] Convert components directory iteratively; prioritize shared primitives (forms, tables) before specialized views.
  - [x] `components/ProductManager.jsx`
  - [x] `components/ProductTable.jsx`
  - [x] `components/ProductDetailModal.jsx`
  - [x] `components/ProductForm.jsx`
  - [x] `components/ProductMediaManager.jsx`
  - [x] `components/InventoryPanel.jsx`
  - [x] `components/AdminAccountsManager.jsx`
  - [x] `components/AuditTrailViewer.jsx`
  - [x] `components/CategoryManager.jsx`
  - [x] `components/KioskApp.jsx`
  - [x] `components/ProductGridSkeleton.jsx`
  - [x] `components/KioskPreview.jsx`
  - [x] `components/LoginPanel.jsx`
- [x] Update utility modules in `client/src/utils` and API layer `services/apiClient.js` to TypeScript, leveraging shared DTOs.
  - [x] `utils/analytics.js`
  - [x] `utils/inventoryCache.js`
  - [x] `utils/offlineCache.js`
  - [x] `utils/productPayload.js`
  - [x] `services/apiClient.js`
- [ ] Migrate test files to `.tsx`/`.ts` and ensure Vitest typings are configured via `vitest.config.ts` and `vitest.setup.ts` updates.
  - [x] `hooks/__tests__/useKioskStatus.test.jsx`
  - [x] `components/__tests__/ProductDetailModal.test.jsx`
- [x] Remove residual `.js/.jsx` files once equivalents exist and imports updated.

## Phase 4 – Server Tooling Enablement

- [x] Install TypeScript, `ts-node`, and `@types` packages for Node/Express ecosystem in `server`.
  - Server `package.json` now includes TypeScript compiler/runtime helpers plus ambient typings for core dependencies.
- [x] Create `server/tsconfig.json` extending base config; configure outDir (e.g., `dist`).
  - Added build and project configs targeting `dist/` with temporary `allowJs` to support existing JS during migration; paths wired to shared types.
- [x] Migrate build scripts: introduce `build` script running `tsc`, update `start` to launch compiled output (`node dist/server.js`).
  - Build + type-check scripts added; `npm start` now runs `tsc -b` via `prestart` then executes compiled output, with `start:js` fallback retained for rollbacks.
- [x] Update Jest config (`jest.config.js`) to support TypeScript (e.g., use `ts-jest` or `babel-jest`).
  - Jest leverages `ts-jest` transform and expanded glob patterns to cover mixed JS/TS sources.
- [x] Configure ESLint with TypeScript parser and updated ruleset.
  - Flat config imports `@typescript-eslint` plugin with `recommended-type-checked` rules gated by project-aware parser options.

## Phase 5 – Server Code Migration

- [x] Convert `server.js` entry point to `server.ts`, defining types for Express app, middleware, and error handling.
- [ ] Migrate middleware modules under `server/src/middleware`, ensuring `Request`/`Response` generics are applied.
  - [x] `middleware/errorHandler.js`
  - [x] `middleware/requestLogger.js`
  - [x] `middleware/auth.js`
  - [x] `middleware/rateLimiter.js`
- [ ] Update route handlers under `server/src/routes` to TypeScript, aligning response schemas with shared DTOs.
  - [x] `routes/health.js`
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
