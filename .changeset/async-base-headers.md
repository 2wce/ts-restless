---
'@ts-restless/core': minor
---

Allow base-header callbacks to return `string | undefined | Promise<string | undefined>` for asynchronous request-scoped auth and SSR cookies. Resolve callbacks per request before transport dispatch while preserving case-insensitive overrides and header removal. Callback failures reject the request with the original error without invoking transport.

Static string and synchronous callback headers remain supported. Use request-scoped clients or auth helpers for SSR; static Promise header values are unsupported. See the Fetch client's Dynamic Headers guide for examples and cancellation behavior.
