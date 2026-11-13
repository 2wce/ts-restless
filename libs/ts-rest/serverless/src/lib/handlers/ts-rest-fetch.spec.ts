import {
  TsRestRequestValidationError,
  RequestValidationError,
  ResponseValidationError,
} from '../types';
import { initContract, TsRestResponseError } from '@ts-restless/core';
import { parse as parseMultipart, getBoundary } from 'parse-multipart-data';
import { z } from 'zod';
import { vi } from 'vitest';
import { TsRestResponse } from '../response';
import {
  createFetchHandler,
  FetchHandlerOptions,
  fetchRequestHandler,
  tsr,
} from './ts-rest-fetch';

// Applications can describe validation responses with their chosen validator.
const ValidationErrorSchema = z.object({
  name: z.literal('ValidationError'),
  issues: z.array(
    z
      .object({
        message: z.string(),
        path: z.array(z.union([z.string(), z.number()])).optional(),
      })
      .passthrough(),
  ),
});
const RequestValidationErrorSchema = z
  .object({
    pathParameterErrors: ValidationErrorSchema.nullable(),
    headerErrors: ValidationErrorSchema.nullable(),
    queryParameterErrors: ValidationErrorSchema.nullable(),
    bodyErrors: ValidationErrorSchema.nullable(),
  })
  .extend({ message: z.string() });

const c = initContract();

const contract = c.router({
  test: {
    method: 'GET',
    path: '/test',
    query: z.object({
      foo: z.string(),
    }),
    responses: {
      200: z.object({
        foo: z.string(),
      }),
      400: RequestValidationErrorSchema,
    },
  },
  ping: {
    method: 'POST',
    path: '/ping/:id',
    pathParams: z.object({
      id: z.coerce.number(),
    }),
    body: z.object({
      ping: z.string(),
    }),
    responses: {
      200: z.object({
        id: z.number(),
        pong: z.string(),
      }),
      404: z.object({
        message: z.literal('Not Found'),
      }),
      500: c.noBody(),
    },
  },
  noContent: {
    method: 'POST',
    path: '/no-content',
    body: c.noBody(),
    responses: {
      204: c.noBody(),
    },
  },
  upload: {
    method: 'POST',
    path: '/upload',
    contentType: 'multipart/form-data',
    body: c.type<{ file: File }>(),
    responses: {
      200: c.otherResponse({
        contentType: 'application/octet-stream',
        body: c.type<Blob | string>(),
      }),
    },
  },
  throw: {
    method: 'GET',
    path: '/throw',
    responses: {
      500: c.noBody(),
    },
  },
});

const mockFn = vi.fn();

const router = tsr
  .routerBuilder(contract)
  .requestMiddleware<{ foo: string }>((req) => {
    req.foo = 'bar';
  })
  .responseHandler((res, req) => {
    res.headers.set('x-foo', req.foo);
  })
  .partialRouter({
    ping: async ({ body, params }) => {
      if (params.id === 500) {
        throw new TsRestResponseError(contract.ping, {
          status: 500,
          body: undefined,
        });
      }

      if (params.id === 404) {
        throw new TsRestResponseError(contract.ping, {
          status: 404,
          body: {
            message: 'Not Found',
          },
        });
      }

      return {
        status: 200,
        body: {
          id: params.id,
          pong: body.ping,
        },
      };
    },
    noContent: {
      middleware: [(req) => mockFn(req.foo)],
      handler: async () => {
        return {
          status: 204,
          body: undefined,
        } as const;
      },
    },
    upload: async (_, { request }) => {
      const boundary = getBoundary(
        request.headers.get('content-type') as string,
      );

      const bodyBuffer = await request.arrayBuffer();
      const parts = parseMultipart(Buffer.from(bodyBuffer), boundary);
      const blob = new Blob([Uint8Array.from(parts[0].data)], {
        type: parts[0].type,
      });

      return {
        status: 200,
        body: blob,
      };
    },
  })
  .route('test', async ({ query }) => {
    return {
      status: 200,
      body: {
        foo: query.foo,
      },
    };
  })
  .route('throw', async () => {
    throw new Error('Test error');
  });

const options = {
  jsonQuery: true,
  responseValidation: true,
  cors: {
    origin: ['http://localhost'],
    credentials: true,
  },
} as FetchHandlerOptions<{}, { foo: string }>;

const testFetchRequestHandler = (request: Request) => {
  return fetchRequestHandler({
    contract,
    router,
    options,
    request,
  });
};

const newFetchRequestHandler = createFetchHandler(contract, router, options);

describe('fetchRequestHandler', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps middleware owned by the caller when creating multiple handlers', async () => {
    const reusableContract = c.router({
      get: {
        method: 'GET',
        path: '/reused',
        responses: { 200: c.type<string>() },
      },
    });
    const middleware = tsr.middleware(() => undefined);
    const implementation = tsr.router(reusableContract, {
      get: {
        middleware: [middleware],
        handler: async () => ({ status: 200, body: 'ok' }),
      },
    });

    const firstHandler = createFetchHandler(reusableContract, implementation);
    const secondHandler = createFetchHandler(reusableContract, implementation);
    await firstHandler(new Request('http://localhost/reused'));
    await secondHandler(new Request('http://localhost/reused'));

    expect(implementation.get.middleware).toEqual([middleware]);
  });

  it('uses each handler validation policy and platform context for a reused implementation', async () => {
    let validations = 0;
    const reusableContract = c.router({
      get: {
        method: 'GET',
        path: '/reused',
        responses: {
          200: z.object({
            value: z.string().transform((value) => {
              validations++;
              return value.toUpperCase();
            }),
            requestId: z.string(),
          }),
        },
      },
    });
    const platformTsr = tsr.platformContext<{ requestId: string }>();
    const implementation = platformTsr.router(reusableContract, {
      get: {
        middleware: [platformTsr.middleware(() => undefined)],
        handler: async (_, { requestId }) => ({
          status: 200,
          body: { value: 'hello', requestId },
        }),
      },
    });
    const rawHandler = createFetchHandler<
      typeof reusableContract,
      {},
      { requestId: string }
    >(reusableContract, implementation, {
      responseValidation: false,
    });
    const validatedHandler = createFetchHandler<
      typeof reusableContract,
      {},
      { requestId: string }
    >(reusableContract, implementation, {
      responseValidation: true,
    });

    const rawResponse = await rawHandler(
      new Request('http://localhost/reused'),
      {
        requestId: 'raw',
      },
    );
    expect(await rawResponse.json()).toEqual({
      value: 'hello',
      requestId: 'raw',
    });
    expect(validations).toBe(0);

    const validatedResponse = await validatedHandler(
      new Request('http://localhost/reused'),
      { requestId: 'validated' },
    );
    expect(await validatedResponse.json()).toEqual({
      value: 'HELLO',
      requestId: 'validated',
    });
    expect(validations).toBe(1);

    const repeatedResponse = await fetchRequestHandler({
      contract: reusableContract,
      router: implementation,
      options: { responseValidation: true },
      request: new Request('http://localhost/reused'),
      platformContext: { requestId: 'single request' },
    });
    expect(await repeatedResponse.json()).toEqual({
      value: 'HELLO',
      requestId: 'single request',
    });
    expect(validations).toBe(2);
  });

  it('should handle GET request', async () => {
    const request = new Request('http://localhost/test?foo=bar', {
      headers: { origin: 'http://localhost' },
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response('{"foo":"bar"}', {
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual(await expectedResponse.json());
  });

  it('should handle POST request', async () => {
    const request = new Request('http://localhost/ping/123', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'foo' }),
    });

    const response = await newFetchRequestHandler(request);
    const expectedResponse = new Response('{"id":123,"pong":"foo"}', {
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual(await expectedResponse.json());
  });

  it('should handle no content response', async () => {
    const request = new Request('http://localhost/no-content', {
      method: 'POST',
      headers: { origin: 'http://localhost' },
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual('');
    expect(mockFn).toHaveBeenCalledWith('bar');
  });

  it('should handle thrown TsRestResponseError', async () => {
    const request = new Request('http://localhost/ping/404', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'foo' }),
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response('{"message":"Not Found"}', {
      status: 404,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual(await expectedResponse.json());
  });

  it('should handle thrown TsRestResponseError no body', async () => {
    const request = new Request('http://localhost/ping/500', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ping: 'foo' }),
    });

    const response = await newFetchRequestHandler(request);
    const expectedResponse = new Response(null, {
      status: 500,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual('');
  });

  it('should handle file upload', async () => {
    const request = new Request('http://localhost/upload', {
      method: 'POST',
      headers: {
        origin: 'http://localhost',
        'content-type':
          'multipart/form-data; boundary=---WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
      body:
        '-----WebKitFormBoundary7MA4YWxkTrZu0gW\r\n' +
        'Content-Disposition: form-data; name="file"; filename="a.html"\r\n' +
        'Content-Type: text/html\r\n' +
        '\r\n' +
        '<html><body><h1>Hello ts-rest!</h1></body></html>\r\n' +
        '-----WebKitFormBoundary7MA4YWxkTrZu0gW--',
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response(
      '<html><body><h1>Hello ts-rest!</h1></body></html>',
      {
        headers: {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'http://localhost',
          'content-type': 'text/html',
          vary: 'Origin',
          'x-foo': 'bar',
        },
      },
    );

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.text()).toEqual(await expectedResponse.text());
  });

  it('should handle validation error', async () => {
    const request = new Request('http://localhost/test', {
      headers: { origin: 'http://localhost' },
    });

    const response = await testFetchRequestHandler(request);
    const expectedResponse = new Response(
      '{"message":"Request validation failed","pathParameterErrors":null,"headerErrors":null,"queryParameterErrors":{"name":"ValidationError","issues":[{"code":"invalid_type","expected":"string","received":"undefined","path":["foo"],"message":"Required"}]},"bodyErrors":null}',
      {
        status: 400,
        headers: {
          'access-control-allow-credentials': 'true',
          'access-control-allow-origin': 'http://localhost',
          'content-type': 'application/json',
          vary: 'Origin',
          'x-foo': 'bar',
        },
      },
    );
    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    const body = await response.json();
    expect(body).toEqual(await expectedResponse.json());
    expect(RequestValidationErrorSchema.safeParse(body)).toStrictEqual({
      data: expect.any(Object),
      success: true,
    });
  });

  it('delivers a modern request error with the original Zod issue details to custom handlers', async () => {
    let caught: unknown;
    const handler = createFetchHandler(contract, router, {
      errorHandler: (error) => {
        caught = error;
      },
    });
    const response = await handler(new Request('http://localhost/test'));
    expect(response.status).toBe(400);
    expect(caught).toBeInstanceOf(TsRestRequestValidationError);
    expect(caught).toBeInstanceOf(RequestValidationError);
    expect(caught).toMatchObject({
      pathParamsError: null,
      headersError: null,
      bodyError: null,
      queryError: {
        name: 'ValidationError',
        issues: [
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'undefined',
            path: ['foo'],
            message: 'Required',
          },
        ],
      },
    });
  });

  it('preserves adapter response errors and validator issue details for custom handlers', async () => {
    const responseContract = c.router({
      get: {
        method: 'GET',
        path: '/invalid-response',
        responses: {
          200: z.object({
            value: z.string().regex(/^valid$/, 'expected valid'),
          }),
        },
      },
    });
    let caught: unknown;
    const handler = createFetchHandler(
      responseContract,
      { get: async () => ({ status: 200, body: { value: 'invalid' } }) },
      {
        responseValidation: true,
        errorHandler: (error) => {
          caught = error;
        },
      },
    );

    const response = await handler(
      new Request('http://localhost/invalid-response'),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: 'Server Error' });
    expect(caught).toBeInstanceOf(ResponseValidationError);
    expect(caught).toMatchObject({
      appRoute: responseContract.get,
      error: {
        name: 'ValidationError',
        issues: [
          {
            code: 'invalid_string',
            validation: 'regex',
            path: ['value'],
            message: 'expected valid',
          },
        ],
      },
    });
  });

  it('should handle 500 response', async () => {
    const request = new Request('http://localhost/throw', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const response = await newFetchRequestHandler(request);
    const expectedResponse = new Response(null, {
      status: 500,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
        'x-foo': 'bar',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual({ message: 'Server Error' });
  });

  it('should handle custom context', async () => {
    type PlatformContext = {
      foo: string;
    };

    const fetchRequestHandlerWithContext = (
      request: Request,
      platformContext: PlatformContext,
    ) => {
      const contract = c.router({
        test: {
          method: 'GET',
          path: '/test',
          responses: {
            200: z.object({}).passthrough(),
          },
        },
      });

      const router = tsr.platformContext<PlatformContext>().router(contract, {
        test: async (_, { foo }) => {
          return {
            status: 200,
            body: {
              foo,
            },
          };
        },
      });

      return fetchRequestHandler({
        contract,
        router,
        options: {},
        request,
        platformContext,
      });
    };

    const request = new Request('http://localhost/test', {
      method: 'GET',
      headers: { origin: 'http://localhost' },
    });

    const response = await fetchRequestHandlerWithContext(request, {
      foo: 'context-bar',
    });
    const expectedResponse = new Response('{"foo":"context-bar"}', {
      headers: {
        'content-type': 'application/json',
      },
    });

    expect(response.status).toEqual(expectedResponse.status);
    expect(response.headers).toEqual(expectedResponse.headers);
    expect(await response.json()).toEqual(await expectedResponse.json());
  });
});

describe('empty JSON request bodies', () => {
  const emptyContract = c.router({
    empty: {
      method: 'POST',
      path: '/empty-json',
      body: z.undefined(),
      responses: { 200: z.undefined() },
    },
    noBody: {
      method: 'POST',
      path: '/no-body-json',
      body: c.noBody(),
      responses: { 204: c.noBody() },
    },
    required: {
      method: 'POST',
      path: '/required-json',
      body: z.object({ value: z.string() }),
      responses: { 200: z.object({ value: z.string() }) },
    },
  });
  const handler = createFetchHandler(
    emptyContract,
    {
      empty: async () => ({ status: 200, body: undefined }),
      noBody: async () => ({ status: 204, body: undefined }),
      required: async ({ body }) => ({ status: 200, body }),
    },
    { responseValidation: true },
  );
  const request = (path: string, body?: string) =>
    new Request('http://localhost' + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

  it.each([undefined, ''])(
    'passes zero-length JSON bytes (%s) to undefined validation',
    async (body) => {
      const response = await handler(request('/empty-json', body));
      expect(response.status).toBe(200);
      expect(response.rawBody).toBeNull();
      expect(response.clone().rawBody).toBeNull();
      expect(await response.text()).toBe('');
      expect(response.headers.get('content-type')).toBe('application/json');
    },
  );
  it('accepts explicit no-body with JSON content type', async () => {
    const response = await handler(request('/no-body-json'));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
  it('rejects a missing required body through contract validation', async () => {
    const response = await handler(request('/required-json'));
    expect(response.status).toBe(400);
    expect((await response.json()).bodyErrors.name).toBe('ValidationError');
  });
  it.each(['', String.fromCharCode(0xfeff)])(
    'preserves nonempty JSON with prefix %s and does not trust content-length',
    async (prefix) => {
      const req = request('/required-json', prefix + '{"value":"input"}');
      req.headers.set('content-length', '0');
      const response = await handler(req);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ value: 'input' });
    },
  );
  it.each(['{', '   ', String.fromCharCode(0xfeff)])(
    'retains nonempty malformed JSON (%s) error handling',
    async (body) => {
      const caught: unknown[] = [];
      const routeHandler = vi.fn(async () => ({
        status: 200 as const,
        body: undefined,
      }));
      const handled = TsRestResponse.fromText('parse failure', { status: 422 });
      const fetchHandler = createFetchHandler(
        c.router({ empty: emptyContract.empty }),
        { empty: routeHandler },
        {
          errorHandler: (error) => {
            caught.push(error);
            return handled;
          },
        },
      );
      const response = await fetchHandler(request('/empty-json', body));
      expect(caught).toHaveLength(1);
      expect(caught[0]).toBeInstanceOf(SyntaxError);
      expect(routeHandler).not.toHaveBeenCalled();
      expect(response).toBe(handled);
      expect(await response.text()).toBe('parse failure');
    },
  );
});

describe('returned response headers', () => {
  const headerContract = c.router({
    json: {
      method: 'GET',
      path: '/returned-json',
      responses: { 200: z.object({ ok: z.boolean() }) },
    },
    text: {
      method: 'GET',
      path: '/returned-text',
      responses: {
        200: c.otherResponse({
          contentType: 'text/plain',
          body: c.type<string>(),
        }),
      },
    },
    blob: {
      method: 'GET',
      path: '/returned-blob',
      responses: {
        200: c.otherResponse({
          contentType: 'application/octet-stream',
          body: c.type<Blob>(),
        }),
      },
    },
    empty: {
      method: 'GET',
      path: '/returned-empty',
      responses: { 204: c.noBody() },
    },
  });

  it.each([
    { shape: 'record', responseValidation: true },
    { shape: 'record', responseValidation: false },
    { shape: 'tuples', responseValidation: true },
    { shape: 'tuples', responseValidation: false },
    { shape: 'Headers', responseValidation: true },
    { shape: 'Headers', responseValidation: false },
  ])(
    'merges $shape headers with context precedence (validation: $responseValidation)',
    async ({ shape, responseValidation }) => {
      const tuples: [string, string][] = [
        ['X-Returned', 'returned'],
        ['X-Shared', 'returned'],
        ['Content-Type', 'caller/type'],
      ];
      const returned: HeadersInit =
        shape === 'record'
          ? Object.fromEntries(tuples)
          : shape === 'tuples'
            ? tuples
            : new Headers(tuples);
      const snapshot = [...new Headers(returned)];
      const handler = createFetchHandler(
        c.router({ json: headerContract.json }),
        {
          json: async (_, { responseHeaders }) => {
            responseHeaders.set('x-shared', 'context');
            responseHeaders.set('x-context', 'context');
            return { status: 200, body: { ok: true }, headers: returned };
          },
        },
        { responseValidation },
      );
      const response = await handler(
        new Request('http://localhost/returned-json'),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(response.headers.get('x-returned')).toBe('returned');
      expect(response.headers.get('X-SHARED')).toBe('context');
      expect(response.headers.get('x-context')).toBe('context');
      expect(response.headers.get('content-type')).toBe('application/json');
      expect([...new Headers(returned)]).toEqual(snapshot);
    },
  );

  it.each(['tuples', 'Headers'])(
    'preserves returned and context cookies from $shape without mutating input',
    async (shape) => {
      const cookies = [
        'returned=one; Expires=Thu, 21 Oct 2027 07:28:00 GMT; Path=/',
        'returned=two; Path=/other',
        'context=one; Expires=Fri, 22 Oct 2027 07:28:00 GMT; Path=/',
        'context=two; Path=/other',
      ];
      const tuples: [string, string][] = cookies
        .slice(0, 2)
        .map((cookie) => ['Set-Cookie', cookie]);
      const returned = shape === 'tuples' ? tuples : new Headers(tuples);
      const snapshot = new Headers(returned).getSetCookie();
      let originalContext: Headers | undefined;
      const handler = createFetchHandler(
        c.router({ json: headerContract.json }),
        {
          json: async (_, { responseHeaders }) => {
            originalContext = responseHeaders;
            for (const cookie of cookies.slice(2))
              responseHeaders.append('set-cookie', cookie);
            return { status: 200, body: { ok: true }, headers: returned };
          },
        },
      );
      const response = await handler(
        new Request('http://localhost/returned-json'),
      );
      expect(response.headers.getSetCookie()).toEqual(cookies);
      expect(new Headers(returned).getSetCookie()).toEqual(snapshot);
      expect(originalContext?.getSetCookie()).toEqual(cookies.slice(2));
    },
  );

  it.each([true, false])(
    'retains native body and content-type policies (validation: %s)',
    async (responseValidation) => {
      const headers = {
        'x-returned': 'present',
        'content-type': 'caller/type',
      };
      const handler = createFetchHandler(
        headerContract,
        {
          json: async () => ({ status: 200, body: { ok: true }, headers }),
          text: async () => ({ status: 200, body: 'plain', headers }),
          blob: async () => ({
            status: 200,
            body: new Blob(['binary'], { type: 'image/example' }),
            headers,
          }),
          empty: async () => ({ status: 204, body: undefined, headers }),
        },
        { responseValidation },
      );
      for (const [path, status, body, contentType] of [
        ['json', 200, '{"ok":true}', 'application/json'],
        ['text', 200, 'plain', 'text/plain'],
        ['blob', 200, 'binary', 'image/example'],
        ['empty', 204, '', 'caller/type'],
      ] as const) {
        const response = await handler(
          new Request('http://localhost/returned-' + path),
        );
        expect(response.status).toBe(status);
        expect(await response.text()).toBe(body);
        expect(response.headers.get('x-returned')).toBe('present');
        expect(response.headers.get('content-type')).toBe(contentType);
      }
      expect(headers['content-type']).toBe('caller/type');
    },
  );

  it('runs response middleware and CORS after merging returned headers', async () => {
    const router = tsr
      .routerBuilder(c.router({ json: headerContract.json }))
      .responseHandler((response) => {
        response.headers.set('x-returned', 'middleware');
      })
      .route('json', async () => ({
        status: 200,
        body: { ok: true },
        headers: {
          'x-returned': 'handler',
          'access-control-expose-headers': 'x-returned',
        },
      }));
    const handler = createFetchHandler(
      c.router({ json: headerContract.json }),
      router,
      {
        cors: { origin: 'https://client.example' },
      },
    );
    const response = await handler(
      new Request('http://localhost/returned-json', {
        headers: { origin: 'https://client.example' },
      }),
    );
    expect(response.headers.get('x-returned')).toBe('middleware');
    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://client.example',
    );
    expect(response.headers.get('access-control-expose-headers')).toBe(
      'x-returned',
    );
  });
});
