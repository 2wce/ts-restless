# @ts-rest/serverless

## 4.0.0-alpha.7

### Major Changes

- 2ff1fae: Move historical Zod3 bridges, inference helpers and error/payload helpers from `/zod3` to the canonical `/legacy` entry in core, Express, Nest, Next and serverless. Update imports as a matched package set; the old paths are removed in the v4 development baseline. Helper names and runtime behavior remain unchanged there. Default entries still use Standard Schema and do not load Zod.

  Fastify's native4 `/legacy` and native5 root remain validator independent. Replace `RequestValidationErrorSchema` from Fastify `/zod3` with `RequestValidationErrorSchemaWithoutMessage` from `@ts-restless/core/legacy`, optionally aliasing it to the old local name. The historical helper requires Zod3; the Fastify adapters do not. Importing compatibility helpers does not restore historical default handler errors or automatic adaptation of old schemas. See the Standard Schema and Fastify migration guides for exact replacements and retained support commitments.

### Minor Changes

- 1c2c0cf: Accept optional Fetch `HeadersInit` on serverless handler responses. Context headers override ordinary returned headers, cookies from both sources are preserved, and existing content-type serialization rules remain in effect.

  Merge `Vary` field names case-insensitively, retaining wildcard cache protection during CORS processing. Returning the context header object copies it once and avoids duplicate cookies.

  Preserve native body data for AWS serialization when CORS middleware creates a plain Fetch response.

## 4.0.0-alpha.6

### Major Changes

- dc4f14e: Adopt package-export-aware TypeScript resolution for the stable v4 baseline. Consumers using `moduleResolution: "node"`/`"node10"` or `"classic"` must migrate to matching Node16/NodeNext settings for direct Node execution, or Bundler resolution for bundled applications. Remove `typesVersions` fallbacks; supported public imports resolve through conditional exports.

  Both ESM and CommonJS code/declarations remain, including old-Zod compatibility. This does not impose contributor TypeScript7/Node26 on consumers or remove native framework support. See the [consumer configuration migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution) for compiler settings, package type, relative ESM extensions, tooling checks and pre-change release guidance.

### Patch Changes

- a676481: Declare audited public packages side-effect free so bundlers can remove unused imports. Installed-artifact bundle checks verify retained client/serverless APIs and Nest reflection metadata; compiled React modules retain their client directives. Function calls still perform their documented operations, and native framework initialization remains consumer-owned.

## 4.0.0-alpha.5

### Patch Changes

- 0e117a0: Treat zero-length JSON request bytes as an absent body before contract validation, so undefined-accepting and explicit no-body contracts work and missing required bodies return normal validation errors. Nonempty malformed JSON keeps its existing parsing-error path.

  Normalize undefined JSON response serialization to an empty native body before AWS gateway v1/v2 mapping, preventing accidental binary conversion failures. Declare empty responses with `c.noBody()` for interoperable clients. Applications relying on a 500 for absent required JSON should expect the normal 400 validation response; see the serverless Fetch runtimes guide.

## 4.0.0-alpha.4

## 4.0.0-alpha.3

## 4.0.0-alpha.2

### Major Changes

- e937ed0: Set the first stable ts-restless v4 Next.js baseline to majors 15 and 16, matching Next.js's Maintenance and Active LTS lines. Remove unsupported Next.js 12, 13 and 14 from both integrations' peer ranges and packed consumers.

  Before migrating an application on Next.js 12–14 to ts-restless v4, upgrade Next.js using its official migration guides. Pages Router, App Router and Pages Router Edge integration entry points remain available on supported majors. Use a current patched release of Next.js 15 or 16; the maintained workspace example targets Next.js 16. This initial v4 baseline does not change already published upstream ts-rest v3 packages.

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

- f08fc34: Support Nest 12 and Next 15/16 while retaining older framework peer ranges.
  Register optional Nest contract paths as concrete route alternatives for Express
  5 compatibility. Paths keep the selected framework's native route priority.
  Update the Zod 3 OpenAPI converter to the compatible 1.14 release without
  changing the OpenAPI public type major.
- f36510a: Support the "Standard Schema" validation interface to enable support for Zod4, Valibot, Arktype etc.

### Patch Changes

- 3313b33: Expose more types to fix build issues with "verbatimModuleSyntax" and other such build configs
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

### Minor Changes

- d4692e3: New `createFetchHandler` function added so a fetch handler can be initialized once and re-used

### Patch Changes

- 7cf4415: Fix AWS Lambda handler not working in Node.js environments.
- d4692e3: Fix response handling for itty-router >= 5.0.17

## 3.50.0

### Minor Changes

- e6af1db: Revert breaking change from v3.47.0. Order of generics on `tsr.router` and `tsr.route` have been reverted. `tsr.routerWithMiddleware` has been introduced so the contract does need to be passed twice.

## 3.49.4

## 3.49.3

## 3.49.2

### Patch Changes

- 6d7bea2: Fix broken package exports

## 3.49.1

### Patch Changes

- b31454f: All ts-rest libraries are now packaged in a better way to be compatible with as many bundlers as possible. The @tanstack/react-query `No QueryClient set` error should also occur much less now.

## 3.49.0

## 3.48.1

### Patch Changes

- Updated dependencies [f2835dd]
  - @ts-rest/core@3.48.1

## 3.48.0

### Patch Changes

- @ts-rest/core@3.48.0

## 3.47.0

### Minor Changes

- eb2c647: BREAKING CHANGE: The order of generics on the `tsr.*` methods have been swapped. Now you don't have to pass `typeof contract` first. You can now pass your request extension type only.
- eb2c647: Make sure initialized client and router types are exported so they can be re-exported with types emitted
- eb2c647: Fluent router builder for easier modification of request context type in middleware. Try it out through `tsr.routerBuilder(contract)`!

### Patch Changes

- @ts-rest/core@3.47.0

## 3.46.0

### Minor Changes

- d763d45: Export `RequestValidationErrorSchema` for default request validation error responses.
- 72fd14e: Add Azure Functions compatibility

### Patch Changes

- Updated dependencies [d763d45]
  - @ts-rest/core@3.46.0

## 3.45.2

### Patch Changes

- f5febbf: Change response handler type to accept promises
  - @ts-rest/core@3.45.2

## 3.45.1

### Patch Changes

- @ts-rest/core@3.45.1

## 3.45.0

### Patch Changes

- @ts-rest/core@3.45.0

## 3.44.1

### Patch Changes

- 08878f0: Create type helpers for route-level middleware context
  - @ts-rest/core@3.44.1

## 3.44.0

### Patch Changes

- Updated dependencies [60f90fa]
- Updated dependencies [45e5104]
  - @ts-rest/core@3.44.0

## 3.43.0

### Minor Changes

- 308b966: `TsRestResponseError` can be thrown from any server package
- 05e8a92: Add ability to include custom platform context for serverless fetch handler

### Patch Changes

- Updated dependencies [308b966]
  - @ts-rest/core@3.43.0

## 3.42.0

### Minor Changes

- 7108c19: Add middleware support

### Patch Changes

- Updated dependencies [7372bee]
  - @ts-rest/core@3.42.0

## 3.41.2

### Patch Changes

- b6bd2ed: Fix module resolution when not using node16 or nodenext
  - @ts-rest/core@3.41.2

## 3.41.1

### Patch Changes

- d107181: Fix broken type for `@ts-rest/serverless/next` handler
  - @ts-rest/core@3.41.1

## 3.41.0

### Patch Changes

- Updated dependencies [fc0adc6]
  - @ts-rest/core@3.41.0

## 3.40.1

### Patch Changes

- Updated dependencies [afa5066]
- Updated dependencies [afa5066]
  - @ts-rest/core@3.40.1

## 3.40.0

### Minor Changes

- fa7219d: Support Next.js App Router route handlers

### Patch Changes

- @ts-rest/core@3.40.0

## 3.39.2

### Patch Changes

- Updated dependencies [dc554da]
  - @ts-rest/core@3.39.2

## 3.39.1

### Patch Changes

- @ts-rest/core@3.39.1

## 3.39.0

### Minor Changes

- 860e402: Add contract definition for an absent body and handle accordingly on the server

### Patch Changes

- Updated dependencies [8f4cfe6]
- Updated dependencies [860e402]
- Updated dependencies [487b2b6]
  - @ts-rest/core@3.39.0

## 3.38.0

### Patch Changes

- Updated dependencies [0b9f249]
- Updated dependencies [15d4926]
  - @ts-rest/core@3.38.0

## 3.37.0

### Patch Changes

- Updated dependencies [6a5280c]
- Updated dependencies [77db06b]
  - @ts-rest/core@3.37.0

## 3.36.0

### Patch Changes

- Updated dependencies [c7e05d8]
  - @ts-rest/core@3.36.0

## 3.35.1

## 3.35.0

### Minor Changes

- bacc9d1: New serverless library for AWS Lambda, Edge runtimes and Next.js-specific Edge runtime

### Patch Changes

- @ts-rest/core@3.35.0
