# Response contract evaluation design

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

**Status:** Design approved on 2026-11-05. The first slice preserves behavior. Implemented through [plan 002](002-response-contract-evaluation.md) on `feat/response-contract-evaluation`; local verification is recorded in the [index](README.md).

**Recorded:** 2026-11-05. **Source baseline:** `aaae50b5`.

**Scope:** Refine A04 of the [adapter maintenance epic](2026-11-04-adapter-maintenance-epic.md). Establish a cohesive owner for response contract interpretation and prove it through Express. Keep the client-policy correction in [F04](release-readiness-backlog.md#f04--reliable-client-response-validation).

## Problem and intended result

Response declarations describe ordinary bodies, explicit media types and no-body responses. The current implementation distributes interpretation of those declarations across core server helpers, the client JSON branch and native adapters. Schema validation is already shared through `validateIfSchema`; this design reuses it.

The first slice gives response contract evaluation an explicit owner. It returns contract metadata and validation results, while callers retain enablement, error construction, status policy, decoding and native writes. A change to response declaration interpretation should have one implementation and one focused test suite.

This is an internal ownership change with one additive integration API. It does not standardize every caller's observable behavior.

## Current behavior to preserve

| Boundary                | Behavior and evidence                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core server helper      | `core/src/lib/server.ts:45` selects the declaration, unwraps `otherResponse`, validates and transforms its body, and throws core `TsRestResponseValidationError` on validation failure. `server.spec.ts:68` explicitly permits an undeclared response status. |
| Schema primitives       | `core/src/lib/standard-schema-utils.ts:254` passes through absent schemas and contract type markers. Invalid declarations and asynchronous validators throw configuration errors. Validation failures return `StandardSchemaError`.                           |
| Express                 | `express/src/lib/ts-rest-express.ts:197` bypasses ordinary validation for streams. Other responses follow the validation flag, then native no-body, explicit-media-type or JSON writing. Errors reach native error middleware.                                |
| Client                  | `core/src/lib/client.ts:142` validates in the default fetcher's JSON branch only. Text and Blob branches return directly. `fetchApi` forwards the validation flag to custom fetchers. These policies remain unchanged in this slice.                          |
| Nest handler            | `nest/src/lib/ts-rest-nest-handler.ts:440` rejects a missing resolved schema and uses its native exception class. `response-validation.spec.ts` covers this boundary. Its local implementation is migrated separately.                                        |
| Nest legacy interceptor | `nest/src/lib/ts-rest.interceptor.ts:66` already calls the core helper. Preserve its existing behavior, including differences from the Nest handler.                                                                                                          |
| Other hosts             | Fastify, Next and serverless call the core helper and retain native response writing and error mapping. They receive the refactored implementation through that compatibility facade without changing their call sites.                                       |

The file paths above are relative to `libs/ts-rest/`. These are source observations, not newly executed test results.

## Alternatives

1. **Shared evaluation with caller-owned policies — recommended.** A pure contract operation provides body metadata and a structured validation result. Existing wrappers retain their observable behavior. This creates an integration seam without imposing a universal host lifecycle.
2. **Correct client validation and consolidate ownership together.** This could remove the JSON-only gap immediately, but requires deciding custom-fetcher validation ownership and its compatibility consequences in the same change. The user deferred this scope.
3. **Extract a selector utility only.** This would share response-schema lookup while leaving metadata preparation and validation orchestration distributed. It does not establish a sufficient owner for the selected capability.

## Responsibility boundary

| Owner                        | Responsibilities                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Response contract evaluation | Interpret the status's declaration, identify no-body and explicit media type, select the body schema, and optionally validate and transform the supplied body. |
| Schema primitives            | Execute synchronous Standard Schema validation and preserve existing issue and configuration-error semantics.                                                  |
| Core compatibility facade    | Preserve the current `validateResponse` signature, response shape, guard behavior and core error class.                                                        |
| Client response processing   | Choose and invoke the fetcher, consume and decode its response, apply the existing validation enablement and preserve headers.                                 |
| Native host integration      | Preserve streams, choose when evaluation runs, construct native failures and write the native response.                                                        |

The evaluator accepts an already available body. It does not read a `Response`, parse JSON, buffer a stream, serialize a body or invoke an application handler.

## Proposed integration API

Add the response capability at `libs/ts-rest/core/src/lib/response.ts`. Its types, predicates and evaluation operation live together. Keep its focused tests in `response.spec.ts`.

```typescript
export type ResponseMetadata = {
  status: number;
  bodyKind: 'none' | 'value';
  contentType: string | undefined;
};

export type ResponseEvaluation =
  | {
      success: true;
      metadata: ResponseMetadata;
      body: unknown;
    }
  | {
      success: false;
      metadata: ResponseMetadata;
      error: StandardSchemaError;
    };

export function evaluateResponse(args: {
  appRoute: AppRoute;
  response: { status: number; body?: unknown };
  validateBody: boolean;
}): ResponseEvaluation;
```

`AppRoute` and `StandardSchemaError` are existing core types. `validateBody` is required so each caller must choose its policy explicitly. The evaluator does not set a default or infer enablement from a route or client option.

The metadata describes the contract. `bodyKind: 'none'` is selected only for `ContractNoBody`; it does not erase a supplied body. `contentType` is supplied only by an `otherResponse` declaration. Ordinary JSON writing remains the host's decision. An undeclared status retains its numeric value and produces ordinary body metadata; missing-schema policy remains caller-owned.

When validation is disabled, return the supplied body unchanged without invoking a validator. When enabled, unwrap the existing response declaration and call `validateIfSchema` once. Successful schema transforms supply the returned body. An absent schema or type marker retains existing passthrough semantics. Invalid declarations and asynchronous validation keep throwing the existing configuration error; they do not become ordinary validation failures.

Expected validation issues produce the failure variant. The evaluator creates no framework exception and does not wrap issues in a response-validation exception.

Expose only `evaluateResponse`, `ResponseMetadata` and `ResponseEvaluation` explicitly from core's existing root entry point. No new package or import subpath is proposed. This additive public integration surface needs review even though the first consumers are adapters.

## Compatibility and first adoption

`server.ts` remains a facade for its existing exports. Re-export the existing response predicates from the response capability. Keep `validateResponse` as a wrapper that preserves `isAppRouteResponse` guarding, invokes evaluation with validation enabled, returns only the existing status/body shape, and constructs the same core `TsRestResponseValidationError` on failure. Preserve constructor identity and its `appRoute` and `cause` fields.

Express keeps its stream branch before evaluation. For an ordinary result, call the evaluator with the existing response-validation flag and numeric status. On failure, throw the same core error that native middleware receives today. On success, use the returned body and metadata for its existing no-body, explicit-media-type and JSON write branches. A stream must not reach the evaluator.

Core's client imports its response-declaration predicate directly from the response capability rather than the server facade. This is an import-boundary change only. Its default fetcher, JSON-only validation, custom-fetcher invocation and error behavior remain unchanged.

Do not migrate the Nest handler's stricter missing-schema policy in this slice. A later adoption must retain its pre-validation missing-schema check and native exception fields. The legacy interceptor continues using the compatibility facade.

The missing-schema difference is a historical compatibility constraint, not a framework responsibility we intend to preserve permanently. Nest's newer handler added its guard when introduced in 2023; its legacy interceptor uses the permissive core helper. A later contract-policy decision should establish explicit shared undeclared-status semantics and migration guidance. Native exception mapping remains adapter-owned. This slice adds no status-policy option and does not reinterpret `strictStatusCodes` as a runtime validation setting.

## Files and scope

| File                                                   | Intended change                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `libs/ts-rest/core/src/lib/response.ts`                | Create the cohesive response capability and evaluation result types.                                     |
| `libs/ts-rest/core/src/lib/response.spec.ts`           | Create direct tests for interpretation, validation and transform count.                                  |
| `libs/ts-rest/core/src/lib/server.ts`                  | Retain existing exports and error policy through a compatibility facade.                                 |
| `libs/ts-rest/core/src/lib/server.spec.ts`             | Characterize additional facade edge cases alongside the existing undeclared-status test.                 |
| `libs/ts-rest/core/src/lib/client.ts`                  | Change only the response-predicate import boundary.                                                      |
| `libs/ts-rest/core/src/index.ts`                       | Add explicit exports for the integration API.                                                            |
| `libs/ts-rest/express/src/lib/ts-rest-express.ts`      | Adopt evaluation after the existing stream branch and retain native writes.                              |
| `libs/ts-rest/express/src/lib/ts-rest-express.spec.ts` | Extend native response regressions where shared conformance does not establish the preserved behavior.   |
| `tests/packaging/validator-independence.test.mjs`      | Extend the strict packed core consumer to exercise the new API without a validator-specific dependency.  |
| `.changeset/response-contract-evaluation.md`           | Record the additive core API and behavior-preserving Express adoption using the existing release policy. |

Do not change package names, versions, peer floors, exports subpaths, release groups, publication controls, workspace layout, header composition, query integrations or other native adapter implementations. Existing conformance fixtures remain shared test ownership and need no new runner.

## Verification required for implementation

The implementation plan must establish the existing focused baseline before editing source. Follow existing Vitest patterns in `server.spec.ts`, Express's conformance suite and its native stream test. Use a minimal Standard Schema with a validation counter for the shared capability; use real HTTP facilities for native behavior.

- Cover ordinary, explicit-media-type, no-body, type-only and undeclared responses with validation enabled and disabled.
- Assert metadata and transformed bodies together, including `false`, `0`, empty string, `null` and `undefined` where the declaration permits them.
- Count validator calls: zero when disabled or no validator exists, exactly one for a validated schema response.
- Distinguish schema issues from invalid declarations and asynchronous validators.
- Preserve the core facade's public error class, fields and status/body return shape. Characterize non-response values and the existing undeclared-status behavior.
- Verify Express's error middleware, streams, status, content type and body behavior using the existing real host setup. The stream counter case must establish that evaluation is bypassed even with response validation enabled.
- Exercise the new API in strict packed ESM/CommonJS consumers and keep validator-independent runtime/declaration checks.

Commands are taken from the current workspace configuration. They are execution gates, not commands run during this design:

| Gate                          | Command                                                  | Required result                                                                         |
| ----------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Focused baseline and adoption | `pnpm exec vp test run --project core --project express` | Existing and new tests pass.                                                            |
| Inference                     | `pnpm typecheck`                                         | Exit 0 with no new diagnostics.                                                         |
| Full source regressions       | `pnpm test`                                              | All existing host and client source suites pass.                                        |
| Packed consumers              | `pnpm test:packages`                                     | Public exports, strict declarations, validator independence and versioning checks pass. |
| Changed source formatting     | `pnpm exec vp fmt <changed-files> --check`               | Exit 0.                                                                                 |
| Whitespace                    | `git diff --check`                                       | Exit 0.                                                                                 |
| Isolated compatibility        | Existing CI `Compatibility Fixtures` gate                | All required fixtures pass before merge.                                                |

`pnpm test` generates the ignored example database client through its task prerequisite. Packed checks build and pack packages. Run them during authorized execution, not as part of this read-only design. Native HTTP checks may require permission to bind local listeners in a sandbox.

## Delivery and follow-ups

After this design is approved, produce one executable plan for core evaluation plus Express adoption. Keep each commit usable: characterize behavior, add the capability with its compatibility facade and packed evidence, then adopt it in Express. Use the repository's `feat/` branch prefix and conventional commit style; do not push, merge or publish without authorization.

Other host adoptions remain in A05–A08. Nest's handler policy requires its own focused compatibility review. F04 separately decides client/custom-fetcher validation ownership and extends validation beyond JSON while proving transforms run once at the intended client boundary.

The first slice is complete when evaluation and Express adoption pass their gates and existing consumers retain their behavior. It does not complete the broader adapter epic or F04.

## Approved decisions

- Add `evaluateResponse`, `ResponseMetadata` and `ResponseEvaluation` to core's root integration surface.
- Adopt through core plus Express first, with only an import change in the client and no Nest-handler migration.
- Preserve the facade and native policies for this extraction; address shared undeclared-status policy through a separate deliberate migration.
