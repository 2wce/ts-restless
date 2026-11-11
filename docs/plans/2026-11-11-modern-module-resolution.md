# Modern module resolution implementation plan

**Goal:** Adopt package-export-aware TypeScript resolution for the first stable ts-restless v4 release while retaining ESM and CommonJS consumers and older compiler verification.

**Architecture:** Conditional public exports select the existing ESM/CommonJS code and declarations. Remove classic resolver `typesVersions` fallbacks rather than adding a new loader. Use Node16/NodeNext for direct Node consumers and Bundler for bundled applications. Public roots/subpaths, native behavior, compiler/runtime floors and release controls remain otherwise unchanged.

**Tech stack:** TypeScript5.2.2/5.7.3 and7.0.2 packed consumers; existing Vite+/Vitest/pnpm infrastructure; Node26.12.0 and pnpm12.14.0.

**Spec:** User-approved modern-resolution adoption on 2026-11-11; [support retirement policy](../adr/0004-support-retirement.md). This defines an initial stable baseline, not retirement of a shipped stable fork promise. ADR IDs0010/0011 belong to the separate Fastify draft PR35; reserve0012 for this decision.

## Task 1: verify the conditional-export baseline and remove classic fallbacks

**Files:** `tests/packaging/package-check.test.mjs`, `tests/packaging/validator-independence.test.mjs`, public package manifests with `typesVersions`, Nest9/10/11 fixture configs.

- [ ] Extend existing packed-metadata assertions to require no `typesVersions`; pack current main artifacts and observe that regression fail on the existing fallback.
- [ ] Replace the classic generic compiler case with older-compiler Bundler/Node16 coverage, retain TS5.2.2/TS7 modern NodeNext `.mts`/`.cts` checks, and preserve all ESM/CommonJS runtime, metadata and inference gates.
- [ ] Move the strict TS5.7.3 old-Zod bridge probe to NodeNext `.mts`/`.cts`, preserving bridge input/output assertions and `skipLibCheck: false`.
- [ ] Remove `typesVersions` from source and `publishConfig` on all public manifests. Keep `main`, `module`, root declarations, conditional `exports`, both build formats and public subpaths.
- [ ] Set Nest9/10/11 fixtures to matching `module`/`moduleResolution: NodeNext`. Their package metadata continues to select CommonJS output; keep existing decorator metadata settings and runtime checks.
- [ ] Build actual changed tarballs and pass all installed-consumer tests; install/test/build affected isolated Nest fixtures and verify emitted CommonJS remains loadable. Record any unrelated native/compiler limitations precisely.

## Task 2: document the support choice and migration

**Files:** `docs/adr/0012-modern-module-resolution.md`, ADR/plan indexes, support policy/inventory, architecture, roadmap, `CONTRIBUTING.md`, canonical public migration guide and an all-package major Changeset.

- [ ] Explain why obsolete resolver compatibility is withdrawn while CommonJS, old-Zod helpers and framework legacy support remain. TypeScript6 deprecates node10 and7 removes it; compiler version, resolver and runtime are separate choices.
- [ ] Provide NodeNext CommonJS/ESM and Bundler configs, package `type`/extension behavior, relative ESM import extensions, tooling migration and release/fallback guidance. Do not advise bypassing failures with `skipLibCheck`, disabled export resolution or casts.
- [ ] Record pinned modern resolver/compiler evidence without implying exhaustive version coverage or imposing the contributor Node/TS baseline on consumers. A single-ESM-build investigation remains a separate future choice.
- [ ] Run repository checks, documentation build/tests and docs lint; obtain independent review and record verification. Commit/push the separate branch and create a draft PR. Do not merge, version or publish.

## Coordination

Start from main `a6764818`, excluding Fastify draft PR35. Its `/legacy` addition will need to follow this baseline when the branches combine: omit classic declaration fallbacks and use modern-resolution consumers. Preserve dated Fastify verification records as historical evidence. No changes to the Fastify branch are part of this task.
