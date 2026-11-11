# @ts-rest/fastify

## 4.0.0-alpha.6

### Major Changes

- 3d4f180: Target native Fastify 5 from `@ts-restless/fastify` and move native Fastify 4 support to the deprecated `@ts-restless/fastify/legacy` entry. Fastify 4 applications must change their adapter value/type imports to `/legacy` when adopting this release; the root entry now rejects native4 at registration. Applications upgrading to native5 use the root entry, Node20+ and compatible native plugins. Registration APIs, contract inference, native hooks, validation and response writing are preserved; the independent `/zod3` helper is unchanged.

  Fastify 4 retains compatibility checks and critical fixes through ts-restless v4. Its removal targets ts-restless v5, no earlier than six calendar months after stable notice and verified replacement availability. See the [Fastify migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5) for the import/runtime/plugin migration and notice timing.

- dc4f14e: Adopt package-export-aware TypeScript resolution for the stable v4 baseline. Consumers using `moduleResolution: "node"`/`"node10"` or `"classic"` must migrate to matching Node16/NodeNext settings for direct Node execution, or Bundler resolution for bundled applications. Remove `typesVersions` fallbacks; supported public imports resolve through conditional exports.

  Both ESM and CommonJS code/declarations remain, including old-Zod compatibility. This does not impose contributor TypeScript7/Node26 on consumers or remove native framework support. See the [consumer configuration migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution) for compiler settings, package type, relative ESM extensions, tooling checks and pre-change release guidance.

### Patch Changes

- a676481: Declare audited public packages side-effect free so bundlers can remove unused imports. Installed-artifact bundle checks verify retained client/serverless APIs and Nest reflection metadata; compiled React modules retain their client directives. Function calls still perform their documented operations, and native framework initialization remains consumer-owned.

## 4.0.0-alpha.5

## 4.0.0-alpha.4

## 4.0.0-alpha.3

## 4.0.0-alpha.2

## 4.0.0-alpha.1

### Patch Changes

- b4a1504: Use core's shared response evaluator for Fastify response validation and contract metadata. Preserve validation enablement, single schema transforms, undeclared statuses, native stream handling, hooks and response errors.

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
- 4cffcb3: export AppRouteImplementation from fastify to allow for usage cross-file

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

## 3.48.1

### Patch Changes

- 48f2a8c: Use fastify logger for route initalization logs

## 3.48.0

## 3.47.0

### Minor Changes

- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted

## 3.46.0

### Minor Changes

- fb42b94: Add ts-rest route to fastify config object
- bfec125: Add option to define hooks on app level or route level
- d763d45: Export `RequestValidationErrorSchema` for default request validation error responses.

### Patch Changes

- 610428d: Fix when `pathPrefix` is used multiple times in nested contracts

## 3.45.2

## 3.45.1

## 3.45.0

### Minor Changes

- 3dc697f: Pass `appRoute` to route handlers

## 3.44.1

## 3.44.0

## 3.43.0

### Minor Changes

- 308b966: `TsRestResponseError` can be thrown from any server package

## 3.42.0

## 3.41.2

## 3.41.1

## 3.41.0

## 3.40.1

## 3.40.0

## 3.39.2

## 3.39.1

### Patch Changes

- 4e166b3: Fix fastify crashing on malformed request JSON

## 3.39.0

### Minor Changes

- 860e402: Add contract definition for an absent body and handle accordingly on the server

## 3.38.0

### Minor Changes

- 33d6a57: Add single route implementation helper

## 3.37.0

## 3.36.0

## 3.35.1

## 3.35.0

## 3.34.0

## 3.33.1

## 3.33.0

## 3.32.0

## 3.31.0

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

## 3.30.1

### Patch Changes

- a30326c: Remove console log in fasitfy route initialization for `@ts-rest/fastify`

## 3.30.0

## 3.29.0

### Patch Changes

- f45aa1b: fix: Type error when combining server contracts with fastify
- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

## 3.27.0

### Patch Changes

- 55411ad: Upgrade zod to 3.21.4
  Upgrade @anatine/zod-openapi to 2.0.1
- f14ad97: Re-throw errors from route handlers
- 4444929: Pass the parsed request body from zod to the route handler instead of the original request.

## 3.26.4

## 3.26.3

## 3.26.2

## 3.26.1

## 3.26.0

### Minor Changes

- fcf877d: Allow defining non-json response types in the contract

## 3.25.1

### Patch Changes

- 81560d4: Fix ESM/CJS issues in package.json

## 3.25.0

### Minor Changes

- 871466c: Added support for registering ts-rest as a Fastify plugin

### Patch Changes

- bf21a75: Internal refactor of types

## 3.24.0

### Minor Changes

- 2c16e94: Release initial fastify implementation
