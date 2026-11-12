# Consolidate compatibility helpers under legacy entries

**Status:** Superseded by ADR-0015. **Decision recorded:** 2026-11-11.

Retain Standard Schema validation, transforms, portable errors and validator-independent default entry graphs from [ADR0001](0001-standard-schema.md), while replacing its `/zod3` path choice with `/legacy` across core, Express, Fastify, Nest, Next and serverless. Public helper names and behavior remain unchanged. The old import paths are removed in the unreleased v4 migration. This supersedes ADR0001's path decision; [ADR0013](0013-openapi-conversion.md) separately replaces its temporary OpenAPI exception.

One canonical compatibility path makes historical usage visible and aligns with the explicit legacy convention in [ADR0011](0011-fastify-legacy-entry.md). Fastify's existing native4 `/legacy` entry also exports its historical Zod error schema. The user explicitly chose that combined entry and accepted its Zod dependency. Importing Fastify `/legacy` therefore requires Zod3 even for contracts using another validator. Fastify's default native5 entry remains independent of Zod; use it for the no-Zod installed-consumer profiles. Native4 still validates Standard Schema contracts and keeps its existing migration lifecycle.

This is an import migration, not a change to the default adapters' error behavior or validation. Compatibility imports do not restore automatic old-Zod adaptation or old handler errors. Historical payload schemas remain Zod3-only. Keep older-compiler, real old-Zod and ESM/CommonJS compatibility checks. Bridge/helper retirement continues to require a verified equivalent and a separate notice/major-release decision; renaming paths establishes no removal date.

Sources: [implementation plan](../plans/2026-11-11-openapi.md#legacy-helper-consolidation), [Standard Schema migration](../../apps/docs/content/docs/standard-schema-migration.mdx), [Fastify migration](../../apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5), [support policy](../support-policy.md).

Follow-up on 2026-11-12: [ADR0015](0015-fastify-validator-independence.md) retains the `/legacy` convention while removing the Fastify helper re-export. Both native adapter entries remain validator independent; historical Fastify payload users import the existing equivalent from core `/legacy`.
