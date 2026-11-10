# ts-restless package identity implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the approved ts-restless namespace installable from native tarballs and prepare the coordinated numbered v4 prerelease path.

**Architecture:** Rename package identifiers and references in place, preserving repository directories, public API identifiers and runtime behavior. Extend the existing package/release tests to exercise real new-scope consumers and Changesets transitions. Use the compatible Changesets action after main CI and all compatibility fixtures pass to create/update a version PR, or publish its merged numbered prerelease. A small Node coordinator initializes alpha mode, validates coordinated public versions and derives the publish tag from committed Changesets state. Keep automation guarded until CI credentials and artifact gates are verified.

**Tech Stack:** TypeScript, pnpm 12.14.0, Node 26.12.0, Vite+, Changesets, native tarballs, GitHub Actions and Fumadocs.

**Spec:** [Approved ts-restless identity](2026-11-04-ts-restless-identity-design.md). The user authorized proceeding on 2026-11-04.

## Global Constraints

- Public identity is `ts-restless`, under project-owned `@ts-restless/*`, with the user as initial npm owner. First stable version is `4.0.0`; first numbered prerelease is `4.0.0-alpha.0`.
- Use the current repository `https://github.com/2wce/ts-restless` (renamed on 2026-11-05), existing ten public leaf names, all supported exports, API identifiers and peer ranges. Keep private packages/examples private and React Query v5 bundled through public `/v5`.
- Preserve directory/file names containing `ts-rest`, upstream attribution, licences and historical changelogs/plans. Update active consumers/configuration, not historical records.
- Preserve validator-independent defaults, explicit `/zod3`, synchronous validation and native lifecycle/behavior. F01–F05 and A03–A19 remain separate work.
- No credentials in source or tool output. Verify real npm identity/organization ownership before publication. Keep stable workflow disabled and prerelease guard disabled until all prerequisites pass.
- Work on existing `feat/ts-restless-identity`; commit only this scope. Push/PR/merge and stable publication are separate instructions.

### Task 1: New-scope native consumers and atomic rename

**Files:** `tests/packaging/{package-check.test.mjs,validator-independence.test.mjs,package-baseline.json}`; every active workspace/fixture manifest, import, lockfile and build/task filter; `.changeset/*.md` and config; library READMEs; README/CONTRIBUTING; active user docs. Preserve historical `CHANGELOG.md`, `docs/superpowers/` documents and the upstream column of the public migration table.

**Interfaces:** Produces ten `dist/packages/ts-restless-<leaf>.tgz` archives and new-scope default/subpath imports. Existing packed consumers and CI fixtures consume those artifacts.

- [x] Update existing packed consumers first to import `@ts-restless/*` and open `ts-restless-*.tgz`; assert artifact names/repository/issue routing and preserve private-dependency exclusion. Run `pnpm exec vp test run --config tests/vite.config.ts tests/packaging/package-check.test.mjs` and observe missing new-scope archives before implementation.
- [x] Rename active scoped references with `@ts-rest(?!less)` to `@ts-restless`, preserving code paths and symbols. Update archive filename references and bundler namespace regular expressions. Change root name to `ts-restless`; public manifests get actual fork repository, issue/homepage links and ts-restless descriptions without version/peer widening.
- [x] Update Changesets fixed grouping and pending package keys. Update fixtures' scope/tarball references while preserving external locked versions. Run `pnpm install --frozen-lockfile` after the deterministic namespace/lockfile changes to relink workspace packages.
- [x] Update compiled docs examples to the new namespace with their workspace dependencies; remove the temporary old-scope explanation. Restore installation guidance for the intended prerelease only with explicit unpublished status, and preserve upstream migration mappings/credits.
- [x] Run `pnpm test:packages`. Existing ESM/CJS, compiler, metadata, no-Zod/Valibot/Zod4/legacy bridge and native Express checks must pass; do not weaken strict consumers or update unrelated compatibility baselines.

### Task 2: Numbered release PRs and automatic prerelease publication

**Files:** `tests/releases/versioning.test.mjs`, new `scripts/prerelease.mjs`, `package.json`, `.github/workflows/build-test.yml`, `SECURITY.md`, `docs/prerelease-checklist.md`; remove obsolete `.github/workflows/prerelease.yml`.

**Interfaces:** `prerelease:version` enters alpha mode only if no prestate exists, invokes real Changesets versioning and refreshes the lockfile. `prerelease:verify` rejects missing/exited/stable/mixed/unsupported states and reports the committed tag/version. `prerelease:publish` validates, builds and calls Changesets publish under that tag. No snapshots, registry retry layer or release-state commits in the coordinator.

- [x] Exercise actual fork manifests and pending Changesets in disposable workspaces, proving ten stable `4.0.0` / alpha `4.0.0-alpha.0` public packages, packed native core peers and private bundled implementation. Keep existing snapshot/native-peer characterization.
- [x] Replace inline-workflow test extraction with execution of the coordinator. First prove bootstrap/progression and unsafe-state rejection fail without the coordinator; then implement minimal version/verify/publish commands. Exercise the real Changesets CLI with the actual fork manifests, leaving active checkout versions unchanged.
- [x] Add an automatic prerelease job to Build Test, `needs: [main, e2e]`, only on pushes to `main`. Pin Changesets action maintenance/v1 at `ae5c373a18fe02dac7d40bcbc0184758c90d94d2` for CLI v2. Use custom version/publish scripts and remove manual dispatch prerelease workflow. Serialize release work without cancelling an in-progress publication. Retain an explicit disabled guard until credentials/current CI are verified; stable workflow remains paused.
- [x] Require a dedicated `RELEASE_PR_TOKEN` (contents/pull-requests write) so bot-created PRs trigger ordinary PR CI; use it for checkout and Changesets. Use per-package npm trusted publishing (OIDC) and provenance with no regular npm write-token secret; document exact workflow trust fields and first-registration requirements. Reject missing credentials before mutating external state. Local npm login is not CI authentication.
- [x] Enable and verify GitHub private vulnerability reporting on the actual fork; document that route and accurate security support status.
- [x] Update the identity spec, checklist and current support/release documents for the approved automatic PR path. Ordinary Changesets open/update the coordinated prerelease PR after CI; merging it and passing CI publishes under alpha/beta/rc from committed prestate. Stable exit/publication remains a separate decision. Record actual remaining authentication gates without requesting the already-approved prerelease policy again.

### Task 3: Verification and delivery evidence

**Files:** execution evidence in this plan and current release/support documents.

- [x] Run `pnpm check`, `pnpm test:packages`, `pnpm build:examples`, `pnpm test:hosts` and `pnpm --filter @ts-restless/docs test`. Local host/docs listeners and clean package-consumer installations may require approved execution; inspect actual failures rather than relaxing checks.
- [x] Verify applicable CI fixture definitions use new-scope archives and exact existing external baselines. The ten isolated framework/validator fixtures remain CI-only; report their result only after a real branch CI run.
- [x] Review remaining old-scope references semantically: preserve upstream migration/provenance/history, reject active imports, dependencies, bundler matchers or archive paths. Run formatting and `git diff --check`.
- [x] Record test counts, actual versioning outcomes and external prerequisites. Commit only this scope; retain disabled guards if npm access or current-branch CI is unverified. The user has approved interim prereleases, so do not re-ask for that policy decision when prerequisites are satisfied.

## Execution evidence

At start, the branch is clean at `8d63911c`. `npm whoami --registry=https://registry.npmjs.org` returned `ENEEDAUTH`; GitHub private vulnerability reporting returned `enabled: false`. The user has been asked to establish the npm organization and local login while implementation proceeds.

On continuation, npm identity `2wce` and organization ownership were verified, and private reporting is enabled. User approved replacing manual dispatch with Changesets release PRs and automatic prerelease publishing after merged release-state CI. No GitHub Actions secrets were configured at that check.

## Final implementation evidence (2026-11-04)

- Atomic scope migration is implemented across manifests, imports, native tarball consumers, fixture archives/lockfiles, Changesets, bundler patterns and executable docs. Public API names, exports, external peers, private status and repository directories are preserved. Remaining old-scope references are upstream provenance, migration mappings/removal commands or negative assertions.
- The manual prerelease dispatch workflow is removed. Build Test now hosts a default-off release-PR/publish job after `main` and `e2e`, using compatible Changesets maintenance/v1 and the coordinator. `PRERELEASE_ENABLED` remains unset; stable workflow is still disabled. No active-checkout version changes or publication occurred.
- TDD: the coordinator tests first failed because its entrypoint was missing. All release tests passed before review, including real first-alpha/progression states, unsafe-state rejection and the publish tag boundary. The first stable and alpha dry runs still yield `4.0.0` and `4.0.0-alpha.0` after the identity Changeset is added.
- Final verification with pinned Node 26.12.0/pnpm 12.14.0: `pnpm check` passed all 12 task stages, 666 tests and native type checks; 2 existing todos, 0 lint errors / 390 warnings. `pnpm test:packages` passed 20 tests across 4 files. Host checks passed 14 tests. Documentation build/typecheck and all 30 static-site tests passed. Formatting and `git diff --check` passed.
- Default `pnpm build:examples` completed 12/13 tasks, but Next Turbopack's CSS worker could not bind its port (`Operation not permitted`) even after elevated execution and pinned Node. A separate unmodified-source `next build --webpack` passed, including type checking and static generation. No source/config workaround was introduced. The default build and ten isolated consumer fixtures still require actual branch CI; this local evidence does not claim that CI gate passed.
- Authenticated npm reads confirmed account `2wce` owns organization `ts-restless`. GitHub private vulnerability reporting is enabled. GitHub Actions secret-name reads still returned no secrets, so `RELEASE_PR_TOKEN` requires configuration before activation. The initial npm-token plan was replaced by the user-approved OIDC policy below; each public package now requires a trusted-publisher relationship. Neither credential is in source/output. No branch push/PR/merge was performed.

### Review corrections

Independent review reproduced two release blockers and a changelog link issue. The publisher now temporarily marks prestate exited only around the CLI invocation, explicitly passes the validated tag and restores the exact original state in `finally`. A real Changesets publisher test replaces only npm/pnpm external commands, proves ten prerelease-only packages publish under alpha rather than latest, and checks state restoration on success/failure. Initial-release fixtures use real evolving manifests with a controlled 3.52.1/major baseline, so probes run on generated alpha.0 and alpha.1 release-PR states instead of inheriting their consumed Changesets. The changelog generator routes v4+ commit links to the fork while retaining upstream v3 history. Each reported failure was reproduced before its fix.

Final review also caught install tabs tagging the entire dependency list. The correction tags each unversioned fork package individually, preserves external peer specs and is verified by four rendered-site regressions (30 static-site tests total). Historical upstream changelog text is preserved. The final full package suite passed 20 tests, and the final source check again passed 666 tests/type checks with no lint errors.

### Trusted-publishing policy update

The user selected npm provenance + trusted publishing after authorizing draft PR #10. The regular prerelease job now uses OIDC with no npm-token secret. `RELEASE_PR_TOKEN` remains a GitHub-only credential so release PRs trigger CI. Official npm and pnpm documentation was checked: npm >=11.5.1 / Node >=22.14.0, GitHub-hosted runners and `id-token: write`; exact per-package trust binding to `2wce/ts-rest` / `build-test.yml`; public repository/package for automatic provenance; new configurations must permit direct publish and validate within two days. Pinned local npm is 11.20.0, Node26.12.0 and pnpm12.14.0. Package registration is still external and unperformed. Staging can register names with public placeholders; no registration/bootstrap path has been executed or implicitly chosen.

### Registration and publisher setup (2026-11-04)

- The user chose staged placeholders followed by OIDC. npm staged all ten registration-only `0.0.0-registration.0` payloads under `registration`; public registry reads confirmed only npm's generated `0.0.0-stage` placeholders. No library contents or alpha were published, and checkout versions remain unchanged. Public docs and library READMEs now distinguish registration placeholders from usable library releases.
- The user confirmed all ten trust grants at action time. Core/Express were configured in npm settings; the other eight used npm 11.20's supported `npm trust github` command with `--file=build-test.yml --repo=2wce/ts-rest --allow-publish --allow-stage-publish`. Direct and staged publication are allowed; dist-tag management is excluded. First OIDC publication is still required to validate the connections. The earliest validation deadline displayed by npm is 2026-11-06 15:35 UTC.
- npm automatically assigned each placeholder to `latest`. An authenticated `npm dist-tag rm @ts-restless/core latest` returned HTTP 400; a subsequent public registry read confirmed the tag remained. No other tag removals were attempted. Registration stages remain unapproved; an attempted Core-stage rejection did not complete authentication. Do not approve those payloads or delete the package records.
- Live GitHub API reads still returned no repository secrets or variables. `RELEASE_PR_TOKEN` remains missing and `PRERELEASE_ENABLED` remains unset. PR #10 is draft; no merge, workflow activation or real alpha publication is authorized by the registration/setup step.
- The registration-status documentation follow-up passed the docs build/type checks and all 30 rendered-site tests. The initial sandboxed run failed to bind the local prerender listener (`listen EPERM ::1`); the unchanged command passed with approved execution. Formatting and whitespace checks passed. The previous implementation head `a47c0890` passed full branch CI, including default Next and all ten isolated compatibility fixtures.

### Repository rename correction (2026-11-05)

GitHub now identifies repository ID `1425753666` as `2wce/ts-restless`; the old URL redirects to it. The user saved `RELEASE_PR_TOKEN`, and a secret-name-only API read confirmed its presence. Full CI passed on `c3425b3f` and the repository correction commit `ad2e9511`, including all ten isolated compatibility fixtures. The token's permission scope still requires proof from an actual release-PR job. The original old-name npm connections were replaced as recorded below; the original setup above is historical evidence.

- [x] Update the existing packed-metadata and generated-changelog expectations to the canonical repository. Both checks failed against the old implementation/artifacts before source changes.
- [x] Align public manifests, root metadata, active fork links, changelog generation and release setup documentation with `2wce/ts-restless`. Preserve upstream attribution, historical changelogs, APIs, versions, peers and paused release guards.
- [x] Run the package/release suite, docs build/type checks and rendered tests; check formatting and remaining old-name references. All 20 package/release tests and 30 rendered-site tests passed. The initial sandboxed consumer installation hit DNS restrictions; the same suite passed with approved network access. Formatting and whitespace checks passed. Active old-name references are only the documented original bindings; historical plans/changelogs retain their recorded names.
- [x] Configure equivalent npm trust bindings to `2wce/ts-restless` / `build-test.yml`, with direct/staged publishing allowed and dist-tag management excluded; retire the obsolete connections after the replacements are verified.
- [x] Record evidence, commit and push the repository correction as `ad2e9511` to the existing draft PR. Publication and merge remain separate from this metadata/authentication correction.

The local npm login returned E401 and was refreshed by the user through npm's browser login flow. npm's supported CLI then reported successful creation of all ten replacement connections with the canonical repository and direct/staged publishing permissions. After expired browser verification requests, a single authenticated command sequence completed verification and retirement on 2026-11-05. Authenticated `npm trust list` reads confirmed all ten replacements use `2wce/ts-restless` / `build-test.yml`, with exactly `createPackage` and `createStagedPackage`; `npm trust revoke` retired the obsolete grants, and subsequent reads confirmed each replacement remained with no old-name binding. The command exited successfully and recorded ten retirement results in `/private/tmp/ts-restless-trust-rename-report.json` (local verification evidence). The replacements require their first successful OIDC publication within two days of creation; the original November 6 deadline above belongs to the retired grants. No library version or public dist-tag was changed. The local origin remote now uses the canonical repository URL. PR #10 remains draft and `PRERELEASE_ENABLED` remains unset.

### Activation and action bundle correction (2026-11-05)

The user authorized enabling prerelease automation, and a GitHub API read verified `PRERELEASE_ENABLED=true`. The user then authorized merging PR #10; it merged as `113ad0fc`. [Main CI run 42031662569](https://github.com/2wce/ts-restless/actions/runs/42031662569) passed Build & Test and all ten compatibility fixtures, then failed before running Changesets: the pinned maintenance source commit did not contain the `dist/index.js` entrypoint declared by `action.yml`. No release PR or library publication occurred.

The correction pins the official [v1.9.0 release](https://github.com/changesets/action/releases/tag/v1.9.0), commit `a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d`, preserving CLI 2.x and the existing inputs. GitHub tag and repository-tree reads verified the release commit, entrypoint and companion bundles. All eight release-versioning tests passed, along with scoped formatting and whitespace checks. Main CI must execute the corrected action and create the alpha version PR before the GitHub credential is considered operationally verified. Merging that separate version PR remains the publication decision; npm OIDC and provenance still require a real publication for verification.
