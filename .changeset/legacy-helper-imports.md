---
'@ts-restless/core': major
'@ts-restless/express': major
'@ts-restless/fastify': major
'@ts-restless/nest': major
'@ts-restless/next': major
'@ts-restless/serverless': major
---

Move historical Zod3 bridges, inference helpers and error/payload helpers from `/zod3` to the canonical `/legacy` entry. Update imports as a matched package set; the old paths are removed in the v4 development baseline. Helper names and runtime behavior remain unchanged. Default entries still use Standard Schema and do not load Zod.

Fastify combines its historical error schema with the existing native4 `/legacy` adapter. Importing that entry now requires Zod3, including for contracts using other validators. Its native5 default entry remains validator-independent. Importing compatibility helpers does not restore historical default handler errors or automatic adaptation of old schemas. See the Standard Schema and Fastify migration guides for exact replacements and retained support commitments.
