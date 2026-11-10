# Express raw request typing implementation plan

> **For agentic workers:** Use the executing-plans skill inline. The F02 acceptance scope is already approved; do not spawn agents or add another approval loop.

**Goal:** Make Express handlers and middleware distinguish validated arguments from the untouched native request.

**Architecture:** Keep `ServerInferRequest` for top-level validated handler arguments. Derive native path parameters with core `ParamsFromUrl`; use Express's native query/header types and `unknown` for the unvalidated, parser-owned body. Middleware runs before validation, so neither schema input nor client input is a valid guarantee for its body/query/headers. No runtime request mutation or shared request extraction is added.

**Tech stack:** Node 26.12.0, pnpm 12.14.0, TypeScript 7.0.2; strict installed TypeScript 5.7.3 consumers for Express 4/5.

**Spec:** [F02 acceptance](release-readiness-backlog.md#f02--express-raw-request-typing).

## Constraints

- Preserve validated top-level outputs, native middleware order and Express parsing.
- Cover transforms, defaults, optional fields, raw header normalization and middleware request compatibility.
- Verify matching Express runtime/types without `skipLibCheck`; no peer expansion, publishing or A03 extraction.
- Root coordinates roadmap/public availability; this change supplies migration/support details and an Express Changeset.

## Steps

- [x] Run the existing Express source tests and inference check; recheck upstream issues 716/698 and PR876.
- [x] Extend `libs/ts-rest/express/src/lib/types.spec.ts` with transformed/defaulted params/query/body/headers. Assert native raw values and reject transformed-value reads in handlers/global/route middleware; run `pnpm --filter @ts-restless/express typecheck` and record the expected red diagnostics.
- [x] Correct `TsRestRequest` in `types.ts`, using `ParamsFromUrl` and native Express types. Preserve top-level `ServerInferRequest` and response inference. Run the inference check green.
- [x] Extend `conformance.spec.ts` for raw middleware values before successful/failed validation, native query parser behavior and JSON-query decoding without native mutation. Run `pnpm exec vp test run --project express`.
- [x] Extend existing independent Express4/5 fixtures with transform/default/optional/body/header type assertions and native HTTP cases; use `@types/express` 4.17.21/5.0.6, strict dependency checks. Build tarballs, install isolated fixtures, run their `test` and `build` scripts.
- [x] Record migration in the public Express/migration guides and exact support evidence in the inventory. Add an Express major Changeset because unsafe raw reads and the third internal inference generic no longer compile.
- [x] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint` and the docs test task. Record exact results here and in `/tmp/ts-restless-f02-progress.md`; commit verified task edits for root review.

## Review correction: validation-error middleware parameters

Express rematches the root `app.use` error layer and resets `req.params` to `{}` after route validation fails. The custom validation-error callback must allow missing native path parameters while route handlers/middleware keep their matched URL parameters. Preserve raw query/body/headers and `tsRestRoute`; do not restore or mutate parameters.

- [x] Add a single-route callback assertion to `types.spec.ts`: its required URL parameter is `string | undefined`, and assigning it unconditionally to `string` fails compilation. The old type fails with TS2344 and an unused expected-error directive; the corrected type passes.
- [x] Extend the existing invalid-body conformance case and Express4/5 archive fixtures to capture callback `params`, raw body and route metadata; verify the callback observes `{}` after route/global middleware observe string parameters.
- [x] Give only the validation-error callback a native request type with partial URL parameters in `types.ts`; retain required matched parameters for successful handlers and prevalidation route middleware. Focused inference and all 40 Express tests pass.
- [x] Update the migration guide/Changeset for optional callback params and rebuild strict Express4/5 archive consumers. Each native fixture passes 7 HTTP tests and its strict build. Full source733/package31/docs80 gates pass again; independent re-review finds no remaining issues.

The isolated fixture lockfiles refresh checksums for regenerated local archives only; their pinned native/compiler versions and strict declaration checks remain intact. CI uses non-frozen fixture installs for this same local-artifact reason. Combined-branch verification and PR delivery are coordinated separately by root.

## Baseline and prior art

2026-11-10: Express source tests passed, 4 files / 35 tests; Express inference check passed. Upstream issues 716/698 are closed as not planned; PR876 is closed, locked and unmerged. Its schema-input approach leaves headers as validated outputs and overstates native parser/prevalidation guarantees, so this correction stays native-owned.

## Verification checkpoint

- Strict workspace Express inference passed after the raw/native mapping and generic validation-error helper correction. Restoring the original request alias reproduces transformed-type mismatches, native middleware incompatibilities and unused negative assertions; the fix was restored immediately.
- Express source suite: 4 files, 40 passed. Runtime cases cover both simple/extended parsers, repeated/nested query values, middleware-before-validation, missing defaults, lowercase raw headers and jsonQuery without mutation.
- Real archive consumers were copied outside the repository to avoid workspace source/module fallback. Express4.21.2/types4.17.21 and Express5.0.1/types5.0.6 each passed 6 HTTP tests and their strict TypeScript5.7.3 build, with `skipLibCheck: false`.
- The fixtures use CI's normal install command. Strict peer installation reported only the pre-existing Vite+ alias/version mismatch in developer tooling; native Express/core peers match the archive declarations. No native peer range or compiler checking was relaxed.
- Migration guidance contains a Twoslash-checked transformed-versus-raw handler example and explicitly covers middleware narrowing and removal of the third inference generic. Express major Changeset added.
- Full `pnpm check` passed: 733 tests, 2 existing todos, all production/inference tasks and lint with 352 existing warnings and no errors. `pnpm test:packages` passed 31 checks. Full docs build/typecheck/snippets and 80 tests passed; docs lint checked 372 links/anchors across 103 documents. Formatting and whitespace checks passed. No versioning, merge or publication performed.
