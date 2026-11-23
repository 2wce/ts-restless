---
'@ts-restless/open-api': minor
---

Add a generation-only `pathPrefix` option to `generateOpenApi` and `generateOpenApiAsync`, including the `/legacy` entry. It prepends a normalized literal prefix to generated `paths` keys, after any contract `pathPrefix`, without changing runtime routes, operation IDs, tags or the routes passed to converters and operation mappers. Prefixes containing path parameters, query strings, fragments or URLs are rejected. Prefer OpenAPI `servers` for a deployment base URL; see the OpenAPI guide for choosing between the options.
