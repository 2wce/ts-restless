---
'@ts-restless/fastify': minor
---

Add verified native Fastify 5 support while retaining Fastify 4. Derive handler reply types from Fastify's native route interface so strict declarations work across both majors.

Fastify 5 is the preferred line. Fastify 4 becomes legacy/deprecated support through ts-restless v4, with removal planned for ts-restless v5 after the stable notice/replacement migration window. Existing adapter imports remain unchanged. See the [Fastify migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5) for runtime, plugin, metadata and native API upgrade steps.
