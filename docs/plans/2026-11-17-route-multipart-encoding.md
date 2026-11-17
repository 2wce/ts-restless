# Route multipart encoding implementation plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Move the multipart wire policy from client/request options into each multipart route's shared contract.

**Architecture:** Add `multipart.fieldEncoding` to multipart mutation routes. Core's existing serializer consumes the route policy for every plain/query client; native server parsing and decoding remain caller-owned.

**Tech Stack:** TypeScript 7, Standard Schema, Vite+/Vitest, Node 26.12.0 and pnpm 12.14.0.

**Spec:** [ADR0021](../adr/0021-route-multipart-encoding.md), accepted after the user approved the route-level design on 2026-11-17.

## Global Constraints

- Public shape: `multipart?: { fieldEncoding: 'form' | 'legacy-json' }`, only valid with `contentType: 'multipart/form-data'` on a mutation route.
- Omitted policy defaults to `form`; explicit FormData is passed through untouched in either policy.
- `form` preserves strings, encodes numbers/booleans/null and nested objects as JSON text, omits undefined fields/items, repeats arrays and retains binary Files.
- `legacy-json` preserves historical JSON.stringify output, including quoted strings and literal undefined fields/items.
- Remove `multipartFieldEncoding` from client and per-request options. Plain and query clients consume the route declaration through existing core execution.
- Preserve native routing, middleware, field decoding, files, validation, providers, cache and reactivity. Core remains framework-independent.
- Extend nearby tests and existing packed-consumer fixtures. Keep strict installed declarations, consumer isolation and snippet diagnostics enabled.
- Retain a major core Changeset and migration guidance. Do not version, merge, publish, change peers or modify release guards.
- Existing portable-brand collision review findings are separate from this multipart change; do not claim the entire branch has no remaining issues.

## Task 1: Route-owned policy, regression coverage and consumer guidance

**Files:**

- Modify `libs/ts-rest/core/src/lib/dsl.ts`: multipart-only declaration and type restrictions.
- Modify `libs/ts-rest/core/src/lib/client.ts`: remove overridable option; read route policy in existing serializer.
- Modify nearby `client.spec.ts`, `dsl.spec.ts`, Express multipart and Vue mutation tests.
- Extend existing fixtures under `tests/packaging/fixtures` for strict ESM/CommonJS route declarations and installed serialization.
- Update `.changeset/native-multipart-fields.md`, canonical fetch/migration guides, migration checklist, architecture and roadmap references.
- Add a supersession notice to multipart sections in the dated 2026-11-16 design/implementation plans. Preserve their original rationale and recorded evidence.

**Interfaces:**

- Consumes the existing `contentType`, `createFormData`, `initClient`, `executeQueryRequest`, native adapters and explicit FormData input.
- Produces route-level `multipart.fieldEncoding`; client APIs and request overrides have no multipart encoding field.

- [x] **Step 1: Write failing runtime and type regressions in existing suites.** Replace the client-option table with route-policy cases (`undefined`, `form`, `legacy-json`) and preserve independent literal field expectations. Use nested/sibling routes with different policies in one client to catch flattening or global state. Keep caller FormData identity and Files assertions. Add type assertions for literal policy inference and expected diagnostics for unknown policy, JSON/urlencoded/GET routes with multipart configuration, and removed client/request options. Example accepted route:

  ```ts
  const upload = c.mutation({
    method: 'POST',
    path: '/upload',
    contentType: 'multipart/form-data',
    multipart: { fieldEncoding: 'legacy-json' },
    body: c.type<{ name: string }>(),
    responses: { 204: c.noBody() },
  });
  ```

- [x] **Step 2: Verify the red tests.** Run `pnpm exec vp test run --project core --project vue-query --project express` with the pinned runtime. A declared legacy route must fail against current production code because it still reads the client option. Capture that failure before production edits. Use native strict checking to demonstrate the new declaration is missing and the removed-option diagnostics are not yet enforced.

- [x] **Step 3: Implement the minimal route policy.** Keep mutation method/body declarations and add a discriminated multipart branch to `AppRouteMutation`. Other route variants should reject a multipart configuration through `multipart?: never` where necessary. Read `route.multipart?.fieldEncoding` only after narrowing its multipart content type. The encoder's default is `form`, its legacy branch compares `legacy-json`. Do not add a new dispatcher, codec callback or server decoder.

  ```ts
  body: body instanceof FormData
    ? body
    : createFormData(body, route.multipart?.fieldEncoding);
  ```

- [x] **Step 4: Verify real endpoint and query behavior.** Extend the existing multer/string-schema regression so route-default fields validate, and a legacy-declared endpoint uses caller-owned JSON decoding before validation. Convert the existing Vue mutation matrix to consume route declarations. Keep negative mismatch evidence where useful, Files and explicit FormData coverage.

- [x] **Step 5: Update consumer examples and migration guidance.** Put the declaration next to route contentType in compiler-checked snippets; delete client/request encoding examples. Explain the default, legacy output, caller FormData and server decoding responsibilities. Add a multipart row to the v4 migration checklist linking to the detailed migration section. Link current architecture/roadmap to ADR0021 and this plan; mark previous multipart plan sections superseded rather than rewriting their history. Preserve unrelated documentation and outstanding branch review findings.

- [ ] **Step 6: Validate and commit.** Run focused suites, `pnpm check`, `pnpm test:packages`, `pnpm --filter @ts-restless/docs test` and `git diff --check`. Parent/controller may run the broader gates after focused validation. Use pinned PATH `/Users/kudakwashe.mupeni/.nvm/versions/node/v26.12.0/bin:$PATH`. Commit only this task's source/tests/guides and approved ADR/plan files, with a message describing route multipart ownership. Record commands, exit codes, red/green results and remaining limitations in the task report. Do not push; controller updates the existing draft PR after review.

## Delivery record

Execution and review evidence will be recorded in a dated document under `docs/evidence`; merge, full compatibility CI and publication remain separate states.
