# @ts-rest/serverless

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
