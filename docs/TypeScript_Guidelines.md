<!-- markdownlint-disable MD013 -->
# TypeScript Coding Guidelines

## Purpose

This document codifies the expectations for contributors migrating the Snackbar codebase to TypeScript. It supplements existing engineering standards and applies to both client and server packages.

## Tooling Defaults

- Target TypeScript version: **5.4.x**. Do not downgrade without team consensus.
- Enable `strict` mode plus `noUncheckedIndexedAccess`, `noImplicitOverride`, and `exactOptionalPropertyTypes` in all tsconfig variants unless an ADR documents an exception.
- Prefer path aliases defined in the shared base tsconfig instead of relative import ladders (`../../`).

## File & Module Conventions

- Client React components must use the `.tsx` extension. Non-JSX utilities should use `.ts`.
- Server files should use `.ts`; tests may stay `.test.ts` (Jest) or `.test.tsx` (Vitest) to align with tooling.
- Name files using existing PascalCase/camelCase patterns; avoid introducing new naming schemes during migration.
- Use ES modules with `import`/`export`; do not mix in CommonJS wrappers.

## Typing Practices

- Model API contracts with shared interfaces or `type` aliases inside `packages/shared-types`. Both client and server must import from there instead of duplicating shapes.
- Avoid `any`. When unavoidable, isolate usage with TODO comment including owner and cleanup issue link.
- Prefer `unknown` for untyped data (e.g., external libraries) and narrow via type guards.
- Express React props as explicit interfaces; annotate component return types with `ReactElement` or `JSX.Element` when not obvious.
- Use readonly arrays/tuples (`readonly T[]`) for data that must not be mutated downstream.

## State & Data Handling

- Define discriminated unions for state machines (loading/success/error) rather than loose booleans.
- When using React Query, leverage generics (`useQuery<FooResponse>`) to propagate DTO types through hooks.
- Ensure server-side database services map raw query results into typed domain objects before returning them.

## Error Handling

- Annotate custom error classes and Express error middleware with explicit payload contracts.
- For `fetch`/Axios replacements, create typed wrappers that surface typed error results rather than returning `any`.

## Nullability & Guards

- Enable `strictNullChecks`. Use early returns or guard clauses to handle nullish values instead of non-null assertions.
- Centralize environment variable parsing in a typed config module that fails fast when required values are missing.

## Testing Expectations

- Update test utilities to expose typed helpers (e.g., factory functions that return typed DTOs).
- For Vitest/Jest mocks, prefer `jest.fn<ReturnType, [Args]>` style helpers to ensure type-safe stubs.

## Documentation & Reviews

- Update module-level README files when public APIs change due to typing refinements.
- Call out any `ts-ignore` usage during code review and track removal work before GA.

## Exceptions Process

- Any deviation from these guidelines requires a documented rationale in `docs/decisions` (ADR format) and approval from tech leads.
