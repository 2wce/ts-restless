---
'@ts-restless/core': major
'@ts-restless/express': major
'@ts-restless/fastify': major
'@ts-restless/nest': major
'@ts-restless/next': major
'@ts-restless/open-api': major
'@ts-restless/react-query': major
'@ts-restless/serverless': major
'@ts-restless/solid-query': major
'@ts-restless/vue-query': major
---

Adopt package-export-aware TypeScript resolution for the stable v4 baseline. Consumers using `moduleResolution: "node"`/`"node10"` or `"classic"` must migrate to matching Node16/NodeNext settings for direct Node execution, or Bundler resolution for bundled applications. Remove `typesVersions` fallbacks; supported public imports resolve through conditional exports.

Both ESM and CommonJS code/declarations remain, including old-Zod compatibility. This does not impose contributor TypeScript7/Node26 on consumers or remove native framework support. See the [consumer configuration migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution) for compiler settings, package type, relative ESM extensions, tooling checks and pre-change release guidance.
