# Untangle ts-restless: audit and proposed design

Date: 2026-11-12. Status: approved by the user on 2026-11-12; implementation is recorded in the accompanying plan.

Repository: `/Users/kudakwashe.mupeni/.codex/worktrees/untangle-codebase/ts-rest`.
Baseline: `2ff1faee`, refreshed from `origin/main` at the user's request. This includes PR #46. Findings resolved by that OpenAPI/legacy-entry change are excluded.

The user requested installation and execution of `caldoai/skills/untangle-codebase` and chose both optional cleanups:

- Comments: Remove comments that only restate the code.
- Tests: Remove tests that wouldn't catch a real bug, and fix the ones that fail without one.

The skill is installed at `/Users/kudakwashe.mupeni/.codex/skills/untangle-codebase`. At the audit checkpoint repository source was unchanged. This document records the approved scope; execution evidence belongs in the accompanying plan.

## Recommended approach and alternatives

Use focused internal extractions and explicit ownership in the existing packages. Keep native integrations intact, reuse established helpers, and deliver each coherent group with its meaningful regression checks. Start with the reproduced mutable-state and build-prerequisite issues, then share contract semantics, then clean up tooling and selected comments/tests. Repeat the structural audit after implementation.

A library-only pass would leave documented build/docs/harness coupling unresolved. A public API redesign would require separate migration and compatibility decisions. The proposed complete pass includes the worthwhile internal improvements below while preserving current supported public APIs.

## Compatibility contract

- Preserve native routing, middleware order, lifecycle, dependency injection, serialization, streams, cookies, cancellation, query keys, cache, providers and Vue/Solid reactivity.
- Preserve Standard Schema sync validation and validator-independent default entries. Preserve the current `/legacy` compatibility entries from ADR0013–0015. Both Fastify native-major entries remain validator independent.
- Preserve existing public names, aliases, signatures, native error identity, enabled/disabled validation policies, undeclared-status rules and native raw request identity. Where structural changes expose an incidental bug, establish intended behavior through existing public-behavior tests before changing it.
- Preserve ESM/CommonJS and strict modern-resolution packed consumers, the independent compatibility workspaces and expected artifact baselines.
- Preserve release guards, package versions, coordinated release policy, stable/prerelease activation and publication controls. This work does not merge or publish anything.
- Integrate outstanding A03/A07/A08 work with the existing adapter-maintenance records; avoid a competing universal dispatcher or retiring supported query wrappers.

## Decision log: grouped fixes and their evidence

### 1. Make the non-strict consumer's artifact prerequisite explicit

`libs/non-strict-mode-test/tsconfig.json:7` maps core to `../ts-rest/core/dist/index.cjs.d.ts`. `vite.config.ts:117` runs typechecks without expressing that prerequisite, and the non-strict package's script does not build core. On a clean worktree the compiler silently falls back to core source under non-strict settings and fails with 11 diagnostics.

Resolution tracing confirmed the missing declaration and fallback to `core/src/index.ts`. Building only core with `vp run '@ts-restless/core#pack'` made the same non-strict check pass. Subsequent `pnpm typecheck` passed all 11 tasks.

Declare the dependency in the owning Vite+ task graph so fresh `pnpm check` and `pnpm typecheck` work without a remembered manual build. Keep this fixture checking built declarations rather than weakening compiler settings. Verify from a disposable clean artifact state, including failure sensitivity of an inference assertion.

### 2. Make serverless construction own its mutable state

- `libs/ts-rest/serverless/src/lib/router-builder/index.ts:61–66` shallow-copies `_router`; nested branches remain shared. Public `partialRouter()` writes through them at `:291–315`.
- `libs/ts-rest/serverless/src/lib/router.ts:350–356` appends generated handlers directly into a caller-supplied middleware array.
- `router-builder/index.ts:287–302` deletes remaining routes in two passes, with inconsistent dotted path construction in the second pass.
- `handlers/ts-rest-fetch.ts:33–44` and `:68–77` duplicate request wrapping, router creation and context mapping.

An in-memory execution of the real builder, with only types/imports removed, confirmed that replacing a cloned nested handler changes the original: both returned `replacement`, and their nested router branches were identical objects.

Copy router branches while preserving functions and route-option leaves, copy caller middleware before appending handlers, and merge partial routes/completion state in one traversal. Delegate single-request setup to the existing Fetch handler boundary. Keep completion inference, context typing, registration order and middleware/early-response semantics.

Extend existing builder and Fetch suites to prove clone independence, nested completion, reusable implementation ownership, repeated calls and context/options behavior. Retain real Fetch/platform consumers.

### 3. Give parsed-request contract evaluation one owner

- Express `src/lib/ts-rest-express.ts:88–134`, Fastify `src/lib/ts-rest-fastify.ts:130–177`, serverless `src/lib/router.ts:71–119`, Next `src/lib/ts-rest-next.ts:294–309` and modern Nest `src/lib/ts-rest-nest-handler.ts:335–353` repeat path/header/query/body schema evaluation and declaration selection.
- Express/Fastify validation helpers also accept unused native response arguments.
- Nest's legacy pipe repeats rules but short-circuits failures. Its output selection and the modern handler use truthiness to choose transformed values.

Extend core's existing request/schema boundary with an evaluator for already parsed values and explicit per-location outcomes. Adapters own normalization, enablement, native argument mapping, aggregation versus first-error policy and error construction. Establish schema call order/counts first. Adopt incrementally in Express, Fastify, Next, serverless and modern Nest; preserve legacy short-circuiting through smaller shared primitives if necessary. Characterize legitimate false/zero/empty/undefined transforms before changing Nest output selection.

Extend existing conformance/native suites for transforms/defaults/passthrough, every invalid location, aggregation, configuration exceptions, JSON queries, disabled checks, call order/counts and raw request identity. No framework-name switch or new host dispatcher in core.

### 4. Consolidate Nest-native decoration and response interpretation

- `nest/src/lib/ts-rest.decorator.ts:58–70` and `ts-rest-nest-handler.ts:96–109` duplicate method-to-native decorator selection and optional route paths.
- `ts-rest-nest-handler.ts:179–221` and `:234–253` repeat route-option/metadata/interceptor application.
- `:139–140` hardcodes `__routeArguments__`; `:186–197` copies only truthy method metadata.
- `:413–469` and the legacy interceptor independently select response metadata/validation rules despite the accepted core evaluator.

Use local Nest helpers for native method decoration and metadata application. Use the established native metadata constant only after verifying it across admitted Nest versions. Characterize falsy metadata through behavior tests. Retain virtual methods, method identity, parameter/design metadata, DI, guard/interceptor behavior and option precedence.

Adopt neutral `evaluateResponse` interpretation where policies permit, preserving missing-declaration errors, native writes, exception causes, legacy behavior and validator invocation counts. Extend existing Nest suites and packed metadata/declaration checks; retain Nest9/10/11 independent fixtures.

### 5. Adopt neutral response interpretation directly in serverless

`serverless/src/lib/router.ts:293–345` calls throwing `validateResponse`, catches its exception to create an adapter exception, and independently reselects media/no-body metadata.

Consume the neutral core result and construct the existing adapter error directly. Keep Blob media-type overrides/conversion, text/binary/JSON writes, empty bodies, no-body behavior, unknown statuses and ordinary error identity. Extend existing Fetch/platform response suites and packed consumers with validation off/on and one-call transforms.

### 6. Share OpenAPI preparation and assembly between sync/async entry paths

PR #46 already fixed conversion, dialects, input mutation and header conversion. Remaining duplicates are `open-api/src/lib/contract-traversal.ts:65–217` and path/query/body parser pairs. `parsers/headers.ts` now provides the local pattern: shared preparation/assembly with separate converter execution.

Follow that pattern for pure route/parameter result assembly and context/schema preparation. Keep synchronous versus asynchronous signatures and explicit serial converter invocation order. Do not add a general async interpreter. Preserve dialects, presence/requiredness, input/output selection, errors, references/components, legacy behavior and type-only/no-body cases.

Extend existing parser and OpenAPI suites with equivalent sync/async fixtures and observable callback-order checks. Keep #46's regressions and strict installed ESM/CommonJS OpenAPI consumers.

### 7. Reuse core-owned inference and marker definitions

- `core/src/lib/response-error.ts:37–45` duplicates exported `FlattenAppRouter` from `dsl.ts:343–352`: import it instead.
- `core/src/lib/type-utils.ts:112–125` duplicates optional-property inference: keep both exported aliases and implement one through the other, preserving distribution and `never` behavior.
- `core/src/lib/query.ts:47–51,84–88` suppresses unknown indexing errors: use typed entry iteration at those boundaries while retaining current scalar/Date/array/null/undefined/query behavior.
- `core/src/lib/standard-schema-utils.ts:269–270` duplicates the existing contract-marker predicate: reuse it without broadening field-schema acceptance.

Extend nearby exact inference assertions and existing query/schema suites where characterization is missing. Verify strict/non-strict projects and real packed declarations, not just runtime tests.

### 8. Move package artifact requirements to owning build configurations

`libs/build-config/src/index.ts:58,64–67` branches on the names `react-query` and `nest`. The common preset must change for package-specific artifact rules.

Declare React Query unbundling and Nest decorator transforms in their existing package configs using existing override/helper mechanisms. Common build tooling owns shared cache/task/artifact defaults. Do not add a plugin registry or extra configuration layer. Root test project orchestration can legitimately know native project requirements.

Verify library builds and real packed exports, especially Nest reflection metadata and React client directives.

### 9. Make docs changelog freshness an explicit build relationship

`apps/docs/generate-changelog.cjs` reads package changelogs and writes tracked MDX, but docs generation is a manual script separate from the docs build/test task. The current generated page begins at upstream `3.52.1`, while core's changelog begins at `4.0.0-alpha.6`. The actual generator would include alpha.6; a read-only comparison confirmed the checked-in output is stale.

Keep package changelogs canonical. Declare generation before MDX/docs compilation and add a check-only freshness mode if committed MDX remains. Separate deterministic parsing/rendering from filesystem I/O and extend the existing changelog tests with actual fixture source-to-output coverage. Preserve fork/upstream link ownership and historical entries; a changelog version alone does not prove publication.

Run docs lint and the full docs build/type/static-output checks after changes.

### 10. Separate packaging scenarios from repeated consumer administration

`tests/packaging/validator-independence.test.mjs` combines unrelated module graphs, Next diagnostics, validator profiles, React/provider/cache scenarios, shared execution inference, Vue/Solid lifecycles and Fastify-major checks. Disposable-consumer install/write/compile/execute/cleanup mechanics repeat across those families.

Split independent scenario families into colocated suites and readable fixture templates. Extract only repeated administration into a local harness. Copy fixtures into disposable consumers so all imports still resolve installed tarballs. Keep exact compiler exceptions, supported versions and independent public API/manifest expectations in their owning suites. Preserve test scenarios and root-free compatibility installs.

Bounded native-state polling is not a meaningless sleep. Prefer an explicit observable/deferred start signal where it covers existing cancellation scenarios; retain bounded waiting when there is no completion primitive. Verify all original scenario families, and use one deliberate fixture mutation to prove the harness still detects a regression.

### 11. Give docs consent policy a neutral local owner

`apps/docs/src/components/PostHogProvider.tsx:7` imports storage policy from the visual `CookieBanner`; both components repeat consent-to-persistence mapping.

A small docs-local consent module owns the existing key, reading/writing and persistence mapping. Components retain visibility/buttons and analytics initialization/pageview lifecycles. Preserve yes/no/undecided values, hydration, dismiss and absent-key behavior; do not introduce new tracking policy.

Verify docs build/types/static output and targeted DOM/browser interaction for existing consent choices.

### 12. Remove proven surplus and expose private-example endpoints

- Four `apps/example-microservice/{users-service,posts-service}/src/environments/environment{,.prod}.ts` files are unused Boolean scaffolding. Their configs have no replacement rules.
- `apps/example-next/hooks/useDebounce.tsx` has no imports or references elsewhere in the repository.
- `serverless/src/lib/mappers/aws/api-gateway.ts:33–38` defines `requestRemoteAddress`, used only by its own tests and absent from public AWS export maps. Reconfirm usage/export evidence before deleting it and its isolated tests.
- The users service accepts `PORT`, while its caller hardcodes port5002; React/Solid independently hardcode posts port5003, and the posts service uses lowercase `port`.

Remove confirmed unreferenced private code. Supply caller-owned base URLs through explicit environment inputs with today's localhost defaults. Preserve existing lowercase port input when adding conventional `PORT` support, unless a separately approved migration changes it. Do not make independently deployable services share a global registry.

Verify example builds and a default/alternate-port two-service HTTP journey. Simple unreferenced-file deletions do not require tests that repeat their absence.

### 13. Selected comment and test cleanup, after structural changes

Remove comments that merely narrate assignments, branching or obvious configuration. Retain public API semantics, compatibility/workaround reasons, upstream links/credits/licensing, deprecation guidance and external constraints.

`core/src/lib/type-utils.spec.ts:10–18` has unconstrained aliases that cannot fail an inference regression; its nullable case mistakenly references the non-nullable schema and ends with a TODO. Replace these with exact `Expect<Equal<...>>` assertions, including nullable output, and prove a wrong expected type fails compilation. Remove the placeholder once coverage is real.

The microservice React `App.spec.tsx` contains only an `it.todo`; remove the empty shell after confirming its task handles no tests. Preserve meaningful compile-time assertions elsewhere even when Vitest sees no runtime assertion. Preserve real HTTP/Fetch/framework and packaging regressions. No blanket test deletion or compiler suppression.

## Verification observed before implementation

- Pinned dependencies installed with Node26.12.0/pnpm12.14.0 at refreshed main.
- `pnpm check`: formatting passed; source suites passed832 tests with2 existing TODOs. Overall exit1 due to the fresh non-strict artifact prerequisite described above; this command is not reported as passing.
- Resolution trace confirmed missing core declaration and fallback to source. Building only core made the same non-strict check pass.
- Subsequent uncached `pnpm typecheck`:11/11 tasks passed.
- `pnpm docs:lint`: repository facts/ADRs and503 links/anchors across122 documents passed.
- Actual generator comparison confirmed changelog staleness.
- Actual stripped RouterBuilder execution confirmed nested clone aliasing. Full middleware HTTP reproduction remains to be added before its change.
- `git status --short` remained empty. Built/generated ignored artifacts and dependency installation are present; no implementation source edits were made.
- Packed consumers, docs production build, examples/hosts and the CI compatibility matrix were not rerun for this audit.

## Approved implementation and review sequence

1. Write the executable plan in the repository's established `docs/plans` location, extending canonical adapter slices where appropriate.
2. Establish meaningful public-behavior/inference regressions for the confirmed mutable-state and artifact-prerequisite problems; implement their local fixes.
3. Consolidate core definitions and package build ownership, preserving artifact/inference boundaries.
4. Adopt parsed-request and remaining response operations one integration at a time, verifying each native policy before the next.
5. Consolidate Nest decoration and OpenAPI sync/async assembly.
6. Reorganize consumer harness/scenarios, wire changelog generation and extract docs consent policy.
7. Clean private-example scaffolding/configuration, then perform selected comment/test cleanup last.
8. Run `pnpm check`, `pnpm test:packages`, docs lint/full docs tests and affected example/host checks. Preserve scenario/support coverage. Required isolated matrix remains a CI gate before integration.
9. Have subagents repeat the structural audit against the resulting diff; resolve concrete worthwhile findings and repeat relevant checks. Document intentional special cases and unresolved external verification limits accurately.

Supporting detailed audit reports are in `/private/tmp/ts-restless-untangle-{core,server,tooling}-audit.md`. This proposed decision log incorporates and independently checks their highest-risk evidence.
