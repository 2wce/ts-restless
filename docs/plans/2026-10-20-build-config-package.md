# Build Config Workspace Package Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use superpowers:executing-plans to implement this approved refactor inline. Steps use checkbox syntax for tracking.

**Goal:** Replace relative imports of shared Vite build presets with a private workspace package.

**Architecture:** `libs/build-config` exports TypeScript source as `@ts-rest/build-config`. It provides `libraryConfig`, `nodePack`, and `decoratorOptions`, declares its own Vite+/SWC dependencies, and has no build task. Root Vite configuration owns workspace orchestration. Existing release staging and consumer checks keep their current locations.

**Tech Stack:** pnpm 12.14.0 workspaces, Vite+ 1.3.0, native TypeScript 7, unplugin-swc.

**Spec:** Approved in chat: private `@ts-rest/build-config` with source exports and explicit `workspace:*` development dependencies in consuming packages.

## Global Constraints

- Keep the current `chore/dx-improvements` branch.
- Preserve published package names, public exports, ESM/CJS artifacts and decorator metadata.
- Preserve standalone compatibility fixture dependency versions and frozen locks.
- Keep release automation paused.
- Add no new build tool, prebuild task or published package.

### Task 1: Package and migrate shared build configuration

**Files:** Create `libs/build-config/package.json`, `src/index.ts`, `tsconfig.json`, and `README.md`; remove `tools/vite/library.ts`, `pack.ts`, and `swc.ts`; update importing root/package Vite configs, consuming manifests, root typecheck script, `pnpm-lock.yaml`, and `CONTRIBUTING.md`.

**Interfaces:** `libraryConfig(name, entry, options?)`, `nodePack(entry?)`, and `decoratorOptions(tsconfigFile, jsx?)` preserve their existing arguments and outputs.

- [x] Create the private source-only package and preserve existing preset logic, using one entry module without runtime-relative TypeScript import complications.
- [x] Replace all active preset imports with `@ts-rest/build-config` and add explicit `workspace:*` development dependencies to the root and each importing package.
- [x] Replace the previous shared-preset cache input with build-config source, manifest and compiler-config inputs. Include the new package in native type checking.
- [x] Refresh the root lockfile with pnpm without upgrading unrelated dependencies. Confirm frozen installation succeeds.
- [x] Update contributor documentation and add a small README explaining source exports and why there is no build task.
- [x] Verify Node 26 can import all exports directly without generated files; verify normal Vite config loading.
- [x] Run library builds, package consumer checks, example builds, native checking/tests and formatting. Use existing artifact tests to verify behavior instead of tests that mirror configuration text.
- [x] Inspect pack task discovery/cache behavior and packed manifests to ensure the private development dependency does not leak into releases.
- [x] Commit the verified refactor and update the existing draft PR branch.
