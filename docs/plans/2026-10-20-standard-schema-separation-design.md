# Standard Schema separation design

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

Issue: https://github.com/2wce/ts-rest/issues/2

## Agreed boundary

The user approved a major-release boundary on 2026-10-20: keep familiar general API names and make default core/adapter entry points validator independent. Legacy Zod helpers move to an explicit compatibility entry point. This is not a promise to preserve all v3 imports, error classes, or automatic pre-Standard-Schema validation.

Default contracts accept StandardSchemaV1, plain contract types, null and no-body markers. Input/output inference follows the Standard Schema types. Default declarations and reachable runtime modules must not import or bundle Zod. Existing synchronous validation, pass-through options, transforms, request locations and response status handling remain supported. Async schema validation remains explicitly unsupported, as today.

## Core and compatibility

Keep initContract, initClient, validation helpers, StandardSchemaV1 and StandardSchemaError in the default entry point. Remove automatic detection/polyfilling of safeParse-only schemas and vendor-based error branching. Unsupported supplied schemas must fail clearly rather than disable validation. General errors expose structural Standard Schema issues.

Add @ts-rest/core/zod3. It owns the existing Zod guards, merge helper, error serialization and deprecated request/error schema constants. Move the deprecated Zod response error class and Zod inference aliases there. Add toStandardSchema<T extends z.ZodTypeAny>(schema: T): T & StandardSchemaV1<z.input<T>, z.output<T>>. It uses the supplied schema's safeParse, preserves original issue details, retains the schema's prototype/introspection for existing Zod 3 OpenAPI tooling, and does not mutate the supplied schema. It does not register global hooks or change default error constructors.

The core manifest declares an optional Zod peer; default consumers need no Zod installed. The package-wide peer permits modern Zod 4 consumers, while the zod3 entry point is documented and tested only with Zod 3. Legacy runtime helpers must remain external to the default bundle, including shared chunks.

Default validation failures use StandardSchemaError (name ValidationError) even when a legacy schema is bridged. HTTP response locations and validator-provided issue fields remain intact; validator-specific error identity and JSON names intentionally change. Legacy serialization/schema helpers continue to describe historical ZodError payloads; they are not the new default response schemas.

## Headers

Replace Zod-class branches with structural Standard Schema branches wherever needed to remove Zod from public types. Keep record-of-field-schema headers and existing plain contract headers. Whole-object Standard Schemas retain input/output inference. Combining opaque schemas validates both and merges their successful outputs; it cannot reproduce Zod object merge's override semantics. Consumers needing the historical override use zodMerge from the compatibility path before bridging, or move to field records. Do not fix unrelated header optionality/casing issues or expand header behavior under issue #3.

## Adapters and OpenAPI boundary

Express, Fastify, Nest, Next and serverless defaults reference StandardSchemaError, not ZodError. Nest/Next/serverless use their existing modern request/response error classes without validator-vendor branching. Familiar RequestValidationError aliases may point to their modern classes; deprecated Zod-specific classes/constants move to package-local zod3 entry points where they are part of the existing public surface. These compatibility classes do not become the automatic default again.

OpenAPI stays Zod-specific where it already is. Update its imports of moved Zod guards to @ts-rest/core/zod3. Preserve existing transformer behavior; do not implement issue #4 here. Keeping the bridge's schema shape/prototype supports legacy transformer introspection.

## Tests and development dependencies

Start with failing core boundary regressions and packed reachable-module checks. Add inference tests for minimal Standard Schema, Valibot and stable Zod 4. Test the bridge with pre-Standard-Schema Zod 3, including transforms, failure issues and original-schema immutability. Test modern request/response error identity and document intentional serialized-name changes. Retain meaningful historical helper coverage under the explicit compatibility path.

Use a modern Zod 3 version for ordinary workspace examples/tests, with a dedicated legacy alias for old-Zod bridge tests. Use actual stable Zod 4 rather than zod/v4 from a Zod 3 distribution. These are development baselines, not a new runtime validator dependency.

Strict packed consumers must install real artifacts and external peers, never root symlinks. Add clean no-Zod Standard Schema/Valibot consumers and stable Zod 4 consumers; exercise ESM and CommonJS imports and declarations with skipLibCheck disabled. Account for framework-owned dependency/type requirements independently of Zod.

The full compatibility matrix stays CI-only. Update Zod 3 and older Express fixtures to bridge explicitly; keep their original runtime validator/framework baselines. Preserve scenario coverage and adapt assertions only for the agreed major-release error boundary. Unit, type, build and package checks may run locally.

## Release and delivery

Add a coordinated major Changeset for affected public packages, without executing versioning or publishing. Update the packaging baseline only for intentional public-subpath/optional-peer changes. Keep both release workflow guards disabled. Document import moves, legacy bridging, error-class/name changes and header merge migration in contributor/user docs. Deliver through the issue #2 branch, with review and actual CI evidence.
