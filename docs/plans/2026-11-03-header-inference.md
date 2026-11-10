# Standard Schema header inference implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Execute the user-approved bounded fix with test-driven development and focused independent review.

**Goal:** Deliver fork issue [#3](https://github.com/2wce/ts-rest/issues/3): make client header inputs, server header outputs and runtime validation agree across Standard Schema validators.

**Architecture:** Correct the existing header inference helpers and normalize field-record names before composition and validation. Reuse Standard Schema input/output inference, validation, client normalization and the existing package-consumer harness. Whole-object schemas remain opaque and retain their existing validate-both merge semantics; their declared input keys must be lowercase.

**Spec:** The issue acceptance criteria and the bounded design approved in this chat on 2026-11-03.

## Constraints

- Work on `feat/standard-schema-header-inference` from `f90f37c0`.
- No validator-specific runtime branches, new validation framework or dependencies.
- Preserve request error status/location, passthrough headers and legacy bridging through `/zod3`.
- Field-record route overrides and `null` removals apply to the same HTTP name regardless of casing; whole-object schemas keep their separate merge semantics.
- Keep the full ten-fixture compatibility matrix in CI. Local source/type/package checks remain allowed.
- Keep release guards disabled and package versions unchanged. Record release intent with a core patch Changeset.

## Task 1: Reproduce header inference and runtime gaps

Files: `libs/ts-rest/core/src/lib/header-inference.spec.ts`, `libs/ts-rest/express/src/lib/ts-rest-express.spec.ts`, `tests/packaging/validator-independence.test.mjs`.

- [x] Add exact client/server assertions for a field record containing a mixed-case required string, a string-to-number transform, optional strings and an optional-input/defaulted-output schema. Use stable Zod 4, Valibot, a minimal Standard Schema and explicitly bridged old Zod 3.
- [x] Assert wrong/missing required inputs fail compilation. Assert nested-router base overrides, case-insensitive removal, plain contract headers and lowercase whole-object Zod 4/legacy schemas.
- [x] Runtime regressions must validate normalized names, transforms and required-header failures, preserve nested value keys and retain optional values. Exercise a real Express HTTP request with Supertest.
- [x] Extend the existing four strict packed consumer profiles with mixed-case header input/output assertions and ESM/CJS runtime validation. Do not add another consumer framework.
- [x] Run `pnpm exec vp test run --project core` and `pnpm --filter @ts-rest/core typecheck`; confirm failures originate in header inference/validation rather than setup.

Example type boundary:

```ts
// Client input: { 'idempotency-key': string; 'x-count': string; 'x-note'?: string }
// Server output: { 'idempotency-key': string; 'x-count': number; 'x-note'?: string }
headers: {
  'Idempotency-Key': z.string(),
  'X-Count': z.string().transform(Number),
  'X-Note': z.string().optional(),
}
```

## Task 2: Correct the existing helpers

Files: `libs/ts-rest/core/src/lib/dsl.ts`, `libs/ts-rest/core/src/lib/standard-schema-utils.ts`.

- [x] Apply `LowercaseKeys` to the complete inferred field output map. Use `UnknownOrUndefinedObjectValuesToOptionalKeys` on outputs, independently of inputs, so defaults and transforms retain their own optionality.
- [x] Infer plain contract headers through `ContractPlainType`, preserving their supplied optional keys.
- [x] Normalize both field records before their existing merge, at the type and runtime boundaries. Normalize incoming field-record data and schema lookup names; retain values and validator-provided issues.
- [x] Do not introspect opaque schema internals. Validate lowercase whole-object schemas directly, including stable Zod 4 and bridged old Zod 3.
- [x] Run core/Express regressions and native inference checks. Fix only failures caused by this scope.

## Task 3: Document and verify artifacts

Files: `apps/docs/content/docs/contract/overview.mdx`, `apps/docs/content/docs/standard-schema-migration.mdx`, `.changeset/standard-schema-header-inference.md`.

- [x] Document lowercase client/server keys, case-insensitive field-record overrides, transformed input/output types and the lowercase-key requirement for opaque whole-object schemas.
- [x] Record a core patch Changeset without versioning or publishing.
- [x] Format changed files, run `pnpm check`, `pnpm test:packages`, docs build/typechecks where affected, and `git diff --check` using pinned Node 26.12.0 and pnpm 12.14.0.
- [x] Request independent review against issue #3 and address actionable findings. Report verified local results and the outstanding CI-only matrix separately.

## Baseline

2026-11-03: core source suite passed (226 tests, one todo). The shell default Node was 24.15.0; subsequent verification uses the installed pinned Node 26.12.0 from NVM.

## Final local verification

- Red: ten new source runtime regressions failed, exact server-header assertions failed, the Express HTTP regression returned 400 for a valid request, and a strict packed consumer failed output inference.
- Green: pnpm check passed with 640 tests, two todos, all native inference projects, zero lint errors and the existing 390 warnings.
- pnpm test:packages passed all 13 checks, including four clean Standard Schema, Valibot, stable Zod 4 and legacy Zod 3 profiles with strict ESM/CJS header declarations and runtime validation.
- Docs build and checked Twoslash example passed; docs typecheck and all 25 static-site tests passed.
- Independent review identified missing ContractPlainType branding in composed plain maps. The reproduction failed before preserving the marker and passed afterward; nested composition now has source and packed-declaration coverage. The reviewer reported no remaining actionable findings.
- Full ten-fixture compatibility execution remains CI-only and must pass before merge. Release guards and package versions remain unchanged.
