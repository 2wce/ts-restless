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

- [ ] Extend existing builder/Fetch suites before implementation. Replacing `original.clone().partialRouter({nested:{get:replacement}})` must leave `await original.build().nested.get(args)` returning the original body. Two Fetch handlers from the same implementation must retain their own options/context and leave its middleware array unchanged. Exercise nested remaining-route completion.
- [ ] Run `pnpm exec vp test run --project serverless router-builder.spec.ts ts-rest-fetch.spec.ts`; confirm clone/middleware regressions fail for the observed reason.
- [ ] Implement branch copying without copying functions/schema objects, and one partial-router merge/completion traversal. Copy route middleware before appending the generated handler:

```ts
const handlers = implementationOrOptions.middleware
  ? [...implementationOrOptions.middleware]
  : [];
handlers.push(routeHandler);
```

- [ ] Delegate `fetchRequestHandler` to `createFetchHandler(contract,router,options)(request,platformContext)`. Replace response exception translation/reselection with `evaluateResponse` while preserving adapter error construction, no-body/media/Blob/native writes and enablement.
- [ ] Reconfirm `requestRemoteAddress` has no production/public-export usage; remove it and its isolated tests. Remove implementation-restatement comments only in touched code; retain external constraints.
- [ ] Run full serverless project and assertion compiler, format touched files, self-review and commit only these files. Record commands, regressions, result and concerns in the task report.

### Task 2: Core definition ownership

**Files:** Modify `core/src/lib/response-error.ts`, `type-utils.ts`, `query.ts`, `standard-schema-utils.ts`; extend existing relevant tests. Design group7. Leave the ineffective type-probe deletion for Task10.

**Interfaces:** Keep exported aliases/public runtime signatures. `AreAllPropertiesOptional<T>` delegates to `IfAllPropertiesOptional<T,true,false>` without changing union/never behavior.

- [ ] Extend existing exact response/inference assertions for deeply nested routers, optional/required/empty/non-record/union/never cases. Run current assertion compiler to characterize them before extraction.
- [ ] Import the existing exported `FlattenAppRouter` and remove the private recursion. Use one optional-property predicate:

```ts
export type AreAllPropertiesOptional<T> = IfAllPropertiesOptional<
  T,
  true,
  false
>;
```

- [ ] Replace query key-then-unknown-index loops with `Object.entries` at the same unknown boundary; keep array/date/null/undefined/scalar and encoding behavior. Reuse `isContractTypeMarker` in top-level schema validation only.
- [ ] Run `pnpm exec vp test run --project core` and core assertion compiler; retain existing query/schema boundary suites. Use a temporary wrong expected inference value to prove added exact assertions fail, restore it, then rerun the compiler.
- [ ] Format, self-review and commit only Task2 files; record verification. Type-only tests are genuine checks and remain.

### Task 3: Explicit build and artifact prerequisites

**Files:** `libs/build-config/src/index.ts`, all ten public package `vite.config.ts` callers, `libs/ts-rest/{nest,react-query}/vite.config.ts`, `libs/non-strict-mode-test` task configuration, root task/script entry if necessary, `CONTRIBUTING.md`/build-config README. Design groups1/8.

**Interfaces:** Common `libraryConfig(entry,options)` owns generic defaults; package-owned `options.pack` carries `unbundle`/decorator plugins. The non-strict `typecheck` depends on `@ts-restless/core#pack` through Vite+.

- [ ] Reproduce the clean-artifact failure in an isolated temporary artifact state by moving `core/dist` aside and running non-strict typecheck; restore artifacts in a `finally`/trap. Do not delete unrelated outputs.
- [ ] Move React `unbundle:true` and Nest `swc.rollup(decoratorOptions('tsconfig.lib.json'))` to their existing configs, reusing existing dependencies/overrides. Remove package-name branching and update callers. Preserve common inputs/output/ESM/CJS/declaration policy.
- [ ] Give the owning non-strict task an explicit prerequisite, using the existing Vite+ task convention:

```ts
run: { tasks: { 'check-inference': {
  command: 'tsc --noEmit -p tsconfig.json',
  dependsOn: ['@ts-restless/core#pack'],
  cache: false,
} } }
```

- [ ] Route its public `typecheck` script through that task; ensure root checks expand prerequisites. Update contributor guidance where the signature/task changes.
- [ ] Repeat the clean-artifact command and verify it builds declarations and succeeds. Run `pnpm build` and typecheck; final Task12 covers real packed Nest metadata/React directives.
- [ ] Format, self-review and commit only Task3 files, recording the clean-artifact proof.

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

- [ ] Add core behavior tests with independent schema fixtures that record invocation order and transform values; invalid locations return their portable errors while configuration/async-validator exceptions retain behavior. The new helper test must fail before implementation.
- [ ] Characterize existing native call order, aggregate/first error and disabled validation before replacing each adapter block. Remove unused native response arguments in Express/Fastify helpers. Preserve Next's current query-source behavior.
- [ ] Implement the neutral helper and replace adapter orchestration one package at a time, keeping native normalization and error constructors unchanged.
- [ ] For Nest transformed false/zero/empty/undefined output, add real handler regressions first. Select raw values only for failed validation rather than successful falsy values, while preserving validation-disabled fallback policies. Retain legacy short-circuiting.
- [ ] Run focused core/native suites after each adoption and the assertion projects. Extend existing HTTP conformance counters/transforms rather than a parallel fixture abstraction.
- [ ] Format, self-review and commit the cohesive request changes, recording any preserved native differences.

### Task 5: Nest decoration and response ownership

**Files:** Create a local Nest route-decoration helper if needed; modify `ts-rest.decorator.ts`, `ts-rest-nest-handler.ts`, `ts-rest.interceptor.ts` and current Nest suites. Design group4, after Task4.

**Interfaces:** Native method/metadata helpers stay local; consume existing `getNestRoutePaths`, native exported metadata constant and `evaluateResponse`. Preserve deprecated/modern APIs, virtual methods and missing-schema policy.

- [ ] Characterize single/multi route metadata, native parameter decorators, guards/interceptors and falsy metadata values through current public native tests. Verify `ROUTE_ARGS_METADATA` exists in admitted Nest9/10/11 package versions before importing it.
- [ ] Extract repeated method-decoration and route metadata/interceptor application locally. Copy metadata based on presence rather than truthiness only once regressions establish its intended behavior.
- [ ] Keep the missing response-declaration guard, then use `evaluateResponse` for body/metadata interpretation; map failures to current exceptions. Preserve thrown response-error causes, native content-type writes/status behavior and legacy interceptor policy.
- [ ] Run existing Nest and route-path suites, assertion compiler and strict metadata checks. Final Task12 includes actual package consumers and independent fixture evidence.
- [ ] Format, self-review and commit Task5, documenting deliberate native constraints.

### Task 6: OpenAPI sync/async preparation and assembly

**Files:** Modify `open-api/src/lib/contract-traversal.ts`, `parsers/{body,query-params,path-params}.ts` and current parser/standard-schema/OpenAPI suites. Design group6.

**Interfaces:** Existing sync/async APIs and converter signatures unchanged; follow `headers.ts`'s shared pure preparation/assembly pattern.

- [ ] Extend existing converter fixtures to record literal expected context/operation ordering and compare sync versus async output with hand-checked parameter/body/reference expectations. Characterize current serial order before extraction.
- [ ] Share schema/context preparation and pure output assembly; leave awaiting in async wrappers and retain separate sync returns. Do not add a general async interpreter or parallelize converters.
- [ ] Run OpenAPI/parser suites covering both dialects, requiredness/presence, nested operation IDs, type-only/no-body routes, definition references and legacy conversion. Preserve all PR46 regressions.
- [ ] Format, self-review and commit Task6; strict installed OpenAPI checks run in Task12.

### Task 7: Docs generation and consent policy ownership

**Files:** `apps/docs/generate-changelog.cjs`, docs Vite/tasks/manifest, changelog MDX, `tests/releases/changelog.test.mjs`, docs tests, `CookieBanner.tsx`, `PostHogProvider.tsx`, new docs-local consent module. Design groups9/11.

**Interfaces:** Generator supports `--check` with nonzero stale-output status; build task generates before MDX is read. Consent policy preserves `cookie_consent` values and mapping:

```ts
export const consentPersistence = (consent: string) =>
  consent === 'yes' ? 'localStorage+cookie' : 'memory';
```

- [ ] Extend existing changelog test with temporary input/output files and a hand-written prerelease entry; check mode must fail for stale output and succeed after generation. Do not infer publication from package headers.
- [ ] Separate pure parsing/rendering from I/O as needed, add freshness mode, and express generation before docs config/MDX compilation (task order alone inside an already loaded config may be too late). Refresh tracked MDX using the actual generator. Preserve fork/upstream links.
- [ ] Move storage/persistence policy to a neutral docs module; components retain UI and analytics lifecycles. Preserve hydration, accept/decline/dismiss, undecided/unknown values and absent key behavior.
- [ ] Verify current consent behavior through targeted existing DOM/browser facilities; avoid tests that only compare the helper to its own result. Run docs lint, full docs test/build/type/static checks and changelog suite.
- [ ] Self-review and commit Task7 with actual generation/consent evidence.

### Task 8: Packaging scenarios and consumer administration

**Files:** Split `tests/packaging/validator-independence.test.mjs` into colocated scenario-family suites; create a local consumer harness and readable scenario fixtures where they reduce nested source strings. Design group10.

**Interfaces:** Consumers still install real archives and compile/run outside workspace resolution. Preserve explicit supported versions, exact Next diagnostic matching and independent manifest/export baselines.

- [ ] Inventory every current top-level test/scenario family and its support versions into the report before moving code. Run existing package suite or use the recorded baseline before extraction.
- [ ] Extract repeated temporary creation/install/write/compile/execute/cleanup into a small local harness. Separate validator graphs/Next, React, query/reactivity and Fastify families into suites. Keep assertions with scenarios and administrative helpers free of shared expected behavior.
- [ ] Copy scenario source assets into disposable consumers before compilation/run; fixtures must not import workspace source. Use explicit deferred start observation only for the polling cancellation-start case; retain bounded observable-state waiting where native APIs need it.
- [ ] Run `pnpm test:packages` with the same scenario/support coverage. Temporarily corrupt one literal scenario expectation, verify its suite fails, restore it and rerun that suite.
- [ ] Format, self-review and commit Task8, including the before/after inventory and mutation evidence.

### Task 9: Private examples and unused scaffolding

**Files:** Four unused microservice environment files, unused Next debounce hook, microservice user caller/posts service/React and Solid endpoint configuration, example READMEs/contributor endpoint guidance. Design group12 (AWS deletion belongs to Task1).

**Interfaces:** Server/client endpoints are caller-owned. Preserve users5002/posts5003 and current localhost defaults. Retain lowercase `port` compatibility when adding `PORT`.

- [ ] Reconfirm unused files have no imports/config replacements before removing them. No absence-only tests.
- [ ] Configure the posts-service user caller through `USERS_API_BASE_URL`, posts listening through `PORT ?? port ?? 5003`, and browser posts callers through `VITE_POSTS_API_BASE_URL ?? 'http://localhost:5003'`. Document exact inputs and defaults.
- [ ] Build affected examples. Run the real users/posts pair with default and alternate ports/URL inputs, fetch `/posts` and verify expected author/response behavior; stop spawned processes in cleanup. Keep independent services independent.
- [ ] Self-review and commit Task9 without API/support/release changes.

### Task 10: Selected comment and ineffective test cleanup

**Files:** `core/src/lib/type-utils.spec.ts`, empty microservice React test shell and implementation-restating comments across audited production/tooling files. Design group13, after structural tasks.

**Interfaces:** No public API removal. Exact assertions replace ineffective aliases:

```ts
type NullableOutput = Expect<
  Equal<SchemaOutputOrType<typeof zodObjectNullable>, { title: string } | null>
>;
```

- [ ] Replace unconstrained core aliases with exact output assertions, using the nullable schema in its case. Remove its placeholder after compiler coverage exists; show a temporary wrong nullable expectation fails, restore and recheck.
- [ ] Remove the empty React TODO-only suite after confirming `passWithNoTests`. Preserve all meaningful inference and native/package tests.
- [ ] Audit comments in production/tooling files; remove only implementation restatements. Retain licensing/credits, external constraints, compatibility rationale, API semantics and deprecation guidance. Avoid wholesale JSDoc deletion or changing prose as a substitute for structure.
- [ ] Run full source/inference checks and relevant tooling checks; self-review and commit Task10 with cleanup scope.

### Task 11: Accepted rationale and delivery record

**Files:** Existing architecture/roadmap/plan index, short ADR for consequential shared-request/state ownership, this plan's execution record and dated evidence if measurements need a separate record. Design groups3/4/5 and final scope.

- [ ] Record accepted shared parsed-request policy and link A03/A05/A06/A07/A08 rather than duplicating the canonical epic. Preserve old dated evidence and clearly distinguish locally implemented from merged/published.
- [ ] Update architecture ownership and current roadmap state for actual implementation; use verified main history for pre-existing merged status without inferring npm publication.
- [ ] Link approved design/plan/ADR from established indexes. Run docs lint and review prose for contradictions/support claims.
- [ ] Commit the record only after implementation evidence is accurate.

### Task 12: Full verification and repeated structural audit

**Files:** Review artifacts and necessary fixes only; evidence in this plan.

- [ ] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, `pnpm --filter @ts-restless/docs test`, affected example builds and host checks. Save full logs; report actual exits/counts. Repeat only after changes/failures justify it.
- [ ] Verify declaration/runtime artifact boundaries, no-Zod profiles, React directives/Nest metadata and all moved packaging scenario families. Independent root-free compatibility matrix remains the CI gate before integration; run relevant fixtures locally where feasible and label limits.
- [ ] Dispatch independent subagent reviews of special cases/hidden links/needless links/surplus against the final diff. Include spec compliance and code quality; resolve worthwhile findings, repeat affected checks and review until none remain worth fixing within approved scope.
- [ ] Preserve intentional native/compatibility special cases with rationale. Record final verified evidence and remaining external CI/publication limits, then commit all cohesive changes. No merge/publish operation is part of this task.

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
