# Shared response evaluation with caller and native ownership

**Status:** Accepted. **Decision recorded:** 2026-11-05.

Core owns response-declaration interpretation and a neutral result containing metadata and validation/transformed-body outcomes. Adapters and other callers retain validation enablement, error construction, status policy, transport decoding, streams and native writes. Establish the boundary through Express, then adopt it incrementally.

A selector-only helper would leave orchestration duplicated. A universal host dispatcher would absorb native lifecycle and serialization responsibilities. Sharing evaluation consolidates contract behavior while preserving each caller's observable policies, including differences that require a separate decision to change.

This extraction does not resolve all client response-validation branches or migrate every server adapter's request/response path. Those remain separately scoped work.

Follow-up recorded 2026-11-10: [ADR 0008](0008-client-response-validation.md) refines the client boundary. Shared client execution owns validation policy and validates decoded results once; fetchers own transport and decoding. This preserves the evaluation/native-write separation above. Further server adapter adoption remains separately scoped.

Sources: [approved response design](../plans/001-response-contract-evaluation-design.md), [implementation](../plans/002-response-contract-evaluation.md). [Roadmap](../roadmap.md) records adoption.
