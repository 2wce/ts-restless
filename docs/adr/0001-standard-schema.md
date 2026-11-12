# Standard Schema defaults and explicit old-Zod compatibility

**Status:** Superseded by ADR-0014. **Decision recorded:** 2026-10-20.

Core contracts and default server adapters use synchronous Standard Schema validation, transforms and portable `StandardSchemaError` failures. Validator-specific helpers and old-Zod bridging are explicit `/zod3` imports. Default consumers need no runtime Zod dependency.

Automatic Zod recognition and vendor-specific errors couple every integration to one validator. The explicit bridge preserves a migration path without keeping that coupling in the default graph. Async validation is outside this decision. Whole-object header composition cannot silently reproduce Zod override semantics; consumers needing those semantics merge before bridging or use field records.

The original OpenAPI exception retained the Zod3 default until a separate converter/dialect design. That exception is superseded by [ADR0013](0013-openapi-conversion.md); the runtime decisions in this record remain accepted.

Sources: [approved separation design](../plans/2026-10-20-standard-schema-separation-design.md), [public migration](../../apps/docs/content/docs/standard-schema-migration.mdx). [Roadmap](../roadmap.md) records delivery.

[ADR0014](0014-legacy-helper-paths.md) preserves the validation decisions and consolidates the helper imports under `/legacy`; this record retains its original `/zod3` naming rationale.
