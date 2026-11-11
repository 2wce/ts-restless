# Modern module resolution implementation plan

**Goal:** Adopt package-export-aware TypeScript resolution for the first stable ts-restless v4 release while retaining ESM and CommonJS consumers and older compiler verification.

**Architecture:** Conditional public exports select the existing ESM/CommonJS code and declarations. Remove classic resolver `typesVersions` fallbacks rather than adding a new loader. Use Node16/NodeNext for direct Node consumers and Bundler for bundled applications. Public roots/subpaths, native behavior, compiler/runtime floors and release controls remain otherwise unchanged.

**Tech stack:** TypeScript5.2.2/5.7.3 and7.0.2 packed consumers; existing Vite+/Vitest/pnpm infrastructure; Node26.12.0 and pnpm12.14.0.

**Spec:** User-approved modern-resolution adoption on 2026-11-11; [support retirement policy](../adr/0004-support-retirement.md). This defines an initial stable baseline, not retirement of a shipped stable fork promise. ADR IDs0010/0011 belong to Fastify PR35, which merged while this work was being verified; use0012 for this decision.

## Task 1: verify the conditional-export baseline and remove classic fallbacks

**Files:** `tests/packaging/package-check.test.mjs`, `tests/packaging/validator-independence.test.mjs`, public package manifests with `typesVersions`, Nest9/10/11 fixture configs.

- [x] Extend existing packed-metadata assertions to require no `typesVersions`; pack current main artifacts and observe that regression fail on the existing fallback.
- [x] Replace the classic generic compiler case with older-compiler Bundler/Node16 coverage, retain TS5.2.2/TS7 modern NodeNext `.mts`/`.cts` checks, and preserve all ESM/CommonJS runtime, metadata and inference gates.
- [x] Move the strict TS5.7.3 old-Zod bridge probe to NodeNext `.mts`/`.cts`, preserving bridge input/output assertions and `skipLibCheck: false`.
- [x] Remove `typesVersions` from source and `publishConfig` on all public manifests. Keep `main`, `module`, root declarations, conditional `exports`, both build formats and public subpaths.
- [x] Set Nest9/10/11 fixtures to matching `module`/`moduleResolution: NodeNext`. Their package metadata continues to select CommonJS output; keep existing decorator metadata settings and runtime checks. Restrict native application builds to `src/**/*.ts`, and retain TS5.1.3 declaration emission with explicit public response/handler annotations, preserving literal contract inference.
- [x] Build actual changed tarballs and pass all installed-consumer tests; install/test/build affected isolated Nest fixtures and verify emitted CommonJS remains loadable. Record any unrelated native/compiler limitations precisely.

## Task 2: document the support choice and migration

**Files:** `docs/adr/0012-modern-module-resolution.md`, ADR/plan indexes, support policy/inventory, architecture, roadmap, `CONTRIBUTING.md`, canonical public migration guide and an all-package major Changeset.

- [x] Explain why obsolete resolver compatibility is withdrawn while CommonJS, old-Zod helpers and framework legacy support remain. TypeScript6 deprecates node10 and7 removes it; compiler version, resolver and runtime are separate choices.
- [x] Provide NodeNext CommonJS/ESM and Bundler configs, package `type`/extension behavior, relative ESM import extensions, tooling migration and release/fallback guidance. Do not advise bypassing failures with `skipLibCheck`, disabled export resolution or casts.
- [x] Record pinned modern resolver/compiler evidence without implying exhaustive version coverage or imposing the contributor Node/TS baseline on consumers. A single-ESM-build investigation remains a separate future choice.
- [x] Run repository checks, documentation build/tests and docs lint; obtain independent review and record verification.
- [ ] Commit/push the separate branch and create a draft PR. Do not merge, version or publish.

## Coordination

Started from main `a6764818` on separate branch `feat/modern-module-resolution`. PR35 merged during verification; rebase onto main `3d4f1801` retains root/Fastify5 and `/legacy`/Fastify4 while removing both resolver fallbacks. The strict older-compiler bridge probe verifies `/legacy` through NodeNext ESM/CommonJS. Preserve dated Fastify verification records as historical evidence. No changes to the Fastify branch are part of this task.

## Verification recorded 2026-11-11

Final source is based on merged main `3d4f1801`. The packed metadata regression first failed on the original `/zod3` fallback, then passed after manifest removal. Final post-rebase verification:

| Gate                                     | Result                                                                                                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                             | Passed: format/lint/native compiler and inference checks; 784 source tests, two existing todos.                                                                                                                         |
| `pnpm test:packages`                     | Passed: 35 tests across four files; actual ten-package archives, older/current modern resolvers, ESM/CommonJS runtime, strict old-Zod and Fastify `/legacy` declarations, bundle/metadata/directive and release probes. |
| `pnpm --filter @ts-restless/docs test`   | Passed: docs build/snippet checks and 80 link/export/checker tests.                                                                                                                                                     |
| Nest9/10/11 `pnpm test` and `pnpm build` | Passed: two HTTP/controller tests per fixture and native CommonJS builds with declaration generation. Existing TS5.1.3/5.7.3 pins retained.                                                                             |
| Nest archive/runtime checks              | Every installed core/Nest file matches the final archives; emitted CommonJS `AppModule` loads with fixture-local dependencies. Independent review also reran all three native compiler/declaration/runtime probes.      |
| Independent review                       | Approved after fixing the native build regressions and stale contributor metadata wording.                                                                                                                              |

The native build failure was reproduced before repair: TS5.1/5.2 could not name an inferred declaration from the internal core chunk (TS2742), and app builds included the ESM-only tooling configuration (TS1479/TS2841). Explicit public response/handler types preserve inference and declarations; source-only application build selection fixes tooling ownership. No compiler upgrade, declaration suppression or internal-path import was used.

The full ten-scenario isolated compatibility matrix remains CI verification. These local Nest runs used independent nested installs in a workspace with root dependencies present; fixture-local resolution and archive equality were checked, but they do not replace the CI job's root-free checkout. Disposable archive/version checksum changes were restored without changing external dependency locks. Source adoption is unmerged/unpublished until its own PR and containing release land.
