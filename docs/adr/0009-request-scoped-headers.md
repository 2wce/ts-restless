# Resolve authentication headers per request in shared client execution

**Status:** Accepted. **Decision recorded:** 2026-11-10; ADR written 2026-11-11.

Core request execution resolves `baseHeaders` callbacks for every request before normalization, explicit request overrides and transport dispatch. Keep static strings and synchronous callbacks; callbacks may return `string | undefined | Promise<string | undefined>`. Resolved headers retain case-insensitive overrides and deletion through `undefined`.

SSR cookies and token refresh previously required fetcher wrappers that duplicated request preparation. Per-request callbacks support plain clients and query bindings through the same boundary. Static Promise values and cached credentials would reuse results across requests; keep auth helpers or clients scoped to the incoming SSR request instead. Core adds no auth cache, framework dependency or separate header helper.

Resolve independent callbacks concurrently while retaining entry order. A callback failure rejects with the original error before transport, even when request headers would override its value. Callbacks receive the request context and effective signal, but arbitrary asynchronous auth work is not automatically canceled. This preserves [native query ownership](0003-query-ownership.md), [exactly-once response validation](0008-client-response-validation.md) and [synchronous schema validation](0001-standard-schema.md).

Sources: [request-scoped design and verification](../plans/2026-11-10-async-base-headers.md), upstream [#832](https://github.com/ts-rest/ts-rest/issues/832), [consumer guidance](../../apps/docs/content/docs/client/fetch.mdx#dynamic-headers). [The roadmap](../roadmap.md) records implementation and release availability separately.
