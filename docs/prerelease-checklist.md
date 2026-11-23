# ts-restless prerelease release-PR checklist

The initial stable target is `4.0.0`; interim libraries use coordinated `4.0.0-alpha.*` releases under the project-owned `ts-restless` npm organization. This checklist describes the repeatable release process. Select actual published versions through [release notes](https://github.com/2wce/ts-restless/releases), package changelogs and live registry verification rather than a moving version snapshot. Historical `0.0.0-stage` registration placeholders contain no library code and must not be installed.

## Automated flow

Ordinary changes land with Changesets. After a push to `main` passes Build & Test and every isolated compatibility fixture, the prerelease job in [build-test.yml](../.github/workflows/build-test.yml) uses the Changesets action to open or update a version PR. The first version PR enters alpha mode and versions the ten public libraries to `4.0.0-alpha.0`; later Changesets advance the numbered prerelease together. The PR includes manifests, changelogs, `.changeset/pre.json` and the refreshed lockfile.

Review and merge that version PR through normal PR CI. After its exact merged commit passes the same main CI and compatibility gates, Changesets publishes unpublished versions under the tag recorded in the committed prerelease state. Publication selects the validated explicit alpha/beta/rc channel. During alpha development, the coordinator then points `latest` at the same alpha release under [ADR0018](adr/0018-alpha-latest-tag.md), so ordinary installs receive the maintained alpha. Beta and RC retain their explicit channels until their default-install policy is separately decided. The action filters Changesets already consumed by the prerelease state, so retained prerelease Changesets do not continually reopen the same PR. New pending Changesets update the version PR before publication.

The small [coordinator](../scripts/prerelease.mjs) validates the active prestate, allowed tag, exact public package set, namespace and matching numbered versions before building/publishing. It rejects missing/exited/stable/mixed states. Changesets owns version progression, registry checks, publication tags and GitHub release creation. CLI 2.x rejects an explicit tag in active pre mode and can otherwise select `latest` for prerelease-only packages. During publication the coordinator temporarily marks the disposable checkout's prestate exited, publishes the unchanged numbered versions under the validated explicit tag, then restores the original prestate even if publication fails. Only after successful alpha publication does it add `latest` for all ten public packages. A tag failure fails the job; retrying reruns tag writes even when Changesets skips already-published versions. Dist-tags update independently per package, so verify every package after a retry. The release PR and committed prerelease state stay active. The workflow serializes release work and skips a stale main commit when a newer commit awaits its own CI. Stable publishing remains paused in [release.yml](../.github/workflows/release.yml).

## Trusted-publisher tag permission

Every public package's existing trusted publisher for `2wce/ts-restless/build-test.yml` must allow **npm publish** and **npm dist-tag**; staged publishing remains allowed. All ten bindings and dist-tag permissions were verified during the [setup refresh](evidence/2026-11-16-delivery-refresh.md). Recheck the binding and permissions when replacing a connection or diagnosing a failed release. Direct publish permission does not grant dist-tag management automatically. Keep OIDC and provenance; no npm write-token secret is needed. The prerelease job installs npm 11.21.0 because Node 26.12.0 bundles npm 11.20.0. npm documents trusted-publisher dist-tag support in npm 11.21+ or 12.2+; see [the official requirements](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).

Successful alpha publication reconciles `latest` with the reviewed numbered alpha version. Confirm both tags from the registry after every release and retry. A code merge or local test does not establish successful publication or tag reconciliation. Stable `4.0.0` follows its own release decision and activation.

## Review release state and artifacts

Use the repository's pinned Node/pnpm versions. The automation runs these maintainer scripts in its disposable checkout:

```sh
pnpm prerelease:version
pnpm prerelease:verify
```

`prerelease:version` initializes alpha mode only when prestate is absent, invokes Changesets and refreshes the lockfile. Keep private packages private. Do not mix snapshot timestamps into this release line. A beta/RC transition requires reviewed Changesets state and the same artifact checks.

Release tracking is limited to the ten explicitly listed public libraries in
`.changeset/config.json`. `privatePackages.version` and `privatePackages.tag` are
both `false`: examples, docs and private tooling/helpers
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

Release notes must cover package/import migration, Standard Schema major changes and exact verified lines. Check the selected release's manifests and changelogs against the [support inventory](support-inventory.md) and migration guides. Fastify5 uses root and Fastify4 uses `/legacy`; the public React adapter admits React18/19 with compatible native Query peers. Private implementation-package peers do not establish public support.

## CI authentication and activation

The prerelease job is enabled through `PRERELEASE_ENABLED=true`; successful generated version-PR jobs and alpha publications establish the configured path. When restoring or replacing release setup, verify the actual ownership, private reporting and repository variable:

```sh
npm whoami --registry=https://registry.npmjs.org
npm org ls ts-restless --json --registry=https://registry.npmjs.org
gh api repos/2wce/ts-restless/private-vulnerability-reporting
gh api repos/2wce/ts-restless/actions/variables/PRERELEASE_ENABLED
```

The release job uses GitHub-hosted Ubuntu runners with `id-token: write`, the pinned Node/pnpm versions and npm 11.21.0 for trusted-publisher dist-tag support. Public registry metadata reads need no npm token. Verify every public package's existing GitHub Actions connection against these fields:

| Field                | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| Organization or user | `2wce`                                                       |
| Repository           | `ts-restless`                                                |
| Workflow filename    | `build-test.yml`                                             |
| Environment name     | Empty; this job does not use a GitHub environment            |
| Allowed actions      | Direct `npm publish`, `npm stage publish` and `npm dist-tag` |

Names include all ten public libraries: core, express, fastify, nest, next, serverless, react-query, open-api, solid-query and vue-query. Private packages stay excluded. Published manifests point to the fork repository, as npm requires. Package settings are case-sensitive; the workflow value is the filename alone. The [dated setup evidence](evidence/2026-11-16-delivery-refresh.md) records the verified permissions.

The workflow uses OIDC instead of an npm write-token secret. GitHub issues a short-lived identity, and the package manager exchanges it for scoped registry access. Public GitHub trusted publishing adds provenance; explicit npm/pnpm provenance settings retain that requirement. Local `npm whoami` checks maintainer login, not workflow OIDC permissions. Verify each publication's registry provenance.

The dedicated `RELEASE_PR_TOKEN` gives the Changesets action GitHub contents/pull-requests write access so generated release PRs trigger ordinary CI. Its successful version-PR runs establish that path; diagnose credential changes through job results without printing the secret. This GitHub credential is independent of npm publishing. A future project-owned GitHub App identity can replace it separately.

When recreating a trust, follow npm's current activation requirements and configure it close to a reviewed release. Keep the prerelease variable disabled during incomplete setup. Enable it after identity, CI, release-PR credentials and all package bindings are verified. A subsequent main push opens or updates the version PR; merging that PR and passing main CI publishes the recorded prerelease. Stable automation has its own disabled workflow and separate approval. Token-based publishing restrictions are managed separately in npm package settings; OIDC setup does not change them.

Official requirements: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [pnpm publish](https://pnpm.io/cli/publish). A successful registry publication proves authentication; local tests and `id-token: write` alone do not.

### First-package registration

The public names were originally registered with placeholder/staged payloads before library publication. The historical [registry snapshot](evidence/2026-11-06-support-demand.json) retains that baseline. The release workflow neither registers new names nor approves registration-only staged payloads. Never install `0.0.0-stage` or approve those placeholder payloads as a library release. Any staged-record cleanup requires its own review; retain the package records and trusted-publisher relationships.

### Verify a completed release

After publication or retry, read every public package's live tags:

```sh
for package in core express fastify nest next serverless react-query open-api solid-query vue-query; do
  npm view "@ts-restless/$package" dist-tags --json
done
```

Require `alpha` and `latest` to match the reviewed numbered alpha release across all ten libraries. Inspect the published version's manifests, exports, peers, changelog and provenance as well; for example:

```sh
npm view @ts-restless/core@alpha version dist.attestations --json
```

Repeat artifact/provenance verification for every released library and pin exact versions in migration applications. `latest` is the default-install channel; the version itself determines whether it is a prerelease. Beta/RC channel changes and stable activation follow their separate decisions. Keep dated observations in [evidence](evidence/README.md) rather than hardcoding the current tag targets into guides or the roadmap.

## Stable exit

After selected launch fixes/support claims pass and stable publication is approved, disable the prerelease job before preparing the stable release branch:

```sh
pnpm exec changeset pre exit
pnpm version-packages-update-lockfile
```

Review the coordinated `4.0.0` state, repeat applicable checks and separately activate the stable release path. The prerelease coordinator deliberately rejects the exited/stable state. A dry run or merge alone does not publish stable packages.
