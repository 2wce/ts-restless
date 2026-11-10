# Client execution owns response validation

**Status:** Accepted. **Decision recorded:** 2026-11-10.

Shared client execution validates decoded fetcher results using the effective client or route policy. Fetchers own transport and decoding. The client disables validation in its delegate, including wrappers around `tsRestFetchApi`, then validates once. Standalone `tsRestFetchApi` retains validation support. Declared `c.noBody()` responses produce `undefined` independently of content type; malformed JSON for a body-bearing response remains a decoding failure.

JSON-only validation skips text and binary schemas, and fetcher-owned validation lets custom transports bypass the contract. Applying validation in both delegate and caller runs non-idempotent transforms twice. One owner across plain clients and query execution closes those gaps without response branding or a new transport API. Custom fetchers must honor the ownership contract and stop manually applying contract transforms.

This refines the client boundary in [ADR 0002](0002-response-ownership.md); native server behavior and [query lifecycle ownership](0003-query-ownership.md) remain with their existing integrations. Transport decoding does not enforce response media types or implement asynchronous schema validation.

Sources: [F04 acceptance criteria](../plans/release-readiness-backlog.md#f04--reliable-client-response-validation), [implementation plan](../plans/2026-11-10-client-response-validation.md), [consumer guide](../../apps/docs/content/docs/client/fetch.mdx). [The roadmap](../roadmap.md) records delivery and publication separately.
