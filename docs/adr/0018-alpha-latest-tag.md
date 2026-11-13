# Let npm latest follow alpha during alpha development

**Status:** Accepted. **Decision date:** 2026-11-13.

During the active alpha release phase, publish the ten coordinated public libraries under `alpha`, then point their `latest` tags at that same numbered release. Ordinary installs should receive the current alpha while alpha is the maintained release line. Versions remain explicitly prerelease versions; this does not establish a stable release. Beta and RC retain their explicit tags until their default-install policy is separately decided. Stable activation remains a separate decision.

Keeping `latest` on the first alpha sends default installs to an obsolete version without making those installs stable. Mirroring alpha makes the default useful now; consumers wanting reproducibility should still pin matching exact versions. Tag updates must follow successful publication, fail visibly, and be retried even when the versions are already published. Dist-tags are independent per package, so a partial failure can temporarily leave them out of sync.

Use npm's trusted-publisher dist-tag permission and a supported npm CLI, preserving OIDC authentication and provenance without adding an npm write-token secret. Each public package must enable **Allow npm dist-tag** for the existing workflow identity before rollout. Local release probes verify coordination and retries; live tag writes remain a separate registry operation.

This refines [ADR0007](0007-public-coordinated-releases.md) and supersedes the stable-only `latest` rule in the [identity design](../plans/2026-11-04-ts-restless-identity-design.md). See the [implementation plan](../plans/2026-11-13-alpha-latest.md), [release checklist](../prerelease-checklist.md), and [npm trusted-publisher requirements](https://docs.npmjs.com/trusted-publishers/#managing-dist-tags-with-trusted-publishing).
