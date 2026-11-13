# Native replies and returned serverless headers implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement the tasks and review the complete change. Steps use checkbox syntax for tracking.

**Goal:** Resolve [#38](https://github.com/2wce/ts-restless/issues/38) and [#42](https://github.com/2wce/ts-restless/issues/42) without changing core contract metadata or other adapters' response APIs.

**Architecture:** Fastify retains ownership once its native reply is sent or hijacked. Serverless accepts optional native Fetch `HeadersInit` on handler responses and merges it at its existing response-writing boundary. Core still owns status/body evaluation only.

**Tech stack:** Node 26.12.0, pnpm 12.14.0, TypeScript, Standard Schema, Fastify 4/5, native Fetch and existing Vite+ source/packed-consumer suites.

**Spec:** The issue acceptance criteria and the design below. The user requested both fixes on a new branch and delegated the returned-header API choice; the recommendation is support with explicit native merge rules.

## Design and constraints

Baseline is fetched main `6f2cbb7b`, containing PR48. Branch: `feat/fix-native-replies-and-response-headers`. Baseline Fastify/serverless suites pass 153 tests in 11 files. Temporary source reproductions confirmed both issues on this baseline, including Fastify 4.28.0 and 5.12.7.

- After awaiting the handler and translating an existing `TsRestResponseError`, Fastify checks `reply.sent` before evaluating or writing the returned envelope. Native Fastify makes this true for both sent and hijacked replies. Preserve native errors, hooks, response-validation behavior and ordinary adapter writes.
- Serverless handler return types add `headers?: HeadersInit` through an intersection with their existing `ServerInferResponses<T>`. Keep core inference, thrown response-error envelopes and all other adapters unchanged.
- Returned headers form the base; context headers override ordinary names case-insensitively. Append context `Set-Cookie` values after returned values, preserving distinct cookies and commas in expiry dates. Reuse the existing cookie splitting utility where runtime header iteration combines values.
- Preserve current JSON/text/Blob/no-body content-type policy after merging. Caller-owned header objects must not be mutated. With no returned headers, retain the existing context header object and behavior. Response middleware and CORS continue to operate after response construction.
- This is native serverless response customization, not a portable contract response-header declaration. Record why support is preferable to rejecting the previously accepted shape; the broader portable metadata proposal remains deferred.
- Preserve Fastify root/native5 and `/legacy`/native4, no-Zod entries, strict ESM/CommonJS consumers, supported versions, release guards, raw requests and platform mappings. Add Changesets but do not version, merge or publish.
- Extend existing suites and consumer fixtures; no tests for source text or mere helper presence.

## Task 1: Respect completed Fastify replies

**Files:** `libs/ts-rest/fastify/src/lib/ts-rest-fastify.ts`, its existing `.spec.ts`, `tests/packaging/fixtures/fastify-runtime.mjs.fixture`, `apps/docs/content/docs/server/fastify.mdx`, `.changeset/respect-native-fastify-replies.md`.

**Interface:** Existing handler signatures and native reply object; no new public API.

- [x] Extend the response-evaluation suite with real native send and hijack scenarios, with validation enabled/disabled. Use a Standard Schema response validator counter, native logger stream, native response headers and HTTP injection. Assert native status/body/headers survive, the validator runs zero times, and no second-send warning appears. A hijacked handler explicitly completes `reply.raw`; no arbitrary waits.

```ts
reply.status(202).header('x-native', 'sent').send({ early: true });
return { status: 201, body: { late: true } };
// Native response: 202 / { early: true }; validationCalls === 0.
// Hijack variant: reply.hijack(); reply.raw.writeHead(...); reply.raw.end(...).
```

- [x] Run `pnpm exec vp test run --project fastify` and verify the new assertions fail for the second-write/validation behavior, not fixture errors.
- [x] Add the native ownership guard immediately before response evaluation:

```ts
if (reply.sent) {
  return reply;
}
```

- [x] Extend the existing packed Fastify runtime fixture with send/hijack validation-counter assertions. Its existing loops cover Fastify4/5, ESM/CommonJS and both registration paths; retain all original cases and no-Zod behavior.
- [x] Document the native ownership rule and add a patch Changeset for `@ts-restless/fastify`.
- [x] Format touched source/docs and rerun Fastify source tests. Record RED/GREEN logs; obtain independent task review before the cohesive commit.

## Task 2: Support returned headers at the serverless boundary

**Files:** `libs/ts-rest/serverless/src/lib/types.ts`, `router.ts`, existing Fetch and Lambda suites, `response-headers.assertions.ts`, the owning assertion config, `tests/packaging/fixtures/validator-types.ts.fixture`, `validator-runtime.mjs.fixture`, serverless router guide, ADR/index/roadmap records, `.changeset/serverless-returned-headers.md`.

**Interface:** Optional Fetch-native header input on the existing handler output:

```ts
) => Promise<ServerInferResponses<T> & { headers?: HeadersInit }>;
```

- [x] Add Fetch regressions for records, tuple arrays and `Headers`; ordinary context precedence; repeated cookies with expiry commas; caller header identity/content preservation; JSON, text, Blob and no-body responses; response validation enabled/disabled. Use actual response headers/body, not helper comparisons. Add Lambda V1/V2 regressions proving returned/context cookies reach their existing native maps separately.
- [x] Add compiler assertions for output `headers?: HeadersInit`, valid inputs and rejection of numeric header values; include the assertion file in its owning config. Run the Fetch tests and compiler before implementation and record the missing-header failures.
- [x] Extend the local handler return type and runtime result type. Merge at the existing response construction boundary:

```ts
function mergeResponseHeaders(
  returned: HeadersInit | undefined,
  context: Headers,
) {
  if (returned === undefined) return context;
  const merged = new Headers(returned);
  context.forEach((value, name) => {
    if (name === 'set-cookie') {
      for (const cookie of splitCookiesString(value))
        merged.append(name, cookie);
    } else {
      merged.set(name, value);
    }
  });
  return merged;
}
```

Create the context header object before calling the handler, then merge `result.headers` into the final response header object before existing status/body/content-type processing. Preserve the no-returned-header path and exception policies.

- [x] Extend the existing validator profile type/runtime fixtures with returned-header input and actual Fetch output assertions. They already install all affected packages and exercise strict ESM/CommonJS across profiles; do not add an unrelated installation harness.
- [x] Document support, merge precedence, additive cookies, protocol-owned content types and context customization. Add a short ADR for the scoped native API and a minor Changeset for `@ts-restless/serverless`. Link the plan/ADR and distinguish local delivery from publication.
- [x] Format, run `pnpm exec vp test run --project serverless` and `pnpm --filter @ts-restless/serverless typecheck`, record RED/GREEN and obtain independent task review before the cohesive commit.

## Task 3: Verify and finish

- [ ] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, `pnpm --filter @ts-restless/docs test` and `pnpm test:hosts`; retain exact compiler diagnostics and native version matrices.
- [ ] Review the complete diff independently for native ownership, precedence, cookies, type inference and compatibility. Fix actionable findings and repeat affected checks.
- [ ] Record actual test counts, warnings and remaining integration CI/publication limits. Keep the new branch locally for review; no merge/publication is authorized.

## Execution evidence

Evidence and review outcomes are appended as tasks complete. Baseline log: `/private/tmp/native-replies-baseline.log`.

Task 1: native send/hijack regressions failed before the guard (four expected failures, 50 passing) and passed after it (54 tests in 2 files). Independent spec and quality review approved the change; a minor wording clarification is applied before final review. Packed runtime execution remains part of Task 3. Controller logs: `/private/tmp/native-replies-fastify-full.log`, `/private/tmp/native-replies-fastify-green.log`.

Task 2: 13 expected runtime failures and missing-header compiler diagnostics turned green. Serverless source tests pass 116/9, inference assertions pass, and independent task review is approved. The integration checker caught a Lambda test union-narrowing error; a two-file correction passed focused Lambda/compiler/native checks and scoped re-review. Production behavior was unchanged by that correction. Full installed-package verification passes 38/9, including the extended Fastify and serverless fixtures.
