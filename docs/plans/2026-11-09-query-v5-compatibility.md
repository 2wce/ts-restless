# Current Query v5 compatibility implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

**Authorization:** The user requested F01 and A11 implementation in parallel on 2026-11-09. This plan covers F01 only; React19, client execution extraction and publication remain separate.

**Baseline:** `30610fc413fd77688862079c0a541afebb5966b0`, alpha.2. Node26.12.0, pnpm12.14.0, TypeScript7.0.2. Existing Query development versions: React Query5.51.11/Core5.51.9. Query4 retention is under a separate support-baseline discussion; no removal is included here.

**Goal:** Make public packed `/v5` declarations work on the retained Query5 baseline and current Query5, preserving native inference and execution.

**Architecture:** Derive infinite and suspense-infinite options from the instantiated native hook's first parameter. Both old and current hooks have five generic parameters, while their option interfaces changed from six to five. This uses native declarations directly without copying overloads or detecting package versions. Bindings retain execution and page mapping; A11 owns their extraction.

## Constraints

- No peer narrowing, casts hiding declaration failures, `skipLibCheck`, React19 expansion, dependency-major change, or private-v5 release.
- Preserve keys, select, initial data, optional inputs, page parameters, errors, suspense, cancellation and existing Query4 checks.
- Extend existing packaging/runtime/inference suites; consume real core/public React tarballs in strict ESM/CommonJS consumers.

## Task 1: Reproduce and add installed-consumer regression

- [ ] Build baseline with `pnpm pack:packages`.
- [ ] Extend `tests/packaging/validator-independence.test.mjs` with exact Query5.51.11/5.80.6/5.107.1 consumers. Pin matching Core and React18/types; install public tarballs, never private-v5 source.
- [ ] Compile `.mts`/`.cts` with `--noEmit --strict --target es2024 --module nodenext --moduleResolution nodenext --esModuleInterop` and no `skipLibCheck`.
- [ ] Assert normal/infinite/suspense selected data, numeric page mapping, provided/absent initial data and rejected invalid request/page inputs. Confirm current baseline emits TS2707 before changing production.

## Task 2: Minimal native option composition

- [ ] In `libs/ts-rest/react-query-v5/src/v5/types/hooks-options.ts`, replace only infinite native option aliases with `Parameters<typeof nativeHook<DataResponse<TAppRoute>, ErrorResponse<TAppRoute>, TData, QueryKey, TPageParam>>[0]` and retain existing `Omit<'queryFn'>` and request mapping.
- [ ] Rebuild tarballs and rerun strict consumers; all exact baseline/current peers must pass.
- [ ] Extend existing Query5 runtime/inference suites for two-page selected results, cancellation and later-page declared errors; preserve suspense/initial-data assertions.

## Task 3: Delivery evidence

- [ ] Run focused Query5 tests, `pnpm typecheck`, `pnpm check`, `pnpm test:packages`, relevant docs tests, changed-file formatting/lint and whitespace.
- [ ] Record exact red/green versions/results, scoped public React Query patch Changeset and support evidence. Keep the package's existing Query5 peer promise.
- [ ] Review the standalone diff and the combined F01+A11 consumer/runtime result before draft PR delivery. No merge or publication.

## Execution record

Parent built baseline tarballs successfully. A disposable strict installed consumer on Query/Core5.107.1 reproduced TS2707 in both normal and suspense infinite option declarations and downstream lost inference. Baseline artifacts and compiler were real installed public packages, not source aliases. Remaining checkboxes record future work, not passed gates.

## Local implementation evidence (2026-11-09)

- Strict disposable Query/Core5.107.1 consumer reproduced TS2707 in both infinite option declarations before the fix.
- Persistent installed public ESM/CommonJS matrix passed on Query/Core5.51.11/5.51.9, 5.80.6/5.80.6 and 5.107.1/5.107.1. All three also executed two-page fetching, later-page same-object error rejection and cancellation reaching the selected fetcher.
- Reverting the production fix and rebuilding archives made the two newer version checks fail while the retained baseline passed. Restored the fix and rebuilt for delivery.
- Full `pnpm check` passed source/runtime/inference/lint/format checks; full `pnpm test:packages` passed 28 tests across four files. Existing warnings remain.
- Current development peers already form a compatible native set: Query5.51.11 resolves Core5.51.9. No dependency update or peer narrowing is needed for this option composition fix.
- The user subsequently approved removing TanStack Query4 completely from the first stable fork baseline and migrating Vue/Solid to Query5. That support/export migration is a separately coordinated slice; it replaces the earlier legacy proposal. F01 still preserves old Query5 baseline consumers.
- Local verification is not CI, merge or publication evidence. A11 and the Query5-only migration require combined validation before delivery.
