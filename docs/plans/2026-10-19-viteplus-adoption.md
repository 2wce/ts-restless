# Vite+ Adoption Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to execute tasks in order, with scoped review.

**Goal:** Adopt Vite+ and remove Nx while retaining ts-rest package compatibility.

**Architecture:** Package manifests declare workspace relationships and native scripts. Vite+ package configs build outputs under `dist/libs/ts-rest`; a small shared config supplies packaging defaults. The root config owns lint/format/test orchestration and task caching.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, Vite+ 1.3.0, TypeScript 5.2.2 initially.

**Spec:** `docs/plans/2026-10-19-viteplus-adoption-design.md`.

## Global Constraints

- Preserve public API paths, ESM/CommonJS consumers, type inference, existing peer ranges, es2019 browser target, React client directives and Nest decorator metadata.
- Keep compatibility fixtures and Changesets.
- Use only a project-local Vite+ installation; no second task runner.
- Keep Node 26.12.0 pinned and the Node upgrade commit intact.
- No publishing or pushing.

### Task 1: Vite+ library packaging

**Files:** root `package.json`, library manifests and Vite configs, shared packaging config, package compatibility tests.

**Interfaces:** `pack` scripts call `vp pack`; published output remains under `dist/libs/ts-rest/<package>`. `@ts-rest/react-query/v5` resolves to the actual private v5 source and shares the published React Query package. Root tools use Vite+ 1.3.0, Vite alias `npm:@voidzero-dev/vite-plus-core@1.3.0` and bundled Vitest 5.0.5.

- [x] Capture current packed entry points and metadata as regression requirements.
- [x] Add Vite+ and its required alias/pin; retain old tools until later tasks replace them.
- [x] Implement one shared packaging default (`format: ['esm', 'cjs']`, `target: 'es2019'`, `dts: true`) with explicit external peers and package entry points.
- [x] Add core/serverless adapter/Nest/React Query/Express/Fastify/Next/OpenAPI/Solid/Vue builds and source workspace relationships.
- [x] Replace the Rollup dependency patch and logger-based package changes with supported configuration/hooks.
- [x] Build all libraries and run real package-consumer/type/metadata/client-directive regression checks.

### Task 2: Vite+ tests and lint/format

**Files:** root Vite config and package scripts, existing test source/configs, standalone Nest fixture manifests/configs, `.vscode`, lint/format configuration.

**Interfaces:** `pnpm test` runs `vp test run`, `pnpm lint` runs `vp lint`, `pnpm format` runs `vp fmt`, `pnpm format:check` runs `vp fmt --check`. Task 1's packed paths are inputs for package tests.

- [x] Translate existing Jest configuration/mocks to Vitest while retaining test behavior and TypeScript assertion checks.
- [x] Preserve Nest decorator transformation in tests with a maintained plugin if required.
- [x] Configure Oxlint with equivalent useful TypeScript/React/Next rules and explicit package-import restrictions.
- [x] Configure Oxfmt with `singleQuote: true`, `printWidth: 80`, build/cache ignores and package-json sorting disabled to limit unrelated churn.
- [x] Migrate Nest fixture lint/format scripts and editor integrations.
- [x] Run all library tests, typed assertion checks and lint/format checks; resolve errors rather than broadly suppressing rules.

### Task 3: Workspace, examples and CI without Nx

**Files:** example manifests/native configs, workspace configuration, root scripts, CI workflows, contributor docs, obsolete Nx/Jest/Rollup/ESLint/Prettier files and direct dependencies.

**Interfaces:** `vp run --filter "./libs/ts-rest/*" pack` orders declared library dependencies. Explicit cached `pack` tasks supply reusable build artifacts; persistent dev/watch tasks use `--parallel`. Release scripts build library outputs and keep Changesets publishing those outputs.

- [x] Replace example Nx build/serve tasks with native Next/Vite/Nest/Node/Wrangler commands.
- [x] Switch CI from Nx Cloud/affected tasks to Vite+ workspace build/test/lint/format checks and GitHub Actions task-cache restoration.
- [x] Remove direct Nx plugins, obsolete Docusaurus integration, Jest, ESLint/Prettier and patched Rollup dependencies after replacement validation.
- [x] Remove old project/config files and update generated README commands and contributor setup.
- [x] Install with frozen lockfile, run full checks/builds and compatibility fixtures, and verify repeated cached tasks and changed-input invalidation.
- [x] Record exact verification evidence and perform whole-branch review before delivery.

## Verification record

Completed on 2026-10-19. See `docs/evidence/2026-10-19-viteplus-adoption.md` for commands, evidence, review resolutions and remaining limitations. Changes are recorded in this migration commit on `chore/dx-improvements`.
