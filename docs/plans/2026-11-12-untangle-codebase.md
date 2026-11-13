# Untangle Codebase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Resolve the thirteen audited structural problem groups while preserving supported APIs and native ownership.

**Architecture:** Core owns neutral parsed contract evaluation and existing response evaluation. Native integrations retain normalization, policies, error constructors and writes. Package configs, docs modules and isolated consumer suites own the requirements that change with them.

**Tech Stack:** TypeScript, Standard Schema, Node 26.12.0, pnpm 12.14.0, Vite+, Vitest, native framework integrations and existing packed-consumer fixtures.

**Spec:** [Approved design and decision log](2026-11-12-untangle-codebase-design.md).

## Global Constraints

- Preserve current public API names, aliases and signatures, ESM/CommonJS, native routing/lifecycle/middleware/serialization/error identity and raw request identity.
- Preserve synchronous Standard Schema validation, validator-independent default entries and current `/legacy` compatibility entries. Both Fastify entries remain validator independent.
- Preserve native cache/providers/query keys/cancellation and Vue/Solid reactivity; retain supported query wrappers.
- Preserve adapter-specific enablement, schema invocation order, aggregation/first-error policies, media types, Blob/stream/cookie/empty-body behavior and undeclared-status policies.
- Preserve strict consumer/snippet checks, independent artifact expectations and all supported compatibility scenarios.
- Do not version packages, change support ranges/release guards, merge or publish.
- Use Node 26.12.0 and pnpm 12.14.0. Extend existing helpers and nearby tests. Do not add tests that mirror implementation or test simple file deletion.
- Perform selected test cleanup after structural work. Keep licensing, upstream credits, API semantics and external-constraint explanations.
- Native policy ambiguities are characterized before extraction; incidental bugs need a regression through public behavior.

## File and ownership map

| Task | Owner/files                                                                                     | Interface                                                                 |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1    | serverless builder, router, Fetch handlers, AWS mapper and nearby suites                        | Existing builder/Fetch signatures; existing core `evaluateResponse`       |
| 2    | core response/type/query/schema helpers and nearby suites                                       | Existing exported aliases and marker/query behavior                       |
| 3    | build-config, package Vite configs, non-strict config/task, contributor docs                    | Existing `libraryConfig` overrides; explicit artifact dependency          |
| 4    | core new request evaluator/export/test; Express/Fastify/Next/Nest/serverless request processing | `evaluateRequest` produces per-location results; native errors stay local |
| 5    | Nest decorators/handler/interceptor and nearby suites                                           | Local decoration helper; neutral response evaluation                      |
| 6    | OpenAPI traversal/body/query/path parsers and nearby suites                                     | Existing sync/async public API and converter ordering                     |
| 7    | docs changelog generator/build tasks/tests and consent components/module                        | Pure generation/check CLI; neutral local consent policy                   |
| 8    | packaging consumer suites/harness/scenario fixtures                                             | Real tarballs, strict compilers and native execution                      |
| 9    | private microservice endpoint inputs and dead example scaffolding                               | Existing localhost defaults and lowercase port compatibility              |
| 10   | selected comments and ineffective core/example tests                                            | Meaningful existing behavior/inference coverage                           |
| 11   | architecture, ADR, roadmap and execution evidence                                               | Current implementation status without publication inference               |
| 12   | review/verification only, then fixes covering actual findings                                   | Repeated structural audit and required checks                             |

### Task 1: Serverless construction and response ownership

**Files:** Modify `libs/ts-rest/serverless/src/lib/router-builder/index.ts`, `router.ts`, `handlers/ts-rest-fetch.ts`, `mappers/aws/api-gateway.ts`; extend their existing `.spec.ts` suites. Design groups2/5/12.

**Interfaces:** Consume existing `evaluateResponse({appRoute,response,validateBody})`; preserve builder/Fetch public signatures and errors. No new core dependency or public export is needed.

- [x] Extend existing builder/Fetch suites before implementation. Replacing `original.clone().partialRouter({nested:{get:replacement}})` must leave `await original.build().nested.get(args)` returning the original body. Two Fetch handlers from the same implementation must retain their own options/context and leave its middleware array unchanged. Exercise nested remaining-route completion.
- [x] Run `pnpm exec vp test run --project serverless router-builder.spec.ts ts-rest-fetch.spec.ts`; confirm clone/middleware regressions fail for the observed reason.
- [x] Implement branch copying without copying functions/schema objects, and one partial-router merge/completion traversal. Copy route middleware before appending the generated handler:

```ts
const handlers = implementationOrOptions.middleware
  ? [...implementationOrOptions.middleware]
  : [];
handlers.push(routeHandler);
```

- [x] Delegate `fetchRequestHandler` to `createFetchHandler(contract,router,options)(request,platformContext)`. Replace response exception translation/reselection with `evaluateResponse` while preserving adapter error construction, no-body/media/Blob/native writes and enablement.
- [x] Reconfirm `requestRemoteAddress` has no production/public-export usage; remove it and its isolated tests. Remove implementation-restatement comments only in touched code; retain external constraints.
- [x] Run full serverless project and assertion compiler, format touched files, self-review and commit only these files. Record commands, regressions, result and concerns in the task report.

### Task 2: Core definition ownership

**Files:** Modify `core/src/lib/response-error.ts`, `type-utils.ts`, `query.ts`, `standard-schema-utils.ts`; extend existing relevant tests. Design group7. Leave the ineffective type-probe deletion for Task10.

**Interfaces:** Keep exported aliases/public runtime signatures. `AreAllPropertiesOptional<T>` delegates to `IfAllPropertiesOptional<T,true,false>` without changing union/never behavior.

- [x] Extend existing exact response/inference assertions for deeply nested routers, optional/required/empty/non-record/union/never cases. Run current assertion compiler to characterize them before extraction.
- [x] Import the existing exported `FlattenAppRouter` and remove the private recursion. Use one optional-property predicate:

```ts
export type AreAllPropertiesOptional<T> = IfAllPropertiesOptional<
  T,
  true,
  false
>;
```

- [x] Replace query key-then-unknown-index loops with `Object.entries` at the same unknown boundary; keep array/date/null/undefined/scalar and encoding behavior. Reuse `isContractTypeMarker` in top-level schema validation only.
- [x] Run `pnpm exec vp test run --project core` and core assertion compiler; retain existing query/schema boundary suites. Use a temporary wrong expected inference value to prove added exact assertions fail, restore it, then rerun the compiler.
- [x] Format, self-review and commit only Task2 files; record verification. Type-only tests are genuine checks and remain.

### Task 3: Explicit build and artifact prerequisites

**Files:** `libs/build-config/src/index.ts`, all ten public package `vite.config.ts` callers, `libs/ts-rest/{nest,react-query}/vite.config.ts`, `libs/non-strict-mode-test` task configuration, root task/script entry if necessary, `CONTRIBUTING.md`/build-config README. Design groups1/8.

**Interfaces:** Common `libraryConfig(entry,options)` owns generic defaults; package-owned `options.pack` carries `unbundle`/decorator plugins. The non-strict `typecheck` depends on `@ts-restless/core#pack` through Vite+.

- [x] Reproduce the clean-artifact failure in an isolated temporary artifact state by moving `core/dist` aside and running non-strict typecheck; restore artifacts in a `finally`/trap. Do not delete unrelated outputs.
- [x] Move React `unbundle:true` and Nest `swc.rollup(decoratorOptions('tsconfig.lib.json'))` to their existing configs, reusing existing dependencies/overrides. Remove package-name branching and update callers. Preserve common inputs/output/ESM/CJS/declaration policy.
- [x] Give the owning non-strict task an explicit prerequisite, using the existing Vite+ task convention:

```ts
run: { tasks: { 'check-inference': {
  command: 'tsc --noEmit -p tsconfig.json',
  dependsOn: ['@ts-restless/core#pack'],
  cache: false,
} } }
```

- [x] Route its public `typecheck` script through that task; ensure root checks expand prerequisites. Update contributor guidance where the signature/task changes.
- [x] Repeat the clean-artifact command and verify it builds declarations and succeeds. Run `pnpm build` and typecheck; final Task12 covers real packed Nest metadata/React directives.
- [x] Format, self-review and commit only Task3 files, recording the clean-artifact proof.

### Task 4: Shared parsed-request evaluation and native adoption

**Files:** Create `core/src/lib/request.ts` and `request.spec.ts`; export from core index. Modify request evaluation in Express/Fastify/Next/Nest modern/serverless and the Nest legacy pipe only where its short-circuit policy remains identical. Extend current conformance/native suites. Design group3 and canonical A03/A05/A06/A07/A08.

**Interfaces:** Neutral evaluator of already parsed inputs, returning the existing result objects:

```ts
type ParsedRequest = {
  params: unknown;
  headers: unknown;
  query: unknown;
  body: unknown;
};
export function evaluateRequest(appRoute: AppRoute, request: ParsedRequest) {
  return {
    paramsResult: validateIfSchema(request.params, appRoute.pathParams, {
      passThroughExtraKeys: true,
    }),
    headersResult: validateMultiSchemaObject(request.headers, appRoute.headers),
    queryResult: validateIfSchema(request.query, appRoute.query),
    bodyResult: validateIfSchema(
      request.body,
      'body' in appRoute ? appRoute.body : null,
    ),
  };
}
```

Adapters prepare JSON queries/headers/body before this call and apply their own error/enablement policies afterwards. Legacy Nest may share a component-level selector rather than aggregate evaluation to preserve first-error invocation order.

- [x] Add core behavior tests with independent schema fixtures that record invocation order and transform values; invalid locations return their portable errors while configuration/async-validator exceptions retain behavior. The new helper test must fail before implementation.
- [x] Characterize existing native call order, aggregate/first error and disabled validation before replacing each adapter block. Remove unused native response arguments in Express/Fastify helpers. Preserve Next's current query-source behavior.
- [x] Implement the neutral helper and replace adapter orchestration one package at a time, keeping native normalization and error constructors unchanged.
- [x] For Nest transformed false/zero/empty/undefined output, add real handler regressions first. Select raw values only for failed validation rather than successful falsy values, while preserving validation-disabled fallback policies. Retain legacy short-circuiting.
- [x] Run focused core/native suites after each adoption and the assertion projects. Extend existing HTTP conformance counters/transforms rather than a parallel fixture abstraction.
- [x] Format, self-review and commit the cohesive request changes, recording any preserved native differences.

### Task 5: Nest decoration and response ownership

**Files:** Create a local Nest route-decoration helper if needed; modify `ts-rest.decorator.ts`, `ts-rest-nest-handler.ts`, `ts-rest.interceptor.ts` and current Nest suites. Design group4, after Task4.

**Interfaces:** Native method/metadata helpers stay local; consume existing `getNestRoutePaths`, native exported metadata constant and `evaluateResponse`. Preserve deprecated/modern APIs, virtual methods and missing-schema policy.

- [x] Characterize single/multi route metadata, native parameter decorators, guards/interceptors and falsy metadata values through current public native tests. Verify `ROUTE_ARGS_METADATA` exists in admitted Nest9/10/11 package versions before importing it.
- [x] Extract repeated method-decoration and route metadata/interceptor application locally. Copy metadata based on presence rather than truthiness only once regressions establish its intended behavior.
- [x] Keep the missing response-declaration guard, then use `evaluateResponse` for body/metadata interpretation; map failures to current exceptions. Preserve thrown response-error causes, native content-type writes/status behavior and legacy interceptor policy.
- [x] Run existing Nest and route-path suites, assertion compiler and strict metadata checks. Final Task12 includes actual package consumers and independent fixture evidence.
- [x] Format, self-review and commit Task5, documenting deliberate native constraints.

### Task 6: OpenAPI sync/async preparation and assembly

**Files:** Modify `open-api/src/lib/contract-traversal.ts`, `parsers/{body,query-params,path-params}.ts` and current parser/standard-schema/OpenAPI suites. Design group6.

**Interfaces:** Existing sync/async APIs and converter signatures unchanged; follow `headers.ts`'s shared pure preparation/assembly pattern.

- [x] Extend existing converter fixtures to record literal expected context/operation ordering and compare sync versus async output with hand-checked parameter/body/reference expectations. Characterize current serial order before extraction.
- [x] Share schema/context preparation and pure output assembly; leave awaiting in async wrappers and retain separate sync returns. Do not add a general async interpreter or parallelize converters.
- [x] Run OpenAPI/parser suites covering both dialects, requiredness/presence, nested operation IDs, type-only/no-body routes, definition references and legacy conversion. Preserve all PR46 regressions.
- [x] Format, self-review and commit Task6; strict installed OpenAPI checks run in Task12.

### Task 7: Docs generation and consent policy ownership

**Files:** `apps/docs/generate-changelog.cjs`, docs Vite/tasks/manifest, changelog MDX, `tests/releases/changelog.test.mjs`, docs tests, `CookieBanner.tsx`, `PostHogProvider.tsx`, new docs-local consent module. Design groups9/11.

**Interfaces:** Generator supports `--check` with nonzero stale-output status; build task generates before MDX is read. Consent policy preserves `cookie_consent` values and mapping:

```ts
export const consentPersistence = (consent: string) =>
  consent === 'yes' ? 'localStorage+cookie' : 'memory';
```

- [x] Extend existing changelog test with temporary input/output files and a hand-written prerelease entry; check mode must fail for stale output and succeed after generation. Do not infer publication from package headers.
- [x] Separate pure parsing/rendering from I/O as needed, add freshness mode, and express generation before docs config/MDX compilation (task order alone inside an already loaded config may be too late). Refresh tracked MDX using the actual generator. Preserve fork/upstream links.
- [x] Move storage/persistence policy to a neutral docs module; components retain UI and analytics lifecycles. Preserve hydration, accept/decline/dismiss, undecided/unknown values and absent key behavior.
- [x] Verify current consent behavior through targeted existing DOM/browser facilities; avoid tests that only compare the helper to its own result. Run docs lint, full docs test/build/type/static checks and changelog suite.
- [x] Self-review and commit Task7 with actual generation/consent evidence.

### Task 8: Packaging scenarios and consumer administration

**Files:** Split `tests/packaging/validator-independence.test.mjs` into colocated scenario-family suites; create a local consumer harness and readable scenario fixtures where they reduce nested source strings. Design group10.

**Interfaces:** Consumers still install real archives and compile/run outside workspace resolution. Preserve explicit supported versions, exact Next diagnostic matching and independent manifest/export baselines.

- [x] Inventory every current top-level test/scenario family and its support versions into the report before moving code. Run existing package suite or use the recorded baseline before extraction.
- [x] Extract repeated temporary creation/install/write/compile/execute/cleanup into a small local harness. Separate validator graphs/Next, React, query/reactivity and Fastify families into suites. Keep assertions with scenarios and administrative helpers free of shared expected behavior.
- [x] Copy scenario source assets into disposable consumers before compilation/run; fixtures must not import workspace source. Use explicit deferred start observation only for the polling cancellation-start case; retain bounded observable-state waiting where native APIs need it.
- [x] Run `pnpm test:packages` with the same scenario/support coverage. Temporarily corrupt one literal scenario expectation, verify its suite fails, restore it and rerun that suite.
- [x] Format, self-review and commit Task8, including the before/after inventory and mutation evidence.

### Task 9: Private examples and unused scaffolding

**Files:** Four unused microservice environment files, unused Next debounce hook, microservice user caller/posts service/React and Solid endpoint configuration, example READMEs/contributor endpoint guidance. Design group12 (AWS deletion belongs to Task1).

**Interfaces:** Server/client endpoints are caller-owned. Preserve users5002/posts5003 and current localhost defaults. Retain lowercase `port` compatibility when adding `PORT`.

- [x] Reconfirm unused files have no imports/config replacements before removing them. No absence-only tests.
- [x] Configure the posts-service user caller through `USERS_API_BASE_URL`, posts listening through `PORT ?? port ?? 5003`, and browser posts callers through `VITE_POSTS_API_BASE_URL ?? 'http://localhost:5003'`. Document exact inputs and defaults.
- [x] Build affected examples. Run the real users/posts pair with default and alternate ports/URL inputs, fetch `/posts` and verify expected author/response behavior; stop spawned processes in cleanup. Keep independent services independent.
- [x] Self-review and commit Task9 without API/support/release changes.

### Task 10: Selected comment and ineffective test cleanup

**Files:** `core/src/lib/type-utils.spec.ts`, empty microservice React test shell and implementation-restating comments across audited production/tooling files. Design group13, after structural tasks.

**Interfaces:** No public API removal. Exact assertions replace ineffective aliases:

```ts
type NullableOutput = Expect<
  Equal<SchemaOutputOrType<typeof zodObjectNullable>, { title: string } | null>
>;
```

- [x] Replace unconstrained core aliases with exact output assertions, using the nullable schema in its case. Remove its placeholder after compiler coverage exists; show a temporary wrong nullable expectation fails, restore and recheck.
- [x] Remove the empty React TODO-only suite after confirming `passWithNoTests`. Preserve all meaningful inference and native/package tests.
- [x] Audit comments in production/tooling files; remove only implementation restatements. Retain licensing/credits, external constraints, compatibility rationale, API semantics and deprecation guidance. Avoid wholesale JSDoc deletion or changing prose as a substitute for structure.
- [x] Run full source/inference checks and relevant tooling checks; self-review and commit Task10 with cleanup scope.

### Task 11: Accepted rationale and delivery record

**Files:** Existing architecture/roadmap/plan index, short ADR for consequential shared-request/state ownership, this plan's execution record and dated evidence if measurements need a separate record. Design groups3/4/5 and final scope.

- [x] Record accepted shared parsed-request policy and link A03/A05/A06/A07/A08 rather than duplicating the canonical epic. Preserve old dated evidence and clearly distinguish locally implemented from merged/published.
- [x] Update architecture ownership and current roadmap state for actual implementation; use verified main history for pre-existing merged status without inferring npm publication.
- [x] Link approved design/plan/ADR from established indexes. Run docs lint and review prose for contradictions/support claims.
- [x] Commit the record only after implementation evidence is accurate.

### Task 12: Full verification and repeated structural audit

**Files:** Review artifacts and necessary fixes only; evidence in this plan.

- [x] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, `pnpm --filter @ts-restless/docs test`, affected example builds and host checks. Save full logs; report actual exits/counts. Repeat only after changes/failures justify it.
- [x] Verify declaration/runtime artifact boundaries, no-Zod profiles, React directives/Nest metadata and all moved packaging scenario families. Independent root-free compatibility matrix remains the CI gate before integration; run relevant fixtures locally where feasible and label limits.
- [x] Dispatch independent subagent reviews of special cases/hidden links/needless links/surplus against the final diff. Include spec compliance and code quality; resolve worthwhile findings, repeat affected checks and review until none remain worth fixing within approved scope.
- [x] Preserve intentional native/compatibility special cases with rationale. Record final verified evidence and remaining external CI/publication limits, then commit all cohesive changes. No merge/publish operation is part of this task.

## Pre-execution conflict scan

| Pair/task         | Produced versus consumed                                                                              | Result                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1/4               | Both edit serverless router; Task1 response/ownership precedes Task4 request adoption                 | Execute sequentially         |
| 2/4               | Task2 schema predicate/query preserves behavior; Task4 imports them                                   | No signature change          |
| 3/7               | Build-config owns library config; docs Vite tasks owned by Task7                                      | Separate files               |
| 3/12              | Non-strict task creates core declarations before checks                                               | Verify fresh artifact state  |
| 4/5               | Nest request block adopted before decorator/response extraction                                       | Execute sequentially         |
| 6/8               | OpenAPI package unchanged by harness; packed tests use resulting archives                             | Keep strict installed checks |
| 7/11              | Docs changelog/component changes versus maintainer records                                            | Separate files; lint both    |
| 1/10,2/10,9/10    | Cleanup follows structural changes in the same files                                                  | No concurrent edits          |
| 1–12 individually | Each task preserves named signatures/policies and includes meaningful checks matching its deliverable | No unassigned spec group     |

## Execution record

Baseline `2ff1faee`; user approved design on 2026-11-12. Branch `feat/untangle-codebase` in the already-isolated worktree. Initial832 source tests passed with2 TODOs; docs lint503 links/122 documents passed;11 typechecks passed after manual core packing. The clean-worktree prerequisite failure is Task3's regression.

Ruling: use inherited-context subagent dispatch where isolated dispatch produces opaque task payloads; requirement/report files remain the task's source of truth. Cost: larger child context, with reliable delivery.

Task evidence is appended as implementation and reviews complete.

### Verified implementation checkpoints

The approved baseline remains `2ff1faee`, fetched on2026-11-12. Branch commits are local and unmerged; no versioning, merging or publication is part of this pass.

| Task | Implementation and evidence                                                                                                                                                                                                                                                                                                                                                                                    |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `329d99fe`/`4b937ad2`: contract-driven nested clone ownership, caller middleware copies, Fetch delegation and neutral responses.103 serverless tests/assertions passed. Review identified a route named `handler` ambiguity; contract-driven classification fixed it and re-review passed.                                                                                                                     |
| 2    | `633d53aa`: core flatten/optional inference, typed query iteration and existing marker predicate reuse. Core tests/assertions and deliberate wrong-expectation compiler proof passed.                                                                                                                                                                                                                          |
| 3    | `865a79f7`: owning package build options and non-strict declaration prerequisite. Clean-artifact RED11 diagnostics; GREEN rebuilt declarations automatically.12/12 typechecks and10/10 builds passed.                                                                                                                                                                                                          |
| 4    | `b230a393`: aggregate/per-location parsed request evaluation, adopted by all five server integrations.568 native/core tests and assertion compilers passed;8 public falsy transform regressions verified RED/GREEN. Legacy Nest first-error order remains.                                                                                                                                                     |
| 5    | `c2cc0108`: local native decoration and neutral response evaluation, preserving metadata presence and native precedence.118 Nest tests/assertions passed. Two falsy metadata HTTP regressions and two native path-precedence regressions verified RED/GREEN; independent re-review passed. Native constant export checked at Nest9.4.0/10.0.0/11.0.9/12.2.0.                                                   |
| 6    | `65d8c88c`: shared OpenAPI preparation/assembly, keeping serial converter execution and existing header batch.99 tests before/after across both dialects and strict library compiler passed; independent review passed.                                                                                                                                                                                        |
| 7    | `de964403`: changelog freshness/config-time generation and neutral docs consent policy. Production docs build/types,80 static checks,12 consent tests and2 changelog tests passed. Stale non-writing check and actual stale-MDX regeneration proved; independent review passed.                                                                                                                                |
| 8    | Scenario families/harness and11 copied source fixtures preserve all25 moved cases. Full package/release suite before38/38 in5files and after38/38 in9files passed; Fastify literal-expectation mutation failed2/2, restored2/2 passed. `5a74ecfb`: independent review approved; three minor findings corrected and scoped re-review approved.                                                                  |
| 9    | `e4e01986`: unused private scaffolding removed and caller-owned service/browser endpoints. Four example builds and default/alternate uppercase/lowercase real two-service HTTP journeys passed; independent review passed.                                                                                                                                                                                     |
| 10   | Exact nullable/output assertions now live in a compiler-only suite with explicit inclusion/artifact exclusion. Incorrect nullable expectation fails withTS2344; restored core compiler passes. Empty TODO-only React shell and implementation-restating comments removed; `pnpm check` passed883 tests in56 files, all15 tasks; independent review approved. Generator spacing cleanup passed2 existing tests. |

Task12 completes full combined checks and final structural review. Earlier task counts describe their recorded code, not a fresh claim for the eventual branch head. The independent root-free compatibility matrix remains a CI gate before integration. Known upstream Next declaration diagnostics retain exact matching; existing native expected-error logs and lint warnings are reported separately from failures. Supported APIs/native ownership, release guards and coordinated versions remain unchanged.

### Final verification (2026-11-13)

- `pnpm check`: exit0, 883 source tests in56 files and15 successful tasks; 0 lint errors, 365 warnings after the final surplus cleanup.
- `pnpm test:packages`: exit0, 38 tests in9 files after extraction, minor review corrections, the Nest ESM fix and the final contract-walker cleanup. All25 moved cases remain; strict modern-resolution/no-Zod/directive/native consumer checks are retained.
- `pnpm --filter @ts-restless/docs test`: exit0, production build, type/snippet checks,80 static checks and12 consent tests.
- `pnpm build:examples`: exit0, all13 tasks successful.
- Root-free Nest9/10/11: exact current tarballs installed in temporary workspaces without root node_modules, each passed2 runtime tests and native build. This caught an extensionless native constant import missed by source checks; using the explicit `.js` path restored ESM loading. The Nest assertion compiler and2 changelog tests passed after final source/spacing corrections.

`pnpm test:hosts` passed14 tests in2 files, both tasks successful. `5849e791` contains the independently reviewed ESM fix and generator spacing cleanup. The final combined check, current packed-consumer suite and rebuilt native host journeys all passed after the contract-walker cleanup; both independent final reviews and the scoped fix review are approved. Full logs are saved under `/private/tmp/untangle-final-*.log`. The final source and package logs end in `check-walker.log` and `packages-walker.log`; the rebuilt host log ends in `hosts-walker.log`. Documentation lint passes523 links/anchors across125 documents. The complete ten-fixture root-free compatibility matrix remains a CI gate before integration. Existing type-aware lint, experimental TypeScript API and docs build warnings remain; successful checks do not imply publication.

### Final review and execution rulings

The whole-branch review and independent repeated structural audit both approved spec compliance and quality, with the same minor surplus finding: initial remaining-route discovery accepted implementations even though all callers supply contracts. `6a0f2487` removes its two obsolete private classifiers and uses `isAppRoute` in a contract-only walker. All103 serverless tests and its assertion compiler passed; the scoped re-review approved the fix with no new findings. The final combined check again passed883 tests/56 files and15 tasks, with0 lint errors and365 warnings. The production import ownership map covers112 files: core imports no native integration, adapters depend on core, and React bundles its private React5 implementation. Native routing, legacy validation order, host serialization, supported version/dialect branches, exact Next diagnostics and bounded observable-state polling retain documented reasons to exist.

All controller rulings are retained here before removing the plan's temporary review workspace:

- Ruling: inherited-context dispatch used because isolated dispatch produced opaque task payloads. No shared-file concurrent implementation. Cost if wrong: larger inherited context and review routing rework.
- Ruling: root may progress disjoint Task4 files while single Task1 implementer owns serverless; Task4 serverless adoption waits for Task1 review. No concurrent git index mutations or shared-file edits. Cost if wrong: task-scoped implementation rework.
- Ruling: Task5 metadata export verification includes admitted Nest12 in addition to plan-listed9/10/11 — current peer range includes12 and scope preserves existing support; cost if wrong is extra read-only verification.
- Ruling: root may progress disjoint Task9 example files while Task3 child owns build configs — independent ownership avoids idle time; shared contributor docs, builds and index operations stay serialized. Cost if wrong is task-scoped rework.
- Ruling: docs own their UI test config/task rather than coupling consent tests to the root examples project — root RTL resolves React18 while docs useReact19, causing all12 renderer failures. Native doc-local ReactDOM tests avoid mixing runtime versions; docs task runs them, root examples exclude docs. Cost if wrong is test orchestration rework.
- Ruling: controller continues new task implementation after repeated unusable worker delivery; per-task independent reviews remain mandatory. Cost if wrong is reduced separation of implementation context.

All twelve implementation/verification tasks are complete locally. No worthwhile structural findings remain open within the approved scope. The branch is kept for integration review; no PR, merge, versioning or publication was performed. The ten-fixture compatibility matrix remains required in CI before integration, alongside the established pipeline gates.
