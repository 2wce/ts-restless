# Vite+ Toolchain Trial Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use `superpowers:executing-plans` to execute this trial inline. Steps use checkbox syntax for tracking.

**Goal:** Determine whether Vite+ can replace the patched library packaging and provide useful caching with a lean configuration.

**Architecture:** A temporary source checkout runs the project-local Vite+ binary. Package-specific configurations define real entry points and output into package-local `dist` folders. Compatibility probes consume built packages rather than source aliases.

**Tech Stack:** Node 26.12.0, pnpm 9.4.0, Vite+ 1.3.0, TypeScript 5.2.2.

**Spec:** `docs/plans/2026-10-19-viteplus-trial-design.md`.

## Global Constraints

- Preserve public API paths, peer version ranges, ESM/CommonJS output, browser targets, inferred declarations, React client directives and Nest decorator metadata.
- No global Vite+ installation.
- The temporary dependency reuse is not a production installation benchmark.
- Keep the Node upgrade commit intact.
- Use the existing DX branch for reviewable documents; run experimental tooling in `/private/tmp/ts-rest-viteplus-trial`.

### Task 1: Establish the trial environment

**Files:** temporary `toolchain/package.json`, staged repository, local module links.

- [ ] Archive committed source using `git archive HEAD`; validate archive paths before extraction.
- [ ] Install `{ "vite-plus": "1.3.0", "typescript": "5.2.2" }` in the separate toolchain.
- [ ] Run `node --version` and the local `vp --version`, and record its bundled tools.
- [ ] Link existing compilation dependencies into the staged checkout; use Vite+'s bundled Vitest for its own imports.

### Task 2: Package representative libraries

**Files:** staged `libs/ts-rest/{core,nest,react-query,serverless}/vite.config.ts`.

**Interfaces:** Each config exports `defineConfig({ pack: ... })`. It consumes the existing entry source and emits ESM, CJS and declarations into the package-local `dist`.

- [ ] Define core settings: `entry: ['src/index.ts'], format: ['esm', 'cjs'], dts: true, target: 'es2019', exports: { legacy: true }, outDir: 'dist'`.
- [ ] Execute `vp pack` from the core package with the real TypeScript config. Investigate any failure before changes.
- [ ] Add serverless entries `index`, `fetch`, `aws`, `next`, `azure` and externalize `@ts-rest/core` and existing peers.
- [ ] Build React Query with entries `index`, `tanstack`, and the real v5 source at `../react-query-v5/src/v5.ts`. Use supported unbundle/directive handling only if required by an observed output failure.
- [ ] Build Nest using existing legacy decorator settings. Test whether built metadata survives before considering a maintained transformer plugin.

### Task 3: Verify consumer compatibility

**Files:** temporary compatibility probes and consumer fixtures.

- [ ] Assert every `exports` JavaScript and type target exists.
- [ ] Load core and adapters under both `require` and `import`; assert `initContract` and adapter exports exist.
- [ ] Compile a real consumer using `initContract`, Zod, `initClient` and inferred response types with TypeScript. Exercise `node`, `node16` and `bundler` module resolution.
- [ ] Assert `'use client'` remains in emitted provider and hook modules.
- [ ] Load built Nest classes with `reflect-metadata` and assert injectable markers and constructor metadata are preserved.

### Task 4: Verify caching and dependency footprint

**Files:** staged root `vite.config.ts` and a disposable cache fixture.

- [ ] Define a cached fixture task that reads `cache-input.txt` and writes `cache-output.txt`: `node -e "require('fs').writeFileSync('cache-output.txt', require('fs').readFileSync('cache-input.txt'))"`.
- [ ] Run `vp run cache-probe` twice and verify a cache hit and restored output.
- [ ] Change the input, run again, and verify a cache miss and the new output content.
- [ ] Count toolchain lockfile packages and measure installed disk usage. Report framework dependency reuse separately.

### Task 5: Record the decision

**Files:** `docs/superpowers/2026-10-19-viteplus-trial-results.md`.

- [ ] Record command versions, successes, failures, required plugins and untested areas.
- [ ] Recommend Vite+ or the maintained-package fallback from observed compatibility and complexity.
- [ ] Check the repository diff and leave trial documents reviewable without committing or pushing.
