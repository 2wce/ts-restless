# Async base headers implementation plan

> **For agentic workers:** Use the executing-plans skill for these scoped steps. The roadmap owns current delivery status.

**Recorded:** 2026-11-10. **Initial baseline:** F04 `c0d19211`. **Integration baseline:** main `45271c21`, containing merged F04 [#29](https://github.com/2wce/ts-restless/pull/29) and serverless [#30](https://github.com/2wce/ts-restless/pull/30). **Goal:** resolve request-scoped asynchronous authentication headers without replacing the transport.

**Architecture:** `fetchApi` resolves header callbacks per request before existing normalization, request overrides and transport dispatch. `Promise.all` starts independent callbacks concurrently and preserves entry order. Plain clients and query integrations share this path; core remains framework-independent.

**Tech stack:** TypeScript, Vite+/Vitest, Standard Schema and strict installed ESM/CommonJS consumers. **Spec:** upstream [#832](https://github.com/ts-rest/ts-rest/issues/832), [client ownership](../adr/0003-query-ownership.md), and the accepted request-scoped design below.

## Constraints

- Keep Node 26.12.0 and pnpm 12.14.0. Keep static strings and synchronous callbacks; callback results become `string | undefined | Promise<string | undefined>`.
- Resolve every request independently. Do not cache callback results, mutate shared header maps, accept static Promise values or introduce a public helper.
- Keep `FetchApiOptions` callback context, lowercase normalization, case-insensitive explicit overrides and deletion through `undefined`.
- Preserve exact thrown/rejected errors and prevent transport dispatch on header-resolution failure.
- Preserve native/request signal precedence, request serialization, response envelopes and F04 exactly-once validation. Do not add async schema validation or framework dependencies.
- SSR auth must be incoming-request scoped. Arbitrary async token work is not automatically canceled by the request signal. Development changes require a containing release before installation guidance.

## Task 1: request resolution and regressions

**Files:** `libs/ts-rest/core/src/lib/client.ts`, `client.spec.ts` and `infer-types.spec.ts` nearby.

- [x] Add failing client tests showing promises reach transport instead of resolved strings; cover default/custom/delegated/query clients and optional header deletion.
- [x] Prove concurrent callbacks start before either finishes, concurrent requests resolve out of order without credential leakage, and failed resolution preserves error identity with zero transport calls.
- [x] Assert callback context and native query signal, explicit mixed-case overrides, static/sync compatibility and exactly one non-idempotent response transform.
- [x] Run `pnpm exec vp test run --project core`; record expected failures before production changes.
- [x] Extend only the callback return type. Resolve entries with `await Promise.all(Object.entries(...).map(async ([name, value]) => [name, typeof value === 'function' ? await value(options) : value]))` before `Object.fromEntries` and existing normalization.
- [x] Add strict inference assertions for required header omission with async providers and rejection of static Promise values.
- [x] Run focused core tests and `pnpm --filter @ts-restless/core typecheck`.

## Task 2: consumers and auth guidance

**Files:** `tests/packaging/validator-independence.test.mjs`, the Dynamic Headers section of `apps/docs/content/docs/client/fetch.mdx`, a minor core Changeset.

- [x] Extend existing ESM/CommonJS strict consumers to accept async required-header providers and reject static promises.
- [x] Extend installed runtime journeys with real HTTP async headers, custom/query dispatch, override/removal, exactly-once validation and failed auth before dispatch. Preserve F04 cases.
- [x] Replace the Dynamic Headers example with self-contained Twoslash showing `Promise<string | undefined>` token retrieval, then explain request-scoped SSR cookies/auth, callback context, resolution/error behavior and availability.
- [x] Record a minor core Changeset without versioning packages.
- [x] Parent runs `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, full docs tests and independent review before committing and creating a draft PR. No merge or publication.

## Verification record

Before implementation, focused core tests showed 8 expected failures: unresolved promises reached transport, asynchronous `undefined` survived header deletion, transport ran before callbacks finished, concurrent request results contained promises, and rejected auth still dispatched. The synchronous failure identity regression already passed.

After implementation, `pnpm exec vp test run --project core` passed 314 tests with 1 existing todo across 15 passing files (1 skipped). `pnpm --filter @ts-restless/core typecheck` passed strict inference, including optional caller headers and static Promise rejection. Formatting and `git diff --check` passed.

Logs: `/private/tmp/ts-restless-async-headers-red.log`, `ts-restless-async-headers-final-core.log`, `ts-restless-async-headers-final-types.log`. These focused results do not alone establish installed-consumer, documentation, CI or publication outcomes; parent verification follows below.

Parent broad verification on the F04-based branch: `pnpm check` passed 767 tests with 2 existing todos and all 14 tasks, `pnpm test:packages` passed 33 installed-consumer tests, and the full docs gate passed 80 checks plus build, prerender and typecheck. A strict test assertion was corrected to index-signature bracket access. Twenty React/Vue tests now wait for the expected transport-call count before retaining their exact dispatch assertions; the compact adapter update passed all 46 adapter tests. Independent implementation review approved. Latest-main integration verification and draft delivery follow below.

Final integration verification on main `45271c21` (both F04 and serverless corrections merged):

- `pnpm check`: exit 0; **782 source tests passed**, 2 existing todos, 56 passing files / 2 skipped; all **14 tasks** passed including strict workspace inference/type checks.
- `pnpm test:packages`: exit 0; **33 installed-consumer tests passed** in 4 files.
- `pnpm --filter @ts-restless/docs test`: exit 0; **80 tests passed**, build/prerender, compiler-checked snippets, typecheck and documentation lint passed.
- Independent initial review and adapter continuation review approved with no findings; continuation independently passed all 46 React/Vue tests.

Logs: `/private/tmp/ts-restless-async-integrated-{check,packages,docs}.log`. Review: `/private/tmp/ts-restless-async-review.md`. The reviewed async commit was rebased locally before its first push; no remote history was rewritten. No merge, versioning or publication was performed for async headers. The roadmap owns its draft delivery status.
