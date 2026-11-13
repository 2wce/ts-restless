import {
  initContract,
  ServerInferRequest,
  TsRestResponseError,
} from '../../libs/ts-rest/core/src';
import type supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod4';

const validationCalls: string[] = [];
const recordValidation = <T>(location: string, value: T): T => {
  validationCalls.push(location);
  return value;
};

const c = initContract();
const numericString = z.string().regex(/^\d+$/).transform(Number);

export const httpContract = c.router({
  transform: {
    method: 'POST',
    path: '/conformance/items/:id/:slug',
    pathParams: z
      .object({ id: numericString })
      .transform((value) => recordValidation('params', value)),
    query: z
      .object({
        count: numericString,
        limit: z.string().default('5').transform(Number),
        note: z.string().optional(),
      })
      .passthrough()
      .transform((value) => recordValidation('query', value)),
    headers: {
      'X-Count': numericString.transform((value) =>
        recordValidation('headers.count', value),
      ),
      'X-Default': z
        .string()
        .default('fallback')
        .transform((s) => recordValidation('headers.default', s.toUpperCase())),
      'X-Note': z
        .string()
        .optional()
        .transform((value) => recordValidation('headers.note', value)),
    },
    body: z
      .object({ title: z.string().transform((s) => s.trim().toUpperCase()) })
      .passthrough()
      .transform((value) => recordValidation('body', value)),
    responses: {
      200: c.type<{
        id: number;
        slug: string;
        count: number;
        limit: number;
        note?: string;
        headerCount: number;
        headerDefault: string;
        headerNote?: string;
        title: string;
        extraBody: unknown;
        extraQuery: unknown;
      }>(),
    },
  },
  declaredError: {
    method: 'GET',
    path: '/conformance/errors',
    query: z.object({ mode: z.enum(['return', 'throw']).default('return') }),
    responses: { 409: z.object({ message: z.string() }) },
  },
  invalidResponse: {
    method: 'GET',
    path: '/conformance/invalid-response',
    responses: {
      200: z.object({ value: z.string().refine((value) => value === 'valid') }),
    },
  },
  transformedResponse: {
    method: 'GET',
    path: '/conformance/transformed-response',
    responses: {
      200: z.object({ value: z.string().transform((s) => s.toUpperCase()) }),
    },
  },
  noContent: {
    method: 'POST',
    path: '/conformance/no-content',
    body: c.noBody(),
    responses: { 204: c.noBody() },
  },
  text: {
    method: 'GET',
    path: '/conformance/text',
    responses: {
      200: c.otherResponse({ contentType: 'text/plain', body: z.string() }),
    },
  },
});

export type TransformInput = ServerInferRequest<typeof httpContract.transform>;
export type RequestErrors = Partial<
  Record<'pathParams' | 'headers' | 'query' | 'body', string>
>;
export type HttpInput = {
  method: 'GET' | 'POST';
  path: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
};
export type HttpResult = {
  status: number;
  body: unknown;
  text: string;
  headers: Record<string, string>;
};
export type NativeInput = {
  params: unknown;
  query: unknown;
  headers: unknown;
  body: unknown;
};
export type HttpHost = {
  request(input: HttpInput): Promise<HttpResult>;
  close(): Promise<void>;
  inputs: TransformInput[];
  nativeInputs: NativeInput[];
  assertRequestError(result: HttpResult, errors: RequestErrors): void;
  assertResponseError(result: HttpResult): void;
};

export const makeHttpHandlers = (inputs: TransformInput[]) => ({
  transform: async ({ params, query, headers, body }: TransformInput) => {
    inputs.push({ params, query, headers, body });
    return {
      status: 200 as const,
      body: {
        id: params.id,
        slug: params.slug,
        count: query.count,
        limit: query.limit,
        note: query.note,
        headerCount: headers['x-count'],
        headerDefault: headers['x-default'],
        headerNote: headers['x-note'],
        title: body.title,
        extraBody: body['extra'],
        extraQuery: query['extra'],
      },
    };
  },
  declaredError: async ({
    query,
  }: ServerInferRequest<typeof httpContract.declaredError>) => {
    const result = { status: 409 as const, body: { message: 'conflict' } };
    if (query.mode === 'throw') {
      throw new TsRestResponseError(httpContract.declaredError, result);
    }
    return result;
  },
  invalidResponse: async () => ({
    status: 200 as const,
    body: { value: 'invalid' },
  }),
  transformedResponse: async () => ({
    status: 200 as const,
    body: { value: 'hello' },
  }),
  noContent: async () => ({ status: 204 as const, body: undefined }),
  text: async () => ({ status: 200 as const, body: 'plain response' }),
});

export const sendHttpRequest = async (
  client: Pick<ReturnType<typeof supertest>, 'get' | 'post'>,
  input: HttpInput,
): Promise<HttpResult> => {
  const pending =
    input.method === 'POST' ? client.post(input.path) : client.get(input.path);
  pending.set(input.headers ?? {});
  if (input.body !== undefined) pending.send(input.body);
  const result = await pending;
  return {
    status: result.status,
    body: result.body,
    text: result.text,
    headers: result.headers,
  };
};

const validRequest = {
  method: 'POST',
  path: '/conformance/items/42/untouched?count=3&extra=query-extra',
  headers: { 'X-Count': '7' },
  body: { title: ' hello ', extra: { preserved: true } },
} satisfies HttpInput;

const expectedBody = {
  id: 42,
  slug: 'untouched',
  count: 3,
  limit: 5,
  headerCount: 7,
  headerDefault: 'FALLBACK',
  title: 'HELLO',
  extraBody: { preserved: true },
  extraQuery: 'query-extra',
};

const invalidRequests: {
  name: string;
  input: HttpInput;
  errors: RequestErrors;
}[] = [
  {
    name: 'params',
    input: {
      ...validRequest,
      path: '/conformance/items/invalid/untouched?count=3',
    },
    errors: { pathParams: 'id' },
  },
  {
    name: 'headers',
    input: { ...validRequest, headers: { 'X-Count': 'invalid' } },
    errors: { headers: 'x-count' },
  },
  {
    name: 'query',
    input: {
      ...validRequest,
      path: '/conformance/items/42/untouched?count=invalid',
    },
    errors: { query: 'count' },
  },
  {
    name: 'body',
    input: { ...validRequest, body: { title: 42 } },
    errors: { body: 'title' },
  },
  {
    name: 'all four locations',
    input: {
      ...validRequest,
      path: '/conformance/items/invalid/untouched?count=invalid',
      headers: { 'X-Count': 'invalid' },
      body: { title: 42 },
    },
    errors: {
      pathParams: 'id',
      headers: 'x-count',
      query: 'count',
      body: 'title',
    },
  },
];

export const describeHttpConformance = (makeHost: () => Promise<HttpHost>) => {
  describe('shared HTTP conformance', () => {
    let host: HttpHost;
    beforeEach(async () => {
      validationCalls.length = 0;
      host = await makeHost();
    });
    afterEach(async () => {
      await host?.close();
    });

    it('transforms parsed inputs, normalizes headers, supplies defaults and preserves extra keys', async () => {
      const result = await host.request(validRequest);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(expectedBody);
      expect(validationCalls).toEqual([
        'params',
        'headers.count',
        'headers.default',
        'headers.note',
        'query',
        'body',
      ]);
      expect(host.inputs).toHaveLength(1);
      expect(host.inputs[0]).toMatchObject({
        params: { id: 42, slug: 'untouched' },
        query: { count: 3, limit: 5, extra: 'query-extra' },
        headers: { 'x-count': 7, 'x-default': 'FALLBACK' },
        body: { title: 'HELLO', extra: { preserved: true } },
      });
      expect(host.inputs[0].query.note).toBeUndefined();
      expect(host.inputs[0].headers['x-note']).toBeUndefined();
      expect(host.nativeInputs).toHaveLength(1);
      expect(host.nativeInputs[0]).toMatchObject({
        params: { id: '42', slug: 'untouched' },
        query: { count: '3', extra: 'query-extra' },
        headers: { 'x-count': '7' },
        body: { title: ' hello ', extra: { preserved: true } },
      });
      expect(host.nativeInputs[0].query).not.toHaveProperty('limit');
      expect(host.nativeInputs[0].headers).not.toHaveProperty('x-default');
    });

    it('accepts supplied optional and defaulted fields', async () => {
      const result = await host.request({
        ...validRequest,
        path: `${validRequest.path}&limit=9&note=query-note`,
        headers: {
          'x-count': '7',
          'x-default': 'provided',
          'x-note': 'header-note',
        },
      });
      expect(result.status).toBe(200);
      expect(result.body).toEqual({
        ...expectedBody,
        limit: 9,
        note: 'query-note',
        headerDefault: 'PROVIDED',
        headerNote: 'header-note',
      });
      expect(host.inputs).toHaveLength(1);
    });

    it.each(invalidRequests)(
      'rejects invalid $name before calling the handler',
      async ({ input, errors }) => {
        const result = await host.request(input);
        expect(result.status).toBe(400);
        host.assertRequestError(result, errors);
        expect(host.inputs).toHaveLength(0);
        expect(host.nativeInputs).toHaveLength(0);
      },
    );

    it.each(['return', 'throw'])(
      'preserves a declared error response (%s)',
      async (mode) => {
        const result = await host.request({
          method: 'GET',
          path: `/conformance/errors?mode=${mode}`,
        });
        expect(result.status).toBe(409);
        expect(result.body).toEqual({ message: 'conflict' });
      },
    );

    it('rejects an invalid response through native error handling', async () => {
      const result = await host.request({
        method: 'GET',
        path: '/conformance/invalid-response',
      });
      expect(result.status).toBe(500);
      host.assertResponseError(result);
    });

    it('applies response schema transforms when validation is enabled', async () => {
      const result = await host.request({
        method: 'GET',
        path: '/conformance/transformed-response',
      });
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ value: 'HELLO' });
    });

    it('writes a no-body response', async () => {
      const result = await host.request({
        method: 'POST',
        path: '/conformance/no-content',
      });
      expect(result.status).toBe(204);
      expect(result.text).toBe('');
      expect(result.headers).not.toHaveProperty('content-type');
    });

    it('writes non-JSON content using its declared media type', async () => {
      const result = await host.request({
        method: 'GET',
        path: '/conformance/text',
      });
      expect(result.status).toBe(200);
      expect(result.text).toBe('plain response');
      expect(result.headers['content-type']).toMatch(/^text\/plain(?:;|$)/);
    });
  });
};
