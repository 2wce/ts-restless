# Upstream Issue Fixes Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement each task with a task-scoped review. Steps use checkbox syntax for tracking.

**Goal:** Resolve fork issues #52–#57 on `feat/upstream-issue-fixes`.

**Architecture:** Preserve native framework ownership while repairing contract
identity, lifecycle metadata and public inference. Each task includes a regression,
the smallest implementation, migration/docs and a Changeset when public behavior
changes. Six tasks produce independently testable commits on the same branch.

**Tech Stack:** TypeScript, Vite+, Vitest, Standard Schema, Nest, Next, native
TanStack Query 5, Express and pnpm packed consumers.

**Spec:** [Approved design](2026-11-16-upstream-issues-design.md).

## Global Constraints

- Core remains framework-independent. Native integrations own guards, interceptors, routing, parsing, response writing, providers and reactivity.
- Retain public API names, conditional ESM/CommonJS entries, current peer ranges, strict installed-consumer checks and compiler-checked public examples.
- Extend nearby tests and existing packaging fixtures. Record consequential compatibility decisions in ADRs, update migration guidance and add appropriate Changesets.
- This work does not merge, version packages or publish a release.
- Use Node 26.12.0 and pnpm 12.14.0. Consumer compiler/runtime support remains separate from the contributor toolchain.
- Execute tasks sequentially; do not stage or commit another task's files. Only the controller updates this plan's status and the progress ledger.

Prefix local commands with `PATH=/Users/kudakwashe.mupeni/.nvm/versions/node/v26.12.0/bin:$PATH`.
Native HTTP tests require local socket access; rerun sandbox-denied commands with
the normal escalation mechanism. Baseline: 625/625 tests across core, nest,
serverless, vue-query and express. Branch starts at `f0526e37`.

## Task 1: Retain final Nest method metadata (#52)

**Files:** `libs/ts-rest/nest/src/lib/ts-rest-nest-handler.ts`, nearby
`ts-rest-nest-handler.spec.ts`, `test-projects/nest-{9,10,11}` existing lifecycle
fixtures as necessary, canonical Nest guide, one Nest Changeset.

**Interfaces:** Keep `TsRestHandler` signatures and generated route names.
Generated function metadata inherits from the original method; generated route
identity remains local. Native guards/interceptors are executed by Nest.

- [ ] Extend the existing falsy metadata/lifecycle test with both decorator orders and a rejecting guard. A generated route must return 403 when the method guard rejects, and must preserve guard-populated request data when accepted. Retain single-route controls and native Express/Fastify cases.
- [ ] Red: run `pnpm exec vp test run --project nest src/lib/ts-rest-nest-handler.spec.ts`. Confirm failure because the generated route omits guard/interceptor/custom metadata when the ts-rest decorator runs first, rather than because of sockets.
- [ ] Make generated function metadata inherit from the original function (for example, `Object.setPrototypeOf(generated, originalMethod)`), and attach the ts-rest handler interceptor to the original method. Keep routing metadata and the existing native path precedence regression intact. Do not snapshot guard/interceptor/custom metadata before native decorators finish, override Reflect APIs or call guards manually.
- [ ] Green: run the focused regression, then the full nest project and Nest production/inference type checks. Add or extend an installed/native retained-major probe if the source fixture alone cannot verify inherited metadata discovery.
- [ ] Update the Nest guide's native decorator behavior, add a patch Changeset and commit only task files as `fix(nest): retain native method metadata across decorator orders`.

## Task 2: Make mixed-format contracts portable (#53)

**Files:** `libs/ts-rest/core/src/lib/dsl.ts`, `type-utils.ts` if neighboring
contract brands block interoperability, nearby core inference/runtime tests,
`tests/packaging/package-check.test.mjs` and existing harness/fixtures,
canonical migration guide, an ADR and core Changeset.

**Interfaces:** `c.noBody()` stays a distinct symbol marker. `ContractNoBodyType`
must be portable across conditional entries without accepting arbitrary symbols.
Keep the `Opaque`/`UnwrapOpaque` API names and inference if their brand changes.

- [ ] Extend the existing installed package checks with `contract.cts` exported to an ESM `app.mts` and an ESM contract imported by a CommonJS consumer. Include no-body request/response, `c.type<{value:string}>()` and `c.type<null>()`. Add a runtime fetch response containing invalid JSON with a declared no-body response and assert body remains undefined.
- [ ] Red: pack current packages and run `pnpm exec vp test run --config tests/vite.config.ts tests/packaging/package-check.test.mjs`. Confirm the mixed unique-symbol declaration error and/or failed runtime no-body detection.
- [ ] Use a namespaced registered runtime symbol and portable declaration branding. A representative type is `symbol & { readonly '~ts-restless.no-body': true }`; use a localized cast at marker construction. If plain/null `Opaque` brands also fail, replace their module-local nominal keys with namespaced structural brand tokens while preserving unwrapping and distinct brands. Do not broadly accept arbitrary symbols or unrelated schemas.
- [ ] Green: freshly pack and run the installed regression under existing Node16/NodeNext/Bundler and older/current compiler modes; run core source/inference tests. Preserve strict checking and negative type assertions.
- [ ] Record the marker/brand decision in an ADR, document matching-package migration boundaries, add an appropriate core Changeset and commit as `fix(core): preserve contract identity across module formats`.

## Task 3: Preserve Next native error control flow (#54)

**Files:** `libs/ts-rest/serverless/src/lib/handlers/ts-rest-next.ts`, its spec,
`libs/ts-rest/serverless/src/lib/router.ts` only for a construction-time generic
escape callback, existing installed Next consumer coverage, canonical Next
serverless guide and serverless Changeset.

**Interfaces:** Keep public Next handler signatures and generic host errors.
Use Next's public `unstable_rethrow` from its optional Next entry. Any shared
constructor callback is internal and framework-neutral.

- [ ] Extend the real NextRequest spec with `redirect`, `permanentRedirect` and `notFound` handlers and middleware. Capture the actual thrown signal and assert the same signal escapes the adapter without conversion or application error-handler invocation. Add ordinary error/HTTP error controls and POST method/body forwarding.
- [ ] Red: run `pnpm exec vp test run --project serverless src/lib/handlers/ts-rest-next.spec.ts`; confirm native signals currently become HTTP responses.
- [ ] Call `unstable_rethrow(error)` before custom/generic conversion through the Next-owned construction callback. Retain generic error logging, deliberate HTTP errors, ordinary custom responses and CORS/response middleware behavior. Avoid private Next imports and generic public error-escape options.
- [ ] Green: run serverless source/type checks and existing installed Next15/16 consumers with native signals. Verify both Next entries and generic fetch/AWS controls; no new peer range or framework dependency at generic entries.
- [ ] Document native control flow and add a patch Changeset; commit as `fix(serverless): preserve native Next control-flow errors`.

## Task 4: Infer Vue mutation result context (#55)

**Files:** `libs/ts-rest/vue-query/src/lib/use-mutation.ts`, existing Vue
inference assertions/spec, `tests/packaging/fixtures/reactivity-types.ts.fixture`
and runtime fixture only where callback/reactivity behavior needs it, canonical
Vue query guide and Vue Changeset.

**Interfaces:** Add inferred `TOnMutateResult = unknown` to the callable wrapper,
options and native result; retain `MaybeRef`, native undefined optionality and
existing default call shapes.

- [ ] Extend inference assertions with synchronous and asynchronous onMutate, success/error/settled and per-mutate callbacks. The expected shape is `{ optimisticTodo: { id: number } }`; native optional access must compile without casts. Include computed/ref options and negative incompatible context accesses.
- [ ] Red: run `pnpm --filter @ts-restless/vue-query typecheck`; confirm the unknown context diagnosis before implementation.
- [ ] Thread the inferred generic through `MutationOptions` and `UseMutationReturnType` and the generic callable `DataReturnMutation`. Keep native execution and computed/unref behavior.
- [ ] Green: run Vue source tests/type checks and installed reactivity/inference consumers, including old/current supported Query5 where already covered by the matrix.
- [ ] Add a concise optimistic-update example and patch Changeset; commit as `fix(vue-query): infer optimistic mutation context`.

## Task 5: Native multipart encoding with JSON compatibility (#56)

**Files:** `libs/ts-rest/core/src/lib/client.ts`, existing core client tests,
existing Express multipart conformance test, client/migration guides, an ADR,
core Changeset and existing query transport coverage if needed.

**Interfaces:** Add `multipartFieldEncoding?: 'native' | 'json'` to
`OverrideableClientArgs`; absent means native. Request overrides and query
clients use the existing resolved client argument path. Caller FormData passes
through unchanged.

- [ ] Extend multipart tests with literal expected fields: string `Alice`, empty string, zero `0`, false `false`, null `null`, no undefined field, JSON object `{"id":1}`, repeated string/file arrays. Add native parser/schema validation for an email field and contrast explicit FormData. Include client-level JSON mode and per-request native override.
- [ ] Red: run `pnpm exec vp test run --project core src/lib/client.spec.ts --project express`; confirm extra quotation marks and undefined serialization cause the new expectations to fail.
- [ ] Encode native non-File values as untouched strings or JSON for supported non-string values; omit undefined only in native mode. JSON mode uses the historical JSON.stringify path unchanged. Files and array repetition remain intact. Explicit FormData is not transformed; native multipart parsers remain caller-owned.
- [ ] Green: run core/Express focused tests, core inference checks and query transport coverage for option/override forwarding. Verify false/zero/default/legacy branches and FormData identity.
- [ ] Record compatibility policy in an ADR and migration guide, document the option in client guides and add an appropriate core Changeset. Commit as `fix(core): encode multipart string fields natively`.

## Task 6: Export Express composition types (#57)

**Files:** `libs/ts-rest/express/src/index.ts`, `lib/ts-rest-express.ts`,
existing Express type assertions, installed package type consumer,
`apps/docs/content/docs/server/express.mdx`, Express Changeset.

**Interfaces:** Public `RouterImplementation<T>`,
`AppRouteImplementationOrOptions<T>` and `TsRestExpressServer = ReturnType<typeof initServer>`.

- [ ] Extend existing public-import inference/packed consumer checks with these types and a factory returning `RouterImplementation<typeof contract>`. Verify missing routes/wrong responses still fail.
- [ ] Red: run Express type checks and the focused packed type consumer; confirm missing public exports.
- [ ] Export the two existing definitions from the public barrel and the named server alias beside initServer. Do not duplicate mapping types or add a runtime factory API.
- [ ] Green: run source/inference and installed ESM/CommonJS checks. Add a compiler-checked modular factory example to the canonical guide.
- [ ] Add a minor Changeset and commit as `feat(express): export modular router implementation types`.

## Final verification and review

- [ ] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint` and `pnpm --filter @ts-restless/docs test` on the complete branch.
- [ ] Run `pnpm build:examples` and `pnpm test:hosts`; inspect exact supported native consumer coverage and run the independent CI compatibility matrix through normal branch CI when pushed.
- [ ] Review every issue's acceptance criteria, migration guidance and Changeset against the actual diff; obtain a whole-branch review and resolve actionable findings.
- [ ] Record exact evidence and branch status, distinguishing local verification, CI, merge and publication. Leave merge and publication to explicit maintainer actions.
