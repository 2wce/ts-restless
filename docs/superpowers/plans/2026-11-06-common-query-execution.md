# Common query execution implementation plan

> **For agentic workers:** After the design approval below is recorded, use `executing-plans` to implement one task at a time with review checkpoints. Track steps with checkboxes. Do not implement the wider client/support roadmap from this plan.

**Status:** Implemented locally on 2026-11-09 by explicit user authorization ("lets do f01 and a11 in parallel"). Draft PR/CI and publication remain separate.

**Goal:** Replace React v5 and Vue's duplicated signal/transport/error policy with one core implementation while preserving existing public APIs and behavior.

**Architecture:** Add `executeQueryRequest` beside existing client functions. Bindings retain request/page mapping and native hooks/options; the helper accepts an evaluated request and an optional native signal, invokes transport once and rejects the existing error envelope.

**Tech stack:** Node `26.12.0`, pnpm `12.14.0`, TypeScript `7.0.2`, Vitest `5.0.5`, Vite+ `1.3.0`; React/React DOM `18.3.1`, React Query `5.51.11`, query-core `5.51.9`; Vue `3.5.44`, Vue Query `4.44.0`.

**Spec:** [Proposed shared-query design](../specs/2026-11-06-client-maintenance-design.md). **Baseline:** `a708f05935a1954799b0a8899259c25e6f611a0b`. Recheck current main and the lockfile before execution.

## Approval and stop conditions

- [x] Record approval in the spec of the public helper name/location, preserved error/signal semantics and React+Vue extraction scope. A merged documentation PR alone does not satisfy this gate.
- [x] Check current main, open PRs and F01/F04 ownership; adapt this plan to intervening client changes before touching source.
- [x] Establish a clean isolated branch, pinned runtime and focused baseline. Record exact installed versions, commands and results.

Stop and revise the design if it requires a new package, native types in core, changed cancellation/error/validation semantics, a native-major upgrade, peer narrowing, wrapper removal or inference fixes concealed by casts/`skipLibCheck`. If a native declaration failure already exists on the baseline, preserve its reproduction and resolve the appropriate compatibility slice before claiming this gate passes.

## Global constraints

- Preserve `initClient`, `getRouteQuery`, all wrapper signatures, keys, select/initial-data/skipToken behavior, native providers and lifecycle. Preserve Vue mutation's absent query context.
- Request `fetchOptions` takes precedence over the native signal, including explicit `signal: undefined`.
- Return/reject original envelopes; propagate original fetch/validation exceptions. Retain existing `isErrorResponse` guard behavior and success inference.
- Core must not import TanStack, React, Vue, Solid, caches or native contexts. Keep the validator-independent default graph and explicit `/zod3` boundary.
- Keep normalization in `evaluateFetchApiArgs` and decoding/validation dispatch in `fetchApi`/its fetcher. No second body read or validator invocation. F04 remains separate.
- Reuse existing suites and installed-tarball infrastructure. Do not change manifests, lockfile, supported dependency lines, fixed release groups or publication controls.

## Task 1: Characterize the existing native execution seam

**Files:** Modify `libs/ts-rest/react-query-v5/src/v5/react-query.spec.tsx` and `libs/ts-rest/vue-query/src/lib/vue-query.spec.ts`. Production files remain unchanged in this checkpoint.

**Consumes:** Existing `initTsrReactQuery`, native `QueryClient`, Vue `queryFn` and each suite's contract/mock setup. **Produces:** Tests that pass against the old wrappers and detect error/signal regressions.

- [x] Run the focused baseline:

```sh
pnpm exec vp test run --project core --project react-query-v5 --project vue-query
```

Expected: all existing focused tests pass. Record the actual count, not a copied historical count.

- [x] Append this React test to the existing suite. Merge the `ApiFetcherArgs` type import into the existing core import. It uses fresh native state and the existing imported `c`, `QueryClient`, `initTsrReactQuery` and `vi`.

```typescript
it.each(['resolved', 'rejected'] as const)(
  'A11 preserves native signal, cache key and %s error identity',
  async (mode) => {
    const contract = c.router({
      read: {
        method: 'GET',
        path: '/a11',
        responses: {
          200: c.type<{ value: string }>(),
          404: c.type<{ missing: true }>(),
        },
      },
    });
    const success = {
      status: 200,
      body: { value: 'ok' },
      headers: new Headers(),
    };
    const failure = {
      status: 404,
      body: { missing: true },
      headers: new Headers(),
    };
    const api = vi
      .fn(
        async (
          _args: ApiFetcherArgs,
        ): Promise<{
          status: number;
          body: unknown;
          headers: Headers;
        }> => success,
      )
      .mockResolvedValueOnce(success);
    if (mode === 'resolved') api.mockResolvedValueOnce(failure);
    else api.mockRejectedValueOnce(failure);
    const native = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const bound = initTsrReactQuery(contract, {
      baseUrl: 'https://a11.example',
      api,
    }).initQueryClient(native);
    try {
      expect(
        await bound.read.fetchQuery({ queryKey: ['a11', 'success'] }),
      ).toBe(success);
      expect(native.getQueryData(['a11', 'success'])).toBe(success);
      expect(api.mock.calls[0][0].fetchOptions?.signal).toBeInstanceOf(
        AbortSignal,
      );
      await expect(
        bound.read.fetchQuery({ queryKey: ['a11', 'error'] }),
      ).rejects.toBe(failure);
    } finally {
      native.clear();
    }
  },
);
```

The two modes distinguish HTTP-envelope rejection from transport rejection. Both preserve object identity; the resolved mode must detect removal of the current `throw result` policy.

- [x] Add this native cancellation case in the same React suite. Cancellation must reach the fetcher, not merely appear in its options:

```typescript
it('A11 forwards native cancellation to the active fetcher', async () => {
  const contract = c.router({
    read: {
      method: 'GET',
      path: '/a11',
      responses: { 200: c.type<{ value: string }>() },
    },
  });
  const aborted = vi.fn();
  const api = vi.fn(
    (args: ApiFetcherArgs) =>
      new Promise<{
        status: number;
        body: unknown;
        headers: Headers;
      }>((_resolve, reject) => {
        args.fetchOptions?.signal?.addEventListener(
          'abort',
          () => {
            aborted();
            reject(new DOMException('Aborted', 'AbortError'));
          },
          { once: true },
        );
      }),
  );
  const native = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const bound = initTsrReactQuery(contract, {
    baseUrl: 'https://a11.example',
    api,
  }).initQueryClient(native);
  try {
    const pending = bound.read.fetchQuery({ queryKey: ['a11-cancel'] });
    const rejection = expect(pending).rejects.toBeDefined();
    await waitFor(() => expect(api).toHaveBeenCalledTimes(1));
    await native.cancelQueries({ queryKey: ['a11-cancel'] });
    await rejection;
    expect(aborted).toHaveBeenCalledTimes(1);
    expect(api.mock.calls[0][0].fetchOptions?.signal?.aborted).toBe(true);
  } finally {
    native.clear();
  }
});
```

- [x] Append this Vue test in the existing suite. Merge `ApiFetcherArgs` into the core import and add `queryFn` from `./common`. It executes the existing binding with an actual native `QueryClient` without constructing a component.

```typescript
it('A11 Vue preserves request signal and resolved HTTP error identity', async () => {
  const { QueryClient } = await import('@tanstack/vue-query');
  const route = c.router({
    read: {
      method: 'GET',
      path: '/a11',
      responses: {
        200: c.type<{ value: string }>(),
        404: c.type<{ missing: true }>(),
      },
    },
  }).read;
  const failure = {
    status: 404,
    body: { missing: true },
    headers: new Headers(),
  };
  const api = vi.fn(async (_args: ApiFetcherArgs) => failure);
  const controller = new AbortController();
  const mapper = vi.fn(() => ({
    params: {},
    body: undefined,
    query: undefined,
    headers: {},
    fetchOptions: { signal: controller.signal },
  }));
  const native = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  try {
    await expect(
      native.fetchQuery({
        queryKey: ['a11'],
        queryFn: queryFn(
          route,
          { baseUrl: 'https://a11.example', api },
          mapper,
        ),
      }),
    ).rejects.toBe(failure);
    expect(mapper.mock.calls).toHaveLength(1);
    expect(api.mock.calls[0][0].fetchOptions?.signal).toBe(controller.signal);
  } finally {
    native.clear();
  }
});
```

- [x] Extend the existing React infinite success case with a declared later-page error, using a new local route with response `404: c.type<{ missing: true }>()`, query `c.type<{ cursor: number }>()` and response `200: c.type<{ next: number }>()`. Use the existing hook/provider fixture pattern with:

```typescript
const success = { status: 200, body: { next: 1 }, headers: new Headers() };
const failure = {
  status: 404,
  body: { missing: true },
  headers: new Headers(),
};
api.mockResolvedValueOnce(success).mockResolvedValue(failure);
queryClient.setDefaultOptions({ queries: { retry: false } });
const localContract = c.router({
  pages: {
    method: 'GET',
    path: '/a11/pages',
    query: c.type<{ cursor: number }>(),
    responses: {
      200: c.type<{ next: number }>(),
      404: c.type<{ missing: true }>(),
    },
  },
});
const local = initTsrReactQuery(localContract, {
  baseUrl: 'https://api.com',
  api: api as ApiFetcher,
});
const { result } = renderHook(
  () =>
    local.pages.useInfiniteQuery({
      queryKey: ['a11-pages'],
      initialPageParam: 0,
      queryData: ({ pageParam }) => ({ query: { cursor: pageParam } }),
      getNextPageParam: (last) => last.body.next,
    }),
  { wrapper: ReactQueryProvider },
);
await waitFor(() => expect(result.current.isSuccess).toBe(true));
await act(async () => {
  await result.current.fetchNextPage();
});
await waitFor(() => expect(result.current.error).toBe(failure));
expect(api.mock.calls[1][0].rawQuery).toEqual({ cursor: 1 });
expect(result.current.data?.pages).toEqual([success]);
```

Wrap this code in an `it('A11 retains page mapping and later-page HTTP errors', async () => { ... })` case. The existing `api as ApiFetcher` boundary is already part of this suite, not a new production workaround. Retry must be disabled or a second mocked page can obscure the failure.

- [x] Run focused tests again: expected pass on old wrappers. Temporarily remove React's `throw result` and then reverse Vue's signal merge order, one mutation at a time. Run the A11 cases and confirm each mutation fails for the intended assertion; restore both files immediately. Do not commit mutations.
- [x] Record the two existing policy locations and commit only characterization tests. Review this checkpoint before production extraction.

## Task 2: Add the core capability and adopt both bindings

**Files:** Modify core `src/lib/client.ts`, `src/lib/client.spec.ts`, React v5 `src/v5/internal/create-hooks.ts`, Vue `src/lib/common.ts` (all under `libs/ts-rest/`).

**Consumes:** Spec's exact helper signature and existing `FetchApiOptions`, `evaluateFetchApiArgs`, `fetchApi`, `isErrorResponse`. **Produces:** Public `executeQueryRequest`, two real consumers and unchanged native wrapper APIs.

- [x] Merge helper/normalizer imports into the existing core client test imports and append this block. Existing `vi`, `c` and `ApiFetcherArgs` are in scope.

```typescript
describe('executeQueryRequest', () => {
  const route = c.router({
    read: {
      method: 'GET',
      path: '/a11',
      responses: {
        200: c.type<{ value: string }>(),
        404: c.type<{ missing: true }>(),
      },
    },
  }).read;
  it.each([200, 204, 299, 300, 404, 500, 599, 100, 600])(
    'preserves existing response identity and status policy for %s',
    async (status) => {
      const response = {
        status,
        body: { value: 'ok' },
        headers: new Headers(),
      };
      const api = vi.fn(async (_args: ApiFetcherArgs) => response);
      const options = {
        ...evaluateFetchApiArgs(route, { baseUrl: 'https://a11.example', api }),
        route,
      };
      const pending = executeQueryRequest(options);
      if (status >= 300 && status < 600)
        await expect(pending).rejects.toBe(response);
      else await expect(pending).resolves.toBe(response);
      expect(api).toHaveBeenCalledTimes(1);
    },
  );
  it('preserves all three signal precedence cases', async () => {
    const native = new AbortController();
    const request = new AbortController();
    const response = {
      status: 200,
      body: { value: 'ok' },
      headers: new Headers(),
    };
    for (const [fetchOptions, expected] of [
      [{}, native.signal],
      [{ signal: request.signal }, request.signal],
      [{ signal: undefined }, undefined],
    ] as const) {
      const api = vi.fn(async (_args: ApiFetcherArgs) => response);
      const options = {
        ...evaluateFetchApiArgs(route, { baseUrl: 'https://a11.example', api }),
        route,
        fetchOptions,
      };
      await executeQueryRequest(options, native.signal);
      expect(api.mock.calls[0][0].fetchOptions?.signal).toBe(expected);
    }
  });
  it('preserves exception identity and request-time override inputs', async () => {
    const failure = new Error('transport failed');
    const api = vi.fn(async (_args: ApiFetcherArgs) => {
      throw failure;
    });
    const options = {
      ...evaluateFetchApiArgs(
        route,
        {
          baseUrl: 'https://initial.example',
          api,
        },
        {
          params: {},
          body: undefined,
          query: undefined,
          headers: {},
          overrideClientOptions: {
            baseUrl: 'https://override.example',
            validateResponse: true,
          },
        },
      ),
      route,
    };
    await expect(executeQueryRequest(options)).rejects.toBe(failure);
    expect(api.mock.calls[0][0].path).toBe('https://override.example/a11');
    expect(api.mock.calls[0][0].validateResponse).toBe(true);
  });
});
```

- [x] Run the focused core cases; expected failure is a missing export/function. Implement the exact helper from the spec in `client.ts`, adding imports from `./status-codes` and `./type-guards`. `src/index.ts` already re-exports `client.ts`; do not introduce another export entry.
- [x] Add a JSON transform-count case to the same suite. Stub global fetch in a `try/finally` and restore it with `vi.unstubAllGlobals()`. The exact transform and response are:

```typescript
let calls = 0;
const schema: StandardSchemaV1<string, string> = {
  '~standard': {
    version: 1,
    vendor: 'A11',
    validate: (value) => {
      calls += 1;
      return { value: String(value) + '!' };
    },
  },
};
const route = c.router({
  read: { method: 'GET', path: '/a11', responses: { 200: schema } },
}).read;
const fetcher = vi.fn(
  async () =>
    new Response(JSON.stringify('input'), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
);
vi.stubGlobal('fetch', fetcher);
try {
  const options = {
    ...evaluateFetchApiArgs(route, {
      baseUrl: 'https://a11.example',
      validateResponse: true,
    }),
    route,
  };
  const result = await executeQueryRequest(options);
  expect(result.body).toBe('input!');
  expect(calls).toBe(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
} finally {
  vi.unstubAllGlobals();
}
```

Import `StandardSchemaV1` as a type from the existing core entry. Wrap the block in a named `it` case. Add the disabled variant with `validateResponse: false`; expected body `'input'`, calls `0`, fetch count `1`. This preserves the current fetcher boundary, not F04's future text/binary correction.

- [x] In React `apiFetcher`, retain its factory signature and existing `evaluateFetchApiArgs` input assertion. Replace everything after evaluation with:

```typescript
return executeQueryRequest({ ...fetchApiArgs, route }, abortSignal);
```

Replace imports of `fetchApi`/`isErrorResponse` with `executeQueryRequest`; remove `DataResponse` only if now unused. Do not change hook factories, `query`/`mutate` direct calls, option/type modules or QueryClient wiring.

- [x] In Vue `queryFn`, retain `argsMapper` and native-context mapping. Replace everything after evaluation with:

```typescript
return executeQueryRequest({ ...fetchApiArgs, route }, queryFnContext?.signal);
```

Replace transport/guard imports with the helper. Keep Vue's exported `DataResponse`/`ErrorResponse`, native function types and mutation wrappers unchanged.

- [x] Run the focused suites and `pnpm typecheck`; expected pass. Verify existing mutation tests retain body/custom inputs and absence of synthetic native signal; existing optional-input and inference tests remain green. A custom extra-argument path must still reach `ApiFetcherArgs` through `extraInputArgs`; retain its existing client tests.
- [x] Inspect the diff: exactly one policy implementation, two consumers, no plain-client rerouting or native import in core. Commit this independently testable capability/adoption checkpoint and review it.

## Task 3: Prove installed declarations and ESM/CommonJS behavior

**File:** Extend `tests/packaging/validator-independence.test.mjs`; reuse its `mkdtemp`, `writeFile`, `execFileSync`, archive paths and `finally` cleanup.

**Consumes:** Native core/React Query/Vue tarballs produced by `pnpm test:packages`. **Produces:** Strict consumer and runtime evidence for public exports; no workspace-source substitute.

- [x] Extend the existing four-profile core consumer's TypeScript source with these assertions, merging imports into its existing source template:

```typescript
const executionRoute = initContract().router({
  read: {
    method: 'GET',
    path: '/a11',
    responses: { 200: initContract().type<{ value: string }>() },
  },
}).read;
const execution = executeQueryRequest({
  ...evaluateFetchApiArgs(executionRoute, { baseUrl: 'https://a11.example' }),
  route: executionRoute,
});
type ExecutionBody = Expect<
  Equal<Awaited<typeof execution>['body'], { value: string }>
>;
type ExecutionStatus = Expect<Equal<Awaited<typeof execution>['status'], 200>>;
// @ts-expect-error successful body value is a string
const incorrect: Promise<{ body: { value: number } }> = execution;
```

- [x] Extend the same runtime template's existing ESM/CJS core loop: include `executeQueryRequest`/`evaluateFetchApiArgs` in destructuring and add this block inside the loop. Do not invoke hooks outside native providers.

```typescript
const queryRoute = initContract().router({
  read: {
    method: 'GET',
    path: '/a11',
    responses: { 200: initContract().type() },
  },
}).read;
const success = { status: 200, body: { value: 'ok' }, headers: new Headers() };
const options = {
  ...evaluateFetchApiArgs(queryRoute, {
    baseUrl: 'https://a11.example',
    api: async () => success,
  }),
  route: queryRoute,
};
const response = await executeQueryRequest(options);
assert.equal(response, success);
assert.equal(response.headers, success.headers);
const failure = {
  status: 404,
  body: { missing: true },
  headers: new Headers(),
};
const failureOptions = {
  ...evaluateFetchApiArgs(queryRoute, {
    baseUrl: 'https://a11.example',
    api: async () => failure,
  }),
  route: queryRoute,
};
await assert.rejects(
  executeQueryRequest(failureOptions),
  (error) => error === failure,
);
```

- [x] Add one bounded strict integration consumer test in this same suite. Dependencies are native tarballs for core/react-query/vue-query plus exact React/DOM `18.3.1`, React types `18.3.1`/`18.3.0`, React Query `5.51.11`, query-core `5.51.9`, Vue `3.5.44`, Vue Query `4.44.0` and the current Node types. No private v5 package dependency. Use the existing consumer install/config/cleanup sequence. Write both `consumer.mts` and `consumer.cts` with:

```typescript
import { initContract } from '@ts-restless/core';
import { initTsrReactQuery } from '@ts-restless/react-query/v5';
import { initQueryClient } from '@ts-restless/vue-query';
const c = initContract();
const contract = c.router({
  read: {
    method: 'GET',
    path: '/a11/:id',
    responses: { 200: c.type<{ value: string }>() },
  },
});
const react = initTsrReactQuery(contract, { baseUrl: 'https://a11.example' });
react.read.useQuery({
  queryKey: ['a11'],
  queryData: { params: { id: '1' } },
  select: (r) => r.body.value,
});
// @ts-expect-error required path param is missing
react.read.useQuery({ queryKey: ['a11'] });
const vue = initQueryClient(contract, { baseUrl: 'https://a11.example' });
vue.read.useQuery(['a11'], () => ({ params: { id: '1' } }), {
  select: (r) => r.body.value,
});
// @ts-expect-error required request mapper is missing
vue.read.useQuery(['a11']);
```

Run the existing compiler command for each extension: `--noEmit --strict --target es2022 --module nodenext --moduleResolution nodenext --esModuleInterop`, without `skipLibCheck`. Compiler exit 0 must also consume both negative assertions. Import graph checks and the no-transitive-Zod standard consumer must remain green.

- [x] Run `pnpm test:packages` and source/inference checks again; expected all applicable tests pass. Record exact resolved peer/compiler versions and separate strict versus existing relaxed generic-consumer evidence. If a baseline native declaration prevents strict compilation, preserve its failing reproduction and stop under the approval conditions; do not hide it by altering compiler strictness.
- [x] Commit the packed proof and review this checkpoint.

## Task 4: Document the outcome and run delivery gates

**Files:** Modify `apps/docs/content/docs/client/react-query-v5.mdx`, `apps/docs/content/docs/client/vue-query-v4.mdx`, `plans/README.md`, the adapter epic and this plan's execution record; add `.changeset/common-query-execution.md`.

**Produces:** Documented additive core capability, correct public release intent and measured extraction evidence.

- [x] Explain in both client docs: existing wrappers are unchanged; core shares execution/rejection policy while native libraries own keys/cache/lifecycle. `initClient` remains a portable envelope-returning client. Native composition is still a later design, so do not advertise an unimplemented replacement API.
- [x] Add this Changeset without versioning/publishing:

```markdown
---
'@ts-restless/core': minor
'@ts-restless/react-query': patch
'@ts-restless/vue-query': patch
---

Share query-library request execution between existing React v5 and Vue wrappers while preserving response envelopes, error identity and cancellation precedence.
```

- [x] Record the two removed policy implementations, remaining three Solid sites, exact commands/results, resolved versions and any limitations. Mark A11 complete only after both consumer gates pass. A14 remains partial/unstarted for native composition; this reuse does not complete it. No package retirement or upgrade savings are claimed.
- [x] Run the delivery gates:

```sh
pnpm exec vp test run --project core --project react-query-v5 --project vue-query
pnpm typecheck
pnpm check
pnpm test:packages
pnpm --filter @ts-restless/docs test
git diff --check
```

Run changed-file formatting and targeted lint using current tooling. CI must pass Build & Test, all retained compatibility fixtures and the aggregate gate before merge; local tests do not certify every advertised peer. Record source, strict archive, docs and CI results separately. Publication is outside this slice.

- [ ] Open a reviewable PR referencing A11/spec/evidence and record its delivery commit and results here. Stop if acceptance requires an unapproved behavior/support change.

## Execution record

Implementation baseline: main `30610fc413fd77688862079c0a541afebb5966b0`, isolated `feat/a11-query-execution`. The user authorized F01/A11 on 2026-11-09; the later Query5-only migration is a separate support/API slice.

- Focused old-wrapper baseline: 304 passed, one todo. Characterization on the old wrappers:42 React/Vue tests passed.
- Core helper red proof:14 missing-function failures; after helper and binding adoption focused core/React/Vue:322 passed, one todo. Added the planned later-page HTTP failure regression before the final check.
- Full `pnpm check`: passed (source suites, formatting/lint and inference assertions). Full `pnpm test:packages`:26 tests passed in four files, with strict real-tarball ESM/CJS core and React/Vue consumers. Native baseline remains React Query5.51.11/Core5.51.9 and Vue Query4.44.0; current native majors belong to the separate migration.
- Mutation proof: reversing signal precedence and disabling helper envelope rejection each fails the A11/executeQueryRequest cases; source restored immediately. The negative tests detect actual policy changes.
- Two policy copies removed (React apiFetcher, Vue queryFn); one implementation in core. Three Solid copies remain at this checkpoint. Plain initClient behavior, JSON validation dispatch and native cache/provider ownership remain unchanged. No reduction in advertised support or native-composition API is delivered by A11.
- Initial packed run exposed duplicate `failure` declarations in the generated proof; scoped the new proof and reran the suite. No compiler checking was weakened.

Docs checks and PR CI are recorded with delivery. No merge or publication performed.
