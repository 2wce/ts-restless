# Response Contract Evaluation Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give response contract interpretation one owner in core, adopt it in Express, and preserve observable behavior across existing consumers.

**Architecture:** A synchronous evaluator returns contract metadata and a structured validation result using the existing `validateIfSchema` primitive. Core's server helper retains its API and exception class as a compatibility wrapper. Express retains lifecycle placement, stream bypass, error middleware and native response writing; core's client receives only a predicate-import change.

**Tech Stack:** TypeScript, Standard Schema, pnpm 12.14.0, Node 26.12.0, Vite+, Vitest, Express and Supertest; existing Changesets and packed ESM/CommonJS consumers.

**Spec:** [Approved response contract evaluation design](001-response-contract-evaluation-design.md).

**Planned at:** `aaae50b5`, 2026-11-05. **Priority:** P1. **Effort:** M. **Risk:** Medium. **Dependencies:** approved design 001 and completed A02 HTTP conformance. A03 request evaluation is not required for this independent response slice.

**Execution:** Completed and merged on 2026-11-06 through [PR #13](https://github.com/2wce/ts-restless/pull/13), commit `d588e194`. Required local gates and all ten CI compatibility fixtures passed. See the [execution evidence](../evidence/2026-11-09-planning-index-history.md#execution-evidence-2026-11-06).

## Global constraints

- Do not change package names, versions, peer floors, exports subpaths, release groups, publication controls, workspace layout, header composition, query integrations or other native adapter implementations.
- Reuse `validateIfSchema`; no new validation engine, validator dependency or framework-name switch in core.
- Preserve core's `TsRestResponseValidationError` constructor identity, `appRoute`, `cause`, message and status/body return shape.
- Validation is explicitly enabled or disabled by the caller. Disabled validation invokes no validator. Enabled validation transforms once.
- Undeclared statuses remain permissive in core and Express. Nest's newer handler keeps its existing stricter behavior. Do not change `strictStatusCodes` semantics or add a status-policy option.
- Metadata describes the contract. A no-body declaration does not erase a supplied body in core. Express's native no-body write does omit it.
- Keep decoding, streams, serialization, headers and native response writing out of the evaluator.
- Do not push, create a PR, merge, version or publish. Execution may create the thematic local commits specified below.

## Context and current state

The flat layout is acceptable; interpretation of response declarations lacks a single owner. These are the relevant boundaries at the recorded commit:

- `libs/ts-rest/core/src/lib/server.ts:45` selects and unwraps response declarations, validates the supplied body and constructs a core exception. Its declaration predicates are also imported by the client.
- `libs/ts-rest/core/src/lib/standard-schema-utils.ts:254` already owns validation. It passes through `null`, `undefined` and symbol markers, rejects invalid declarations and asynchronous validators, and returns `StandardSchemaError` for schema issues.
- `libs/ts-rest/express/src/lib/ts-rest-express.ts:197` bypasses response validation for streams, then repeats declaration interpretation for no-body/media-type/JSON writes.
- `libs/ts-rest/core/src/lib/client.ts:19` imports `isAppRouteOtherResponse` from `./server`. Its JSON-only and custom-fetcher policies are outside this slice.
- `libs/ts-rest/nest/src/lib/ts-rest-nest-handler.ts:451` rejects a missing resolved schema before validation. The legacy interceptor calls core instead. This divergence is preserved for compatibility, not endorsed as a permanent architectural boundary.

The existing core helper contains:

```typescript
const responseType = appRoute.responses[response.status];
const responseSchema = isAppRouteOtherResponse(responseType)
  ? responseType.body
  : responseType;
const responseValidation = validateIfSchema(response.body, responseSchema);
```

The existing Express writer contains:

```typescript
if (result.body instanceof Stream) {
  result.body.pipe(res.status(result.status));
  return;
}
```

That branch must remain before evaluation, including its use of `result.status`. For ordinary responses Express already computes `Number(result.status)`.

Follow the existing named imports, two-space indentation, single quotes and colocated `*.spec.ts` suites. Vitest globals come from the existing configuration. `server.spec.ts` demonstrates the public facade; `express/src/lib/conformance.spec.ts` supplies the real HTTP host and native-error assertions; `ts-rest-express.spec.ts` supplies stream and explicit media-type regressions. Keep those existing cases.

## Scope and file ownership

| File                                                   | Responsibility in this plan                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `libs/ts-rest/core/src/lib/response.ts` (create)       | Response predicates, metadata, evaluation and result types.                   |
| `libs/ts-rest/core/src/lib/response.spec.ts` (create)  | Direct behavior and transform-count coverage.                                 |
| `libs/ts-rest/core/src/lib/server.ts`                  | Existing response guard, exports and exception policy through a wrapper.      |
| `libs/ts-rest/core/src/lib/server.spec.ts`             | Facade compatibility characterizations.                                       |
| `libs/ts-rest/core/src/lib/client.ts`                  | Change one predicate import.                                                  |
| `libs/ts-rest/core/src/index.ts`                       | Explicit additive evaluator/type exports.                                     |
| `libs/ts-rest/express/src/lib/ts-rest-express.ts`      | Evaluator adoption after stream bypass.                                       |
| `libs/ts-rest/express/src/lib/ts-rest-express.spec.ts` | Native response and counter characterizations.                                |
| `tests/packaging/validator-independence.test.mjs`      | Strict declarations and runtime use of the additive API in existing profiles. |
| `.changeset/response-contract-evaluation.md` (create)  | Core minor API addition and Express patch adoption.                           |
| `docs/plans/README.md`                                 | Execution status after verification.                                          |

All other files are out of scope, including schema primitives, error classes, shared conformance fixtures, client validation logic, Nest, Fastify, Next, serverless, package manifests and the lockfile. Existing tests in those packages run as regressions through the facade.

## Preflight and verification commands

- [x] Read the design, this plan, `CONTRIBUTING.md` and applicable repository instructions. Use the worktree skill at execution time to establish a suitable isolated checkout; preserve unrelated source changes. Branch prefix: `feat/`, suggested name `feat/response-contract-evaluation`.
- [x] Run `git status --short --untracked-files=all` and record the starting changes. The planning checkout only added the three files under `plans/`; include them in the execution checkout if they are uncommitted. Do not accidentally commit unrelated work from the current `feat/prerelease-action-bundle` branch.
- [x] Run this drift check before editing:

```bash
git diff --stat aaae50b5..HEAD -- libs/ts-rest/core/src/lib/response.ts libs/ts-rest/core/src/lib/response.spec.ts libs/ts-rest/core/src/lib/server.ts libs/ts-rest/core/src/lib/server.spec.ts libs/ts-rest/core/src/lib/client.ts libs/ts-rest/core/src/index.ts libs/ts-rest/express/src/lib/ts-rest-express.ts libs/ts-rest/express/src/lib/ts-rest-express.spec.ts tests/packaging/validator-independence.test.mjs .changeset/response-contract-evaluation.md
```

Expected: no source drift from the recorded baseline. If there is drift, compare the current-state excerpts, exports and test harnesses before proceeding. Do not overwrite changed behavior.

- [x] After installation in a fresh worktree, run `pnpm --filter @ts-restless/core build` before inference checks. The existing non-strict fixture resolves built core declarations; a missing build can incorrectly send it through source under non-strict settings. Expected: core builds successfully, without tracked changes.

- [x] Run the focused baseline: `pnpm exec vp test run --project core --project express`. Expected: all existing tests pass before source changes. A sandbox refusal to bind HTTP listeners requires normal command approval; do not replace HTTP tests with mocks.

| Purpose                         | Command                                                  | Success evidence                          |
| ------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| Focused source suites           | `pnpm exec vp test run --project core --project express` | All tests pass.                           |
| Core suite                      | `pnpm exec vp test run --project core`                   | All tests pass.                           |
| Express suite                   | `pnpm exec vp test run --project express`                | Native and shared conformance cases pass. |
| Inference                       | `pnpm typecheck`                                         | Exit 0, no diagnostics.                   |
| Full source suite               | `pnpm test`                                              | All source and example suites pass.       |
| Archives and isolated consumers | `pnpm test:packages`                                     | All packaging/versioning checks pass.     |
| Whitespace                      | `git diff --check`                                       | Exit 0.                                   |

Commands are verified against current configuration, not executed during plan authoring. The full isolated compatibility matrix is the existing CI `Compatibility Fixtures` gate and remains required before merge. `pnpm test` generates ignored Prisma example files; `pnpm test:packages` builds, packs and installs real archives in temporary consumers. Dependency/network failures require normal approval and a retry, not relaxed checks, dependency changes or `skipLibCheck`.

## Task 1: Characterize the preserved boundaries

**Files:** modify `libs/ts-rest/core/src/lib/server.spec.ts` and `libs/ts-rest/express/src/lib/ts-rest-express.spec.ts`.

**Interfaces:** consumes the existing `validateResponse`, `initContract`, `createExpressEndpoints` and `initServer` APIs. Produces passing compatibility tests before extraction; no production change.

- [x] Add `AppRoute`, `StandardSchemaV1` and `StandardSchemaError` to the existing core test imports. Append these public-facade tests:

```typescript
describe('response facade compatibility', () => {
  it.each([null, undefined, {}, { status: '200' }])(
    'returns a non-response value unchanged: %j',
    (value) => {
      const response = value as unknown as Parameters<
        typeof validateResponse
      >[0]['response'];
      expect(
        validateResponse({ appRoute: contract.plainResponse, response }),
      ).toBe(value);
    },
  );

  it('retains a supplied body for a no-body declaration', () => {
    const appRoute: AppRoute = {
      method: 'GET',
      path: '/none',
      responses: { 204: c.noBody() },
    };
    const body = { supplied: true };
    const result = validateResponse({
      appRoute,
      response: { status: 204, body },
    });
    expect(result).toStrictEqual({ status: 204, body });
    expect(result.body).toBe(body);
  });

  it('transforms a wrapped declared error once and returns only status/body', () => {
    const validate = vi.fn((value: unknown) => ({ value: `${value}!` }));
    const schema: StandardSchemaV1<unknown, string> = {
      '~standard': { version: 1, vendor: 'test', validate },
    };
    const appRoute: AppRoute = {
      method: 'GET',
      path: '/error',
      responses: {
        400: c.otherResponse({ contentType: 'text/plain', body: schema }),
      },
    };
    expect(
      validateResponse({ appRoute, response: { status: 400, body: 'bad' } }),
    ).toStrictEqual({ status: 400, body: 'bad!' });
    expect(validate).toHaveBeenCalledExactlyOnceWith('bad');
  });

  it('keeps the public error class and route/cause fields', () => {
    const issues = [{ message: 'Rejected', path: ['value'] }];
    const schema: StandardSchemaV1 = {
      '~standard': { version: 1, vendor: 'test', validate: () => ({ issues }) },
    };
    const appRoute: AppRoute = {
      method: 'GET',
      path: '/invalid',
      responses: { 200: schema },
    };
    let caught: unknown;
    try {
      validateResponse({ appRoute, response: { status: 200, body: 1 } });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(TsRestResponseValidationError);
    if (!(caught instanceof TsRestResponseValidationError)) {
      throw new Error('Expected the public response-validation error');
    }
    expect(caught.appRoute).toBe(appRoute);
    expect(caught.cause).toBeInstanceOf(StandardSchemaError);
    expect(caught.cause.issues).toEqual(issues);
    expect(caught.message).toBe(
      `[ts-rest] Response validation failed for GET /invalid: ${caught.cause.message}`,
    );
  });
});
```

Keep `server.spec.ts`'s existing undeclared-status and validator tests. These characterize existing behavior and should pass before extraction.

- [x] Add `StandardSchemaV1` to the Express test's core imports and `Readable` from `node:stream`. Append native tests using the existing `c` and `s` variables:

```typescript
describe('response evaluation compatibility', () => {
  it.each([true, false])(
    'runs a non-idempotent text transform according to validation=%s',
    async (responseValidation) => {
      const validate = vi.fn((value: unknown) => ({ value: `${value}!` }));
      const schema: StandardSchemaV1<string> = {
        '~standard': { version: 1, vendor: 'test', validate },
      };
      const contract = c.router({
        get: {
          method: 'GET',
          path: '/response-count',
          responses: {
            200: c.otherResponse({ contentType: 'text/plain', body: schema }),
          },
        },
      });
      const app = express();
      createExpressEndpoints(
        contract,
        s.router(contract, {
          get: async () => ({ status: 200, body: 'value' }),
        }),
        app,
        { responseValidation, logInitialization: false },
      );
      const response = await supertest(app).get('/response-count');
      expect(response.status).toBe(200);
      expect(response.text).toBe(responseValidation ? 'value!' : 'value');
      expect(response.headers['content-type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(validate).toHaveBeenCalledTimes(responseValidation ? 1 : 0);
    },
  );

  it('passes through an undeclared status with validation enabled', async () => {
    const validate = vi.fn(() => ({ issues: [{ message: 'Do not call' }] }));
    const schema: StandardSchemaV1<string> = {
      '~standard': { version: 1, vendor: 'test', validate },
    };
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/undeclared',
        responses: { 200: schema },
      },
    });
    const app = express();
    createExpressEndpoints(
      contract,
      s.router(contract, {
        get: async () => ({ status: 201, body: 'unknown' }),
      }),
      app,
      { responseValidation: true, logInitialization: false },
    );
    const response = await supertest(app).get('/undeclared');
    expect(response.status).toBe(201);
    expect(response.body).toBe('unknown');
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(validate).not.toHaveBeenCalled();
  });

  it('bypasses response validation for a real stream', async () => {
    const validate = vi.fn(() => ({
      issues: [{ message: 'Stream must bypass validation' }],
    }));
    const schema: StandardSchemaV1 = {
      '~standard': { version: 1, vendor: 'test', validate },
    };
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/stream-count',
        responses: { 200: schema },
      },
    });
    const app = express();
    createExpressEndpoints(
      contract,
      s.router(contract, {
        get: async ({ res }) => {
          res.setHeader('content-type', 'text/plain');
          return { status: 200, body: Readable.from(['streamed']) };
        },
      }),
      app,
      { responseValidation: true, logInitialization: false },
    );
    const response = await supertest(app).get('/stream-count');
    expect(response.status).toBe(200);
    expect(response.text).toBe('streamed');
    expect(response.headers['content-type']).toBe('text/plain');
    expect(validate).not.toHaveBeenCalled();
  });
});
```

The existing shared conformance assertions already inspect native error identity, route and cause. Do not duplicate that harness or edit shared fixtures. Retain the existing image-stream and no-content tests.

- [x] Run `pnpm exec vp test run --project core --project express`. Expected: all new characterizations and existing suites pass against unchanged production code. Investigate a baseline mismatch before refactoring.
- [x] Run `pnpm typecheck`, then `pnpm exec vp fmt libs/ts-rest/core/src/lib/server.spec.ts libs/ts-rest/express/src/lib/ts-rest-express.spec.ts --check` and `git diff --check`. Expected: exit 0. Execution may format only these changed files if needed.
- [x] Review the diff and commit only these two test files with `test: characterize response evaluation compatibility`.

## Task 2: Establish the core response capability and public evidence

**Files:** create `response.ts` and `response.spec.ts`; modify core `server.ts`, `client.ts`, `index.ts`, and `tests/packaging/validator-independence.test.mjs`.

**Interfaces:** consumes `AppRoute`, `validateIfSchema` and `StandardSchemaError`. Produces `evaluateResponse({ appRoute, response, validateBody }): ResponseEvaluation`, `ResponseMetadata`, `ResponseEvaluation`, and unchanged server-facade exports. Express in Task 3 consumes this exact root API.

- [x] Create `response.spec.ts` with the following direct tests. Importing `./response` is deliberately the first red gate; the file/API must not exist yet.

```typescript
import { AppRoute, initContract } from './dsl';
import { StandardSchemaV1 } from './standard-schema';
import { StandardSchemaError } from './validation-error';
import { evaluateResponse } from './response';

const c = initContract();
const route = (declaration: AppRoute['responses'][number]): AppRoute => ({
  method: 'GET',
  path: '/response',
  responses: { 200: declaration },
});
const makeSchema = (
  validate: StandardSchemaV1['~standard']['validate'],
): StandardSchemaV1 => ({
  '~standard': { version: 1, vendor: 'test', validate },
});

describe('response contract evaluation', () => {
  it.each([false, 0, '', null, undefined])(
    'preserves a successful schema output of %j',
    (body) => {
      const validate = vi.fn(() => ({ value: body }));
      expect(
        evaluateResponse({
          appRoute: route(makeSchema(validate)),
          response: { status: 200, body: 'input' },
          validateBody: true,
        }),
      ).toStrictEqual({
        success: true,
        metadata: { status: 200, bodyKind: 'value', contentType: undefined },
        body,
      });
      expect(validate).toHaveBeenCalledExactlyOnceWith('input');
    },
  );

  it.each([true, false])(
    'evaluates a wrapped declared error with validation=%s',
    (validateBody) => {
      const validate = vi.fn((value: unknown) => ({ value: `${value}!` }));
      const appRoute: AppRoute = {
        method: 'GET',
        path: '/error',
        responses: {
          400: c.otherResponse({
            contentType: 'text/plain',
            body: makeSchema(validate),
          }),
        },
      };
      expect(
        evaluateResponse({
          appRoute,
          response: { status: 400, body: 'bad' },
          validateBody,
        }),
      ).toStrictEqual({
        success: true,
        metadata: { status: 400, bodyKind: 'value', contentType: 'text/plain' },
        body: validateBody ? 'bad!' : 'bad',
      });
      expect(validate).toHaveBeenCalledTimes(validateBody ? 1 : 0);
    },
  );

  it.each([true, false])(
    'preserves a no-body payload and metadata with validation=%s',
    (validateBody) => {
      const body = { supplied: true };
      const appRoute: AppRoute = {
        method: 'GET',
        path: '/none',
        responses: { 204: c.noBody() },
      };
      const result = evaluateResponse({
        appRoute,
        response: { status: 204, body },
        validateBody,
      });
      expect(result).toStrictEqual({
        success: true,
        metadata: { status: 204, bodyKind: 'none', contentType: undefined },
        body,
      });
      if (result.success) expect(result.body).toBe(body);
    },
  );

  it.each([true, false])(
    'passes through type-only, null and undeclared responses with validation=%s',
    (validateBody) => {
      const appRoute: AppRoute = {
        method: 'GET',
        path: '/markers',
        responses: { 200: c.type<unknown>(), 201: null },
      };
      for (const status of [200, 201, 500]) {
        for (const body of [false, 0, '', null, undefined]) {
          expect(
            evaluateResponse({
              appRoute,
              response: { status, body },
              validateBody,
            }),
          ).toStrictEqual({
            success: true,
            metadata: { status, bodyKind: 'value', contentType: undefined },
            body,
          });
        }
      }
    },
  );

  it('does not invoke a throwing validator when disabled', () => {
    const validate = vi.fn(() => {
      throw new Error('Must not run');
    });
    const body = { original: true };
    const result = evaluateResponse({
      appRoute: route(makeSchema(validate)),
      response: { status: 200, body },
      validateBody: false,
    });
    expect(result).toStrictEqual({
      success: true,
      metadata: { status: 200, bodyKind: 'value', contentType: undefined },
      body,
    });
    if (result.success) expect(result.body).toBe(body);
    expect(validate).not.toHaveBeenCalled();
  });

  it('returns expected issues with metadata and no native exception', () => {
    const issues = [{ message: 'Rejected', path: ['value'] }];
    const validate = vi.fn(() => ({ issues }));
    const result = evaluateResponse({
      appRoute: route(
        c.otherResponse({
          contentType: 'text/plain',
          body: makeSchema(validate),
        }),
      ),
      response: { status: 200, body: 1 },
      validateBody: true,
    });
    expect(result.success).toBe(false);
    expect(result.metadata).toStrictEqual({
      status: 200,
      bodyKind: 'value',
      contentType: 'text/plain',
    });
    if (result.success) throw new Error('Expected validation failure');
    expect(result.error).toBeInstanceOf(StandardSchemaError);
    expect(result.error.issues).toEqual(issues);
    expect(validate).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('retains configuration errors and bypasses them when disabled', () => {
    const invalid = {} as AppRoute['responses'][number];
    const asynchronous = makeSchema(async (value) => ({ value }));
    for (const [declaration, message] of [
      [
        invalid,
        'Invalid schema supplied; use a Standard Schema or a contract type marker',
      ],
      [asynchronous, 'Schema validation must be synchronous'],
    ] as const) {
      expect(() =>
        evaluateResponse({
          appRoute: route(declaration),
          response: { status: 200, body: 'value' },
          validateBody: true,
        }),
      ).toThrow(message);
      expect(
        evaluateResponse({
          appRoute: route(declaration),
          response: { status: 200, body: 'value' },
          validateBody: false,
        }),
      ).toStrictEqual({
        success: true,
        metadata: { status: 200, bodyKind: 'value', contentType: undefined },
        body: 'value',
      });
    }
  });
});
```

- [x] Run `pnpm exec vp test run --project core`. Expected red: the new suite cannot resolve `./response`. The existing facade tests remain unchanged. Record this failure before implementation.
- [x] Create `response.ts`. Move `isAppRouteResponse`, `isAppRouteOtherResponse` and `isAppRouteNoBody` from `server.ts` verbatim, retaining their existing signatures and importing their existing DSL/HTTP status types. Add these types and the evaluator:

```typescript
export type ResponseMetadata = {
  status: number;
  bodyKind: 'none' | 'value';
  contentType: string | undefined;
};

export type ResponseEvaluation =
  | { success: true; metadata: ResponseMetadata; body: unknown }
  | { success: false; metadata: ResponseMetadata; error: StandardSchemaError };

export function evaluateResponse({
  appRoute,
  response,
  validateBody,
}: {
  appRoute: AppRoute;
  response: { status: number; body?: unknown };
  validateBody: boolean;
}): ResponseEvaluation {
  const declaration = appRoute.responses[response.status];
  const otherResponse = isAppRouteOtherResponse(declaration);
  const metadata: ResponseMetadata = {
    status: response.status,
    bodyKind: isAppRouteNoBody(declaration) ? 'none' : 'value',
    contentType: otherResponse ? declaration.contentType : undefined,
  };
  if (!validateBody) {
    return { success: true, metadata, body: response.body };
  }
  const schema = otherResponse ? declaration.body : declaration;
  const validation = validateIfSchema(response.body, schema);
  if (validation.error) {
    return { success: false, metadata, error: validation.error };
  }
  return { success: true, metadata, body: validation.value };
}
```

Imports come directly from `./dsl`, `./status-codes`, `./standard-schema-utils` and `./validation-error`. Do not import the server facade or any exception adapter from this module. Add concise public JSDoc explaining supplied-body evaluation, explicit enablement and configuration errors. Do not default `validateBody` or catch thrown configuration errors.

- [x] Replace `server.ts`'s implementation with the following wrapper, retaining the existing `validateResponse` signature and return type:

```typescript
import { AppRoute } from './dsl';
import { evaluateResponse, isAppRouteResponse } from './response';
import { TsRestResponseValidationError } from './response-validation-error';

export {
  isAppRouteResponse,
  isAppRouteOtherResponse,
  isAppRouteNoBody,
} from './response';

export const validateResponse = ({
  appRoute,
  response,
}: {
  appRoute: AppRoute;
  response: { status: number; body?: unknown };
}): { status: number; body?: unknown } => {
  if (!isAppRouteResponse(response)) return response;
  const evaluation = evaluateResponse({
    appRoute,
    response,
    validateBody: true,
  });
  if (!evaluation.success) {
    throw new TsRestResponseValidationError(appRoute, evaluation.error);
  }
  return { status: evaluation.metadata.status, body: evaluation.body };
};
```

The exception implementation stays in its existing file. The facade must not leak metadata or a success flag to callers.

- [x] Change only the client's predicate import from `./server` to `./response`. Keep its validation and fetcher logic unchanged. In `core/src/index.ts` retain `export * from './lib/server'` and add explicit exports:

```typescript
export { evaluateResponse } from './lib/response';
export type { ResponseMetadata, ResponseEvaluation } from './lib/response';
```

Do not add a wildcard response export or a package subpath. The old predicates reach the root through the facade as before.

- [x] Run `pnpm exec vp test run --project core`, then `pnpm typecheck`. Expected: all tests, including the new evaluator tests and existing clients, pass; the new union narrows correctly. No type assertion should hide an evaluator or Express result mismatch.
- [x] Extend the existing packed consumer's `source` template in `tests/packaging/validator-independence.test.mjs`. Add `evaluateResponse`, `ResponseMetadata` and `ResponseEvaluation` to the existing core import. After constructing `contract`, insert this code into the template:

```typescript
const evaluated: ResponseEvaluation = evaluateResponse({
  appRoute: contract.convert,
  response: { status: 200, body: '12' },
  validateBody: true,
});
const responseMetadata: ResponseMetadata = evaluated.metadata;
if (evaluated.success) {
  const evaluatedBody: unknown = evaluated.body;
  void evaluatedBody;
} else {
  const issueMessage: string = evaluated.error.issues[0].message;
  void issueMessage;
}
// @ts-expect-error callers must explicitly choose validation enablement
evaluateResponse({
  appRoute: contract.convert,
  response: { status: 200, body: '12' },
});
void responseMetadata;
```

Both `.mts` and `.cts` consumers already compile this source under strict NodeNext settings without `skipLibCheck`. Do not change compiler flags, validator profiles, framework baselines, consumer installation or graph checks.

- [x] Add `evaluateResponse` to the existing runtime loop's core destructuring. Inside that same loop insert:

```javascript
const responseRoute = initContract().router({
  get: {
    method: 'GET',
    path: '/response',
    responses: { 200: schema },
  },
}).get;
const accepted = evaluateResponse({
  appRoute: responseRoute,
  response: { status: 200, body: '42' },
  validateBody: true,
});
assert.deepEqual(accepted, {
  success: true,
  metadata: { status: 200, bodyKind: 'value', contentType: undefined },
  body: 42,
});
const rejected = evaluateResponse({
  appRoute: responseRoute,
  response: { status: 200, body: {} },
  validateBody: true,
});
assert.equal(rejected.success, false);
assert.ok(rejected.error instanceof StandardSchemaError);
assert.ok(rejected.error.issues.length > 0);
const original = {};
const disabled = evaluateResponse({
  appRoute: responseRoute,
  response: { status: 200, body: original },
  validateBody: false,
});
assert.equal(disabled.success, true);
assert.equal(disabled.body, original);
```

This runs against both installed ESM and CommonJS core exports for every existing validator profile, including the profile with no validator dependency. Keep the existing export-key parity and default graph assertions.

- [x] Run `pnpm test:packages`. Expected: the real tarballs expose the evaluator and result types, all existing consumer profiles and release probes pass, and no default import graph loads or bundles Zod.
- [x] Run `pnpm exec vp fmt libs/ts-rest/core/src/lib/response.ts libs/ts-rest/core/src/lib/response.spec.ts libs/ts-rest/core/src/lib/server.ts libs/ts-rest/core/src/lib/client.ts libs/ts-rest/core/src/index.ts tests/packaging/validator-independence.test.mjs --check` and `git diff --check`. Expected: exit 0.
- [x] Review and commit only Task 2 files with `feat(core): centralize response contract evaluation`.

## Task 3: Adopt in Express and verify the slice

**Files:** modify `libs/ts-rest/express/src/lib/ts-rest-express.ts` and `libs/ts-rest/express/src/lib/ts-rest-express.spec.ts`; create `.changeset/response-contract-evaluation.md`; update `docs/plans/README.md` only after verified completion.

**Interfaces:** consumes the root `evaluateResponse` API and the existing core `TsRestResponseValidationError`. Produces native responses with the existing status, body, media-type, stream and middleware semantics.

- [x] Before the write refactor, extend Task 1's native counter coverage with an ordinary JSON transform so both JSON and explicit-media-type branches prove single evaluation. Append within `describe('response evaluation compatibility')`:

```typescript
it('evaluates an ordinary JSON response once', async () => {
  const validate = vi.fn((value: unknown) => ({
    value: { transformed: value },
  }));
  const schema: StandardSchemaV1<unknown, { transformed: unknown }> = {
    '~standard': { version: 1, vendor: 'test', validate },
  };
  const contract = c.router({
    get: {
      method: 'GET',
      path: '/json-count',
      responses: { 200: schema },
    },
  });
  const app = express();
  createExpressEndpoints(
    contract,
    s.router(contract, {
      get: async () => ({ status: 200, body: 'input' }),
    }),
    app,
    { responseValidation: true, logInitialization: false },
  );
  const response = await supertest(app).get('/json-count');
  expect(response.status).toBe(200);
  expect(response.body).toEqual({ transformed: 'input' });
  expect(response.headers['content-type']).toMatch(/^application\/json/);
  expect(validate).toHaveBeenCalledExactlyOnceWith('input');
});
```

- [x] Run `pnpm exec vp test run --project express`. Expected: the new JSON case and existing characterizations/conformance pass against the old writer. This is a refactor characterized by passing tests, not a new behavior requiring an artificial failing test.
- [x] In the production Express core import, remove `validateResponse`, `isAppRouteNoBody` and `isAppRouteOtherResponse` (they have no remaining uses in this file). Add `evaluateResponse` and `TsRestResponseValidationError`. Leave request processing untouched.
- [x] Keep numeric status conversion and the existing stream branch. Replace the code after that branch through the ordinary JSON write with:

```typescript
const evaluation = evaluateResponse({
  appRoute: schema,
  response: { status: statusCode, body: result.body },
  validateBody: Boolean(options.responseValidation),
});

if (!evaluation.success) {
  throw new TsRestResponseValidationError(schema, evaluation.error);
}

if (evaluation.metadata.bodyKind === 'none') {
  res.status(evaluation.metadata.status).end();
  return;
}

if (evaluation.metadata.contentType !== undefined) {
  res.setHeader('content-type', evaluation.metadata.contentType);
  res.status(evaluation.metadata.status).send(evaluation.body);
  return;
}

res.status(evaluation.metadata.status).json(evaluation.body);
return;
```

Use an explicit undefined check for media types, preserving empty strings. No second call to `validateResponse`, `validateIfSchema` or a validator may follow evaluation. Keep the outer catch/`next(e)` and existing thrown `TsRestResponseError` conversion.

- [x] Create the changeset with exactly:

```markdown
---
'@ts-restless/core': minor
'@ts-restless/express': patch
---

Add a shared response contract evaluator returning body metadata and structured
validation results. Preserve the existing core response-validation facade and
Express behavior while adopting the evaluator for ordinary responses. Stream
handling, validation enablement, undeclared statuses and error identities remain
unchanged.
```

Do not run versioning or edit manifests. The existing fixed release group and native `workspace:^` peer packing remain responsible for release coordination and peer floors.

- [x] Run `pnpm exec vp test run --project core --project express`. Expected: the core evaluator, public facade, native counters, no-content/media-type/image-stream regressions and shared conformance all pass.
- [x] Run `pnpm typecheck`, `pnpm test` and `pnpm test:packages` sequentially and inspect every exit code. Expected: exit 0 for each. These final gates cover the changed Express source and changeset, plus untouched callers through the compatibility facade. Do not repeat full checks after they pass unless another change or unresolved concern warrants it.
- [x] Run this changed-file formatting check, then `git diff --check`:

```bash
pnpm exec vp fmt libs/ts-rest/core/src/lib/response.ts libs/ts-rest/core/src/lib/response.spec.ts libs/ts-rest/core/src/lib/server.ts libs/ts-rest/core/src/lib/server.spec.ts libs/ts-rest/core/src/lib/client.ts libs/ts-rest/core/src/index.ts libs/ts-rest/express/src/lib/ts-rest-express.ts libs/ts-rest/express/src/lib/ts-rest-express.spec.ts tests/packaging/validator-independence.test.mjs .changeset/response-contract-evaluation.md docs/plans/README.md --check
```

Expected: exit 0. Execution may format these files, preserving prose and test semantics.

- [x] Verify the final boundaries:

```bash
rg -n "from './server'" libs/ts-rest/core/src/lib/client.ts
rg -n 'validateResponse|isAppRouteNoBody|isAppRouteOtherResponse' libs/ts-rest/express/src/lib/ts-rest-express.ts
rg -n 'evaluateResponse' libs/ts-rest/core/src/index.ts libs/ts-rest/express/src/lib/ts-rest-express.ts
git diff --name-only aaae50b5
```

Expected: first two searches have no matches (exit 1 is expected); the third shows the core export and Express import/call; the diff names only scoped files plus the planning documents. Inspect `git status --short --untracked-files=all` too: an unstaged new file does not appear in `git diff --name-only`.

- [x] Review the diff against the design. Verify the stream branch still precedes evaluation; predicates moved verbatim; only one client import changed; core's exception class file and all other adapter implementations are unchanged; no generated tracked file or dependency changes occurred.
- [x] Record completed task checks and actual command evidence in the execution report. Update the plan 002 index row to `DONE` only if all required local gates passed, with CI compatibility explicitly pending until run. If blocked, record the exact failed gate and reason in the row instead of claiming completion.
- [x] Commit the Express source/test, changeset and status update with `refactor(express): use shared response contract evaluation`. Commit the approved design/plan documentation separately if it was transferred uncommitted. Do not push or create a PR.

## Done criteria and review checklist

- [x] Core's `evaluateResponse`, `ResponseMetadata` and `ResponseEvaluation` are explicit root exports with strict ESM/CommonJS consumer evidence.
- [x] Core response predicates have one implementation and their existing root/server exports remain available.
- [x] Direct tests distinguish no-body metadata, type/null markers, explicit media types, schema issues, invalid declarations, async validators, undeclared statuses and falsy/undefined outputs.
- [x] Validator counters prove zero calls when disabled and exactly one when enabled; native JSON/text and stream tests confirm host placement.
- [x] Core's facade retains its runtime guard, status/body shape, error constructor and fields.
- [x] Express uses evaluation after stream bypass and retains existing native response and middleware behavior.
- [x] Client production diff is only the predicate import. Other host implementations and policy options are unchanged.
- [x] Focused suites, inference, full source tests, packed consumers, changed-file formatting and whitespace all pass with recorded output.
- [x] Existing CI `Compatibility Fixtures` passes before merge; PR #13 passed all ten fixture jobs and the aggregate gate.

## Stop conditions and follow-ups

Stop and report if drift changes a preserved contract, a failing baseline prevents reliable comparison, completing a step requires an out-of-scope production file or dependency change, or a well-formed existing contract needs metadata the approved result cannot represent. After two failed repair attempts at a new test or compilation boundary, report the concrete failure rather than changing policy to make it pass. Routine approval retries for sandbox/network failures are not code repair attempts.

The evaluator is framework-independent, but status policy is not standardized by this extraction. Later A05–A08 adoptions must characterize their native lifecycle and errors. Nest's missing-schema divergence should lead to a separate shared contract-policy decision with migration guidance. F04 decides default/custom-fetcher validation ownership and non-JSON client validation; no decoder or custom-fetcher change belongs here. Headers and query cohesion remain separate architecture slices.
