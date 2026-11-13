# @ts-rest/vue-query

## 4.0.0-alpha.7

## 4.0.0-alpha.6

### Major Changes

- dc4f14e: Adopt package-export-aware TypeScript resolution for the stable v4 baseline. Consumers using `moduleResolution: "node"`/`"node10"` or `"classic"` must migrate to matching Node16/NodeNext settings for direct Node execution, or Bundler resolution for bundled applications. Remove `typesVersions` fallbacks; supported public imports resolve through conditional exports.

  Both ESM and CommonJS code/declarations remain, including old-Zod compatibility. This does not impose contributor TypeScript7/Node26 on consumers or remove native framework support. See the [consumer configuration migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution) for compiler settings, package type, relative ESM extensions, tooling checks and pre-change release guidance.

### Patch Changes

- a676481: Declare audited public packages side-effect free so bundlers can remove unused imports. Installed-artifact bundle checks verify retained client/serverless APIs and Nest reflection metadata; compiled React modules retain their client directives. Function calls still perform their documented operations, and native framework initialization remains consumer-owned.

## 4.0.0-alpha.5

## 4.0.0-alpha.4

## 4.0.0-alpha.3

### Major Changes

- bcf8bb2: Target TanStack Query v5 only in the initial stable ts-restless v4 baseline. React v5 becomes the default (`/v5` remains an alias); remove the v4 React wrapper and React16/17 peers. Migrate Vue and Solid to native v5 options, typed pagination and native reactivity. Infinite queries require initialPageParam and getNextPageParam; mutation status follows v5 isPending. Follow the [Query v5 migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/query-v5-migration.mdx) before upgrading from previous prereleases or upstream v3. It covers React provider/hook/cache/SSR replacements, removed options/types, Vue/Solid reactivity and application verification; there is no Query4 legacy adapter.

### Patch Changes

- ab168d1: Share query-library request execution between existing React v5 and Vue wrappers while preserving response envelopes, error identity and cancellation precedence.

## 4.0.0-alpha.2

## 4.0.0-alpha.1

## 4.0.0-alpha.0

### Major Changes

- 724b9b3: Make default core and adapter entry points validator independent through Standard
  Schema. Remove Zod-specific public inference types and automatic old-Zod detection
  from those entries, and isolate historical Zod helpers under explicit `/zod3`
  compatibility entry points.

  Default validation failures use StandardSchemaError with the serialized name
  ValidationError, including explicitly bridged old schemas. Request error locations
  and validator-provided issue fields are retained. Whole-object header schemas now
  validate both inputs before merging successful outputs; merge typed Zod
  objects before bridging when replacement semantics are required.

  See the unreleased Standard Schema migration guide for moved imports and intentional
  major-version changes. This Changeset records the future coordinated release;
  release workflows remain disabled.

### Minor Changes

- f36510a: Support the "Standard Schema" validation interface to enable support for Zod4, Valibot, Arktype etc.

### Patch Changes

- Updated dependencies [2c6367c]
- Updated dependencies [f36510a]
- Updated dependencies [d588e19]
- Updated dependencies [0ca71d0]
- Updated dependencies [612c295]
- Updated dependencies [534d761]
- Updated dependencies [113ad0f]
- Updated dependencies [724b9b3]
  - @ts-restless/core@4.0.0-alpha.0

## 3.52.1

## 3.52.0

## 3.51.1

## 3.51.0

## 3.50.0

## 3.49.4

## 3.49.3

## 3.49.2

## 3.49.1

### Patch Changes

- b31454f: All ts-rest libraries are now packaged in a better way to be compatible with as many bundlers as possible. The @tanstack/react-query `No QueryClient set` error should also occur much less now.

## 3.49.0

### Minor Changes

- 597cd92: You can now pass functions as values for your `baseHeaders` in your client. This makes it much easier now to fetch and set access tokens from your authentication libraries.

## 3.48.1

## 3.48.0

## 3.47.0

### Minor Changes

- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted

## 3.46.0

## 3.45.2

## 3.45.1

## 3.45.0

## 3.44.1

## 3.44.0

## 3.43.0

## 3.42.0

## 3.41.2

## 3.41.1

## 3.41.0

### Patch Changes

- 5a48f18: Fix `select` option

## 3.40.1

## 3.40.0

## 3.39.2

## 3.39.1

## 3.39.0

## 3.38.0

## 3.37.0

### Minor Changes

- 6a5280c: Allow fetch options to be set and client options to be overridden per request

## 3.36.0

## 3.35.1

## 3.35.0

## 3.34.0

## 3.33.1

### Patch Changes

- 6d2c369: Remove TanStack Query v5 from peer dependencies

## 3.33.0

## 3.32.0

## 3.31.0

### Minor Changes

- 29fe85b: feat: `@ts-rest/react-query` use object-syntax in react-query to support [@tanstack/react-query@^5.0.0](https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5)

  - note: This does **not** implement a complete migration to v5 but lays the groundwork to get the ball rolling and apps running again.

  feat: `@ts-rest/vue-query` add @tanstack/vue-query@^5.0.0 as peer dependency

## 3.30.5

### Patch Changes

- 9bd7402: - `@ts-rest/fastify` fix: fastify deprecated routerPath property (fixes [#392](https://github.com/ts-rest/ts-rest/issues/392))
  - `@ts-rest/open-api` fix: Pass through contentType to OpenApi schema ([#414](https://github.com/ts-rest/ts-rest/pull/414))
  - `@ts-rest/core` fix: Content-type text/html returns blob body (fixes [#418](https://github.com/ts-rest/ts-rest/issues/418))
- 8cc95c5: add changeset for latest changes

## 3.30.4

### Patch Changes

- 10dff96: - fix: address `zod` [CVE](https://nvd.nist.gov/vuln/detail/CVE-2023-4316) with bump `@ts-rest` peer dependency `zod` to minimum `^3.22.3`
  - ref PR: https://github.com/colinhacks/zod/pull/2824

## 3.30.3

## 3.30.2

### Patch Changes

- bd0161b: fix: content-type application/json will not be automatically included in client request if the route is GET or body is undefined/null

## 3.30.1

## 3.30.0

## 3.29.0

### Minor Changes

- 2feedbb: Adds new `@ts-rest/vue-query` package!
  - feat: add support @tanstack/vue-query
  - feat: add docs for @tanstack/vue-query package
