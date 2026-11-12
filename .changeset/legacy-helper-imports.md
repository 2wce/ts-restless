---
'@ts-restless/core': major
'@ts-restless/express': major
'@ts-restless/fastify': major
'@ts-restless/nest': major
'@ts-restless/next': major
'@ts-restless/serverless': major
---

Move historical Zod3 bridges, inference helpers and error/payload helpers from `/zod3` to the canonical `/legacy` entry in core, Express, Nest, Next and serverless. Update imports as a matched package set; the old paths are removed in the v4 development baseline. Helper names and runtime behavior remain unchanged there. Default entries still use Standard Schema and do not load Zod.

Fastify's native4 `/legacy` and native5 root remain validator independent. Replace `RequestValidationErrorSchema` from Fastify `/zod3` with `RequestValidationErrorSchemaWithoutMessage` from `@ts-restless/core/legacy`, optionally aliasing it to the old local name. The historical helper requires Zod3; the Fastify adapters do not. Importing compatibility helpers does not restore historical default handler errors or automatic adaptation of old schemas. See the Standard Schema and Fastify migration guides for exact replacements and retained support commitments.
