# Test tooling layout implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Execute the approved cleanup inline. Preserve test behavior and verify each moved boundary.

**Goal:** Remove `tools/vite` while keeping package, versioning and inference checks as ordinary tests and package-owned compiler projects.

**Architecture:** Packaging and release integration tests use a dedicated Vitest config under `tests`. The unit suite retains shared setup under `tests/setup.ts`. A root compiler preset supplies inference settings, while owning packages select assertion files and the non-strict package checks built core declarations.

**Tech stack:** Vite+, Vitest, pnpm 12, native TypeScript 7, Node 26.

**Approved design:** The cleanup table approved in chat on 2026-10-20.

## Constraints

- Preserve all ten packed packages and sixteen public ESM/CJS/declaration entrypoints.
- Keep real Changesets patch/minor/major and snapshot probes.
- Keep every existing inference assertion and the compiled non-strict declaration check.
- Do not add dependencies or change library runtime behavior, public versions or release guards.
- Work on the existing `chore/dx-improvements` draft PR branch.

## Tasks

- [x] Move package checks, their trimmed compatibility fixture and versioning tests under `tests/packaging` and `tests/releases`. Convert Node test registration to Vitest and keep temporary consumers isolated.
- [x] Add `tests/vite.config.ts` and make `check-packages` invoke it after native packing. Move unit setup to `tests/setup.ts` without loading it in the packaging suite.
- [x] Move shared inference settings to root `tsconfig.assertions.json`. Give core and serverless their own assertion projects; update other consumers. Consolidate non-strict settings and built declaration mapping into its existing package config.
- [x] Update contributor/build-config documentation, remove `tools/vite`, and verify no live references remain.
- [x] Run package tests, unit tests, all inference projects, formatting, lint and diff checks. Use temporary negative probes to prove serverless inference and packaging checks still reject regressions, restoring all probe outputs.
- [x] Obtain independent review and resolve actionable findings, then commit and push to the existing draft PR.

## Verification

- `pnpm test:packages`: all three integration tests in the dedicated Vitest suite passed; coverage retains ten tarballs and sixteen ESM/CJS/declaration entrypoints.
- `pnpm test`: 579 unit tests passed, with two existing skipped files and two existing todo tests.
- `pnpm typecheck`: all nine uncached tasks passed (eight inference projects and the shared build-config package).
- `pnpm format:check`, `pnpm lint` and `git diff --check` passed. Existing lint warnings remain; none were introduced in the moved test tooling.
- Removing an existing serverless missing-route error annotation caused its new owning-package check to fail. Restoring the source returned it to green.
- Replacing the packed core ESM export with a source path caused the migrated packaging test to fail at the compiled import target assertion. Restoring the archive returned all three integration tests to green. Both probe edits were restored byte-for-byte.
- Independent review found no actionable issues and confirmed coverage/compiler settings are preserved.
- Public versions and release guards are unchanged. No active configuration or contributor documentation references `tools/vite`; older plans/specs retain historical paths.
