---
'@ts-restless/fastify': major
---

Target native Fastify 5 from `@ts-restless/fastify` and move native Fastify 4 support to the deprecated `@ts-restless/fastify/legacy` entry. Fastify 4 applications must change their adapter value/type imports to `/legacy` when adopting this release; the root entry now rejects native4 at registration. Applications upgrading to native5 use the root entry, Node20+ and compatible native plugins. Registration APIs, contract inference, native hooks, validation and response writing are preserved. Both adapter entries remain validator independent; historical payload users import `RequestValidationErrorSchemaWithoutMessage` from `@ts-restless/core/legacy` separately.

Fastify 4 retains compatibility checks and critical fixes through ts-restless v4. Its removal targets ts-restless v5, no earlier than six calendar months after stable notice and verified replacement availability. See the [Fastify migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5) for the import/runtime/plugin migration and notice timing.
