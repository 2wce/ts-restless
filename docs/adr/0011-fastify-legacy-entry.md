# Separate the Fastify 4 legacy entry from the Fastify 5 default

**Status:** Accepted. **Decision:** 2026-11-11.

Use `@ts-restless/fastify` for native Fastify 5 and `@ts-restless/fastify/legacy` for native Fastify 4. This supersedes [ADR 0010](0010-fastify-support-lifecycle.md): its lifecycle remains, but its same-entry choice did not provide the explicit legacy opt-in requested for support scheduled for removal.

Separate imports identify deprecated usage and make migration and eventual removal concrete. Both entries share internal routing, hooks, validation and serialization; a public boundary does not require duplicate implementations. Native types come from the installed Fastify declarations. Package peers remain `^4.0.0 || ^5.0.0` because npm peers apply to the package, not individual subpaths. Registration checks the native instance's version before installing hooks, routes or error handlers; a wrong entry fails with migration guidance. The independent `/zod3` schema helper remains usable with either major.

Fastify 4 remains legacy/deprecated through ts-restless v4 with compatibility checks and critical security/correctness fixes; new features target 5. Removal targets ts-restless v5, no earlier than six calendar months after both the stable public notice and verified replacement with migration guidance are available, under [ADR 0004](0004-support-retirement.md). If v5 arrives sooner, retain legacy support or revisit the release plan explicitly. Source and prereleases do not start the clock; no calendar removal date is established.

The root-import change requires migration guidance and a breaking Changeset. Applications staying on4 change adapter imports to `/legacy`; upgrading to5 changes them back to root together with the native runtime/plugins. A re-export alias without registration enforcement was rejected because deprecated support would remain silently available at root. Separate implementations were rejected because native routing behavior is shared.

Sources: [plan and verification](../plans/2026-11-11-fastify5-compatibility.md#follow-up-explicit-fastify-4-legacy-entry-approved-2026-11-11), [support policy](../support-policy.md#fastify-baseline-and-legacy-support), [consumer migration](../../apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5).

Follow-up: [ADR0014](0014-legacy-helper-paths.md) combines the historical Zod error schema into `/legacy`, replacing the independent `/zod3` helper choice while preserving the native-major split and retirement window. Importing the combined native4 entry requires Zod3.
