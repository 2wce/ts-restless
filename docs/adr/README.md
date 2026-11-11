# Architecture decision records

ADRs preserve consequential choices and their rationale. Use short Markdown records; implementation steps and test logs belong in [plans](../plans/README.md) and [evidence](../evidence/README.md). [The roadmap](../roadmap.md) owns current implementation/release status.

| ADR                                         | Decision                                                                         |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| [0001](0001-standard-schema.md)             | Superseded by 0014: Standard Schema defaults and explicit old-Zod compatibility. |
| [0002](0002-response-ownership.md)          | Shared response evaluation with caller/native ownership.                         |
| [0003](0003-query-ownership.md)             | Shared query execution with native cache and reactivity.                         |
| [0004](0004-support-retirement.md)          | Verified support and explicit retirement process.                                |
| [0005](0005-next-baseline.md)               | Initial stable Next15/16 baseline.                                               |
| [0006](0006-query-v5-baseline.md)           | Query5 only with retained Vue/Solid bindings.                                    |
| [0007](0007-public-coordinated-releases.md) | Ten public libraries, coordinated releases and private examples.                 |
| [0008](0008-client-response-validation.md)  | Client execution validates decoded responses once.                               |
| [0009](0009-request-scoped-headers.md)      | Resolve request-scoped auth headers in shared client execution.                  |
| [0010](0010-fastify-support-lifecycle.md)   | Superseded by 0011: Fastify support lifecycle.                                   |
| [0011](0011-fastify-legacy-entry.md)        | Fastify5 at root; Fastify4 through `/legacy` until fork v5 eligibility.          |
| [0012](0012-modern-module-resolution.md)    | Modern conditional-export resolution; retain ESM/CommonJS consumers.             |

| [0013](0013-openapi-conversion.md) | Explicit OpenAPI conversion/dialects, whole-value presence and opt-in Zod3. |

| [0014](0014-legacy-helper-paths.md) | Canonical `/legacy` helper imports; combined Fastify native4 compatibility. |

These initial records extract already approved decisions from existing documents; they do not newly approve roadmap proposals.

## Writing an ADR

Use the next available four-digit number. Include title, decision date, status (`proposed`, `accepted`, `rejected` or `superseded by ADR-NNNN`), the decision and its rationale, and links to original evidence. Add alternatives and consequences only when they clarify a real trade-off. An accepted decision may still be unimplemented or unpublished.

When direction changes, add a new ADR and mark the old one superseded, linking both ways. Preserve the old rationale. Correct factual errors explicitly; avoid rewriting a past decision to look like the current one. Small routine fixes need no ADR.

`pnpm docs:lint` checks the four-digit filename/ID, title, decision date, allowed status, decision/rationale paragraphs and evidence links. Put status and date in the first metadata paragraph, as in the existing records; bold formatting is optional. Superseded decisions require an existing replacement and reciprocal links. The checker validates structure and link targets; acceptance and rationale require human review.
