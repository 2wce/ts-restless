---
'@ts-restless/nest': patch
---

Send responses returned from `@TsRestHandler` routes whose handler injects
`@Res()` or `@Next()` without passthrough, instead of leaving the request
hanging. Routes that already responded through the native object are left as
sent. Multi-route handlers now also honour `@Res({ passthrough: true })`.
