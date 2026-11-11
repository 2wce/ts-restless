# Fastify 5 compatibility implementation plan

**Goal:** Verify and admit standalone Fastify 5 while retaining Fastify 4 as legacy/deprecated support through ts-restless v4, targeting removal in ts-restless v5.

**Architecture:** Keep native routing, hooks, context, error mapping and serialization in the Fastify adapter. Derive native reply types through a shared route-handler interface rather than version-specific positional generics. Extend existing installed-tarball probes with pinned Fastify 4/5 consumers, using strict declarations and real HTTP journeys.

**Spec:** [F03b acceptance](release-readiness-backlog.md#f03--verified-current-react-and-fastify-support), [support policy](../support-policy.md), [native ownership](../adr/0002-response-ownership.md).

## Constraints

- Retain `^4.0.0` and verify Fastify 4.28.0 and 5.12.7; a peer range is not exhaustive patch/floor coverage.
- Use Node 26.12.0, pnpm 12.14.0 and strict TS 7 NodeNext ESM/CommonJS consumers without `skipLibCheck`.
- Preserve contract inference, metadata, hook order, errors, response validation and native response writing.
- Extend existing packaging/native suites; avoid a global framework upgrade, new matrix machinery or other adapter changes.
- No merge, versioning, publication or release-guard changes. The 2026-11-11 lifecycle steering is recorded in [ADR 0010](../adr/0010-fastify-support-lifecycle.md); stable notice/replacement timing follows ADR 0004.

## Task 1: Verify both native majors and expand the peer promise

**Files:** `libs/ts-rest/fastify/src/lib/ts-rest-fastify.ts`, nearby specs, `tests/packaging/validator-independence.test.mjs`, `tests/packaging/package-baseline.json`, Fastify manifest/lockfile, `docs/support-inventory.md`, `docs/support-policy.md`, `docs/adr/0010-fastify-support-lifecycle.md`, `apps/docs/content/docs/server/fastify.mdx`, public migration checklist, plan/ADR indexes, `.changeset/*`. The coordinator owns the shared roadmap refresh in F07.

**Interfaces:** Existing public `initServer().router`, `.route`, `.registerRouter` and `.plugin` remain; hook/handler arguments expose native request/reply plus typed `request.routeOptions.config.tsRestRoute`.

- [x] Install locked dependencies, run focused Fastify baseline tests and pack the actual public archives.
- [x] Add isolated strict peer/declaration consumers for pinned 4.28.0 and 5.12.7, compiling `.mts` and `.cts` handlers/hooks with positive and negative metadata/native field assertions. Record the Fastify 5 peer failure and unchanged-archive native generic failure before production changes.
- [x] Inspect Fastify 4/5 declarations and migration guidance, then derive `AppRouteImplementation`'s request/reply through the stable native route-handler signature to preserve correct generic ordering across majors. Replace removed metadata aliases in examples/tests with `request.routeOptions.config`.
- [x] Execute ESM/CommonJS installed adapters on both majors over HTTP: transformed/raw requests, JSON query handling, native hooks/order/context, declared errors, custom validation errors, response validation exactly once, no-body/text writes and inherited native error handling. Exercise `.registerRouter` and `.plugin`.
- [x] Only after native proof, expand the public peer to `^4.0.0 || ^5.0.0`, align package baseline/lockfile and add a minor Changeset. Record exact coverage and Fastify 5's Node 20 minimum in support/migration documentation without imposing a new library engine floor.
- [x] Correct the Fastify guide's Express-style custom validation handler to `reply.status(...).send(...)`, update plan links/delivery status, and record test evidence here.
- [x] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, docs tests and affected example build; submit the commit(s) for independent review and a draft PR.

## Verification evidence

Execution baseline: main `43b0a72d` on 2026-11-11. All evidence below concerns local source/artifacts unless explicitly identified otherwise; it does not establish npm availability.

The initial pinned Fastify5 consumer rejected the Fastify4-only peer under strict admission. Temporarily relaxed peer admission on the unchanged archive then exposed TS2559 in the emitted `FastifyReply<RawServerDefault, ...>` and incorrect `reply.raw` inference: native5 moved `RouteGeneric` to the first generic slot. The fix derives both arguments from native `RouteHandlerMethod`; it passed native4/5 strict declarations and runtime journeys before expanding the peer. Final fixtures restore strict peer admission. These are intentional red/green steps, not a committed bypass.

The installed consumers compile `.mts` and `.cts` handlers and application/route hooks with TypeScript 7.0.2, strict library checking, exact positive/negative input and metadata assertions, Fastify 4.28.0/5.12.7 and Valibot1.5.0. Both ESM/CommonJS adapter entries execute both registration modes over real HTTP. Input coverage matches A02's transforms, normalized headers, optional/defaulted fields, extra keys and individual/combined invalid locations; native parsed fields remain untouched. Response transforms run once; declared/thrown errors, native validation error identity, inherited native error handling, custom validation handlers, decorator context/route metadata, hook order, JSON/no-body/text writes and response headers are exercised.

The new native5 warning about same-scope error-handler replacement led to registering the `registerRouter` journey in a native child scope, matching the already encapsulated plugin journey. Guidance explains parent-handler inheritance and registration order. Native reply declarations do not retain route-specific config on `reply.request`, so strict metadata inference uses the supplied request argument and tests separately prove reply/request identity. No runtime dispatch change was needed; the production change is native type derivation and peer admission.

`pnpm test:packages` passed 35 tests across four files, including both new strict native consumers and existing release/consumer probes. `pnpm check` passed formatting/lint/type checks, 782 source tests (two existing todos) and inference/production compiler tasks; zero lint errors and 359 warnings remain. The Fastify example builds. The final docs build/typecheck and 80 documentation checks passed, including the route-metadata/error-scope migration wording. `git diff --check` passed. The lockfile changes only the Fastify adapter peer specifier; workspace Fastify remains4.28.0 and release controls/package versions remain intact.

[ADR0010](../adr/0010-fastify-support-lifecycle.md) records the user's decision to make Fastify4 legacy/deprecated through fork v4 and target removal in fork v5, subject to the stable notice/replacement window. Runtime Node20+ is Fastify5's requirement, not a newly imposed global library floor. These local Node26 checks do not certify all allowed patches, the untested4.0.0/5.0.0 floors, other Node lines, deployed hosts or the CI-only compatibility fixture matrix. Alpha.5 remains Fastify4-only; this addition needs a containing release. The stable retirement clock has not started.
