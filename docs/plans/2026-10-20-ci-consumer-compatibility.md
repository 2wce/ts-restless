# CI consumer compatibility implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Execute the approved CI-only design inline. Keep full compatibility execution in CI.

**Goal:** Run the full consumer matrix in clean CI checkouts, remove Make/copy orchestration, and require compatibility success before merging.

**Architecture:** The normal build job uploads its already-verified native pnpm tarballs. Ten matrix jobs download them into fresh checkouts, install only their fixture dependencies and run native tests/builds. A stable aggregate check fails unless the entire matrix succeeds. Root dependencies are never installed in consumer jobs.

**Tech stack:** GitHub Actions, pnpm 12.14.0, Node 26.12.0, Vitest, Vite+ packing and existing Nest/validator fixtures.

**Approved design:** CI owns the full matrix; local development retains unit/type/package checks. Single-fixture debugging uses direct commands in an independent consumer checkout.

## Constraints

- Preserve all ten fixture scenarios and their framework, validator and TypeScript baselines. The user authorized deleting Bun locks and generating fresh pnpm locks; transitive resolutions can change in this migration.
- Keep the current tarball dependency paths and full-file archive freshness checks.
- Commit the initial native pnpm lock migration. Refresh subsequent build archive checksums only in disposable CI checkouts; do not commit those run-specific updates.
- Keep stable and prerelease workflows disabled; do not change public package versions or runtime code.
- No new root dependencies, fixture copying runner, or local full-matrix command. Fixture-local Vite+/Vitest tooling replaces Bun tooling.

## Tasks

- [x] Upload verified package tarballs from the normal build job; replace e2e's root install/build with ten independent fixture matrix jobs and a stable aggregate gate.
- [x] Standardize all fixtures on Node, pnpm and Vitest, delete Bun types/locks, and generate native pnpm locks without a custom converter. Declare previously masked direct imports. Keep every installed-file comparison and reject root node_modules in consumer jobs.
- [x] Delete the root Makefile, ten fixture Makefiles and shared fixture.mk. Update README/CONTRIBUTING for CI-only coverage and optional direct single-fixture debugging.
- [x] Validate workflow syntax with temporary actionlint, formatting and diff checks; review independently. Do not run the full matrix locally.
- [x] Commit and push to the existing draft PR, require the stable compatibility gate on main, and report actual CI status without treating pending checks as passed.

## Verification and delivery

- Temporary actionlint 1.7.12 passed workflow validation; its release archive SHA256 was checked before use. No repository dependency was added for it.
- Formatting and `git diff --check` passed. Read-only parity checks confirm all ten scenarios, framework/validator declarations and existing assertions remain intact, with TypeScript 5.7.3 explicit in the migrated fixtures.
- Seven native fixture pnpm locks were generated using `pnpm install --lockfile-only --no-frozen-lockfile --ignore-scripts`, following the user's instruction to delete Bun locks instead of converting them. Existing Vite+ alias peer warnings remain.
- All former Bun-specific test imports/types/locks and Make runners are removed. Direct body-parser and Zod 4 converter imports are explicitly declared.
- Independent final review found no actionable issues. The full fixture matrix was not run locally; actual runtime validation belongs to CI.
- Main branch protection now requires `Compatibility Fixtures`, with admin enforcement enabled. Both release workflow guards remain disabled.

## CI result

- [Build Test run 39403991706](https://github.com/2wce/ts-rest/actions/runs/39403991706) passed for commit `904ba6be`: the main job, all ten consumer fixtures and the required Compatibility Fixtures aggregate succeeded. The full fixture matrix ran only in CI.
- The first run exposed compiler configuration errors after all seven migrated fixtures passed runtime tests and bundling. TypeScript's `preserveSymlinks: true` prevented transitive declarations from resolving in pnpm's isolated package graph; removing it restored normal resolution. The shared `neverBundle` option also needed literal `true` inference. No assertions or dependency baselines changed.
- A small independent type-resolution probe reproduced the inherited Supertest method error with preserved symlinks and passed with default resolution. Formatting, actionlint and diff checks passed; focused independent review found no actionable issues.
