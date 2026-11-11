# Side-effect metadata and bundle verification implementation plan

**Goal:** Let bundlers discard unused public package imports safely, with published-artifact evidence that used APIs retain required initialization.

**Architecture:** Audit emitted ESM/CommonJS entry graphs, then declare `sideEffects: false` only where module evaluation has no required external effects. Use a file allowlist for genuine initialization entries. Extend the existing installed-tarball suite with esbuild probes; keep runtime API ownership and build layout intact.

**Spec:** [F07 acceptance](release-readiness-backlog.md#f07--side-effect-metadata-and-bundle-verification), [package boundaries](../architecture.md#package-and-artifact-boundaries).

## Constraints

- Audit all ten public libraries and all executable export subpaths; private examples/tooling are outside the metadata promise.
- Import-time effects differ from operations invoked through exported APIs. Schema/symbol construction and decorators require inspection, not automatic exclusion.
- Preserve Nest legacy decorators/reflection metadata and React `use client` directives.
- Use Node 26.12.0, pnpm 12.14.0 and existing esbuild; no new bundler or release machinery.
- Do not version, merge or publish packages. Record local artifact evidence separately from availability.

## Task 1: Audit and verify the public metadata promise

**Files:** public `libs/ts-rest/*/package.json`, `tests/packaging/package-check.test.mjs`, `.changeset/*`, this plan. Shared build configuration changes require a demonstrated emitted-artifact defect.

**Interfaces:** Existing archive installation in `package-check.test.mjs` supplies actual published manifests and native peers. esbuild resolves imports from that isolated consumer using its package exports.

- [x] Run `pnpm pack:packages`; enumerate built executable exports and inspect their transitive import-time initialization. Record each package/subpath's outcome below, including external registrations, globals, polyfills, decorators, schema construction and serverless factories.
- [x] Extend the existing packed suite with a metadata assertion and a bundle importing all executable public subpaths whose values are unused. Build with `treeShaking: true`, `metafile: true`, external native peers, and the installed consumer as `absWorkingDir`; require zero retained bytes from public libraries and execute the resulting no-op bundle. Run the focused test and record the failure before metadata changes.
- [x] Add used-export ESM/CJS bundle journeys: invoke core contract/client APIs, verify a retained Nest decorated class with `Reflect.getMetadata('design:paramtypes', TsRestInterceptor)[0] === Reflector`, and retain the existing compiled React directive assertions. Give used imports observable behavior so an empty bundle cannot pass.
- [x] Add `"sideEffects": false` to audited public manifests, or exact emitted-file allowlists where required. Repack and prove the unused/used tests pass. Test a deliberately removed/incorrect metadata promise as a negative control if fixture structure allows it without complicating the suite.
- [x] Add a patch Changeset for affected public libraries and concise audit evidence here. Update the plan index and roadmap; a new ADR is needed only if the audit reveals a consequential initialization policy decision.
- [x] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint` and the docs test task. Record results and limitations for the review commit, then create a draft PR.

## Audit and verification evidence

Execution starts from main `43b0a72d` after async headers merged. The manifests initially omit `sideEffects`. The task is planned before implementation; later entries record exact audited artifacts and verification, without claiming publication.

### Built-artifact audit (2026-11-11)

All 22 executable public subpaths and their emitted ESM/CommonJS chunks were reviewed after normal packing. No package-owned global patch, polyfill, host registration, listener or stylesheet initialization needs an exception allowlist. All ten public manifests therefore declare `sideEffects: false`.

| Package / executable subpaths                                  | Import-time initialization and retained behavior                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core: root, `/zod3`                                            | Symbols and exported compatibility Zod schemas; constructors/functions execute only when called. Schemas are local values, not global registrations.                                                                                                                                                                   |
| express: root, `/zod3`                                         | Router symbol and version-dependent path helper selected from the native application API; endpoint registration stays inside exported calls. Compatibility entry reexports local schemas.                                                                                                                              |
| fastify: root, `/zod3`                                         | Router symbol/error classes and helper functions; plugins/hooks/routes are installed only by exported calls. Compatibility entry reexports schemas.                                                                                                                                                                    |
| nest: root, `/zod3`                                            | `ConfigurableModuleBuilder` creates exported module/token values; legacy decorators attach metadata to exported classes. Keeping those classes keeps their initialization. No application module is registered by importing the package. Reflection/native initialization belongs to the native dependencies/consumer. |
| next: root, `/zod3`                                            | Classes and handler/client factories; imports do not register a route or modify a native request. Compatibility entry reexports schemas.                                                                                                                                                                               |
| serverless: root, `/fetch`, `/aws`, `/azure`, `/next`, `/zod3` | `createTsr()` constructs an exported object of functions without a host registration. Handler creation and request work happen on invocation. Shared chunks define classes/functions; compatibility schemas remain explicit.                                                                                           |
| react-query: root, `/v5`, `/tanstack`                          | Preserved reexport modules and package-local React context construction; no provider is mounted or query dispatched on import. Client directives stay on emitted provider/query-client modules in both formats.                                                                                                        |
| vue-query: root                                                | Functions import native query/reactivity APIs; no query, watcher or provider is created on import.                                                                                                                                                                                                                     |
| solid-query: root                                              | Functions import native query/reactivity APIs; no query/owner is created on import.                                                                                                                                                                                                                                    |
| open-api: root                                                 | Converter/traversal function objects and explicit Zod3 converter imports; document generation is invoked by consumers.                                                                                                                                                                                                 |

### Verification

Missing metadata failed the new tarball assertion before manifest edits (`next: audited import-time effects`, actual `undefined`). Unused static imports from all 22 entries contribute zero bytes from public libraries in esbuild ESM and CommonJS outputs. A negative control restores conservative metadata in a disposable installed Nest manifest and proves its decorated initialization is retained. Manifest replacement uses a fresh inode so pnpm's store is not mutated.

Used ESM import and CommonJS require bundles execute contract/client APIs, Fetch handler and `tsr` factory behavior, interceptor constructor metadata and module exports metadata. Native peers remain external; runtime dependencies are bundled from their installed package locations. Existing source directives and strict tarball/runtime consumers remain enabled. This promises removable import-time modules, not purity of function calls or exhaustive elimination of unused properties from CommonJS modules.

`pnpm check` passed all 14 tasks: 782 source tests, two existing todos, strict production/inference checks, zero lint errors and 359 existing warnings. `pnpm test:packages` passed 33 tests across four files, including installed native/validator/query journeys and versioning probes. Public availability was independently refreshed from all ten npm alpha.5 manifests/tags and merged release records: F04/serverless fixes are published, async headers are merged but absent from alpha.5. The docs export expectation was updated from alpha.4 to alpha.5 and retains the explicit async-header availability limitation.

The final focused bundle test passed after the hard-link-safe negative-control change. The docs build/native typecheck and all 80 docs tests passed; docs lint verified 421 links/anchors across 111 documents. Independent review and draft delivery follow this audit. Local checks do not prove CI-only fixtures, other bundlers, publication of this metadata or future import-time effects; changes that add initialization must review this promise and update the probes.
