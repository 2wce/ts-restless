# Accept native returned headers in serverless responses

**Status:** Accepted. **Decision recorded:** 2026-11-13.

Serverless handler results accept optional Fetch `HeadersInit` beside their existing status/body envelope. Returned headers form a copied base; context headers override ordinary names case-insensitively, while cookies from both sources are appended in returned-then-context order. Existing serialization owns content types, and middleware/CORS processing retains its native position. Core inference and other adapters remain unchanged under [ADR0002](0002-response-ownership.md).

Rejecting the shape would avoid a new API but keep a migration trap for structurally accepted handlers whose headers were silently dropped. A portable contract-header declaration would widen the scope beyond the confirmed bug. The native serverless extension makes the existing shape useful while retaining context customization and limiting the compatibility promise to Fetch headers. Changing these public precedence rules later would require migration guidance.

Sources: [issue42](https://github.com/2wce/ts-restless/issues/42), [scoped implementation plan](../plans/2026-11-13-native-replies-and-response-headers.md), [consumer guide](../../apps/docs/content/docs/server/serverless/routers.md#response-headers). [The roadmap](../roadmap.md#native-response-bug-fixes) records implementation separately from publication; portable contract response-header metadata remains deferred.
