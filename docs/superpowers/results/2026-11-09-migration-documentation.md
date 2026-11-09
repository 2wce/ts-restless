# Initial v4 migration documentation audit

**Date:** 2026-11-09. **Scope:** Public changes from upstream snapshot `dd7239bc`
through migration branch `f764798f`, plus this documentation follow-up. Compare
`git diff dd7239bc HEAD -- libs/ts-rest`, public manifests/exports, retained
Changesets and the support inventory. Remote main was `192636d2` during the
audit: F01 #20 had merged; the Query5 migration remained draft PR #22. This
audit does not change support, implementation, versions or publication.

## Finding

Existing guides described the broad changes but were insufficient for a complete
user migration. Nine rendered migration journeys had broken internal links.
React's removed factory/hooks/options/types lacked concrete replacements; the
schema guide did not list all removed legacy helpers or exact adapter error
imports. OpenAPI still claimed its retained default converter would disappear
in v4. Release wording mixed old registry snapshots with development source.

## Coverage and replacements

The public [migration hub](../../../apps/docs/content/docs/ts-restless-migration.mdx)
now provides a removal/replacement table, matched-package upgrade order,
release-selection guidance, fallback and application checks. Its detailed
guides cover these audited surfaces:

| Source evidence                                                         | Affected surface                                                                                                                                    | User migration                                                                                                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ten public `libs/ts-rest/*/package.json` manifests                      | Scope and dependency replacement                                                                                                                    | Replace the matching ten package names as used, update shared contracts/imports, select one containing prerelease and avoid deep/private implementation imports.                         |
| Next/serverless manifests; Next integration source                      | Next12–14                                                                                                                                           | Upgrade to a patched Next15/16 through official guides; retain Pages API/App/Pages Edge entry points; replace `geo`/`ip`; check combined React Query peers.                              |
| React Query manifest and removed `src/v4` implementation                | Query4, React16/17                                                                                                                                  | Query5/React18 upgrade order, providers and root v5 factory; `/v5` alias retained, no legacy adapter.                                                                                    |
| Removed React v4 `react-query.ts` exports                               | Root `initQueryClient`, `useTsRestQueryClient`, positional query/cache APIs                                                                         | `initTsrReactQuery`, object `queryKey`/`queryData` calls, `tsr.useQueryClient()` and the retained `tsr.initQueryClient(nativeClient)` for SSR.                                           |
| Removed React v4 `types.ts`; v5 `RequestData`/error options             | `ReactQueryClientArgs`, `InitClientReturn`, `UseTsRestQueryClient`, `AppRouteFunctions*`, `DataReturn*`, error toggle, top-level request cache/next | Infer instance/client and contract request/response types, use v5 generic signatures/guards, move fetch options inside request data.                                                     |
| Native5 wrapper option definitions in React/Vue/Solid                   | Native4 pagination, callback/status/cache/suspense/hydration options                                                                                | Explicit initial page/next mapper, response-envelope `InfiniteData`, native5 option map and official guides; mutations remain contract requests.                                         |
| Vue/Solid wrapper source and manifests                                  | Native Query4 in those frameworks                                                                                                                   | Retain initializer/convenience calls and native providers; explicit native5 installation, Vue computed/ref keys and Solid key/request/options accessors, pagination and signal behavior. |
| Core `parseAsStandardSchema`, schema validation and explicit `zod3.ts`  | Automatic old-Zod recognition and silently skipped unsupported schemas                                                                              | Upgrade to a Standard Schema validator or bridge each supplied old schema; field-record and whole-object header examples distinguish bridge placement.                                   |
| Core root index, type utils, dsl and legacy schema helpers              | Zod helpers/types/error schemas moved from root; `ContractAnyTypeLegacy` and `areAllSchemasLegacyZod` removed                                       | Exact helper table, `/zod3` historical imports, portable schema input/output types, `ContractAnyType`, and removal of vendor-based error branches.                                       |
| Express/Fastify/Nest/Next/serverless default and `/zod3` exports        | Historical error schemas/classes and constructor identity                                                                                           | Exact per-adapter table; current classes and error-location fields, legacy imports for old payloads only, response-error issue access.                                                   |
| Core `StandardSchemaError`, `validationErrorResponse`, adapter handlers | `ZodError` checks/serialized payloads and flatten/format assumptions                                                                                | Portable issue/path handling and replacement JSON-error schema; update consuming response contracts and middleware together.                                                             |
| Core header composition/input-output inference                          | Whole-object replacement semantics, casing and transformed types                                                                                    | Merge Zod objects before bridging when replacement is required, or use field records; lowercase whole-object fields; client inputs and handler outputs.                                  |

## Retained and pending surfaces

- All ten public libraries remain. Vue/Solid framework adapters are not retired;
  no Svelte adapter was removed. The plain core client remains the portable
  fallback, with its capabilities and explicit status handling described.
- Public npm manifests were read on 2026-11-09 for React/Vue/Solid alpha.2 and
  Next/serverless alpha.1. They confirm explicit pre-change fallback points:
  Query4 (and the old React peers) at alpha.2, and Next12–14 peers at alpha.1.
  The hub identifies them without promising continued maintenance or treating
  declared ranges as verification of every native version.
- The Zod3 bridge and historical `/zod3` exports remain. Nest's older controller
  helpers and the plain client's deprecated top-level cache/next options are
  still present; the hub does not claim their inherited removal comments were
  implemented.
- OpenAPI's built-in Zod3 transformer remains; other validators need a matching
  explicit converter. The OpenAPI warning and a converter example were corrected.
- React19 and Fastify5 are pending additions. The Next16 adapter does not prove
  React19 Query compatibility. Vue2 and literal Query5.0.0 floors remain
  unverified; broad peer ranges do not certify every installation.
- Node26/pnpm12 are contributor baselines, not a newly declared consumer runtime
  floor. Existing upstream and published prerelease artifacts remain unchanged.

## Verification

- Before correction, the extended static-site suite reported **9 failed
  migration journeys** due to missing routes such as `/docs/query-v5-migration`.
- After corrections, `pnpm --filter @ts-restless/docs test` built/prerendered the
  docs, ran TypeScript checking and passed **46 tests**, including **13 rendered
  migration-journey page/anchor checks**. Eight Twoslash blocks in the two detailed
  migration guides compile against development packages, covering React normal
  and infinite options, schema bridging/types, error handling and payload schemas.
- Docs prerendering needs a local preview port. The sandboxed run failed with
  `listen EPERM ::1`; the approved run outside the sandbox completed successfully.
- The same docs command is already part of `.github/workflows/build-test.yml`.
  No workflow or publication-control change is needed to run the new checks in CI.
- After merging current main, the only conflicts were the React root versus
  `/v5` test import and retained additional A11/Vue/Solid fixtures. Keeping the
  migration fixture made the merge tree identical to documentation commit
  `bf3e5e0c`. A fresh `pnpm test:packages` run passed all31 installed-package
  tests; `node --check` also accepted the resolved fixture.
- `git diff --check` passed before committing. This is documentation validation,
  not a new application/runtime verification campaign. Framework-specific runtime
  journeys remain those recorded in the Query migration implementation plan.

## Continuing requirement

The [support policy](../../support-policy.md#migration-documentation-gate) now
requires a public checklist row, concrete replacement/examples, release boundary,
fallback, application checks and doc verification for every future removal.
Retained major Changesets link to the guides and reflect the final baseline.
When a containing release is created, replace development-only availability
wording with its exact released version; do not invent a future version now.
