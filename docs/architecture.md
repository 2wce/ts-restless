# Architecture

ts-restless shares a TypeScript API contract between clients and servers. Runtime schemas use Standard Schema; type-only contracts carry inference without introducing a runtime validator. Ten public libraries are released together. Examples and tooling remain private.

## Ownership

| Boundary            | Responsibility                                                                                                   | Entry points / source                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Contract            | Route declarations and client/server request/response inference.                                                 | [Core DSL](../libs/ts-rest/core/src/lib/dsl.ts) and core public exports.                                                                   |
| Validation          | Synchronous Standard Schema validation, transforms and portable errors; explicit old-Zod bridge.                 | [Schema utilities](../libs/ts-rest/core/src/lib/standard-schema-utils.ts), core `/legacy`; [ADR 0001](adr/0001-standard-schema.md).        |
| Request evaluation  | Evaluate parsed locations; callers retain normalization, rejection policy and native errors.                     | [Core request evaluation](../libs/ts-rest/core/src/lib/request.ts); [ADR0016](adr/0016-parsed-request-ownership.md).                       |
| Response evaluation | Interpret response declarations and validate bodies once. Callers retain policy, decoding, errors and writes.    | [Core response evaluation](../libs/ts-rest/core/src/lib/response.ts); [ADR 0002](adr/0002-response-ownership.md).                          |
| Transport           | Request normalization, fetcher invocation, decoding and response envelopes.                                      | [Core client](../libs/ts-rest/core/src/lib/client.ts), `initClient`.                                                                       |
| Query execution     | Request/native signal precedence and same-object HTTP error rejection.                                           | Core `executeQueryRequest`; [ADR 0003](adr/0003-query-ownership.md).                                                                       |
| Native integrations | Framework routing, lifecycle, middleware/hooks, serialization, providers, cache and reactivity.                  | Express/Fastify/Nest/Next/serverless and React/Vue/Solid packages.                                                                         |
| OpenAPI             | Explicit schema conversion and document generation. Standard Schema validation alone cannot provide JSON Schema. | [OpenAPI package](../libs/ts-rest/open-api/README.md); explicit converter/dialect selection; deprecated `/legacy` converter compatibility. |

Express, Fastify, Next, serverless and modern Nest use core parsed-request evaluation. Legacy Nest uses the same location operations individually to retain first-error short-circuiting. Native integrations keep parsing, validation enablement, error construction and raw request identity. Successful transformed values are selected by validation outcome, including false, zero, empty string and undefined.

Direct response evaluation covers Express, Fastify, Next, serverless and both Nest handler paths. Adapters retain their status, stream, Blob, media and native-write policies. [The roadmap](roadmap.md) records branch delivery; these shared operations do not provide a universal server dispatcher.

Serverless construction owns mutable router branches and generated middleware lists. It retains caller handlers and schema/route-option leaves while keeping cloned nested routers and reused implementations independent. Single-request Fetch handling delegates to the same handler-construction boundary. [The untangling plan](plans/2026-11-12-untangle-codebase.md) records the public-behavior regression evidence.

Shared client execution validates decoded responses once under the effective route/client policy, including custom transports; fetchers own transport and decoding. Standalone `tsRestFetchApi` retains validation support. [ADR 0008](adr/0008-client-response-validation.md) records this refinement of the response boundary.

React, Vue and Solid reuse core query execution. The plain client returns response envelopes and does not adopt query-library rejection semantics. Native-composition APIs remain planned; current wrappers are supported.

[ADR 0009](adr/0009-request-scoped-headers.md) records request-scoped asynchronous header preparation for plain clients and query bindings. Header callbacks resolve before transport without an auth cache or automatic cancellation of arbitrary auth work. The roadmap records delivery; acceptance of this boundary does not establish package availability.

[ADR 0011](adr/0011-fastify-legacy-entry.md) separates the Fastify5 root entry from deprecated Fastify4 `/legacy` support. They share adapter internals and native inference; registration enforces the selected major before native mutations. [ADR0015](adr/0015-fastify-validator-independence.md) keeps both entries independent of Zod and supplies the historical payload schema through core `/legacy`. The native4 retirement window remains governed by ADR 0004; helper retirement requires a separate migration decision.

## Package and artifact boundaries

Library source lives under `libs/ts-rest`. `react-query-v5` is an implementation workspace, bundled into public React root and `/v5` entries, not an eleventh public library. Library packing produces package-local `dist`; installed tarball tests check exports and strict ESM/CommonJS declarations independently of workspace source resolution.

[ADR0012](adr/0012-modern-module-resolution.md) requires Node16/NodeNext or Bundler resolution for consumers. Conditional exports select both ESM and CommonJS declarations; obsolete resolver mappings are removed. Compiler version and runtime support remain separately evidenced.

`libs/build-config` owns shared Vite+ build presets; package configs own requirements such as React Query unbundling and Nest decorator transforms. The non-strict inference task declares its dependency on built core declarations. `apps/example-*` demonstrate integrations with caller-owned endpoint inputs. `apps/docs` owns public guides, snippet checking and static HTML/search/Markdown output. Its changelog is generated from package changelogs before MDX compilation, and its consent policy is local to docs. Maintainer plans and ADRs live in this `docs` directory.

## Support and release boundaries

Consult [the inventory](support-inventory.md) for exact peers, pinned consumers and known gaps. Initial stable support includes Query5 and Next15/16. React18/19 compatibility is verified with compatible native Query versions; check the containing release before installing React19 support. [The retirement policy](support-policy.md) distinguishes the initial stable baseline from retiring an already published stable promise.

Coordinated Changesets prereleases use reviewed version PRs and explicit prerelease tags. During alpha development, `latest` follows the same alpha version under [ADR0018](adr/0018-alpha-latest-tag.md). Stable activation is separate. Read [ADR 0007](adr/0007-public-coordinated-releases.md) and the [release checklist](prerelease-checklist.md). Source, locally verified artifacts, merged code and published packages are different evidence states.
