# DX Follow-up Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use inline execution with verification checkpoints. Task assignment transport was unusable in the prior audit; do not rely on unreadable agent reports.

**Goal:** Complete approved cleanup, dependency ownership, source exports and native TypeScript checking.

**Architecture:** pnpm catalogs/manifests own versions and dependencies. Workspace exports select source; supported build hooks retain published ESM/CJS outputs. Vite+ owns static checking and task scheduling.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, Vite+ 1.3.0, TypeScript 7.0.2, Node types 26.6.5.

**Spec:** docs/plans/2026-10-19-dx-followup-design.md.

## Global Constraints

- Work on chore/dx-improvements after ce1dfbe5. Final delivery is authorized: commit all changes and open a draft PR to 2wce/ts-rest. No merge or publication.
- Preserve public APIs, built paths, ESM/CJS, peer ranges, React directives, Nest metadata and es2019 target.
- Keep Azure tooling installed normally, host CI, Prisma shared generation and independent apps/docs dependencies.
- Keep old framework/compiler consumer fixtures; no unrelated major dependency upgrades.
- No new maintained orchestration/redirects/dependency-rewriting script.

### Task 1: Remove obsolete tools and declare dependency ownership

Files: root/private package manifests, pnpm-workspace.yaml, obsolete TypeDoc/Babel configs and tools/scripts/docs-redirects.ts.

- [x] Confirm unused direct packages against tracked imports/configs. Remove commander, fs-extra/@types, core-js, sass, uuid/@types, root ts-node, TypeDoc/plugin dependencies and stale configs.
- [x] Populate pnpm default catalog with retained versions. Declare private-package runtime imports in dependencies; configs/tests/types in devDependencies. Keep shared test/tool dependencies and Prisma generator at root in devDependencies.
- [x] Preserve published library runtime dependencies and peer ranges. Install with pnpm and inspect lockfile for unintended major version changes.
- [x] Run unit checks and examples/host builds against scoped manifests.

### Task 2: Resolve source workspaces through exports

Files: workspace manifests, libs/ts-rest/react-query/src/v5.ts, root/base and example Vite configs.

- [x] Replace outside-package main paths with exports to actual source files, including all serverless and React subpaths.
- [x] Add `export * from '@ts-rest/react-query-v5';` in the parent's v5 source shim and export the isolated v5 workspace's src/v5.ts.
- [x] Remove source aliases from tsconfig.base.json and root Vite test configuration; remove frontend tsconfigPaths settings after source exports resolve.
- [x] Resolve/import source subpaths without library dist outputs; build packages and run existing packed API/metadata/type regressions.

### Task 3: Native TypeScript and Vite+ static checks

Files: root/compiler catalog, workspace tsconfigs, tools/vite/pack.ts, vite.config.ts, seven assertion task manifests, tools/vite/package-check.mjs, contributor docs.

- [x] Upgrade TypeScript to 7.0.2 and Node types to 26.6.5; retain TypeScript 5.2.2 as `typescript-legacy` solely for packed old-consumer checks.
- [x] Remove baseUrl, use relative path values where the non-strict dist assertion needs one, and migrate bundled workspace configs to module esnext/moduleResolution bundler. Keep standalone fixture configs on their own supported versions.
- [x] Remove the explicit tsc declaration generator so Vite+ selects the documented native TypeScript 7 generator.
- [x] Enable lint.options.typeAware/typeCheck. Root check invokes `vp check`, Vitest and isolated inference tasks scheduled with vp run; manifests invoke native `tsc --noEmit -p` per existing assertion project.
- [x] Verify native checks detect temporary incompatible values/unused expect-error directives and restore probe edits. Resolve new diagnostics at their source without deleting assertions or blanket suppressions.
- [x] Check generated package types with both legacy/classic Node and current/bundler or NodeNext resolution. Run frozen install, full checks, examples, hosts, fixtures and diff checks; record evidence and limitations.

## Verification results

Implementation completed on chore/dx-improvements. Final delivery verification passed before preparing the draft PR to the personal fork.

- Frozen pnpm install passed. The catalog audit found no unused entries and
  no new unrelated dependency versions. The lockfile removes 55 package
  versions and adds 23 compiler/Node-type platform packages.
- All 10 library builds passed with native declaration generation.
- All 11 example build tasks passed, including Next and Vue. Vue resolves its
  compatibility compiler through a pnpm peer extension; no manual registration.
- pnpm check passed: 0 compiler/lint errors, 388 existing/newly enabled lint
  warnings, 565 unit tests passed, 2 existing todo tests, 7 native inference
  projects passed. Those inference projects always run uncached.
- Source-only unit verification passed with dist/libs/ts-rest temporarily hidden
  and then restored. Source package exports no longer require a library build.
- Packed verification passed for 10 packages and all 16 ESM/CommonJS entry
  points, public subpaths/peers, React client directives, and Nest metadata.
  Declaration consumers passed TypeScript 5.2.2 node/nodenext and TypeScript
  7.0.2 bundler/nodenext modes.
- Azure/Cloudflare host tests: 2 files, 14 tests passed.
- make e2e passed all 9 existing compatibility fixture projects.
- Temporary probes proved Vite+ native checks and TypeScript reject incompatible
  values and unused expect-error directives. A task-cache probe initially exposed
  a cached success after a new invalid assertion; --no-cache fixes that boundary.
  The same probe then failed correctly, and all 7 projects passed after removal.
- Diff whitespace checks passed; no edits in apps/docs or test-projects, no
  temporary probe files or emitted declarations remain in source directories.

## Review and limitations

Reviewed the manifests, public package baseline, compiler/build configuration,
cache behavior, and runtime typing changes directly. An independent reviewer was
requested, but assignment delivery again arrived as encrypted unreadable data;
no independent findings or sign-off are claimed.

TypeScript 5.2.2 remains for published-declaration compatibility and for the
Next 13/Vue example build integrations. The ts-rest Vue adapter uses TypeScript 7;
the root checker checks the Vue example's .ts files, not .vue templates. Vue's
TypeScript 7 bridge and v4 draft were researched but not introduced. There is no
new compiler fork or maintained dependency-rewriting script. Babel can remain
transitively in framework dependencies; all direct Babel configuration is gone.

## Final delivery verification

The user authorized a draft PR to `2wce/ts-rest` and committing all changes on 2026-10-19. Fresh delivery checks passed: frozen pnpm install, `pnpm build-test-all`, fourteen host integration tests and all nine `make e2e` fixture projects. The pipeline includes 565 unit tests, seven native inference projects, ten library builds, eleven example tasks and ten packages/sixteen ESM/CommonJS entry points. The lint checker reports zero errors and 388 warnings. Task scratch files are removed after delivery; permanent configs, contributor documentation, specs and plans are retained.

## Example database follow-up

The user approved moving shared Prisma generation out of the root on 2026-10-19.
The example-only package and task prerequisites described in
`../plans/2026-10-19-example-database.md` supersede the earlier root Prisma
placement. Root installation no longer generates the example client.
