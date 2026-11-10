---
'@ts-restless/core': major
---

Validate decoded client responses consistently across JSON, text, binary and custom fetchers, including declared error statuses. Shared client execution owns validation and passes `validateResponse: false` to delegate fetchers so non-idempotent transforms run once. Standalone `tsRestFetchApi` retains its validation policy.

Custom fetchers must return decoded schema inputs and remove manual contract validation. Preserve the supplied flag when forwarding to `tsRestFetchApi`. Response interceptors inside fetchers observe values before shared validation. Declared `c.noBody()` responses now return `undefined` for every content type and for custom fetchers, replacing the old empty-Blob behavior. Empty or malformed required JSON still rejects with a parse error. See the fetch-client validation and custom API migration guidance.
