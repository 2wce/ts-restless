# Roadmap and delivery status

This roadmap records delivered source capabilities and remaining work. Merged PRs are durable implementation references; numbered publication history belongs in [release notes](https://github.com/2wce/ts-restless/releases) and package changelogs. Use the [release checklist](prerelease-checklist.md) to verify installed versions, provenance and live npm tags. Dated checks belong in [evidence](evidence/README.md), including the [delivery refresh](evidence/2026-11-16-delivery-refresh.md).

## Adoption and stable release

| Work                                             | Delivered behavior / evidence                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standard Schema and header groundwork            | Framework-independent validation and header inference; [decision](adr/0001-standard-schema.md), [migration guide](../apps/docs/content/docs/standard-schema-migration.mdx).                                                                                                                                      |
| F01 Query5 infinite-option compatibility         | Merged [#20](https://github.com/2wce/ts-restless/pull/20); older/current native5 consumers and inference checks retained; [plan](plans/2026-11-09-query-v5-compatibility.md).                                                                                                                                    |
| F02 Express raw request types                    | Merged [#27](https://github.com/2wce/ts-restless/pull/27); validated arguments stay separate from native raw fields; [criteria](plans/release-readiness-backlog.md#f02--express-raw-request-typing).                                                                                                             |
| F03a React19 / F03b Fastify5                     | Merged [#26](https://github.com/2wce/ts-restless/pull/26) / [#35](https://github.com/2wce/ts-restless/pull/35); React18/19 with admitted Query5 pairs; Fastify5 at root and retained Fastify4 through `/legacy`; [criteria](plans/release-readiness-backlog.md#f03--verified-current-react-and-fastify-support). |
| F04 Client response validation                   | Merged [#29](https://github.com/2wce/ts-restless/pull/29); shared execution validates decoded default/custom results once, with explicit no-body behavior; [decision](adr/0008-client-response-validation.md), [plan](plans/2026-11-10-client-response-validation.md).                                           |
| F05 Validator-independent OpenAPI                | Merged [#46](https://github.com/2wce/ts-restless/pull/46); explicit conversion/dialect selection, body/default/query-composition fixes and opt-in Zod3 conversion under `/legacy`; [plan](plans/2026-11-11-openapi.md), [legacy helper decision](adr/0015-fastify-validator-independence.md).                    |
| F06 Identity and prerelease delivery             | Project-owned `@ts-restless/*` packages, coordinated reviewed version PRs and OIDC publication; [checklist](prerelease-checklist.md). Stable launch remains a separate release decision.                                                                                                                         |
| F07 Side-effect metadata and bundle verification | Merged [#34](https://github.com/2wce/ts-restless/pull/34); unused imports disappear while used APIs, Nest metadata and React directives remain; [plan](plans/2026-11-11-side-effect-packaging.md).                                                                                                               |
| Query5 baseline and migration documentation      | Merged [#22](https://github.com/2wce/ts-restless/pull/22); React/Vue/Solid use native Query5, with historical fallback and upgrade guidance; [decision](adr/0006-query-v5-baseline.md), [plan](plans/2026-11-09-query-v5-baseline.md).                                                                           |
| Documentation consolidation and agent exports    | Merged [#24](https://github.com/2wce/ts-restless/pull/24); contributor guidance, generated consumer Markdown and required documentation CI; [plan](plans/2026-11-09-documentation-adr.md).                                                                                                                       |

The initial stable target is `4.0.0`. Stable activation, prerelease exit and release verification follow the [stable-exit checklist](prerelease-checklist.md#stable-exit). Completing every future adapter-maintenance slice is not a stable-launch prerequisite.

## Compiler-resolution baseline

Modern TypeScript resolution merged in [#43](https://github.com/2wce/ts-restless/pull/43). [ADR0012](adr/0012-modern-module-resolution.md) and the [plan](plans/2026-11-11-modern-module-resolution.md) define Node16/NodeNext/Bundler support, removal of classic mappings/probes, retained ESM/CommonJS and consumer migration. A single-ESM-build investigation remains future work requiring separate evidence and approval.

## Follow-up from the upstream shortlist

Async base headers merged in [#32](https://github.com/2wce/ts-restless/pull/32), addressing upstream [#832](https://github.com/ts-rest/ts-rest/issues/832). Callbacks resolve per request with override/deletion behavior and concurrent-request isolation; [plan](plans/2026-11-10-async-base-headers.md), [ADR0009](adr/0009-request-scoped-headers.md).

Typed infinite-cache helpers for [#37](https://github.com/2wce/ts-restless/issues/37) merged in [#45](https://github.com/2wce/ts-restless/pull/45). Native keys/cache behavior remain unchanged; ordinary helpers retain response-envelope types; [plan](plans/2026-11-11-infinite-cache.md).

## Adapter maintenance epic

The [epic](plans/2026-11-04-adapter-maintenance-epic.md) retains detailed deliverables and dependencies. Approval of a completed slice does not approve later removal or redesign.

| Slice                                                 | Delivery / remaining scope                                                                                                                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Support inventory / A02 HTTP conformance          | Merged groundwork; inventory, policy and conformance checks remain maintained.                                                                                                                                                                                |
| A03 Shared parsed-request evaluation                  | Merged in [#48](https://github.com/2wce/ts-restless/pull/48); neutral aggregate and per-location operations preserve native policy; [ADR0016](adr/0016-parsed-request-ownership.md).                                                                          |
| A04 Shared response evaluation                        | Merged in [#13](https://github.com/2wce/ts-restless/pull/13).                                                                                                                                                                                                 |
| A05 Fastify / A06 Next shared operations              | Response adoption merged in [#14](https://github.com/2wce/ts-restless/pull/14) / [#17](https://github.com/2wce/ts-restless/pull/17); request adoption merged in [#48](https://github.com/2wce/ts-restless/pull/48). Native parsing/hooks/writes remain local. |
| A07 Nest / A08 Serverless adoption                    | Merged in [#48](https://github.com/2wce/ts-restless/pull/48); shared request evaluation, retained legacy Nest short-circuiting, serverless construction/response ownership and Nest consolidation; [plan](plans/2026-11-12-untangle-codebase.md).             |
| A09 Owned Fetch boundary / A10 portable Fetch journey | Planned; the existing plain client needs no new vanilla package.                                                                                                                                                                                              |
| A11 Shared query execution                            | Merged in [#21](https://github.com/2wce/ts-restless/pull/21); Query5 migration also adopts it in Solid.                                                                                                                                                       |
| A12 React query/mutation / A13 infinite composition   | Proposed future APIs; scoped design and upgrade proof still required.                                                                                                                                                                                         |
| A14 Vue / A15 Solid                                   | Execution reuse and native5 migration delivered; native composition remains proposed.                                                                                                                                                                         |
| A16 Policy-driven compatibility checks                | Planned; current strict package and isolated CI checks remain.                                                                                                                                                                                                |
| A17 Independent adapter versions                      | Proposed; coordinated releases remain the accepted policy.                                                                                                                                                                                                    |
| A18 Upgrade rehearsal                                 | Migration guides and native consumer checks delivered; broader composition/upgrade rehearsal remains.                                                                                                                                                         |
| A19 Legacy retirement                                 | Initial Next/Query baselines adopted; other retirements require their own decision and policy process.                                                                                                                                                        |

## Upstream empty-body follow-up

Merged [#30](https://github.com/2wce/ts-restless/pull/30) addresses upstream [#772](https://github.com/ts-rest/ts-rest/issues/772) in serverless JSON request decoding and AWS undefined-response serialization; [evidence](evidence/2026-11-10-empty-body-reproduction.md), [plan](plans/2026-11-10-serverless-empty-body.md). The original #696 parse exception was not reproduced; its no-body client type/runtime mismatch belongs to F04.

## Resuming work

Select one remaining slice, verify prerequisites against current source and read its ADRs, historical design and acceptance criteria. Update this index with the actual merged PR when implementation lands. Keep moving version/tag observations in dated evidence and verify publication through the release checklist. Retirement windows follow the [support policy](support-policy.md).

## Alpha default-install tag

Merged [#50](https://github.com/2wce/ts-restless/pull/50) implements [ADR0018](adr/0018-alpha-latest-tag.md): after successful alpha publication, update `latest` to the same numbered version across all ten public packages. Retries repair partial tag failures without republishing existing versions; beta/RC retain explicit channels. All ten existing trusted publishers have **Allow npm dist-tag** enabled for `2wce/ts-restless/build-test.yml`; [setup evidence](evidence/2026-11-16-delivery-refresh.md), [implementation plan](plans/2026-11-13-alpha-latest.md). Verify the registry after each release using the [checklist](prerelease-checklist.md); stable activation is separate.

## Explicit mutation client follow-up

The fix for [#36](https://github.com/2wce/ts-restless/issues/36) merged in [#44](https://github.com/2wce/ts-restless/pull/44). Mutations forward the optional native QueryClient, preserving its defaults, cache and errors; [plan](plans/2026-11-11-mutation-queryclient.md).

## Merged codebase untangling pass

Merged [#48](https://github.com/2wce/ts-restless/pull/48) consolidates request/response semantics, construction state, inference definitions and build prerequisites while preserving native ownership. It also organizes OpenAPI preparation/assembly, docs generation/consent, packaging scenarios and selected comment/test cleanup. The [design](plans/2026-11-12-untangle-codebase-design.md) and [implementation plan](plans/2026-11-12-untangle-codebase.md) retain scoped regression, review and verification evidence. Source, installed consumers, production docs, examples, native hosts and the independent CI compatibility matrix gate changes to these boundaries.

## Native response bug fixes

Merged [#49](https://github.com/2wce/ts-restless/pull/49) fixes [#38](https://github.com/2wce/ts-restless/issues/38) and [#42](https://github.com/2wce/ts-restless/issues/42). Fastify skips response-envelope validation and writing after a native reply is sent or hijacked. Serverless accepts returned Fetch `HeadersInit`, with context precedence, additive cookies, shared-object deduplication and case-insensitive `Vary` merging with wildcard preservation through CORS. AWS body serialization survives CORS creating a plain native response. [ADR0017](adr/0017-serverless-response-headers.md) records the scoped header decision; the [plan](plans/2026-11-13-native-replies-and-response-headers.md) retains test/review evidence. Portable contract response-header metadata remains deferred.
