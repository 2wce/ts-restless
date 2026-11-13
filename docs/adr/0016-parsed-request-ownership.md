# Share parsed contract evaluation while preserving native ownership

**Status:** Accepted. **Decision recorded:** 2026-11-12.

Core owns synchronous evaluation of already parsed path parameters, headers, query and body, returning neutral outcomes for each location. Adapters own parsing, JSON-query normalization, validation enablement, rejection policy, native errors and raw request identity. Aggregate callers use `evaluateRequest`; legacy Nest uses `evaluateRequestPart` to retain its first-error validation order. Successful transforms are selected by their validation outcome, including falsy and undefined values.

Sharing only individual schema calls would leave aggregate orchestration duplicated. A universal server dispatcher would tie contract semantics to framework routing, middleware, lifecycle and writes. The neutral boundary consolidates semantics without erasing native policy differences. [ADR0002](0002-response-ownership.md) continues to govern response evaluation and native writes; this decision extends the same ownership principle to parsed requests rather than superseding it.

Construction also owns mutable state: serverless builders copy nested router branches using the contract to distinguish branches from route leaves, and handlers copy middleware lists before adding generated handlers. Handler functions, schemas and route options retain their existing identity. This lets a cloned router or reused implementation change independently without imposing a shared registry or changing public signatures.

Sources: [approved design](../plans/2026-11-12-untangle-codebase-design.md), [implementation and verification](../plans/2026-11-12-untangle-codebase.md), canonical [adapter maintenance epic](../plans/2026-11-04-adapter-maintenance-epic.md). [The roadmap](../roadmap.md#adapter-maintenance-epic) records A03/A05/A06/A07/A08 delivery separately from decision acceptance and publication.
