# Fastify 5 compatibility implementation plan

**Goal:** Verify and admit standalone Fastify 5 while retaining Fastify 4.

**Architecture:** Keep native routing, hooks, context, error mapping and serialization in the Fastify adapter. Derive native reply types through a shared route-handler interface rather than version-specific positional generics. Extend existing installed-tarball probes with pinned Fastify 4/5 consumers, using strict declarations and real HTTP journeys.

**Spec:** [F03b acceptance](release-readiness-backlog.md#f03--verified-current-react-and-fastify-support), [support policy](../support-policy.md), [native ownership](../adr/0002-response-ownership.md).

## Constraints

- Retain `^4.0.0` and verify Fastify 4.28.0 and 5.12.7; a peer range is not exhaustive patch/floor coverage.
- Use Node 26.12.0, pnpm 12.14.0 and strict TS 7 NodeNext ESM/CommonJS consumers without `skipLibCheck`.
- Preserve contract inference, metadata, hook order, errors, response validation and native response writing.
- Extend existing packaging/native suites; avoid a global framework upgrade, new matrix machinery or other adapter changes.
- No merge, versioning, publication or release-guard changes. No new ADR is required for a routine compatibility expansion under the accepted support policy.

## Task 1: Verify both native majors and expand the peer promise

**Files:** `libs/ts-rest/fastify/src/lib/ts-rest-fastify.ts`, nearby specs, `tests/packaging/validator-independence.test.mjs`, `tests/packaging/package-baseline.json`, Fastify manifest/lockfile, `docs/support-inventory.md`, `apps/docs/content/docs/server/fastify.mdx`, plan index/roadmap, `.changeset/*`.

**Interfaces:** Existing public `initServer().router`, `.route`, `.registerRouter` and `.plugin` remain; hook/handler arguments expose native request/reply plus typed `request.routeOptions.config.tsRestRoute`.

- [ ] Install locked dependencies, run focused Fastify baseline tests and pack the actual public archives.
- [ ] Add isolated strict peer/declaration consumers for pinned 4.28.0 and 5.12.7, compiling `.mts` and `.cts` handlers/hooks with positive and negative metadata/native field assertions. Record the Fastify 5 peer failure and unchanged-archive native generic failure before production changes.
- [ ] Inspect Fastify 4/5 declarations and migration guidance, then derive `AppRouteImplementation`'s request/reply through the stable native route-handler signature to preserve correct generic ordering across majors. Replace removed metadata aliases in examples/tests with `request.routeOptions.config`.
- [ ] Execute ESM/CommonJS installed adapters on both majors over HTTP: transformed/raw requests, JSON query handling, native hooks/order/context, declared errors, custom validation errors, response validation exactly once, no-body/text writes and inherited native error handling. Exercise `.registerRouter` and `.plugin`.
- [ ] Only after native proof, expand the public peer to `^4.0.0 || ^5.0.0`, align package baseline/lockfile and add a minor Changeset. Record exact coverage and Fastify 5's Node 20 minimum in support/migration documentation without imposing a new library engine floor.
- [ ] Correct the Fastify guide's Express-style custom validation handler to `reply.status(...).send(...)`, update plan links/delivery status, and record test evidence here.
- [ ] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint`, docs tests and affected example build; submit the commit(s) for independent review and a draft PR.

## Verification evidence

Execution baseline: main `43b0a72d` on 2026-11-11. All evidence below concerns local source/artifacts unless explicitly identified otherwise; it does not establish npm availability.
