# ts-restless identity and release boundary

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

**Recorded:** 2026-11-04. **Status:** The user selected `ts-restless`, an initial stable version of `4.0.0`, and project-owned npm organization `ts-restless` with the user as its initial owner. The user also approved interim public prereleases while stable-launch fixes continue. This document defines the identity implementation boundary; package renaming, organization creation, versioning and publication have not been performed.

**Related:** [Fork release readiness issue #6](https://github.com/2wce/ts-restless/issues/6), [F06 release backlog](release-readiness-backlog.md#f06--fork-identity-migration-and-release-readiness), [Standard Schema separation design](2026-10-20-standard-schema-separation-design.md).

## Project identity

The project is **ts-restless**. Its public description is:

> Contract-first, end-to-end typed REST for TypeScript. A maintained fork of ts-rest.

Use the complete name consistently in package descriptions, README, documentation navigation and release notes. Describe its upstream lineage explicitly and preserve upstream credits and MIT licence notices. Support and maintenance claims concern ts-restless releases and their recorded dependency support; they must not imply ownership or maintenance of upstream published packages.

Use the current repository at `https://github.com/2wce/ts-restless` for the initial release. GitHub API verification on 2026-11-05 confirmed the renamed repository retains ID `1425753666`; the old URL redirects to it. Set package repository, issue links and npm trusted-publisher bindings to the actual name. A later move to a project GitHub organization can be delivered separately with its own metadata/link updates. A custom domain and redesigned logo are not first-release requirements; documentation must use an actual hosted destination when one is available.

## Publication names and ownership

Publish public libraries under the project-owned npm organization `ts-restless`, with the user as its initial owner. Establish ownership and verify publishing access before enabling releases. The proposed organization is not treated as acquired based on a package registry lookup.

Preserve each public package's leaf name:

| Existing package       | ts-restless package        |
| ---------------------- | -------------------------- |
| `@ts-rest/core`        | `@ts-restless/core`        |
| `@ts-rest/express`     | `@ts-restless/express`     |
| `@ts-rest/fastify`     | `@ts-restless/fastify`     |
| `@ts-rest/nest`        | `@ts-restless/nest`        |
| `@ts-rest/next`        | `@ts-restless/next`        |
| `@ts-rest/serverless`  | `@ts-restless/serverless`  |
| `@ts-rest/react-query` | `@ts-restless/react-query` |
| `@ts-rest/open-api`    | `@ts-restless/open-api`    |
| `@ts-rest/solid-query` | `@ts-restless/solid-query` |
| `@ts-rest/vue-query`   | `@ts-restless/vue-query`   |

Internal scoped workspace packages follow `@ts-restless/*` for consistent dependency resolution and task filters. Preserve their private status. In particular, the private React Query v5 implementation stays private and is bundled into public `@ts-restless/react-query/v5`; it does not become an eleventh public library. Keep example apps private. Rename the root workspace identity to `ts-restless` without treating its private version as the public release version.

Do not publish aliases or proxy packages in the upstream `@ts-rest` scope. Default entry points, public subpaths, package relationships and optional peers must remain equivalent to the reviewed fork except for approved identity/version changes and separately delivered launch fixes.

## Version policy

The first stable release of every public library is **`4.0.0`**. This marks the breaking successor to ts-rest v3. Releases remain coordinated; independent adapter versions are deferred to A17 of the maintenance epic.

Use `4.0.0-alpha.0` for the first numbered public prerelease, followed by numbered alpha, beta and release-candidate versions as evidence warrants. Publish each under its explicit `alpha`, `beta` or `rc` dist-tag. Reserve `latest` for the stable release. Existing timestamp snapshot tooling must be reconciled with this numbered prerelease policy before enabling publication.

Reconcile pending Changesets and source versions in a disposable versioning dry run so the stable result is exactly `4.0.0`. Current source libraries are `3.52.1` with coordinated major Changesets pending. Do not set them to `4.0.0` and then inadvertently apply another major bump to `5.0.0`. Keep private workspace packages private even when coordinated tooling updates their versions.

Subsequent releases follow semver under ts-restless's own release history. Announce and perform compatibility removal according to the adopted [support policy](../support-policy.md); the initial baseline must describe differences from upstream v3 explicitly.

## Interim prereleases and stable launch

Publish interim `4.0.0-alpha.*` releases once the identity, ownership and prerelease artifact gates below pass. Completion of F01–F05 and A03–A19 is not required for an alpha. Give users an explicit prerelease installation command, migration guidance and release notes listing the exact verified dependency lines, known gaps and breaking changes. Direct testing feedback to the actual fork's issues.

The first alpha gate requires new-scope metadata/imports throughout published artifacts, verified npm organization access, native tarball/strict migration-consumer checks, applicable source/native/CI checks, private security reporting, and a dry run yielding `4.0.0-alpha.0` with correct package relationships. Document current limitations including pinned Query v5 evidence, public React support through 18, Fastify4 support and the existing OpenAPI converter boundary. Do not infer new support claims from a prerelease tag or widen peers to conceal a failing consumer.

The user subsequently approved Changesets release PRs with automatic prerelease publication after a release PR merges and CI passes. Enable this flow after these gates pass. Prefer Changesets prerelease state for coordinated numbered versions; reconcile it with existing snapshot commands rather than mixing the two version models. Run the compatible Changesets action after the existing main and compatibility CI gates on the exact main commit. Pending Changesets create/update a version PR; merged numbered prerelease state publishes under its committed tag. Use a dedicated release PR credential so these PRs trigger CI, and npm trusted publishing through OIDC with provenance. The user selected this authentication policy; regular publication must not require an npm write-token secret. Keep stable automation disabled and keep alpha/beta/rc releases off `latest`. Later prereleases repeat applicable checks for their actual changes and publish accurate compatibility notes.

The stable `4.0.0` launch has its own release decision after selected F01–F05 work and support claims meet their acceptance criteria. Record the chosen stable scope explicitly; Fastify5 is optional if the supported Fastify4 line is stated clearly. Prerelease progress does not establish a stable release or start a support-retirement clock.

## Consumer migration

Replace dependencies and imports as a matched package set. Preserve public API identifiers such as `initContract`, core `initClient`, `initTsrReactQuery` and existing `TsRest*` names; renaming symbols or error names for branding would add an unnecessary migration. Preserve supported subpaths including `/zod3`, React Query `/v5` and serverless host entry points.

Examples of intended imports after implementation:

```typescript
import { initClient, initContract } from '@ts-restless/core';
import { toStandardSchema } from '@ts-restless/core/zod3';
import { initTsrReactQuery } from '@ts-restless/react-query/v5';
```

Document dependency/import replacement separately from the major behavioral migration. The existing [Standard Schema migration guide](../../apps/docs/content/docs/standard-schema-migration.mdx) must be updated to use the new identity and explain legacy Zod bridging, moved helpers, portable validation errors, synchronous validation and header composition. Existing upstream v3 artifacts retain their behavior; installing ts-restless v4 opts into the new major boundary.

Provide strict, runnable migration consumers using native tarballs and matching new-scope dependencies. Do not rely on workspace symlinks, unresolved upstream imports, or npm aliases to make the examples pass. Test both ESM and CommonJS resolution, required public subpaths, legacy `/zod3` and a representative real adapter request. Preserve the validator-independent default declaration/runtime graph.

## Maintainer, documentation and security routes

Use the actual fork repository for issue reporting and contribution links. Retain upstream links where they identify provenance or prior-art issues; replace upstream links that currently act as this fork's support, repository, release or installation destination. Documentation and README badges must identify this project and its actual artifacts.

The user also requested public documentation updates during identity definition. Deliver a development-preview docs slice now: update README and docs branding, current repository/support links, maintainer attribution, browser metadata, and the prerelease/namespace migration explanation. Remove upstream npm/Discord badges presented as this fork's own metrics/support. Preserve the current checkout's compiled `@ts-rest/*` examples until package renaming lands; explain that transition visibly and provide the intended `@ts-restless/*` migration on its own page. Replace executable install/import examples atomically with the source package rename rather than inventing aliases or claiming new packages are already published.

Replace the inherited security policy's upstream personal contact and blanket version table. Enable and verify GitHub private vulnerability reporting on the actual fork repository, then document that private channel and the ts-restless release lines receiving security fixes. An unverified private reporting route is a release gate; ordinary public issues are not the security-reporting substitute.

Keep publishing authentication in the organization's supported CI authentication/secret configuration, outside the source tree. Verify that the destination accepts the chosen workflow identity and provenance configuration. Record ownership and recovery responsibilities without claiming a multi-maintainer organization exists before additional maintainers join.

## Implementation boundary and checks

Deliver identity adoption in a reviewed branch. Cover source/package names, workspace dependencies and lockfile, internal imports, build/task filters, packed package baseline, fixture consumers, Changesets references, repository metadata, README/docs/examples and security routing. Update configured package-matching patterns deliberately; preserve historical plans, prior release changelogs, licence notices and upstream evidence references as historical records.

Keep both stable and prerelease publication guards disabled throughout identity implementation and review. Interim prerelease distribution is approved, but publication cannot begin until the actual organization ownership, artifacts and automated prerelease path meet the gates above. Stable publication and a repository transfer remain separate decisions. This documentation slice does not create organizations, rename packages, configure credentials or enable a workflow.

The identity change must demonstrate:

1. All ten native tarballs have correct new-scope names, repository links, public exports and compatible package relationships. Private packages are excluded from publication and do not leak as consumer dependencies.
2. Strict clean consumers install only the new-scope artifacts with real external peers and exercise declarations, ESM/CommonJS and the agreed migration examples. Validator-independent consumers still work without Zod.
3. Existing source/inference checks, package tests, native examples, host checks and applicable CI fixture matrix pass after the rename. Update archive verification paths as well as consumer imports.
4. Changesets dry runs resolve the first stable public package set to `4.0.0` and the first numbered prerelease to `4.0.0-alpha.0`, with correct internal dependency ranges and public/private treatment.
5. Organization ownership, actual documentation/support destinations and private security reporting are verified before publication. No upstream identity is used as the fork's publication or support destination.

Compatibility fixes F01–F05 remain independently scoped work and can be shipped in successive prereleases. This design does not widen framework peers, claim current Query/React/Fastify compatibility, implement validator-independent OpenAPI, or require completion of A03–A19. Verify each selected launch claim through its own acceptance criteria before the stable release decision.

## Availability evidence

On 2026-11-04, the GitHub API returned 404 for the public account `ts-restless`; repository search returned no `ts-restless` matches. The public npm registry returned 404 for unscoped `ts-restless` and scoped `@ts-restless/core`. These are initial collision checks, not proof of namespace ownership or reservation. Recheck when acquiring the organization. No custom domain has been selected or acquired.
