# Monorepo configuration consolidation

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

Keep compiler and build policy shared. Package configs should select local files and state genuine framework or compatibility exceptions. This is a configuration refactor within the approved Vite+ migration; published APIs and release paths remain the same.

## TypeScript

- `tsconfig.base.json`: common language, resolution and runtime settings.
- `tsconfig.library.json`: existing library strictness flags, no ambient globals and no-emit checking.
- `tsconfig.test.json`: library checking with isolated Vitest and Node globals.
- `tsconfig.pack.json`: declaration generation settings, no test globals, shared output location and test exclusions.
- `tsconfig.node.json`: Node example checking and test globals.
- `tsconfig.web.json`: browser build-tool checking without unused composite/declaration output.
- Public libraries keep a small `tsconfig.json` solution, `tsconfig.lib.json` for source-only declarations and `tsconfig.spec.json` for test checking. The references preserve separate ambient type environments. Private source-only libraries and Node examples need only `tsconfig.json`.
- Remove unused private-library/spec/app configs; preserve public-library source/test references. Keep inference assertion projects independent and uncached.
- Standard file patterns use TypeScript 7's built-in `${configDir}` substitution so they resolve in the consuming package. Keep only exceptions local. Public-library solution configs remain empty; Vite+ owns build ordering, while references preserve editor/checker source/test project selection. Do not introduce a `tsc --build` pipeline.
- Keep the root React Query declaration config: the native generator's root-directory behavior requires it to cover both versioned source trees.
- Next and standalone consumer fixtures retain their compatibility settings. Node examples retain Node/Express types, Nest metadata and the existing Nest target. Browser JSX differences stay local.

## Vite+

- `tools/vite/library.ts` shares library pack tasks, cache inputs and outputs using Vite's native `mergeConfig` for pack overrides; extra workspace cache inputs are declared locally.
- Keep explicit build cache inputs; include every shared config and the React Query v5 source/manifest/config inputs. Do not depend on automatic native compiler read tracking.
- `tools/vite/pack.ts` continues to own public artifact generation and additionally shares the Node example pack preset.
- `tools/vite/swc.ts` shares decorator transform settings across library builds, Node examples and tests.
- Root unit tests inherit common defaults using Vitest `extends: true`; isolated non-strict/example projects retain their existing setups. No new task runner or dependency is added.

## Validation

Compare against the existing dirty migration snapshot. Run formatting, native lint, uncached inference checks, the unit suite, all library builds, package compatibility checks, example builds and host tests. Probe strict/non-strict compiler settings and cache invalidation after shared-config and React Query v5 changes. Preserve all existing work through implementation. The user subsequently authorized committing all changes and opening a draft PR to the personal fork; no merge or publication.
