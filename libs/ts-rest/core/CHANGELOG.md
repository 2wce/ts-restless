# @ts-rest/core

## 4.0.0-alpha.7

### Major Changes

- 2ff1fae: Move historical Zod3 bridges, inference helpers and error/payload helpers from `/zod3` to the canonical `/legacy` entry in core, Express, Nest, Next and serverless. Update imports as a matched package set; the old paths are removed in the v4 development baseline. Helper names and runtime behavior remain unchanged there. Default entries still use Standard Schema and do not load Zod.

  Fastify's native4 `/legacy` and native5 root remain validator independent. Replace `RequestValidationErrorSchema` from Fastify `/zod3` with `RequestValidationErrorSchemaWithoutMessage` from `@ts-restless/core/legacy`, optionally aliasing it to the old local name. The historical helper requires Zod3; the Fastify adapters do not. Importing compatibility helpers does not restore historical default handler errors or automatic adaptation of old schemas. See the Standard Schema and Fastify migration guides for exact replacements and retained support commitments.

## 4.0.0-alpha.6

### Major Changes

- dc4f14e: Adopt package-export-aware TypeScript resolution for the stable v4 baseline. Consumers using `moduleResolution: "node"`/`"node10"` or `"classic"` must migrate to matching Node16/NodeNext settings for direct Node execution, or Bundler resolution for bundled applications. Remove `typesVersions` fallbacks; supported public imports resolve through conditional exports.

  Both ESM and CommonJS code/declarations remain, including old-Zod compatibility. This does not impose contributor TypeScript7/Node26 on consumers or remove native framework support. See the [consumer configuration migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution) for compiler settings, package type, relative ESM extensions, tooling checks and pre-change release guidance.

### Minor Changes

- 43b0a72: Allow base-header callbacks to return `string | undefined | Promise<string | undefined>` for asynchronous request-scoped auth and SSR cookies. Resolve callbacks per request before transport dispatch while preserving case-insensitive overrides and header removal. Callback failures reject the request with the original error without invoking transport.

  Static string and synchronous callback headers remain supported. Use request-scoped clients or auth helpers for SSR; static Promise header values are unsupported. See the Fetch client's Dynamic Headers guide for examples and cancellation behavior.

### Patch Changes

- a676481: Declare audited public packages side-effect free so bundlers can remove unused imports. Installed-artifact bundle checks verify retained client/serverless APIs and Nest reflection metadata; compiled React modules retain their client directives. Function calls still perform their documented operations, and native framework initialization remains consumer-owned.

## 4.0.0-alpha.5

### Major Changes

- 45271c2: Validate decoded client responses consistently across JSON, text, binary and custom fetchers, including declared error statuses. Shared client execution owns validation and passes `validateResponse: false` to delegate fetchers so non-idempotent transforms run once. Standalone `tsRestFetchApi` retains its validation policy.

  Custom fetchers must return decoded schema inputs and remove manual contract validation. Preserve the supplied flag when forwarding to `tsRestFetchApi`. Response interceptors inside fetchers observe values before shared validation. Declared `c.noBody()` responses now return `undefined` for every content type and for custom fetchers, replacing the old empty-Blob behavior. Empty or malformed required JSON still rejects with a parse error. See the fetch-client validation and custom API migration guidance.

## 4.0.0-alpha.4

## 4.0.0-alpha.3

### Minor Changes

- ab168d1: Share query-library request execution between existing React v5 and Vue wrappers while preserving response envelopes, error identity and cancellation precedence.

## 4.0.0-alpha.2

## 4.0.0-alpha.1

## 4.0.0-alpha.0

### Major Changes

- 113ad0f: Launch the maintained fork as **ts-restless**, with the ten public packages under
  `@ts-restless/*` and the first stable target `4.0.0`. Interim numbered alpha
  releases are available before the remaining compatibility work is complete.
  Replace upstream dependencies and imports as a matched package set; public API
  identifiers and supported subpaths, including `/zod3` and React Query `/v5`, remain.
  Report bugs and prerelease feedback at https://github.com/2wce/ts-restless/issues.

  This major includes the Standard Schema default API and the separately documented
  legacy Zod bridge. A prerelease does not widen framework support: public React
  peers cover React 16.8–18, Fastify support remains on major 4, and Query v5 evidence
  is limited to the pinned compatibility baseline. OpenAPI still has its existing
  converter boundary. Follow the package and Standard Schema migration guides in
  the repository before moving from upstream v3.

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
- d588e19: Add a shared response contract evaluator returning body metadata and structured
  validation results. Preserve the existing core response-validation facade and
  Express behavior while adopting the evaluator for ordinary responses. Stream
  handling, validation enablement, undeclared statuses and error identities remain
  unchanged.

### Patch Changes

- 2c6367c: Fix handling of responses with no body and content type json header
- 0ca71d0: Fixed a bug where leading and trailing forward slashes the baseUrl and path would double up
- 612c295: allow passing numbers as path params into ts-rest core
- 534d761: Correct field-record header input/output inference across Standard Schema validators.
  Normalize HTTP names for validation and base/route overrides, preserve optional
  outputs and transformed values, and retain null removals through nested routers.
  Infer plain contract header maps correctly. Whole-object schemas keep their
  existing validation and merge semantics and require lowercase header keys.

## 3.52.1

### Patch Changes

- 5005793: Fix trailing slashes not being preserved by the client

## 3.52.0

### Minor Changes

- 964f7c6: Support optional path params in the type system, and ensure multiple levels of query params are dealt with in nest

## 3.51.1

## 3.51.0

## 3.50.0

### Minor Changes

- 83f6675: Do not require `body` to be defined for DELETE endpoints in contracts

## 3.49.4

### Patch Changes

- 52a2b35: Fix broken types on TS 5.5 in Node environments without `lib.dom`

## 3.49.3

### Patch Changes

- 1f9fd4a: Fix client functions resolving as `any` in TS 5.5 when `dom` is not included in tsconfig libs
- 740c538: Fix pnpm `Maximum call stack size exceeded` when installing @ts-rest/core

## 3.49.2

## 3.49.1

### Patch Changes

- b31454f: All ts-rest libraries are now packaged in a better way to be compatible with as many bundlers as possible. The @tanstack/react-query `No QueryClient set` error should also occur much less now.

## 3.49.0

### Minor Changes

- 597cd92: You can now pass functions as values for your `baseHeaders` in your client. This makes it much easier now to fetch and set access tokens from your authentication libraries.

## 3.48.1

### Patch Changes

- f2835dd: Fix merging of `baseHeaders` and `headers` in contracts when they are defined using plain types

## 3.48.0

## 3.47.0

## 3.46.0

### Minor Changes

- d763d45: Export `RequestValidationErrorSchema` for default request validation error responses.

## 3.45.2

## 3.45.1

## 3.45.0

## 3.44.1

## 3.44.0

### Minor Changes

- 60f90fa: Allow entire contract to be passed to `TsRestResponseError` so common responses can be thrown easily
- 45e5104: Add router-level metadata

## 3.43.0

### Minor Changes

- 308b966: `TsRestResponseError` can be thrown from any server package

## 3.42.0

### Minor Changes

- 7372bee: Allow arrays of files to be uploaded

## 3.41.2

## 3.41.1

## 3.41.0

### Minor Changes

- fc0adc6: Add contract option to define common responses

## 3.40.1

### Patch Changes

- afa5066: Fix incorrect type for URL `params` when using optional params without defining `pathParams`
- afa5066: Fix broken types for `c.responses()`

## 3.40.0

## 3.39.2

### Patch Changes

- dc554da: Fix `params` resolving as `any` when `pathParams` is missing and zod is not installed

## 3.39.1

## 3.39.0

### Minor Changes

- 860e402: Add contract definition for an absent body and handle accordingly on the server
- 487b2b6: Add `c.responses` utility

### Patch Changes

- 8f4cfe6: Fix client not validating response

## 3.38.0

### Patch Changes

- 0b9f249: Fix ts-rest overwriting a supplied content-type header
- 15d4926: Fix invalid `extraHeaders` type when no headers are defined in the contract

## 3.37.0

### Minor Changes

- 6a5280c: Allow fetch options to be set and client options to be overridden per request

### Patch Changes

- 77db06b: Fix client not correctly encoding application/x-www-form-urlencoded body

## 3.36.0

### Patch Changes

- c7e05d8: Fix optional path parameters showing in types with a question mark if path params are not used

## 3.35.1

## 3.35.0

## 3.34.0

## 3.33.1

## 3.33.0

## 3.32.0

### Minor Changes

- c4fb3f6: feat: `@ts-rest/core`: Add support for `x-www-form-urlencoded` content-type to core client fetcher

## 3.31.0

## 3.30.5

### Patch Changes

- 9bd7402: - `@ts-rest/fastify` fix: fastify deprecated routerPath property (fixes [#392](https://github.com/ts-rest/ts-rest/issues/392))
  - `@ts-rest/open-api` fix: Pass through contentType to OpenApi schema ([#414](https://github.com/ts-rest/ts-rest/pull/414))
  - `@ts-rest/core` fix: Content-type text/html returns blob body (fixes [#418](https://github.com/ts-rest/ts-rest/issues/418))
- 8cc95c5: add changeset for latest changes

## 3.30.4

### Patch Changes

- 10dff96: - (all packages) fix: address `zod` [CVE](https://nvd.nist.gov/vuln/detail/CVE-2023-4316) with bump `@ts-rest` peer dependency `zod` to minimum `^3.22.3`
  - ref PR: https://github.com/colinhacks/zod/pull/2824

## 3.30.3

### Patch Changes

- da48e62: fix: apply `validateResponseOnClient` recursively to nested App Routers in `@ts-rest/core` client

## 3.30.2

### Patch Changes

- bd0161b: fix: content-type application/json will not be automatically included in client request if the route is GET or body is undefined/null
  > if you need to send this header for whatever reason in a GET request/undefined body request, you can pass in runtime headers https://ts-rest.com/docs/core/#headers

## 3.30.1

## 3.30.0

### Minor Changes

- c056132: feat: add support for client-side response validation against contract schemas for `@ts-rest/core` (see docs for usage)

## 3.29.0

### Patch Changes

- 5f7b236: - bump `@ts-rest/react-query` peer dependency `@tanstack/react-query` to `^4.0.0` (latest 4.33.0)
  - bump `@ts-rest/react-query` peer dependency `zod` to `^3.21.0`
  - upgrades NX to 16.7 for project root

## 3.28.0

### Minor Changes

- a7755ef: Adds support for fetch cache and support for Nextjs App Dir fetch (docs coming soon), see this PR for more info: https://github.com/ts-rest/ts-rest/pull/315
- 16501dd: tsRestFetchApi should be more flexible when determining application/json content type header

## 3.27.0

### Patch Changes

- 55411ad: Upgrade zod to 3.21.4
  Upgrade @anatine/zod-openapi to 2.0.1

## 3.26.4

## 3.26.3

## 3.26.2

## 3.26.1

## 3.26.0

### Minor Changes

- fcf877d: Allow defining non-json response types in the contract
- 48b138d: Add new `SingleHandler` and `MultiHandler` API to `@ts-rest/nest`
- 2763208: Added `pathPrefix` to contract options to allow recursive path prefixing.

## 3.25.1

### Patch Changes

- 81560d4: Fix ESM/CJS issues in package.json

## 3.25.0

### Patch Changes

- bf21a75: Internal refactor of types

## 3.24.0

## 3.23.0

### Minor Changes

- 74bb4a8: Implement strict mode at a contract level. Strict mode ensures that only known responses are allowed by the type system. This applies both on the server and client side. Enable this with `strictStatusCodes: true` when defining a contract. If you would like to have the vanilla client throw an error when the response status is not known then you will need to use `throwOnUnknownStatus` when initializing the client.
- df77869: Response headers are now exposed to clients. Users of custom API fetchers should start returning headers.
- 74e41dc: Add 'metadata' property to routes

### BREAKING CHANGES FOR CUSTOM API FETCHERS

If you are using a custom API fetcher, you need to start returning response headers from your fetcher as a Web API [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers) interface.

If you are using `fetch`, just simply return `response.headers`.

If you are using `axios`, you can return `new Headers(response.headers.toJSON())`

## 3.22.0

### Minor Changes

- d61b127: Implement tanstack query cancellation
- 1c53ac9: Add `throwOnUnknownStatus` to `initClient` configuration. When set to `true` the client will throw errors for all status codes returned by the server which are not defined in the contract.

## 3.21.2

## 3.21.1

### Patch Changes

- 1b4ef1e: Fix incorrect detection of zod objects with nested ZodEffects and fix regression with validation

## 3.21.0

### Minor Changes

- b2bf874: Added React Query QueryClient function helpers

### Patch Changes

- 8729bb5: Fix node16 esm module resolution
- b2bf874: Add rawQuery parameter to custom API fetcher parameters

## 3.20.0

### Minor Changes

- c1c1d31: Add type-safe header definitions to contracts

## 3.19.5

### Patch Changes

- 574dbab: Improved Zod object detection in OpenAPI

## 3.19.4

### Patch Changes

- 4b6e9f6: Filter out undefined values from json queries

## 3.19.3

## 3.19.2

### Patch Changes

- 96ab6bd: Revert ESM fix, due to failed compilation on Next.js

## 3.19.1

### Patch Changes

- 5e1c6a2: feat: add rawBody and contentType to Custom Client API arguments
- ecac73d: Fix compatibility with Node.js TS native ESM code

## 3.19.0

### Minor Changes

- 2bb39f8: Added inference type helpers

## 3.18.1

### Patch Changes

- 9bd4c77: Fixes broken typing where sometimes the client's request args were incorrectly typed as optional

## 3.18.0

### Minor Changes

- 3fa43d9: Export the default fetch API as `tsRestFetchApi` from the core library, enables you to easy modify the fetcher
- 3fa43d9: Add the ability to remove a baseHeader on a per-request basis by setting the headers value to undefined
- 3fa43d9: Allow custom API to allow extra args, and type them in the individual api calls
- 3fa43d9: Prettify the arguments of API calls, making it much clearer what data should be passed to ts-rest api calls (thanks @mattpocockuk!)

## 3.17.0

## 3.16.2

### Patch Changes

- 3fa8679: Do not throw error for missing content-type header

## 3.16.1

### Patch Changes

- 832b645: fix(core): wrong "content-type" detection

## 3.16.0

### Minor Changes

- e490cf3: - Added server-side response validation feature
- Deprecated `@Api` decorator, use `@TsRest` instead

## 3.15.0

### Patch Changes

- 0f1edf9: Rename some Nest functions and types, and deprecate old names

- Fix Nest deprecation warning when passing Zod error to HttpException (#122)

- Some internal helper types (`NestControllerShapeFromAppRouter` and `NestAppRouteShape`) that were previously exported are now kept internal.
  You can use `NestControllerInterface` and `NestRequestShapes` instead.

- 3f65909: Drop usage of ES6 Proxy for clients (fixes IE11 support)

## 3.14.0

### Minor Changes

- 13ca71b: Enable nested routers without declaring new constants

## 3.13.1

### Patch Changes

- d778e60: Rebuilt without code comments in the compiled JS

## 3.13.0

## 3.12.1

### Patch Changes

- e0164f6: Publish README

## 3.12.0

### Minor Changes

- a53a384: Add response shape shape helper to make allow you to extract the response from a Contract route
- 5a13803: Allow typed query parameters by encoding them as JSON strings (disabled by default)

### Patch Changes

- 36e5bd4: Fix typing for query

## 3.11.2

## 3.11.1

## 3.11.0

### Minor Changes

- 57acbad: Added the ability to omit the second parameter if there no required query parameters

## 3.10.2

## 3.10.1

## 3.10.0

### Minor Changes

- 046e498: Use Nest.js req.query and req.params instead of parsing from URL

### Patch Changes

- 35c64db: Move next lib utils out of @ts-rest/core to reduce bundle size

## 3.9.0

## 3.8.0

### Minor Changes

- 59b8d29: Add credentials option for fetch client

### Patch Changes

- 1b3faaf: Use z.input for body and query types for clients

## 3.7.0

### Minor Changes

- d4d9be5: Add support for pathParams Zod verification
- 8a19717: Add pathParams transformations

## 3.6.1

## 3.6.0

### Minor Changes

- 6753c69: Build ESM and CommonJS for improved compatibility

## 3.5.0

### Minor Changes

- 068822d: Add support for multipart/form-data

## 3.4.2

## 3.4.1

## 3.4.0

## 3.3.0

## 3.2.2

## 3.2.1

## 3.2.0

## 3.1.1

### Patch Changes

- d3a74fe: Remove unnecessary recursion

## 3.1.0

## 3.0.0

### Major Changes

- 895112a: Migrate paths to a string rather than function

## 2.1.0

### Minor Changes

- 75f157a: Add Zod validation to @ts-rest/next

## 2.0.1

### Patch Changes

- 119aed6: Bump versions to 2.0.1

## 2.0.0

### Major Changes

- 4792b26: Change contract to support multiple responses, for different statuses
- c88fb99: Rename data to body to be more HTTP spec compliant

### Patch Changes

- 4792b26: Add error handling support to express

## 1.3.0

### Minor Changes

- a5d7e97: Add basic open-api support

### Patch Changes

- 077d57b: Update client to have zod response type
- 5f87b1a: Add OpenAPI options for generateOpenApi

## 1.2.0

### Minor Changes

- 987fd07: Add query and mutation support to react-query, instead of requring useMutation and useQuery

## 1.1.0

### Minor Changes

- 72dd65d: Extract express logic to @ts-rest/express

## 1.0.4

### Patch Changes

- 3adb9c8: Change build path

## 1.0.3

### Patch Changes

- 0d706a3: Sync package versions

## 1.0.2

### Patch Changes

- 1fe80ea: sync versions

## 1.0.1

### Patch Changes

- 8d908ee: Update package scope

## 1.0.0

### Minor Changes

- 86a5cb7: add react-query and nest integration
