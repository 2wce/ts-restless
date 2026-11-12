# Keep legacy Fastify adapters validator independent

**Status:** Accepted. **Decision recorded:** 2026-11-12.

Keep both Fastify entries validator independent: `@ts-restless/fastify` targets native5 and `@ts-restless/fastify/legacy` targets native4. Remove the historical Zod payload re-export and optional Zod peer from the Fastify package. Consumers of the former Fastify `RequestValidationErrorSchema` import `RequestValidationErrorSchemaWithoutMessage` from `@ts-restless/core/legacy`, optionally aliasing the local name. Its historical Zod3 payload behavior stays unchanged.

This supersedes [ADR0014](0014-legacy-helper-paths.md). Retain its canonical `/legacy` convention for core, Express, Nest, Next and serverless helpers and removal of the unreleased `/zod3` paths; Fastify's helper is supplied by core's existing legacy entry. Fastify's native-major split, shared routing/validation implementation and retirement window remain governed by [ADR0011](0011-fastify-legacy-entry.md). Native framework compatibility and validator compatibility are separate concerns: Standard Schema contracts work with native4 without a historical Zod helper.

The combined entry was rejected because importing the native4 adapter unnecessarily loaded Zod3 even with another contract validator. A new nested helper subpath was unnecessary because core already exports the identical schema. Replacing the historical helper with a portable schema would silently change its payload contract: current handlers emit `ValidationError`, while the retained helper describes `ZodError`. Applications define schemas for current portable errors in their chosen validator.

Sources: [follow-up plan](../plans/2026-11-11-openapi.md#2026-11-12-fastify-validator-independence-follow-up), [Fastify migration](../../apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5), [Standard Schema migration](../../apps/docs/content/docs/standard-schema-migration.mdx#older-zod-3), [support policy](../support-policy.md#fastify-baseline-and-legacy-support).
