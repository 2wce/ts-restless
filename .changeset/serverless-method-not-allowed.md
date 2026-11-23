---
'@ts-restless/serverless': minor
---

Return `405 Method Not Allowed` with an `Allow` header when a request path
matches contract routes but none for its method. Unknown paths still return
`404`. `Allow` lists the matching routes' methods, plus `OPTIONS` when CORS
preflight is enabled; `HEAD` is not served from `GET` routes. The error passes
through custom error handlers as a `TsRestHttpError` whose new optional
`headers` property carries `Allow`. Copy those headers if your handler returns
its own response.
