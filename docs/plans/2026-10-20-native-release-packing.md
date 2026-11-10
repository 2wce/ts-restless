# Native release packing implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Execute the approved plan inline using executing-plans. Verify each artifact boundary before marking a task complete.

**Goal:** Remove the synthetic release workspace and publish directly from source manifests through Changesets and pnpm.

**Architecture:** Public libraries emit into package-local `dist`. Their source manifests retain TypeScript workspace exports and declare compiled publish overrides plus a file allowlist. Native pnpm packing produces tarballs. Compatibility tests install those tarballs in isolated consumers. The user selected native caret workspace peers over the historical generated peer policy. Built-in Changesets configuration avoids major bumps for compatible core minors; prereleases use disposable Changesets snapshots.

**Tech stack:** pnpm 12.14.0, Vite+ 1.3.0, Changesets, Node 26.12.0, Make, Bun compatibility fixtures.

**Approved design:** The four-step release simplification proposed in chat and approved on 2026-10-20.

## Constraints

- Keep stable and prerelease workflows disabled.
- Preserve all 16 public ESM/CJS entry points, declaration resolution, Nest metadata and React directives.
- Use native `workspace:^` core peers; the user explicitly accepted replacing the historical stable minor floor and exact prerelease rule.
- Keep React Query v5 private and bundled into the public React Query package.
- Use native packing and installation; no synthetic workspace, generated release manifests or copied library directories.
- Keep fixture dependency locks reproducible; refresh mutable build tarball checksums only in temporary test copies after the initial lock migration.

## Task 1: Lock in the published artifact and version contracts

- [x] Replace directory-copy package checks with tarball inspection and pnpm installation in a temporary consumer. Assert compiled exports, allowed contents, metadata and no runtime dependency on private tooling.
- [x] Add Node integration tests that run real Changesets patch/minor and snapshot versioning and pack the resulting native core peer ranges. Include a major bump probe.
- [x] Run against the existing layout; record the expected source-export and unexpected major-version and unconfigured snapshot failures.

## Task 2: Adopt native packing

- [x] Give the ten public manifests `files: ["dist", "CHANGELOG.md"]` and publishConfig overrides for main/module/types, conditional exports and subpath typesVersions. Declare core peers explicitly.
- [x] Set shared library pack output/cache to package-local dist; remove build manifest generation and copying hooks.
- [x] Replace release-workspace.mjs with native root packing and direct Changesets publication. Use native caret peers and Changesets onlyUpdatePeerDependentsWhenOutOfRange; configure calculated-version timestamp snapshots. Keep version commands native and install to refresh the lock.
- [x] Point non-strict declaration checks at core's local dist.
- [x] Verify packed contents include license/readme/changelog; use native license inheritance or committed package license files if necessary.
- [x] Run new artifact/version tests and frozen installation.

## Task 3: Consume tarballs in compatibility fixtures

- [x] Update Bun and Nest fixture dependencies to native pack archives under root dist/packages.
- [x] Share an existing Make-based fixture runner that copies fixture source and dependency locks into ignored temporary directories. Allow only temporary lock updates for current tarball checksums; install and test actual archives.
- [x] Refresh initial fixture locks and make root e2e pack before running fixtures.
- [x] Run all compatibility fixtures and verify tracked files remain unchanged after a second artifact build.

## Task 4: Document, verify and review

- [x] Update CONTRIBUTING and build-config README for source/published manifests, native pack commands and native peer policy and snapshot prereleases.
- [x] Run build-test-all, host tests and compatibility fixtures. Verify source manifests remain unchanged by packing and both release workflow guards remain disabled.
- [x] Review the final diff independently and resolve actionable findings.

## Verification evidence

- `pnpm build-test-all`: 579 unit tests, native typechecks, ten public library builds and eleven example builds passed.
- `pnpm test:packages`: ten actual tarballs and all sixteen ESM/CJS entrypoints passed. Declaration consumers cover classic TypeScript 5.2 Node resolution, TypeScript 5.2/7 NodeNext ESM and CJS, and TypeScript 7 Bundler resolution.
- Real Changesets probes passed patch, minor, major and timestamp snapshot versioning with native packed core peers.
- `pnpm test:hosts`: fourteen Azure/Cloudflare tests passed.
- `CI=true make e2e`: all ten compatibility fixtures passed with every installed local package file compared against its current archive.
- A same-version, changed-content archive probe passed for Bun/Express 4 and pnpm/Nest 11. Source manifests and tracked fixture locks stayed byte-identical; the generated probe outputs were restored afterward.
- Root frozen installation, formatting, changed-tooling lint and `git diff --check` passed. Existing workspace lint warnings remain.
- Public package versions are unchanged; stable and prerelease workflow jobs remain guarded with `if: ${{ false }}`.

Independent follow-up review found no remaining actionable issues after reproducing the native Bun archive refresh and inspecting the expanded declaration coverage.
