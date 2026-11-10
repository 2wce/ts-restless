# Support inventory and HTTP conformance implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Document the release-focused fixes and deliver A01/A02 of the adapter maintenance epic on `feat/adapter-support-conformance`.

**Architecture:** Document current compatibility promises separately from the evidence that verifies them. Reuse the existing Vitest projects and real Express/Fastify HTTP facilities for a shared test-only contract and scenario driver. Each adapter owns its setup, native context assertions and error policy; production request/response processing stays unchanged.

**Tech Stack:** TypeScript, Standard Schema, Zod, Express, Fastify, Supertest, Vitest/Vite+, Node 26.12.0, pnpm 12.14.0.

**Spec:** [A01/A02 and constraints in the adapter maintenance epic](2026-11-04-adapter-maintenance-epic.md). The user approved starting A01/A02 and adopted the support-policy baseline on 2026-11-04.

**Branch base:** `2c4f2e379e0e949c30befad180aae1c1bfa28332` (merged main). Preserve the existing support-policy and epic edits.

## Global Constraints

- Preserve the validator-independent default entry graph and explicit `/zod3` compatibility boundary.
- Preserve synchronous schema validation; asynchronous schema support is outside this epic.
- Preserve current public APIs, native context, parsing ownership, lifecycle behavior, error classes and serialized failure locations.
- Keep stable/prerelease workflow publication guards disabled. Do not version, publish or rename packages.
- Reuse existing tooling and native HTTP facilities. Shared fixtures belong under `tests/conformance/` and are test-only; add no production abstraction or second test runner.
- Keep existing peers and compatibility fixtures intact. Adopt one active verified dependency major plus a previous-major migration window with at least six calendar months' notice; do not set a retirement clock without public notice and a released verified replacement.
- Do not blanket-upgrade Vue/Solid Query v4 or claim broader runtime/packed coverage than actual evidence proves.
- Document all six prioritized fixes and their launch ordering without creating external issues.
- Commit only this scope locally; leave the new branch available for review. Push, merge and publication are separate actions.

### Task 1: Release backlog and A01 compatibility inventory

**Files:** Create `docs/release-readiness-backlog.md` and `docs/support-inventory.md`; complete `docs/support-policy.md`; update A01 and approval language in `docs/plans/2026-11-04-adapter-maintenance-epic.md`. Read manifests, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, CI workflows, `tests/packaging/`, `test-projects/` and `CONTRIBUTING.md` as evidence.

**Interfaces:** Produces documentation of the adopted baseline and exact current peer/fixture/compiler/runtime inventory. A02 consumes no runtime interface from this task. A02 execution evidence will be appended by its own task.

- [x] Record every public package's current peers, lockfile-resolved workspace versions, exact isolated fixture versions and package ownership. Include legacy `/zod3` bridge, private bundled React Query v5 relationship, compiler resolution modes and developer versus consumer runtime requirements.
- [x] Separate advertised support, workspace source coverage, strict packed declarations and native-host checks. Record gaps for promised lines without evidence. State existing floors unchanged and no dated retirements currently announced; identify verified active and retained lines without silently retiring older advertised majors. The policy adoption is approved, but no new dependency floor is approved by this task.
- [x] Document ownership/triage steps: reproduce with exact package/peer/runtime/compiler, find the first failing native/contract/declaration boundary, keep upstream-native errors distinct, require packed types and applicable native behavior before advertising a new line.
- [x] Document six release fixes, evidence, acceptance gates and dependencies: current TanStack Query v5 infinite generics (#815/#825, fork #5); Express raw request input typing (#716/#698, unmerged PR #876, including raw headers); React 19 and Fastify 5 compatibility (#769, PR #845 and #849/#850/#702); response validation beyond JSON and custom-fetcher policy (#789/#858); validator-independent modern OpenAPI (#813/#839, fork #4); fork identity/migration/release guard readiness (fork #6).
- [x] Sequence A01/A02, then Query v5/Express raw typing/React19, then response validation/OpenAPI/release identity; Fastify5 is a launch-support decision. Record later native query composition, async base headers, verified Hono journey, returned response headers and compiler benchmarks; defer SSE/serialization/executable middleware and flag unverified reports needing reproduction. Link upstream evidence as `https://github.com/ts-rest/ts-rest/issues/<id>` or `/pull/<id>` and fork issues as `https://github.com/2wce/ts-rest/issues/<id>`.
- [x] Validate every inventory row against its repository source, run changed Markdown format checks and `git diff --check`, update A01 status only to the level actually delivered, then commit only these docs with `docs: record launch fixes and adapter support baseline`.

### Task 2: Shared Express/Fastify HTTP conformance and evidence

**Files:** Create `tests/conformance/http.ts` and optional focused adjacent fixture file; create `libs/ts-rest/express/src/lib/conformance.spec.ts` and `libs/ts-rest/fastify/src/lib/conformance.spec.ts`; update `docs/plans/2026-11-04-adapter-maintenance-epic.md` A02 status/execution record. Existing native middleware/hook/stream suites remain. Adjust spec tsconfig inclusion only if checks demonstrate it is necessary.

**Interfaces:** The shared module owns the contract, common handlers/assertions and a narrowly scoped HTTP test interface. The adapter modules provide native app setup and teardown, validated-input/raw-context observations and native error assertions. Use explicit fixture values so both hosts run identical requests and contract assertions. Suggested shape:

```ts
type HttpResult = {
  status: number;
  body: unknown;
  text: string;
  headers: Record<string, string>;
};
type HttpInput = {
  method: 'GET' | 'POST';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};
type HttpHost = {
  request(input: HttpInput): Promise<HttpResult>;
  close(): Promise<void>;
};
```

Adapt this interface to native Supertest's actual types if necessary; avoid `any` and casts that defeat the contract types.

- [x] Establish the existing Express/Fastify baseline with `pnpm exec vp test run --project express --project fastify` using the pinned Node PATH. Local HTTP listeners require escalated execution if the sandbox denies them.
- [x] Define a real contract request with string path id transformed to number, string query count transformed to number, omitted query default, an optional query value, JSON body transformation and passthrough keys, and mixed-case header declaration normalized to lowercase with a numeric transformation. Use a POST route such as `/conformance/items/:id`; assert handler receives numeric id/count/header, transformed body, optional absence and preserved passthrough values. Observe the untouched native request and reply/response in each host module.
- [x] Add common cases for valid transformed requests, optional values supplied, invalid params/query/headers/body rejecting before handler invocation, declared non-success response, response-validation failure, response transformation when enabled, no-body response and text response/content type. Define expected request errors by location; Express/Fastify native modules assert their actual distinct default formats and error mapping rather than forcing agreement.
- [x] Run the shared scenarios through both real adapters, using Express JSON middleware and endpoint registration, Fastify router registration/ready/close and Supertest of the native HTTP server. Use real validators and handlers; avoid mocking the contract operations. Keep fixture/driver responsibilities small and explicit.
- [x] Demonstrate sensitivity: intentionally alter one shared expected transformed numeric value, run focused conformance files and capture both failing assertions; restore exactly that mutation and rerun the focused suites green. This is test-only characterization work, so preserve current production behavior instead of inventing a runtime fix to make a new test fail.
- [x] Run `pnpm typecheck`, changed-file format checks and `git diff --check`. Run the complete source suite once (`pnpm test`) before committing. Record commands, outputs and any existing warnings separately. Do not rerun packing/host matrices for test-only changes unless a changed declaration/config requires them.
- [x] Update the A02 checklist and execution record with exact results, baseline versions and limitations. Mark this task and its verified epic slice complete, then commit only its tests/docs with `test: share Express and Fastify HTTP conformance`.

## Final verification and review

Task reviews compare each task against this plan and the epic. A final review covers the entire branch, including the two existing documentation edits. Confirm no un-restored mutation, peer changes or production imports from `tests/conformance/` remain. Report the branch, documented fixes, delivered A01/A02 behavior, checks and remaining compatibility gaps; no release or deployed-host behavior is implied.
