# Monorepo Configuration Consolidation Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use the executing-plans workflow inline. Preserve the existing dirty migration; the dedicated branch is `chore/dx-improvements`.

**Goal:** Reduce repeated TypeScript and Vite settings using existing monorepo facilities.

**Architecture:** Root TypeScript presets own shared compiler policy; package configs own file selection and framework exceptions. Typed Vite presets use `mergeConfig` and Vitest root inheritance. Explicit package build caching remains in place.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, Vite+ 1.3.0, TypeScript 7.0.2, Vitest 5.0.5.

**Spec:** `docs/plans/2026-10-19-monorepo-config-design.md`

## Global Constraints

- Add no dependencies or maintained orchestration scripts.
- Preserve release paths, ESM/CJS exports, es2019 library target, React directives and Nest metadata.
- Keep React Query v4/v5 and strict/non-strict inference projects isolated.
- Inference checks must run uncached.
- Preserve independent docs and consumer-fixture dependencies/configs.
- Preserve all changes through implementation. Final delivery is authorized: commit all changes and open a draft PR to 2wce/ts-rest; no merge or publication.

## Task 1: Consolidate TypeScript configuration

**Files:** Root `tsconfig.library.json`, `tsconfig.test.json`, `tsconfig.pack.json`, `tsconfig.node.json`, `tsconfig.web.json`; workspace package `tsconfig*.json`; `tools/vite/tsconfig.assertions.json` consumers.

- [x] Run the existing unit suite and save a focused snapshot before edits. Baseline: 565 passed, two existing todos.
- [x] Add shared library checking/declaration/browser compiler presets. Library checking inherits the current strict flags with `noEmit: true`; packing uses `declaration: true`, `noEmit: false`, `types: []` and excludes test/spec files.
- [x] Keep public-library solution references for isolated source/test ambient globals; remove unused private-library, example spec and Node app configs. Share standard includes with `${configDir}`; keep Node/Express ambient types, Nest es2021 target and JSX exceptions local.
- [x] Remove unused composite/incremental browser preset. Preserve root React Query declaration include and uncached assertion commands.
- [x] Run native lint and inference checks; inspect effective configs for declarations, source-only includes, version isolation and non-strict settings.

## Task 2: Consolidate Vite configuration and verify boundaries

**Files:** `tools/vite/library.ts`, `tools/vite/pack.ts`, `tools/vite/swc.ts`, library/example `vite.config.ts`, root `vite.config.ts`, `CONTRIBUTING.md`.

- [x] Share the library task object with explicit source/manifest/docs/shared-config/lock inputs and release output globs. Use `mergeConfig` for the React Query root tsconfig; declare extra cross-package cache inputs locally.
- [x] Share Node pack settings and decorator transform options; point Node examples to their consolidated `tsconfig.json`.
- [x] Move library test defaults to the root and inherit them with `extends: true`. Preserve example/non-strict setup isolation and Fastify/DOM/Nest exceptions.
- [x] Update contributor docs to show the preset hierarchy and the intentional exceptions.
- [x] Run `pnpm format`, `pnpm check`, `pnpm build`, `pnpm test:packages`, `pnpm build:examples` and `pnpm test:hosts`.
- [x] Probe shared-config and React Query v5 cache invalidation, check compiler isolation, compare the focused pre-edit snapshot and run `git diff --check`.
- [x] Record fresh verification results. The user subsequently authorized committing all changes and creating a draft PR to the personal fork.

## Results

- Removed 25 obsolete TypeScript configs and added five shared presets: 20 fewer config files overall.
- Standard file selection uses TypeScript's built-in `${configDir}`. Most public library pack/test configs now contain only `extends`.
- Shared typed Vite presets own pack ordering/cache policy, Node example packing and decorator transforms. Root library tests inherit their shared defaults.
- `pnpm check`: zero errors, the same 388 existing lint warnings, 565 tests passed, two existing todos; seven inference projects passed uncached.
- `pnpm build`: all ten published libraries passed. `pnpm build:examples`: all eleven tasks passed.
- `pnpm test:packages`: ten packages and sixteen ESM/CJS entries passed, including older/native TypeScript consumers, Nest metadata and React directives.
- `pnpm test:hosts`: fourteen tests passed across Azure and Cloudflare.
- Compiler inspection confirmed portable source globals, source-only declaration includes, combined v4/v5 declarations, the Nest es2021 target and strict/non-strict settings. A null assignment failed under the strict preset and passed under the non-strict preset.
- Cache probes confirmed that a shared declaration preset change invalidates all ten packs, and an isolated v5 source change invalidates React Query while core remains cached. Probe changes were restored byte-for-byte; the final warm build used ten cache hits.
- Reviewed the focused delta against the saved pre-refactor snapshot. Public-library source/test references remain for editor/checker selection; they are not a composite `tsc --build` pipeline. Source-only private libraries and examples no longer need that extra config layer.
- Independent docs/consumer fixtures retain their existing configs. No dependencies or maintained orchestration scripts were added. Existing migration work was preserved through the refactor. Final delivery is authorized as a draft PR to the personal fork.

Verification results are recorded above. Temporary probe scripts, inspection snapshots and task logs are discarded at final delivery; permanent source/configuration and documentation are retained.
