# Fork adoption and first-release backlog

> Historical triage and acceptance criteria. Use [the roadmap](../roadmap.md) for current delivery status; dated package/version observations below retain their original context.

**Recorded:** 2026-11-04. **Source baseline:** merged main `2c4f2e379e0e949c30befad180aae1c1bfa28332`. **Status:** Prioritized future fixes; documenting an issue is not its implementation or release. Standard Schema core/adapter separation, header inference and A01/A02 are merged groundwork. Identity is merged and public alpha.0/alpha.1 releases are published. Stable publication remains disabled. The 2026-11-06 status refresh below distinguishes delivered releases from outstanding adoption/architecture work.

**Goal:** Make the fork a credible maintained replacement by resolving concrete adoption blockers, with tested migration and compatibility claims. Extend existing inference, validation, converters and transport logic where possible. The [adapter maintenance epic](2026-11-04-adapter-maintenance-epic.md) reduces future upkeep incrementally; completing all nineteen slices is not a launch prerequisite.

## Delivery order

1. **Groundwork:** A01 support inventory/adopted policy and A02 shared Express/Fastify conformance. This establishes the promises and behavior later changes must preserve.
2. **First compatibility fixes:** current TanStack Query v5 infinite types, Express raw request types, and public React19 compatibility. These are independently deliverable and need not wait for A03–A19.
3. **Broader adoption and launch:** reliable client response validation, modern validator-independent OpenAPI, and fork identity/migration/release readiness. Include Fastify5 if it is selected for launch; otherwise state Fastify4 support clearly.
4. Continue adapter extraction, native composition and package/release improvements in small epic slices, alongside the focused fixes. Retire surfaces only under the [support policy](../support-policy.md).

## F01 — Current TanStack Query v5 infinite types

**Evidence:** upstream [#815](https://github.com/ts-rest/ts-rest/issues/815), [#825](https://github.com/ts-rest/ts-rest/issues/825); existing fork [#5](https://github.com/2wce/ts-restless/issues/5). [hooks-options.ts](../../libs/ts-rest/react-query-v5/src/v5/types/hooks-options.ts) supplies six native generics to infinite/suspense-infinite options. The workspace pins Query `5.51.11` and query-core `5.51.9`; upstream reports concern later five-argument signatures. This code coupling is confirmed; the exact current-version failure must be reproduced against a recorded consumer before fixing.

**Deliverable:** Extend the existing option/inference mapping to the approved Query5 baseline/current line, preserving request, selected data, page parameters, errors, initial data and suspense behavior. Avoid copying a fresh hierarchy of upstream overloads. A12/A13 native composition can later reduce this coupling.

**Acceptance:** strict packed `/v5` consumers against exact baseline and current supported Query5 versions; normal/infinite/suspense-infinite inference including selected data and invalid page/input assertions; a real two-page request, cancellation and later-page declared error. No relaxation through `skipLibCheck`. Update support evidence and migration notes. Existing wrappers remain operational.

**Dependency:** A01 identifies supported lines; A02 is general groundwork, not a technical prerequisite for this client-only fix. Do not gate F01 on A11–A13.

**2026-11-09 implementation:** The [F01 plan](2026-11-09-query-v5-compatibility.md) records a local fix using native hook-parameter composition and strict installed Query5.51.11/5.80.6/5.107.1 consumers. Full source checks and 28 packed tests passed. PR/CI delivery remains pending. The approved Query4 removal and Vue/Solid Query5 migration are a separate support/export slice; no native Query5 peer floor is narrowed by F01.

## F02 — Express raw request typing

**Evidence:** upstream [#716](https://github.com/ts-rest/ts-rest/issues/716), [#698](https://github.com/ts-rest/ts-rest/issues/698), prior-art PR [#876](https://github.com/ts-rest/ts-rest/pull/876) (unmerged at triage; recheck when implementing). [types.ts](../../libs/ts-rest/express/src/lib/types.ts) defines `TsRestRequest` through `ServerInferRequest` outputs, while [the handler](../../libs/ts-rest/express/src/lib/ts-rest-express.ts) supplies transformed top-level arguments and the original native `req`. Consequently raw strings can be typed as transformed numbers or dates. The mismatch is confirmed in code; PR876 does not fully address raw header output typing.

**Deliverable:** Preserve validated handler arguments and type raw params/query/body/headers according to their actual input/native boundary, including global/route middleware. Reuse existing input/output inference helpers; do not mutate the native request to force it to match today's types. Review raw header normalization separately from schema transforms.

**Acceptance:** request transforms prove top-level outputs while `req` still exposes strings/raw JSON; optional/defaulted fields and headers distinguish input from output. Add positive/negative type assertions for handlers and middleware; strict packed consumers with Express4/5 and their matching type packages; native HTTP evidence for both lines. Document any required type migration and Changeset impact.

**Dependency:** A02 provides runtime characterization. A03 extraction can consume the corrected boundary later; it is not required first.

## F03 — Verified current React and Fastify support

**Evidence:** React19 [#769](https://github.com/ts-rest/ts-rest/issues/769) / PR [#845](https://github.com/ts-rest/ts-rest/pull/845); Fastify prior art [#849](https://github.com/ts-rest/ts-rest/pull/849), [#850](https://github.com/ts-rest/ts-rest/pull/850), [#702](https://github.com/ts-rest/ts-rest/pull/702). The public [React Query manifest](../../libs/ts-rest/react-query/package.json) stops at React18 despite private v5 accepting 19. [Fastify](../../libs/ts-rest/fastify/package.json) promises only `^4.0.0`. These declaration gaps are confirmed; compatibility with new majors is not established by widening peers. Nest's native Fastify5 usage is a different integration.

**Deliverables:** Split into F03a React19 and F03b Fastify5. F03a verifies the public packed package/provider/hooks against React19/types and supported Query lines before changing public peers. F03b reviews native request/reply/hook generics and lifecycle APIs, replaces removed native accesses where required and verifies Fastify5 before adding it. Keep existing supported lines and checks until their own retirement decision.

**Acceptance:** strict isolated packed consumers and meaningful runtime journeys. React covers query, mutation, errors, provider and inference. Fastify covers A02 HTTP behavior plus hook order, context/route metadata, error mapping and native response writing on both retained4 and proposed5. Record exact versions and migration guidance. Retain tests for existing promises; peer expansion alone is insufficient.

**Dependency:** A01/A02 for support/lifecycle evidence. Decide whether F03b is a launch requirement; F03a belongs in the first compatibility wave. No blanket Vue/Solid upgrade follows from this work.

## F04 — Reliable client response validation

**Evidence:** [#789](https://github.com/ts-rest/ts-rest/issues/789), [#858](https://github.com/ts-rest/ts-rest/issues/858). [client.ts](../../libs/ts-rest/core/src/lib/client.ts) validates only its JSON parsing branch; text and Blob branches return without validation. Custom fetchers receive the validation flag but own their behavior. These current branch paths are confirmed; intended custom-fetcher ownership needs an explicit decision.

**Deliverable:** Apply the approved validation policy across declared JSON/text/binary/no-body responses and non-success statuses through existing schema utilities. Define where custom-fetcher validation belongs so non-idempotent transforms run once. Preserve response envelopes/headers and disabled-validation behavior. Keep decoding transport-owned and do not consume bodies twice.

**Acceptance:** default/custom-fetcher tests cover invalid JSON/text/binary responses, valid transforms, no body, declared errors and per-route/per-client validation precedence. A transform counter proves one validation per response. Strict packed types and documented custom-fetcher examples match runtime semantics. Any changed error behavior needs migration notes.

**Dependency:** Decide fetcher ownership before implementation; A11 query execution policy subsequently reuses it.

## F05 — Modern validator-independent OpenAPI

**Evidence:** [#813](https://github.com/ts-rest/ts-rest/issues/813), [#839](https://github.com/ts-rest/ts-rest/issues/839), existing fork [#4](https://github.com/2wce/ts-restless/issues/4). [The generator](../../libs/ts-rest/open-api/src/lib/ts-rest-open-api.ts) defaults to Zod3 conversion and emits OpenAPI `3.0.2`. Converter hooks already exist; the Zod4 fixture uses an explicit async converter. Core Standard Schema support does not supply JSON Schema conversion automatically.

**Deliverable:** Extend existing converter/traversal/reference logic with explicit supported OpenAPI dialects and validator-independent converter selection. Keep legacy Zod3 compatibility explicit. Specify sync versus async transformer pairing and conversion failure behavior; do not infer arbitrary validator JSON Schema from Standard Schema validation alone.

**Acceptance:** packed consumers without mandatory Zod, buildable Zod3/Zod4/Valibot converter examples, structural/ref checks and dialect validation. Cover shared references, nullable/union shapes, params/query/headers/body, non-JSON/no-body responses, converter failures and sync/async pairing. Record migration from the existing default/dialect and correct major-release treatment.

**Dependency:** Existing Standard Schema separation is usable groundwork. This does not wait for the entire adapter epic.

## F06 — Fork identity, migration and release readiness

**Evidence:** existing fork [#6](https://github.com/2wce/ts-restless/issues/6). Merged PR #10 updates package names and repository/issue routing, retains coordinated [Changesets](../../.changeset/config.json), verifies native tarball consumers and initial version dry runs, and prepares Changesets release PRs and automatic numbered prerelease publication after main CI and compatibility fixtures pass. The prerelease job defaults off behind `PRERELEASE_ENABLED`; stable publishing remains guarded off. The migration guide describes v4 prereleases; review and publishing gates still apply.

**Identity decisions adopted 2026-11-04:** `ts-restless`, project-owned npm organization `ts-restless` with the user as initial owner, public packages under `@ts-restless/*`, and first stable version `4.0.0`. Authenticated checks confirm `2wce` owns the npm organization, and private vulnerability reporting is enabled. Interim public `4.0.0-alpha.*` releases are approved once artifact/authentication/CI gates pass; F01–F05 can follow in successive prereleases. See the [identity design](2026-11-04-ts-restless-identity-design.md) and [prerelease checklist](../prerelease-checklist.md). Package identity merged in PR #10; release PRs #12/#16 and npm metadata establish public alpha.0/alpha.1 publication. Stable publication remains unperformed.

**Deliverable:** Implement the adopted identity and import migration; reconcile repository metadata, README/docs/examples, package exports and Changesets against actual major breaks. Define supported lines, semver, prerelease validation, maintainer/security/issue routes and the first stable release checklist. Keep stable publication disabled until its separate release approval.

**Acceptance:** native tarballs with correct identity/exports/peers, strict copyable migration consumers and all applicable source/native/CI fixture checks pass for promised lines; release/versioning dry-run evidence matches package relationships. Activate the approved release-PR prerelease path only after its credential/artifact/CI gates pass; stable publishing remains a separate explicit release decision. No package renaming, versioning or publishing is part of this backlog documentation.

**Dependency:** Selected launch fixes and support claims must be verified. A17 independent versions can follow separately; it is not required to ship the fork under the current coordinated scheme.

## 2026-11-06 findings and resume order

The [dated evidence record](../evidence/2026-11-06-support-demand.md) and [JSON snapshot](../evidence/2026-11-06-support-demand.json) record support counts, upstream demand, framework-major shares, source limitations and release state. These are decision inputs, not approved retirements. Continue F01/F02/F03a independently of the architecture epic; Fastify5, client validation and OpenAPI remain separately scoped fixes.

The [proposed client design](2026-11-06-client-maintenance-design.md) and [A11 implementation plan](2026-11-06-common-query-execution.md) describe one shared execution capability used by existing React v5/Vue wrappers. Design approval is still required. Subsequent native-composition and upgrade-proof slices decide whether thinner bindings justify retaining/upgrading or retiring legacy wrappers. No new vanilla package or blanket Vue/Solid retirement is approved.

All ten npm `alpha` tags point to `4.0.0-alpha.1`; `latest` points to alpha.0 despite the intended stable-only policy. F06 must reproduce/review the tag discrepancy and reconcile consumer instructions before stable release. This record does not change tags, enable publication or claim provenance validation beyond the published registry metadata.

## Later features and reports requiring reproduction

| Candidate                                  | Evidence / next bounded deliverable                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Native query-options composition           | [#689](https://github.com/ts-rest/ts-rest/issues/689), [#782](https://github.com/ts-rest/ts-rest/issues/782); A12/A13 cover native query/mutation/infinite composition after A11. Keep wrappers during migration.               |
| Async base headers                         | [#832](https://github.com/ts-rest/ts-rest/issues/832); focused core client addition with request-time auth/header resolution and precedence tests. This is separate from async schema validation.                               |
| Verified Hono journey                      | [#190](https://github.com/ts-rest/ts-rest/issues/190); start with a preconstructed Fetch handler and real Hono middleware/context. A09/A10 own portable context/host evidence; no new wrapper until a real gap is demonstrated. |
| Portable returned response headers         | [#833](https://github.com/ts-rest/ts-rest/issues/833); define common response metadata first, then preserve native header/cookie handling. Do not scatter competing adapter implementations.                                    |
| Large-contract compiler benchmarks         | [#764](https://github.com/ts-rest/ts-rest/issues/764); record exact compiler, contract shape and timings before optimizing shared inference.                                                                                    |
| Next regression                            | [#867](https://github.com/ts-rest/ts-rest/issues/867); reproduce on exact native/runtime versions before assigning scope.                                                                                                       |
| Empty request/response bodies              | [#696](https://github.com/ts-rest/ts-rest/issues/696), [#772](https://github.com/ts-rest/ts-rest/issues/772); reproduce method/content-type/body-presence behavior separately from existing no-body helpers.                    |
| Historical cross-package inference reports | Reproduce with current strict packed packages and actual peer/compiler versions; avoid reimplementing issues already resolved by Standard Schema or packaging work.                                                             |

Defer SSE, serialization redesign and executable contract middleware until a concrete product/API design justifies their cross-cutting maintenance cost. Prioritize reproducible compatibility/correctness failures over votes alone. This file records triage evidence and acceptance gates; it does not create GitHub issues or claim those fixes are complete.

## Query v5-only initial stable baseline (approved 2026-11-09)

The user superseded the proposed Query4 `/legacy` path with complete native-v4 removal and Vue/Solid migration to5. The [scoped plan](2026-11-09-query-v5-baseline.md) delivers exports/peers, wrapper migration, strict archive/native checks, examples and documentation. It builds on F01 and A11, without completing native-composition A12–A15 or React19 F03a. Query-major commitments reduce 13 to 12. Current historical registry/download snapshots remain unchanged; publication and stable activation remain separate.
