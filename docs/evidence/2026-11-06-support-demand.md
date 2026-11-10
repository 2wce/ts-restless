# Support breadth and fork direction evidence

**Recorded:** 2026-11-06. **Repository baseline:** `a708f05935a1954799b0a8899259c25e6f611a0b` (merged main). **Status:** Evidence and recommendations for review. No support floor, removal, retirement notice or new public API is approved by this document.

Read the [machine-readable snapshot](2026-11-06-support-demand.json), [support inventory](../support-inventory.md), [adopted support policy](../support-policy.md), [adoption backlog](../plans/release-readiness-backlog.md) and [architecture epic](../plans/2026-11-04-adapter-maintenance-epic.md) together. The snapshot records source URLs, capture time, counts, denominators, registry state and policy observations. Refresh it before making a support decision; retain this dated record rather than silently replacing its numbers.

## Direction and problem

The fork's strongest direction is a validator-independent REST contract core with thin native integrations. Strict installed-tarball consumers, explicit `/zod3` compatibility and native behavior tests make that direction credible. Shared response evaluation is merged for Express and Fastify. Routing, lifecycle, middleware, DI, streams, serialization and native error mapping remain adapter-owned.

Architecture work should run alongside adoption fixes, not postpone them. The release backlog records current Query v5 compatibility, Express raw request typing, public React 19 support, client response-validation gaps and modern OpenAPI conversion. Shared validation alone cannot remove native declaration coupling, query-wrapper overloads, support promises or release coordination.

The maintenance hypothesis is that sharing contract/query execution policy and using native composition reduces repeated changes during dependency upgrades. It is not yet a measured saving. Removing packages may reduce work, but low download counts alone do not establish that removal is the best approach.

## Declared support at the recorded baseline

At baseline `a708f059`, there are **ten public libraries**. Seven primary framework/query integrations advertise **sixteen dependency-major lines**:

| Integration | Declared majors    | Count |
| ----------- | ------------------ | ----: |
| Express     | 4, 5               |     2 |
| Fastify     | 4                  |     1 |
| Nest        | 9, 10, 11, 12      |     4 |
| Next        | 12, 13, 14, 15, 16 |     5 |
| React Query | 4, 5               |     2 |
| Vue Query   | 4                  |     1 |
| Solid Query | 4                  |     1 |
| Total       |                    |    16 |

This is a count of declared major commitments, not sixteen fully verified installations or a count of all compatibility combinations. React Query also promises React 16–18. Serverless exposes Fetch/AWS/Azure/Next entry points and repeats the Next 12–16 promise. Validator bridges, compilers, module formats and host runtimes add other dimensions. The repository has Vue and **Solid** integrations; it has no Svelte integration.

After [PR #17](https://github.com/2wce/ts-restless/pull/17) merged as `e937ed0e` on 2026-11-06, current main advertises **thirteen** major lines: Next's five become two (15/16), and the other six integrations are unchanged. Serverless Next likewise retains 15/16. The table and JSON baseline above remain historical evidence; the [support inventory](../support-inventory.md) records the updated declarations.

## Upstream integration demand

These are upstream `@ts-rest/*` package downloads for **2026-10-30 through 2026-11-05**, using npm's date-bounded package endpoint. They indicate the inherited ecosystem, not adoption of the new fork.

| Upstream package | Downloads |
| ---------------- | --------: |
| core             |   990,329 |
| open-api         |   455,821 |
| react-query      |   283,553 |
| express          |   234,598 |
| nest             |   202,745 |
| fastify          |    99,919 |
| serverless       |    80,807 |
| next             |    10,524 |
| solid-query      |       656 |
| vue-query        |       621 |

Source pattern: `https://api.npmjs.org/downloads/point/2026-10-30:2026-11-05/@ts-rest/<package>`. Exact URLs and endpoint dates are retained in the JSON snapshot.

Downloads include CI, reinstalls and transitive use; they are not unique users or production deployments. Do not sum the rows to estimate users. These endpoints cannot identify which framework versions ts-rest consumers use.

## Framework-major demand

Separate npm per-version `last-week` responses were captured on 2026-11-06. Aggregate by the leading numeric major, including prereleases; divide each bucket by the sum of **that same version response**. The endpoint does not return explicit start/end dates, so do not claim it has precisely the same window as the table above.

| Package     | Major shares of its version-summed downloads                 |
| ----------- | ------------------------------------------------------------ |
| Next        | 12: 0.568%; 13: 0.887%; 14: 6.731%; 15: 20.217%; 16: 71.403% |
| Express     | 4: 42.73%; 5: 57.19%                                         |
| Nest core   | 9: 2.03%; 10: 16.36%; 11: 59.70%; 12: 20.34%                 |
| Fastify     | 4: 9.49%; 5: 89.05%                                          |
| React       | 16: 1.58%; 17: 1.89%; 18: 22.79%; 19: 73.41%                 |
| React Query | 4: 4.49%; 5: 95.51%                                          |
| Vue Query   | 4: 3.90%; 5: 96.10%                                          |
| Solid Query | 4: 0.215%; 5: 96.05%; 6: 3.73%                               |

Other majors and rounding account for incomplete totals. A major bucket containing prereleases does not prove a stable release exists; in particular this table does not establish Solid Query 6 support or stability.

The Next version response sums to **97,435,778** downloads. Its major counts are 553,425 (12), 864,327 (13), 6,558,298 (14), 19,698,444 (15) and 69,572,323 (16). Next 12+13 account for **1.455%**; 15+16 account for **91.620%** within that response. The independent date-bounded package-total endpoint returns **91,648,380**. These totals do not reconcile; do not mix their denominators. Neither set measures the Next versions used with ts-rest.

Sources: `https://api.npmjs.org/versions/next/last-week` and the corresponding encoded package URLs in the snapshot. To recalculate a share from the saved aggregate: `100 * major_downloads[major] / total`. A refresh must query every endpoint again and record a new capture time; a rolling endpoint cannot reproduce a past version response.

## Upstream support and review candidates

| Surface    | Verified upstream policy / demand                                                                                  | Proposed next action                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next 12/13 | [Next policy](https://nextjs.org/support-policy) marks 12/13/14 unsupported; 12+13 have low ecosystem share.       | Delivered in merged PR #17: the initial-v4 Next 15–16 baseline excludes 12–14. Do not open a duplicate retirement slice. This cuts advertised Next majors from five to two (60% fewer commitments, not a measured 60% workload saving). |
| Next 15/16 | 16 Active LTS; 15 Maintenance LTS, with security releases through 2027-01-31.                                      | Maintain the merged 15/16 installed-consumer matrix and its explicit upstream declaration limitations; verify newly selected versions before widening claims.                                                                           |
| Express 4  | [Express policy](https://expressjs.com/en/support/) lists ongoing support for both 4 and 5; 4 remains substantial. | Retain 4 unless its measured cost and migration evidence justify a separate decision.                                                                                                                                                   |
| Fastify 4  | [Fastify LTS](https://fastify.dev/docs/latest/Reference/LTS/) ended on 2025-06-30; the fork only advertises 4.     | Verify Fastify 5 under F03b before considering retirement of 4.                                                                                                                                                                         |
| Nest 9     | Lower ecosystem share than 10–12.                                                                                  | Review 9 before 10; reproduce affected consumers and replacement coverage first.                                                                                                                                                        |
| Vue/Solid  | Low upstream ts-rest downloads; current adapters advertise native Query 4 while ecosystem downloads favor 5.       | First share execution and prove a small native integration. Measure upgrade cost before deciding whether an entire package should be retired.                                                                                           |

At the original `a708f059` snapshot, strict packed Next declarations used 12.3.7 as a fallback. [PR #17](https://github.com/2wce/ts-restless/pull/17) subsequently merged as `e937ed0e`, delivering response adoption and the approved initial-v4 Next 15–16 baseline. Its same-major declaration/runtime matrix for 15.5.29 and 16.4.2 replaces the fallback, with explicit upstream declaration limitations retained. See [plan 006](../plans/006-next-supported-majors.md) and the [support inventory](../support-inventory.md) for that delivered evidence. The original snapshot does not claim these later checks ran on `a708f059`.

An initial stable-v4 baseline decision and retirement of an existing fork promise are different reviews. The adopted policy permits an explicitly documented narrower initial stable baseline; established promises require a released verified replacement, public notice, at least six calendar months and removal in a major. A prerelease does not start that clock. No retirement clock is started by this record. Next's initial-v4 baseline decision is delivered in PR #17, rather than a new notice/removal proposal here.

## Client strategy to test

`@ts-restless/core` already provides framework-independent `initClient`. Another vanilla package would duplicate that transport entry point. Direct use remains possible in Vue, Solid, Svelte or other environments, but it does not supply native query caches, reactivity, SSR, hook lifecycles or option typing.

The proposed path is shared framework-independent query execution, then small native bindings. Native composition becomes the recommended path only after its supported capabilities and migration examples are verified; existing wrappers remain during migration. Core owns request execution, envelope rejection and cancellation precedence. Native libraries own keys, caches, observers, reactivity, providers, suspense and hydration. There is no proposed universal cache or reactivity engine.

The distinction matters: `initClient` normally resolves HTTP response envelopes, including declared error statuses. Query integrations reject those envelopes so native retry/error state works. React v5, Vue and Solid currently repeat this policy and signal merging.

Start with [the proposed A11 design](../plans/2026-11-06-client-maintenance-design.md) and its [implementation plan](../plans/2026-11-06-common-query-execution.md). Use React v5 and existing Vue Query 4 wrappers as two real extraction consumers; changing dependency majors is separate. Next prove React native composition and one reactive binding (Vue proposed), including input changes, query/mutation/infinite behavior, cancellation, inference and SSR/hydration where supported. Rehearse a real native-library upgrade before deciding whether to retain, upgrade or retire Vue/Solid wrappers. Solid remains supported while this proof is pending.

## Maintenance proof and handoff

Before extraction, record policy sites: React v5 `internal/create-hooks.ts:apiFetcher` (one), Vue `common.ts:queryFn` (one), and Solid `solid-query.ts` query/infinite/mutation closures (three). These five source sites are a narrow execution-policy baseline, not the total duplicated code in the repo. Record their locations again at implementation time.

For A11, success means one shared implementation replaces the React/Vue copies, with both installed consumers and native suites preserving behavior. The three Solid sites remain until its own slice. This establishes ownership, not an upgrade-cost saving.

For each A18 rehearsal, record exact before/after dependency versions, the same consumer journeys and inference checks, failure ownership, changed production/type files, repeated policy edits, elapsed hands-on work with its measurement limits, compatibility jobs and release impact. Compare equivalent upgrades/checks where possible. If only the new design is rehearsed, report remaining coupling without inventing a before/after saving. Stop expanding the abstraction if a shared change still requires duplicated execution-policy edits or native reactivity/types leak into core.

A retirement should depend on its own replacement, tested migration and applicable rehearsal, rather than every unrelated adapter migration. The epic records this as a proposed sequencing refinement. A19's surface/date/release decision remains mandatory.

## Delivery and release snapshot

Main includes A04 in PR #13, Fastify's response portion in PR #14 and public-only release corrections in PR #15. A03/request adoption remains unimplemented. Next response/LTS baseline work merged in PR #17 as `e937ed0e`; Next request adoption remains outstanding.

Registry reads confirm all ten public libraries have `4.0.0-alpha.0` and `4.0.0-alpha.1`; `alpha` points to alpha.1. Stable 4.0.0 is not published. All ten `latest` tags currently point to alpha.0, which conflicts with the intended stable-only tag policy. Use the explicit `@alpha` channel for evaluation. Investigate and review tag reconciliation separately; this documentation change does not mutate registry tags or enable stable publication.

## Resume checklist

1. Read this evidence, the adopted support policy, epic and adoption backlog; check current main and open PR ownership.
2. Recheck versions, registry state and relevant demand/policy evidence. Historical observations are not current certification.
3. Review the proposed A11 spec and plan together; resolve its API approval gate before execution. Implement one slice, with its own review and evidence.
4. Create scoped designs/plans for native composition and the upgrade rehearsal using the capability checklist above. Do not treat this roadmap as permission to implement all integrations.
5. Select one retirement only after replacement proof. Record the affected promise, decision status, package owner, migration, applicable clock/release and last compatible release. No deprecation follows automatically from this snapshot.

## Documentation verification (2026-11-06)

The documentation-only branch passed `pnpm --filter @ts-restless/docs test`: build, documentation typechecking and all 30 static-site tests. Local Node was 24.15.0 with pnpm 12.14.0; CI retains the pinned Node 26.12.0 gate. Existing CSS/browser-externalization warnings remained. Relative file links, fenced blocks, snapshot totals and changed-file formatting/whitespace were checked.

A disposable source compiler probe passed with TypeScript 7.0.2, strict checking and library checking enabled: the candidate helper and six source-test snippets compiled against the baseline core/React/Vue sources and installed peers. Two incomplete request examples were corrected against the existing broad normalizer/Vue mapper type. This is static feasibility evidence; the A11 runtime tests and installed-tarball proof remain unimplemented. No probe source is committed.

## Main reconciliation (2026-11-06)

Merged main `e937ed0e` into this documentation branch after PR #17 landed. Retained the approved Next 15/16 peer ranges, checked-consumer limitations, migration guidance and response execution records. The proposed client API, two-consumer extraction and per-surface future rehearsals remain proposed. The dated npm JSON snapshot and its original baseline are unchanged.

After reconciliation, the documentation build/typecheck and all 30 static-site tests passed again. Relative links, the current thirteen major commitments, both Next peer ranges, formatting and whitespace were verified. Library source, packaging tests, Changesets and the lockfile match merged main; the conflict resolution adds no production changes.
