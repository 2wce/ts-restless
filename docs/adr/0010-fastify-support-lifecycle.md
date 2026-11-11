# Prefer Fastify 5 and retain Fastify 4 as legacy support

**Status:** Accepted. **Decision:** 2026-11-11.

Support native Fastify 5 actively and retain native Fastify 4 as legacy/deprecated support throughout ts-restless v4. Plan to remove Fastify 4 in ts-restless v5, subject to the notice and stable replacement window in [ADR 0004](0004-support-retirement.md). This distinguishes the dependency's major from the fork's release major.

Keeping both native lines active indefinitely increases the compatibility burden; immediately dropping 4 would deny existing applications a verified migration. Legacy support retains compatibility checks and critical security/correctness fixes while new features target 5. Both lines use the same adapter entry and API; a `/legacy` export would add a second surface without isolating a different implementation.

The first stable v4 release will carry this notice and a verified Fastify 5 replacement with migration guidance. Removal is no earlier than six calendar months after both are publicly available, and only in a ts-restless major release. Prereleases and this source decision do not start that window; no calendar removal date is established yet. If the v5 schedule is earlier than eligibility, retain 4 or revisit the release plan explicitly.

Sources: [F03b plan and verification](../plans/2026-11-11-fastify5-compatibility.md), [support policy](../support-policy.md#fastify-baseline-and-legacy-support), [consumer migration](../../apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5).
