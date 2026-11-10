# Next Supported Majors Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use `superpowers:executing-plans` with the user's single-executor checkpoints.

**Goal:** Establish Next 15 and 16 as the first stable ts-restless v4 baseline, removing unsupported Next 12–14 promises and fixtures.

**Architecture:** Both Next integrations declare `^15.0.0 || ^16.0.0`. Existing packed consumers verify supported majors with real packages and native HTTP execution. The Next 16 example retains Pages and App Router coverage.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, Next 15.5.29 and workspace Next 16.4.2, strict TypeScript consumers, Vitest.

**Spec:** User instruction on 2026-11-06 to drop upstream-deprecated Next majors and update documentation; [official Next support policy](https://nextjs.org/support-policy), checked on the same date, lists 16 as Active LTS, 15 as Maintenance LTS and 14 and earlier as unsupported. Next 15 security maintenance is extended through 2027-01-31.

## Constraints

- Scope this baseline decision to Next; other dependency retirement policies retain their existing review process.
- This is a breaking baseline change for the first stable v4, distinct from removing compatibility in a shipped stable fork release.
- Preserve routing, response semantics, public entry points, legacy schema bridging and release controls.
- Keep library checking enabled, do not patch Next internals or polyfill removed Node APIs. Report and classify only exact reviewed upstream diagnostics for the pinned supported versions; any unexpected diagnostic fails.
- Examples target supported majors. Pages Router is retained because router style is distinct from framework-major support.
- Do not publish, merge or version the live workspace during verification.

## Task 1: Supported-major evidence

**Files:** `tests/packaging/validator-independence.test.mjs`, `tests/packaging/package-baseline.json`.

- [x] Replace the Next 12 declaration baseline and runtime version swap with a Next 15.5.29 / Next 16.4.2 matrix across the existing four validator profiles. Compile each installed consumer's `.mts`/`.cts` strictly, then execute the same installed major's native HTTP harness.
- [x] Set expected Next peers to `^15.0.0 || ^16.0.0` for both packages in the packed baseline. Run against existing archives to observe the old broad peers fail before changing manifests.
- [x] Trace supported-major declaration failures to the owning declarations before deciding any required correction. Retain inference and zero/one validation call assertions.

## Task 2: Baseline and documentation

**Files:** Next/serverless manifests, `pnpm-lock.yaml`, a major Changeset, support policy/inventory, `CONTRIBUTING.md`, Next integration docs and package READMEs, migration guide, plan index and adapter epic.

- [x] Narrow both Next peers to `^15.0.0 || ^16.0.0`, refresh the lockfile and add a major Changeset explaining the initial v4 baseline and upgrade path.
- [x] Record the official lifecycle source, supported majors, pinned evidence and example baseline. Explain that future upstream lifecycle changes trigger reviewed support updates; published stable promises require the existing migration process.
- [x] Remove current recommendations for unsupported majors. Preserve historical verification records and mark them superseded where needed. Update Next docs to use current Next request APIs.

## Task 3: Verification and draft delivery

**Files:** Existing release tests and PR #17 description.

- [x] Run `pnpm test:packages` and `pnpm check` on Node 26.12.0. Verify the actual release rehearsal still targets stable v4 and coordinated alphas with the major Changeset.
- [x] Run changed-file formatting, whitespace checks and the Next example build.
- [x] Verify canonical example build and all compatibility fixtures in CI for this expanded scope.
- [x] Commit and push normally to draft PR #17, update its title/body around the final scope and observe fresh CI before claiming completion.

## Execution evidence

- Before manifest edits, the packed peer baseline failed on the old `12–16` range. Supported-major probes independently reproduced upstream declaration failures.
- Matching React 19.3.1 / types 19.3.0 and ES2024 libraries resolved the fixture's React/standard-library mismatch. Next 15.5.29 retains three exact upstream diagnostics and Next 16.4.2 retains two, recorded in `CONTRIBUTING.md` and the support inventory. All other diagnostics remain fatal.
- `pnpm test:packages` passed 25 tests across four files on Node 26.12.0. The native matrix includes both integration packages, supported majors, module formats and validation enablement across four validator profiles. Actual Changesets rehearsals including the new major Changeset still target stable v4 and coordinated alpha releases.
- A temporary incompatible request-body type assertion caused two expected TS2344 failures in the consumer source, one on each supported major. Restored consumers passed.
- Full `pnpm check` passed 728 tests and all configured typechecks with zero lint errors and 393 existing warnings.
- The retained Next 16 example built successfully on Node 26.12.0. Documentation build, typing and all 30 rendered-site tests passed. Changed-file formatting and whitespace checks passed.
- Draft PR #17 was updated and implementation commit `0a7bdb66` passed [Build & Test, all ten compatibility fixtures and the aggregate gate](https://github.com/2wce/ts-restless/actions/runs/42236967009). This records verification without merging or publishing.
