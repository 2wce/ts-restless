# Shared query execution and native client direction

**Status:** A11 implementation authorized on 2026-11-09 and implemented locally with source, strict packed-consumer and docs checks passing. The original 2026-11-06 documentation approval was followed by explicit implementation authorization. Native composition and support/API removals require their own scoped decision; merge and publication remain separate.

**Baseline:** merged main `a708f05935a1954799b0a8899259c25e6f611a0b`. **Scope:** A11 of the [adapter epic](../plans/2026-11-04-adapter-maintenance-epic.md), with one bounded reuse step from A14. The [evidence record](../results/2026-11-06-support-demand.md) supplies the wider direction and demand rationale. The [execution plan](../plans/2026-11-06-common-query-execution.md) implements this spec only after design approval.

## Problem and intended outcome

React Query v5 `apiFetcher`, Vue `queryFn` and three Solid execution closures separately merge cancellation signals, call `fetchApi` and reject error response envelopes. Core already owns transport, request normalization and validation dispatch. Extract the repeated query-library execution policy into a cohesive helper in the existing core client module.

Prove the boundary through existing React v5 and Vue Query 4 wrappers. Two real consumers justify the helper without inventing a new package or restructuring the wrappers. Existing plain `initClient` and wrapper APIs retain their behavior. Native-composition API design, native-major upgrades and wrapper retirements are later slices.

## Alternatives

| Approach                                                  | Trade-off                                                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared execution plus small native bindings (recommended) | Removes repeated ts-rest policy while retaining native cache, lifecycle, reactivity and inference. Requires evidence that the smaller bindings survive real upgrades.        |
| Retire Vue/Solid and document plain `initClient`          | Reduces package count but pushes envelope rejection, cancellation and native composition onto consumers. Low downloads alone do not establish acceptable migration coverage. |
| Universal query/reactivity adapter                        | Expands the owned API and moves native behavior into core; creates another compatibility layer to maintain.                                                                  |

This slice tests the first approach through existing APIs. It does not yet establish that native composition can replace every wrapper capability.

## Ownership and terminology

- **Transport:** core `fetchApi` and the selected fetcher serialize/decode, forward validation options and preserve response headers.
- **Query execution policy:** merge a supplied native signal with evaluated request options, run transport once, and reject the existing error envelope. The helper also runs mutation requests; its name denotes query-library semantics, not GET-only routing.
- **Native binding:** creates native query/mutation functions, maps request/page arguments and preserves native keys/options/contexts. React/Vue own their providers, observers, cache and reactive values.
- **Plain client:** `initClient`/`getRouteQuery` keep their existing response-envelope and unknown-status behavior. Do not route them through the rejecting helper.

## Proposed integration API

Add `executeQueryRequest` to `libs/ts-rest/core/src/lib/client.ts`. The default `src/index.ts` already re-exports that module. No new package, dependency, subpath, route-function factory or generic native option type is needed.

```typescript
export const executeQueryRequest = async <TAppRoute extends AppRoute>(
  options: Omit<FetchApiOptions, 'route'> & { route: TAppRoute },
  abortSignal?: AbortSignal,
): Promise<
  ClientInferResponses<TAppRoute, SuccessfulHttpStatusCode, 'force'>
> => {
  const result = await fetchApi({
    ...options,
    fetchOptions: {
      ...(abortSignal && { signal: abortSignal }),
      ...options.fetchOptions,
    },
  });

  if (isErrorResponse(result)) {
    throw result;
  }

  return result as ClientInferResponses<
    TAppRoute,
    SuccessfulHttpStatusCode,
    'force'
  >;
};
```

Import `SuccessfulHttpStatusCode` and `isErrorResponse` from their existing core modules. The assertion is confined to the existing raw transport-result boundary; it preserves the wrappers' current success typing. It must not become a declaration-compatibility workaround or spread into consumer assertions. TypeScript promises do not encode rejection types: retain each adapter's existing native `ErrorResponse` type and its handling of transport/validation errors.

Keep `evaluateFetchApiArgs` in the bindings. Its current input typing and each binding's request/page mapping remain untouched. Pass `{ ...evaluated, route }` to recover the exact route type for the helper; its existing broad return type is not a reason to rewrite request inference in A11.

The helper is deliberately low-level. Native option factories for ergonomic composition require A12/A14 designs. Users do not have to build `FetchApiOptions` to keep using `initClient` or existing wrappers.

## Behavior to preserve

| Case                               | Required behavior                                                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Successful envelope                | Return the same envelope object, including status, transformed body and original `Headers`. Do not unwrap `body`.                                                                        |
| Declared/undeclared error envelope | Use existing `isErrorResponse(result)` without a contract argument; reject the same object for recognized error statuses (300–599). Preserve current unknown-status behavior.            |
| Nonstandard fetcher status         | Do not strengthen the guard to reject every non-2xx number. Current wrappers pass through results outside the guard's range. No new success validation is implied by the return type.    |
| Fetch/validation exception         | Propagate the original exception unchanged. No catch/re-wrap, retry loop or native error class in core.                                                                                  |
| Native signal only                 | Forward it into `fetchOptions.signal`; `fetchApi` retains its existing deprecated signal alias behavior.                                                                                 |
| Request signal present             | Request `fetchOptions` wins over the native signal, including an explicitly present `signal: undefined`. Do not introduce signal combining or native-signal priority in this extraction. |
| Mutation                           | No synthetic native cancellation signal; preserve an explicit request signal and all custom fetcher input.                                                                               |
| Request mapping                    | Optional args, custom fetcher extra args, query/header/body normalization and overrides still use `evaluateFetchApiArgs` exactly once per request.                                       |
| Pagination                         | Native context and `pageParam` reach the existing request mapper unchanged. The helper sees only the evaluated request. A later-page declared error remains an error envelope.           |
| Validation                         | Invoke transport once; add no second validator. Preserve current JSON-only default validation and custom-fetcher ownership. F04 separately decides their correction.                     |
| React skipToken/native options     | Preserve skipToken, disabled queries, select, initial data, suspense, native keys and QueryClient operations in the bindings.                                                            |
| Vue lifecycle/input                | Preserve current mapping, reactive/native options and mutation's undefined context. New reactive-composition capabilities are outside A11.                                               |

Runtime acceptance of undeclared success statuses and the existing forced success type are inherited behavior. Fixing that mismatch, changing the HTTP error boundary, enforcing `throwOnUnknownStatus` in query wrappers or changing cancellation precedence requires another reviewed design.

## Files and delivery boundaries

| File                                                                                                 | Responsibility                                                                                               |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `libs/ts-rest/core/src/lib/client.ts`                                                                | Shared helper, beside existing client execution.                                                             |
| `libs/ts-rest/core/src/lib/client.spec.ts`                                                           | Execution identity, signals, validation dispatch, optional inputs and type assertions.                       |
| `libs/ts-rest/react-query-v5/src/v5/internal/create-hooks.ts`                                        | Replace only `apiFetcher`'s transport/rejection block.                                                       |
| `libs/ts-rest/react-query-v5/src/v5/react-query.spec.tsx`                                            | Characterize and preserve native query/mutation/infinite behavior.                                           |
| `libs/ts-rest/vue-query/src/lib/common.ts`                                                           | Replace only `queryFn`'s transport/rejection block.                                                          |
| `libs/ts-rest/vue-query/src/lib/vue-query.spec.ts`                                                   | Preserve native behavior and characterize the shared seam.                                                   |
| `tests/packaging/validator-independence.test.mjs`                                                    | Extend real core consumers and add bounded strict public `/v5`/Vue consumers.                                |
| `apps/docs/content/docs/client/react-query-v5.mdx`, `apps/docs/content/docs/client/vue-query-v4.mdx` | Explain unchanged wrapper usage and the integration boundary.                                                |
| `.changeset/common-query-execution.md`                                                               | Core additive minor; public React Query/Vue patches. Never release the private v5 implementation separately. |

No manifest/lockfile/native-major change is planned. If strict native declarations fail independently of this helper, reproduce and route the failure to the compatibility backlog; do not widen peers, add casts or enable `skipLibCheck` to pass A11.

## Acceptance and maintenance proof

1. Both bindings use one shared signal/transport/error-policy implementation. Their existing public types and native behavior remain operational.
2. Source tests prove same-object success/error/exception identity, signal precedence including explicit undefined, optional inputs, custom extra inputs and one validation/transport invocation. Existing query/mutation/infinite tests remain green, with a later-page declared-error case.
3. Native React/Vue tests prove cancellation reaches the selected fetcher, mutation inputs remain intact, request mappers retain native context and consumers preserve keys/select/skipToken where applicable.
4. Installed core ESM/CJS consumers execute the helper and check precise success inference. Separate strict installed public `/v5` and Vue consumers compile on the exact baseline peers with no `skipLibCheck`. No default graph gains Zod or TanStack imports.
5. Record before/after policy locations: React one plus Vue one become one core implementation; Solid's three remain. Report this ownership change separately from unmeasured upgrade savings.

## Later proof and support decisions

After A11, scope A12/A13 React native composition and A14 Vue-native composition, then rehearse a real query-library upgrade. A14 may need a separately approved Vue Query 5 compatibility slice. Retain Solid while deciding whether to migrate it next. The smaller API must demonstrate typed success/errors, mutations, select/initial data, optional inputs, cancellation, pagination, changing reactive inputs/keys, provider lifetime and SSR hydration where the native library supports it.

Success for that proof means a native upgrade does not require duplicating contract execution policy or copying another hierarchy of native overloads. Record the remaining binding edits and native declaration failures rather than claiming zero upkeep. If the boundary expands into a universal cache, reactive engine or native context model, stop and redesign the affected slice.

Package retirement, supported-major narrowing and recommending composition as the primary user API remain separate decisions. Apply A19 and the support policy to each chosen surface after replacement/migration evidence exists.

## Review gate and resume instructions

Review the helper's name/public placement, its preserved signal/error semantics and React+Vue extraction scope. Approval must be recorded here before executing the linked plan. Recheck current main, pinned versions, F01/F04 work and draft PR ownership at execution time. If intervening changes alter any preserved behavior, revise the spec and plan before implementation. No implementer should infer approval from the existence or merge of this documentation PR.

## 2026-11-09 implementation authorization

The user authorized F01 and A11 in parallel. The public `executeQueryRequest` name/location and preserved error/signal semantics above are the implemented A11 scope. React5 and Vue adopt this capability; native composition and broader roadmap steps remain separate. TanStack Query v4 removal and Vue/Solid migration were subsequently authorized as a separate initial-stable-baseline slice; that does not alter this extraction's baseline checks.
