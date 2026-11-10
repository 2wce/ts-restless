# React 19 compatibility implementation plan

**Goal:** Verify the public React adapter with React 19 before expanding its peers, retaining React 18 and Query 5 coverage.

**Architecture:** Extend the existing installed-consumer fixture to check native dependency admission, strict ESM/CommonJS declarations and rendered provider/hooks. Native React/Query context, cache and error behavior remain adapter-owned; no framework upgrade or Query peer floor change is required.

**Spec:** [F03a acceptance](release-readiness-backlog.md#f03--verified-current-react-and-fastify-support), [support inventory](../support-inventory.md).

## Constraints

- Retain React 18 and Query 5.51.11/Core 5.51.9, 5.80.6 and 5.107.1 checks.
- Use React/DOM 19.3.1 with matching types 19.3.0 for React 19 consumers; inspect Query's native peers before selecting valid pairs.
- Keep strict library checking enabled and isolate consumers from workspace modules.
- No Fastify/global framework upgrade, merge, package versioning or publication.

## Execution

- [x] Run baseline React source tests and pack the public archives.
- [x] Extend `tests/packaging/validator-independence.test.mjs` to admit React 19 through a strict peer installation; reproduce the React 18-only public peer failure.
- [x] Verify provider/query/mutation/error behavior and strict root and `/v5` inference in real installed React 18/19 consumers, retaining native Query checkpoints.
- [x] Expand public/private React peers to `^18.0.0 || ^19.0.0` and align `tests/packaging/package-baseline.json` after compatibility proof.
- [x] Record verified pairings in the support inventory and migration guide; add a minor Changeset. Keep publication statements explicit.
- [x] Run focused tests, `pnpm check`, `pnpm docs:lint`, packed consumers and the docs suite; record exact results for the review commit.

## Evidence

Execution began at `f7be9e0d`, using Node 26.12.0 and pnpm 12.14.0. Baseline `pnpm exec vp test run --project react-query-v5` passed 34 tests; `pnpm pack:packages` built all public archives.

The two new React 19 rows failed strict peer installation with `ERR_PNPM_PEER_DEP_ISSUES`: `@ts-restless/react-query@4.0.0-alpha.3` required `react: ^18.0.0` despite native Query 5.80.6/5.107.1 admitting 19. Before changing production peers, a compatibility probe against the unchanged archives temporarily relaxed peer admission and passed all five React/Query pairs. Strict declaration checking stayed enabled throughout. The committed fixture restores strict peer installation.

No provider/hook production change was required. The fixture compiles root and `/v5` imports in `.mts`/`.cts` consumers with strict TypeScript 7.0.2 library checking and exact positive/negative inference assertions. Each pair runs rendered providers, selected queries, shared native cache, JSON mutations, invalidation/refetch, same-object query/mutation HTTP errors and transport exceptions through ESM and CommonJS root/alias entries. Existing infinite/later-page/cancellation checks remain. Browser-native cache timers are disabled with test-only `gcTime: Infinity`, matching nearby installed Vue/Solid fixtures; clients and React roots are explicitly cleared/unmounted.

After peer expansion, `pnpm test:packages` passed all 33 checks across four files, including all five strict-admission React pairs. `pnpm check` passed all 14 tasks: 728 source tests, two existing todos, all native production/inference checks, zero lint errors and 353 warnings. `pnpm --filter @ts-restless/docs test` passed the build/typecheck and 80 documentation checks. `pnpm docs:lint` verified 375 links/anchors across 103 documents. Changed-file formatting and `git diff --check` passed.

The lockfile keeps resolved workspace React 18.3.1 and changes only the public peer specifier. The Query 5 floor, framework development dependencies, release guards and package versions are unchanged. These are local packed/jsdom checks; the CI-only isolated framework fixture matrix, deployed browser and SSR/hydration are not covered by this slice. Published alpha.3 remains React 18-only; publication of the addition requires a containing release.
