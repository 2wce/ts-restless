---
'@ts-restless/core': major
'@ts-restless/express': major
'@ts-restless/fastify': major
'@ts-restless/nest': major
'@ts-restless/next': major
'@ts-restless/serverless': major
'@ts-restless/open-api': major
'@ts-restless/react-query': major
'@ts-restless/solid-query': major
'@ts-restless/vue-query': major
---

Make default core and adapter entry points validator independent through Standard
Schema. Remove Zod-specific public inference types and automatic old-Zod detection
from those entries, and isolate historical Zod helpers under explicit `/legacy`
compatibility entry points.

Default validation failures use StandardSchemaError with the serialized name
ValidationError, including explicitly bridged old schemas. Request error locations
and validator-provided issue fields are retained. Whole-object header schemas now
validate both inputs before merging successful outputs; merge typed Zod
objects before bridging when replacement semantics are required.

See the [Standard Schema migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/standard-schema-migration.mdx)
for exact moved imports, removed legacy detection/types, portable error handling,
replacement payload schemas and header composition. Prerelease publication follows
the gated release workflow; stable-release activation remains a separate decision.
