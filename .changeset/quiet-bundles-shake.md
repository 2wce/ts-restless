---
'@ts-restless/core': patch
'@ts-restless/express': patch
'@ts-restless/fastify': patch
'@ts-restless/nest': patch
'@ts-restless/next': patch
'@ts-restless/serverless': patch
'@ts-restless/react-query': patch
'@ts-restless/solid-query': patch
'@ts-restless/vue-query': patch
'@ts-restless/open-api': patch
---

Declare audited public packages side-effect free so bundlers can remove unused imports. Installed-artifact bundle checks verify retained client/serverless APIs and Nest reflection metadata; compiled React modules retain their client directives. Function calls still perform their documented operations, and native framework initialization remains consumer-owned.
