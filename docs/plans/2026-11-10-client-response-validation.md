# Client response validation implementation plan

> **For agentic workers:** Use the executing-plans skill for these scoped steps. The roadmap owns current delivery status.

**Recorded:** 2026-11-10. **Baseline:** main `1fcd7a612cf83b658d1c8c40fa7b09f9f34734b6`, alpha.4. **Goal:** validate decoded responses consistently and exactly once, including custom fetchers, without changing transport decoding or query error policy.

**Architecture:** Fetchers own transport and decoding. Shared `fetchApi` owns the effective client/route validation policy and uses existing `evaluateResponse`. Standalone `tsRestFetchApi` retains validation support; client execution passes `validateResponse: false` to delegates to prevent duplicate transforms. The accepted [client validation decision](../adr/0008-client-response-validation.md) refines [response ownership](../adr/0002-response-ownership.md) and retains [query ownership](../adr/0003-query-ownership.md).

**Spec:** [F04 acceptance](release-readiness-backlog.md#f04--reliable-client-response-validation), upstream [#789](https://github.com/ts-rest/ts-rest/issues/789), [#858](https://github.com/ts-rest/ts-rest/issues/858), and [#696](https://github.com/ts-rest/ts-rest/issues/696).

## Constraints

- Keep Node 26.12.0, pnpm 12.14.0, synchronous Standard Schema validation and strict installed declaration checks.
- Normalize declared `c.noBody()` to `undefined`, independent of content type and validation enablement, for default and custom fetchers.
- Keep empty or malformed JSON distinct from declared no-body; do not catch JSON parsing errors and turn them into success.
- Preserve headers, status, fetcher failures and unchanged response-envelope identity. Query HTTP failures retain their existing same-object rejection policy.
- Explicit client `false` overrides route `true`; custom fetchers return decoded bodies and stop performing contract validation themselves.
- Do not add media-type policing, async schemas, branding/WeakMaps, adapters or release changes.

## Task 1: response validation and no-body normalization

**Files:** `libs/ts-rest/core/src/lib/client.ts`, `client.spec.ts` and `infer-types.spec.ts` nearby.

- [x] Add regressions proving invalid text/binary/custom outputs reject with `StandardSchemaError`; use literal invalid bodies and actual Standard Schema counters.
- [x] Cover default, standalone, custom-decoded and delegated default fetchers with a non-idempotent transform (`input` becomes `input!`) and assert exactly one validator call. Cover declared errors and disabled/client-over-route precedence.
- [x] Cover no-body with absent, JSON, text and binary content types, custom nonempty output, empty required JSON and malformed JSON. Run `pnpm exec vp test run --project core` and record expected failures.
- [x] Implement an internal finalizer using `evaluateResponse({ appRoute: route, response, validateBody })`. Throw its existing validation error; return the original envelope if its body is unchanged, otherwise spread the envelope with the normalized/transformed body.
- [x] Decode no-body before content-type dispatch. Decode remaining responses once with existing JSON/text/Blob policy, then call the finalizer.
- [x] Await the delegate in `fetchApi`, append `validateResponse: false` after extra arguments, and finalize against the original route and `clientArgs.validateResponse ?? route.validateResponseOnClient ?? false`.
- [x] Run focused core tests and strict core typecheck; retain schema-output inference for text/binary/no-body.

## Task 2: installed consumers and migration

**Files:** `tests/packaging/validator-independence.test.mjs`, `apps/docs/content/docs/client/fetch.mdx`, a core major Changeset.

- [x] Extend existing archive consumers in ESM/CommonJS and validator profiles: use a real HTTP server for plain `initClient` and `executeQueryRequest`, including exactly-once transforms, no-body and custom-fetcher validation.
- [x] Document default/custom validation ownership, disabling delegate validation, standalone usage, text/binary/error coverage, no-body normalization, parse failure behavior and the unreleased availability boundary.
- [x] Add a major Changeset explaining the custom-fetcher and no-body behavior changes and pointing to migration guidance. Do not change package versions.
- [x] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, `pnpm --filter @ts-restless/docs test`, and `git diff --check`; record exact outputs below.
- [x] Commit only owned verified files. Root performs independent review, shared ADR/roadmap updates and draft PR delivery.

## Verification record

Pre-fix focused tests demonstrated 19 expected failures for skipped text/binary/custom validation and inconsistent no-body outputs. The final focused core/React/Vue review run passed 350 tests with one existing todo; standalone, default, custom-decoded, delegated and query transforms are covered. No compiler or test gate was weakened.

Final gates:

- `pnpm check`: 14/14 tasks successful; 757 source tests passed, 2 existing todos. Strict inference/typechecks pass.
- `pnpm test:packages`: 33 passed across 4 files; real installed ESM/CommonJS default and custom clients/query execution, HTTP text/binary/JSON/no-body and four validator profiles.
- `pnpm --filter @ts-restless/docs test`: build/prerender/typecheck/lint and 80 docs/checker tests passed. Static exports contain migration and current availability guidance.
- `pnpm docs:lint` and `git diff --check`: passed.

Final logs: `/private/tmp/ts-restless-f04-final-check.log`, `ts-restless-f04-final-packages.log`, `ts-restless-f04-final-docs.log`. Initial broad runs hit sandbox DNS/listen failures and outdated exact wrapper/documentation expectations; reruns used native HTTP/registry access and corrected substantive assertions. Independent task and whole-branch reviews approved both spec compliance and code quality with no remaining findings.

ADR 0008, a major core Changeset, migration checklist and feature guide record the custom-fetcher ownership and no-body behavior changes. The small availability refresh verifies all ten alpha.4 public manifests and merged release PR #28; F04 itself is absent from alpha.4. Draft delivery is recorded in the PR. Publication requires a later containing release.
