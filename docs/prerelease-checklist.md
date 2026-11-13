# ts-restless prerelease release-PR checklist

The initial stable target is `4.0.0`; interim library releases start at `4.0.0-alpha.0`. The project-owned npm organization is `ts-restless`. On 2026-11-04, authenticated npm checks confirmed `2wce` as an organization owner, and GitHub private vulnerability reporting was enabled and verified on the current fork. All ten public names are registered with npm's `0.0.0-stage` placeholders. All ten public libraries have alpha.0/alpha.1 releases as of 2026-11-06; `alpha` points to alpha.1. The historical placeholders contain no library code and must not be installed. Stable `4.0.0` is not published.

## Automated flow

Ordinary changes land with Changesets. After a push to `main` passes Build & Test and every isolated compatibility fixture, the prerelease job in [build-test.yml](../.github/workflows/build-test.yml) uses the Changesets action to open or update a version PR. The first version PR enters alpha mode and versions the ten public libraries to `4.0.0-alpha.0`; later Changesets advance the numbered prerelease together. The PR includes manifests, changelogs, `.changeset/pre.json` and the refreshed lockfile.

Review and merge that version PR through normal PR CI. After its exact merged commit passes the same main CI and compatibility gates, Changesets publishes unpublished versions under the tag recorded in the committed prerelease state. Publication selects the validated explicit alpha/beta/rc channel. During alpha development, the coordinator then points `latest` at the same alpha release under [ADR0018](adr/0018-alpha-latest-tag.md), so ordinary installs receive the maintained alpha. Beta and RC retain their explicit channels until their default-install policy is separately decided. The action filters Changesets already consumed by the prerelease state, so retained prerelease Changesets do not continually reopen the same PR. New pending Changesets update the version PR before publication.

The small [coordinator](../scripts/prerelease.mjs) validates the active prestate, allowed tag, exact public package set, namespace and matching numbered versions before building/publishing. It rejects missing/exited/stable/mixed states. Changesets owns version progression, registry checks, publication tags and GitHub release creation. CLI 2.x rejects an explicit tag in active pre mode and can otherwise select `latest` for prerelease-only packages. During publication the coordinator temporarily marks the disposable checkout's prestate exited, publishes the unchanged numbered versions under the validated explicit tag, then restores the original prestate even if publication fails. Only after successful alpha publication does it add `latest` for all ten public packages. A tag failure fails the job; retrying reruns tag writes even when Changesets skips already-published versions. Dist-tags update independently per package, so verify every package after a retry. The release PR and committed prerelease state stay active. The workflow serializes release work and skips a stale main commit when a newer commit awaits its own CI. Stable publishing remains paused in [release.yml](../.github/workflows/release.yml).

## Trusted-publisher tag permission

Before rolling out the alpha-to-`latest` policy, enable **Allow npm dist-tag** in each of the ten public packages' existing trusted-publisher configurations for `2wce/ts-restless/build-test.yml`. Direct publish permission does not grant this permission automatically. Keep OIDC and provenance; no npm write-token secret is needed. The prerelease job installs npm 11.21.0 because Node 26.12.0 bundles npm 11.20.0. npm documents trusted-publisher dist-tag support in npm 11.21+ or 12.2+; see [the official requirements](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

The first successful run reconciles `latest` with its reviewed alpha version. Confirm both `alpha` and `latest` from the registry; a code merge or local test does not establish that package permissions or live tags changed. Stable `4.0.0` still requires its own release decision and activation.

## Review release state and artifacts

Use the repository's pinned Node/pnpm versions. The automation runs these maintainer scripts in its disposable checkout:

```sh
pnpm prerelease:version
pnpm prerelease:verify
```

`prerelease:version` initializes alpha mode only when prestate is absent, invokes Changesets and refreshes the lockfile. Existing pending major Changesets already target v4; do not first set versions to `4.0.0` and then apply another major bump. Keep private packages private and React Query v5 bundled through public `/v5`. Do not mix snapshot timestamps into this release line. A beta/RC transition requires reviewed Changesets state and the same artifact checks.

Release tracking is limited to the ten explicitly listed public libraries in
`.changeset/config.json`. `privatePackages.version` and `privatePackages.tag` are
both `false`: examples, docs, private tooling/helpers and the bundled v5 package
retain their versions and receive no release changelog or tag during alpha
progression. Private packages were never npm publication candidates. Existing
private manifest versions and entries in `pre.json.initialVersions` are history,
not a request to release those packages again.

Changesets must list only public libraries. The planner validates every retained
Changeset before filtering consumed IDs from `pre.json`; an old entry mixing a
private helper with public libraries still blocks the next version command.
The current-state release probe retains the entire committed `.changeset`
directory so CI checks this boundary against the real pending and consumed entries.

Before enabling the separately approved stable release path, rehearse prerelease
exit against all real manifests and verify skipped private packages remain
unchanged. The installed Changesets planner can assign an exit patch to a skipped
package that has no dependency-only release entry; the current prerelease
coordinator rejects exited state.

The complete CI gates are:

```sh
pnpm check
pnpm test:packages
pnpm build:examples
pnpm test:hosts
pnpm --filter @ts-restless/docs test
```

`test:packages` builds and natively packs `dist/packages/ts-restless-<leaf>.tgz`, installs real external peers in clean consumers, and checks ESM/CJS exports, declarations, Nest metadata, React directives and validator-independent/legacy consumers. Disposable dry runs using actual fork manifests and a controlled initial major prove the first stable/alpha versions, alpha progression, native peers and rejection of unsafe prerelease states. Inspect the release PR's versions and package relationships; ignored upstream archives are not this release's artifacts.

Require all ten isolated CI fixtures to pass on the release commit: Express4/5, Nest9/10/11 and Zod3/Zod4/no-validator/Valibot/ArkType under recorded pinned combinations. Relaxed fixture compiler settings are not a strict claim for every peer version; strict packed consumers provide separate evidence. Preserve external dependency baselines and do not widen peers to permit installation.

Release notes must cover package/import migration, Standard Schema major changes and exact verified lines. F01–F05 may arrive in later prereleases: current Query v5 compatibility, Express request typing, public React19, response validation and modern OpenAPI are separate work. Current Fastify support is major4; the private Query v5 implementation's React19 peer does not widen the public peer range.

## CI authentication and activation

Verify actual ownership and private reporting:

```sh
npm whoami --registry=https://registry.npmjs.org
npm org ls ts-restless --json --registry=https://registry.npmjs.org
gh api repos/2wce/ts-restless/private-vulnerability-reporting
```

Configure npm trusted publishing for each of the ten public packages. The release job uses GitHub-hosted Ubuntu runners with `id-token: write`; pinned Node 26 provides npm 11.20.0 locally, and the job checks npm >=11.5.1. The repository's pnpm 12 publish path supports OIDC and provenance. Public registry metadata reads need no npm token.

In each package's npm settings, add a GitHub Actions trusted publisher with these exact fields:

| Field                | Value                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Organization or user | `2wce`                                                                                      |
| Repository           | `ts-restless`                                                                               |
| Workflow filename    | `build-test.yml`                                                                            |
| Environment name     | Leave empty; this job does not use a GitHub environment                                     |
| Allowed actions      | Enable direct `npm publish`; current new trust configurations otherwise permit staging only |

The original ten connections were created on 2026-11-04 for `2wce/ts-rest`, with direct and staged publishing allowed and dist-tag management disabled. GitHub renamed the same repository (ID `1425753666`) to `2wce/ts-restless` by 2026-11-05. All ten replacement connections were created and verified on 2026-11-05 with the exact binding above and permissions limited to `createPackage` and `createStagedPackage`. Authenticated npm CLI reads after revocation confirmed every replacement remained and all obsolete old-name bindings were retired. Every new connection needs its first successful OIDC publication within two days of creation; the original connections' November 6 deadline no longer applies. Existing package token-access settings have not been tightened; that remains a separate step after successful OIDC publication.

Names include all ten entries in the package migration table: core, express, fastify, nest, next, serverless, react-query, open-api, solid-query and vue-query. Keep private packages excluded. The public manifests already point to the actual fork repository, as npm requires. Package settings are case-sensitive; the workflow filename is the filename alone.

The workflow has no `NPM_TOKEN` or `NODE_AUTH_TOKEN` publishing secret. GitHub issues a short-lived OIDC identity, and the package manager exchanges it for scoped registry access. GitHub trusted publishing automatically adds provenance for these public packages/public repository; explicit npm/pnpm provenance settings retain that requirement. Local `npm whoami` is not a check of OIDC permissions. Verify the actual publication's registry provenance before declaring the setup complete.

A dedicated repository secret `RELEASE_PR_TOKEN` provides GitHub contents/pull-requests write access so generated release PRs trigger ordinary PR CI. A secret-name-only GitHub API read confirmed the user saved it on 2026-11-05; its actual permissions still need verification by a successful release-PR job. It is a GitHub PR credential, independent of npm publishing. A future project-owned GitHub App identity can generate installation tokens in the workflow. Never print or commit the credential's value.

### First-package registration

The new package names need npm package records before their per-package trust settings can be configured. Organization ownership alone does not establish those relationships. The user approved staged registration on 2026-11-04, and all ten records now exist. The workflow itself does not perform registration or bootstrap releases.

[npm staged publishing](https://docs.npmjs.com/staged-publishing/) registered the names using authenticated maintainer access. Each submission used a registration-only `0.0.0-registration.0` payload, tagged `registration`, containing only a manifest and README. npm created the publicly available `0.0.0-stage` placeholders; the submitted contents remain staged and unapproved. **Never approve those registration-only payloads as a library release.** The first library alpha must come from the reviewed release PR through OIDC.

Before the first library release, registry reads confirmed only `0.0.0-stage`, assigned to `latest`. A 2026-11-06 refresh confirmed alpha.0 and alpha.1 for all ten packages; `alpha` pointed to alpha.1 while `latest` pointed to alpha.0. This conflicted with the stable-only policy at that time; [ADR0018](adr/0018-alpha-latest-tag.md) subsequently superseded that policy with alpha mirroring. See the historical [registry snapshot](evidence/2026-11-06-support-demand.json). An authenticated attempt to remove Core's placeholder `latest` tag returned HTTP 400; the placeholder-tag attempt did not change registry state at that time. The earlier placeholder was registration state, not a stable release. User installation instructions can use the real `@alpha` channel. Registration-only stage rejection was not recorded in the setup evidence; recheck with `npm stage list` before any separately approved cleanup. Do not delete the package records or approve the staged payloads.

Do not activate automation until each package has its trusted publisher configured. Current npm trust configurations must complete their first successful publish within two days or be recreated. Configure them near the ready-to-publish release, with direct publish permission, then enable the workflow. After successful OIDC publication, restrict token-based publishing in npm package settings as appropriate; do not claim that restriction is configured by this source change.

The job defaults off behind repository variable `PRERELEASE_ENABLED`; actual alpha publications establish that the prerelease path has since run. The following describes its setup gate, not an assertion that publication is still disabled. Keep it unset until the identity branch is reviewed, its full CI passes, the GitHub release-PR credential is configured, and the npm package trust relationships are ready. Then set `PRERELEASE_ENABLED=true`; the next successful main push opens/updates the release PR. Its merge and successful CI publish automatically under the recorded prerelease tag. Stable automation remains disabled.

Official requirements: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [pnpm publish](https://pnpm.io/cli/publish). The actual registry publish is the authentication proof; successful local tests or the presence of `id-token: write` do not establish that trust is configured.

After library publication, verify every package/version and dist-tag. Replace the placeholder warnings in README/docs/security only after registry verification, including actual release notes. During active alpha development, `alpha` and `latest` must point to the same numbered release after successful tag reconciliation. `latest` is the default-install channel and does not establish stability; check the version itself. Beta/RC channel changes and stable activation remain separate decisions.

## Stable exit

After selected launch fixes/support claims pass and stable publication is approved, disable the prerelease job before preparing the stable release branch:

```sh
pnpm exec changeset pre exit
pnpm version-packages-update-lockfile
```

Review the coordinated `4.0.0` state, repeat applicable checks and separately activate the stable release path. The prerelease coordinator deliberately rejects the exited/stable state. A dry run or merge alone does not publish stable packages.
