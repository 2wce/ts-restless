# Coordinate ten public libraries and keep examples private

**Status:** Accepted. **Identity/version decision:** 2026-11-04; public-only release tracking approved and delivered 2026-11-06.

Publish the ten library packages under `@ts-restless/*` as a coordinated Changesets group. The first stable target is4.0.0, preceded by explicit numbered alpha/beta/rc releases. Preserve upstream lineage and existing public API names. Examples, tooling and the bundled React5 implementation workspace remain private and excluded from release versioning/tagging.

Coordinated versions simplify matched-package migration and shared-contract compatibility. Independent adapter versions could reduce release impact but remain a separate A17 proposal. Publishing/versioning private examples adds release noise without a consumer package contract.

Prerelease version PRs and publication follow artifact/CI and authentication gates. Stable activation is a separate decision. Record actual npm tags and versions rather than inferring them from repository state; publication uses the reviewed OIDC/provenance workflow.

Sources: [identity decision](../plans/2026-11-04-ts-restless-identity-design.md), [public-only tracking](../plans/004-private-package-release-noise.md), [maintained checklist](../prerelease-checklist.md). [Roadmap](../roadmap.md) records delivery.
