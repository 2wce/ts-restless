import {
  initClient,
  initContract,
  TsRestResponseError,
} from '@ts-restless/core';
import { NextRequest } from 'next/server';
import { redirect, permanentRedirect, notFound } from 'next/navigation.js';
import { z } from 'zod';
import { createNextHandler } from './ts-rest-next';
import { TsRestHttpError } from '../http-error';
import { TsRestResponse } from '../response';
import { TsRestRequest } from '../request';

const c = initContract();
const controlContract = c.router({
  control: {
    method: 'GET',
    path: '/control',
    responses: { 200: c.noBody(), 409: z.object({ message: z.string() }) },
  },
  write: {
    method: 'POST',
    path: '/write',
    body: z.object({ value: z.string() }),
    responses: { 200: z.object({ value: z.string() }) },
  },
});

const nativeSignals = [
  ['redirect', () => redirect('/destination')],
  ['permanentRedirect', () => permanentRedirect('/destination')],
  ['notFound', () => notFound()],
] as const;

function captureSignal(trigger: () => never) {
  try {
    trigger();
  } catch (error) {
    return error;
  }
  throw new Error('Next control-flow helper did not throw');
}

const contract = initContract().router({
  getItem: {
    method: 'GET',
    path: '/items/:id',
    pathParams: z.object({ id: z.coerce.number() }),
    query: z.object({ label: z.string() }),
    responses: { 200: z.object({ id: z.number(), label: z.string() }) },
  },
});

const uploadContract = initContract().router({
  upload: {
    method: 'POST',
    path: '/upload',
    contentType: 'multipart/form-data',
    body: z.object({
      title: z.string(),
      tags: z.array(z.string()),
      count: z.coerce.number(),
      file: z.instanceof(File),
    }),
    responses: {
      200: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        count: z.number(),
        fileName: z.string(),
        fileText: z.string(),
      }),
    },
  },
});

// Application-owned field decoding for the route's default `form` encoding.
const parseUploadFormData = async (request: TsRestRequest) => {
  const form = await request.formData();
  request.content = {
    title: form.get('title') ?? undefined,
    tags: form.getAll('tags'),
    count: form.get('count') ?? undefined,
    file: form.get('file') ?? undefined,
  };
};

for (const handlerType of ['app-router', 'pages-router-edge'] as const) {
  describe(`Next ${handlerType}`, () => {
    const controlRequest = (path = '/control', init?: RequestInit) => {
      const url = new URL(`http://localhost${path}`);
      if (handlerType === 'pages-router-edge') {
        url.searchParams.set('ts-rest', path.slice(1));
      }
      return new NextRequest(new Request(url, init));
    };

    for (const [name, trigger] of nativeSignals) {
      for (const origin of [
        'handler',
        'request middleware',
        'route middleware',
        'response handler',
      ] as const) {
        it(`preserves the same ${name} signal from ${origin} before application error handling`, async () => {
          const signal = captureSignal(trigger);
          let conversions = 0;
          let responseCalls = 0;
          const throwSignal = () => {
            throw signal;
          };
          const nativeHandler = createNextHandler(
            controlContract,
            {
              control: {
                middleware: origin === 'route middleware' ? [throwSignal] : [],
                handler: async () => {
                  if (origin === 'handler') throwSignal();
                  return { status: 200, body: undefined };
                },
              },
              write: async ({ body }) => ({ status: 200, body }),
            },
            {
              handlerType,
              requestMiddleware:
                origin === 'request middleware' ? [throwSignal] : [],
              responseHandlers: [
                () => {
                  if (origin === 'response handler') throwSignal();
                  responseCalls += 1;
                },
              ],
              errorHandler: () => {
                conversions += 1;
                return TsRestResponse.fromJson(
                  { converted: true },
                  { status: 499 },
                );
              },
            },
          );
          await expect(nativeHandler(controlRequest())).rejects.toBe(signal);
          expect(conversions).toBe(0);
          expect(responseCalls).toBe(0);
        });
      }
    }

    it('rethrows native signals before default error logging', async () => {
      const signal = captureSignal(() => redirect('/destination'));
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const nativeHandler = createNextHandler(
          controlContract,
          {
            control: async () => {
              throw signal;
            },
            write: async ({ body }) => ({ status: 200, body }),
          },
          { handlerType },
        );
        await expect(nativeHandler(controlRequest())).rejects.toBe(signal);
        expect(log).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
      }
    });

    it('retains ordinary error logging, HTTP errors and response middleware', async () => {
      const ordinary = new Error('ordinary failure');
      const cases = [
        {
          error: ordinary,
          status: 500,
          body: { message: 'Server Error' },
          logs: 1,
        },
        {
          error: new TsRestHttpError(409, { message: 'Conflict' }),
          status: 409,
          body: { message: 'Conflict' },
          logs: 0,
        },
        {
          error: new TsRestResponseError(controlContract.control, {
            status: 409,
            body: { message: 'Declared' },
          }),
          status: 409,
          body: { message: 'Declared' },
          logs: 0,
        },
      ];
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        for (const testCase of cases) {
          log.mockClear();
          const nativeHandler = createNextHandler(
            controlContract,
            {
              control: async () => {
                throw testCase.error;
              },
              write: async ({ body }) => ({ status: 200, body }),
            },
            {
              handlerType,
              responseValidation: true,
              cors: { origin: '*' },
              responseHandlers: [
                (response) => {
                  response.headers.set('x-response', 'retained');
                },
              ],
            },
          );
          const response = await nativeHandler(controlRequest());
          expect(response.status).toBe(testCase.status);
          expect(await response.json()).toEqual(testCase.body);
          expect(response.headers.get('access-control-allow-origin')).toBe('*');
          expect(response.headers.get('x-response')).toBe('retained');
          expect(log).toHaveBeenCalledTimes(testCase.logs);
        }
      } finally {
        log.mockRestore();
      }
    });

    it('retains custom handling of ordinary application errors', async () => {
      const ordinary = new Error('custom failure');
      const request = controlRequest();
      let handled: unknown;
      const nativeHandler = createNextHandler(
        controlContract,
        {
          control: async () => {
            throw ordinary;
          },
          write: async ({ body }) => ({ status: 200, body }),
        },
        {
          handlerType,
          errorHandler: (error, rawRequest) => {
            handled = error;
            expect(rawRequest.url).toBe('http://localhost/control');
            return TsRestResponse.fromJson({ custom: true }, { status: 503 });
          },
        },
      );
      const response = await nativeHandler(request);
      expect(handled).toBe(ordinary);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ custom: true });
    });

    it('forwards POST method, body and original NextRequest', async () => {
      const request = controlRequest('/write', {
        method: 'POST',
        body: JSON.stringify({ value: 'posted' }),
        headers: { 'content-type': 'application/json' },
      });
      const nativeHandler = createNextHandler(
        controlContract,
        {
          control: async () => ({ status: 200, body: undefined }),
          write: async ({ body }, { nextRequest, request: rawRequest }) => {
            expect(nextRequest).toBe(request);
            expect(rawRequest.method).toBe('POST');
            return { status: 200, body };
          },
        },
        { handlerType },
      );
      const response = await nativeHandler(request);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ value: 'posted' });
    });

    // Upstream ts-rest#867 reported POST arriving as GET on Node 22. Next
    // constructs route requests from a URL and init, so mirror that here.
    it('forwards method, JSON body, headers and signal from an init-built NextRequest', async () => {
      const url = new URL('http://localhost/write');
      if (handlerType === 'pages-router-edge') {
        url.searchParams.set('ts-rest', 'write');
      }
      const controller = new AbortController();
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify({ value: 'posted' }),
        headers: { 'content-type': 'application/json', 'x-trace': 'abc' },
        signal: controller.signal,
        duplex: 'half',
      });
      let forwarded: Request | undefined;
      const nativeHandler = createNextHandler(
        controlContract,
        {
          control: async () => ({ status: 200, body: undefined }),
          write: async ({ body }, { nextRequest, request: rawRequest }) => {
            expect(nextRequest).toBe(request);
            forwarded = rawRequest;
            return { status: 200, body };
          },
        },
        { handlerType },
      );
      const response = await nativeHandler(request);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ value: 'posted' });
      expect(forwarded?.method).toBe('POST');
      expect(forwarded?.headers.get('content-type')).toBe('application/json');
      expect(forwarded?.headers.get('x-trace')).toBe('abc');
      expect(forwarded?.signal.aborted).toBe(false);
      controller.abort();
      expect(forwarded?.signal.aborted).toBe(true);
    });

    it('returns 405 with Allow for methods Next forwards to an unsupported route', async () => {
      // Next calls the GET export for HEAD when HEAD is not exported.
      for (const [method, path, allow] of [
        ['HEAD', '/control', 'GET'],
        ['POST', '/control', 'GET'],
        ['GET', '/write', 'POST'],
      ] as const) {
        const nativeHandler = createNextHandler(
          controlContract,
          {
            control: async () => ({ status: 200, body: undefined }),
            write: async ({ body }) => ({ status: 200, body }),
          },
          { handlerType },
        );
        const response = await nativeHandler(controlRequest(path, { method }));
        expect(response.status).toBe(405);
        expect(response.headers.get('allow')).toBe(allow);
      }
    });

    const handler = createNextHandler(
      contract,
      {
        getItem: async ({ params, query }) => ({
          status: 200,
          body: { ...params, ...query, extra: 'removed by validation' },
        }),
      },
      { basePath: '/api', handlerType, responseValidation: true },
    );

    const requestFor = (id: string, label?: string) => {
      const url = new URL(`http://localhost/api/items/${id}`);
      if (label !== undefined) url.searchParams.set('label', label);
      if (handlerType === 'pages-router-edge') {
        url.searchParams.append('ts-rest', 'items');
        url.searchParams.append('ts-rest', id);
      }
      return new NextRequest(url);
    };

    it('reads real NextRequest path/query values and validates the response', async () => {
      const response = await handler(requestFor('42', 'example'));
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
      expect(await response.json()).toEqual({ id: 42, label: 'example' });
    });

    it('rejects invalid request data', async () => {
      const response = await handler(requestFor('invalid'));
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.pathParameterErrors.issues[0].path).toEqual(['id']);
      expect(body.queryParameterErrors.issues[0].path).toEqual(['label']);
    });

    describe('multipart request bodies', () => {
      const upload = (middleware: Array<(request: TsRestRequest) => unknown>) =>
        createNextHandler(
          uploadContract,
          {
            upload: {
              middleware,
              handler: async ({ body }, { request }) => {
                // Server body types omit File fields; read the parsed value.
                const file: File = request.content.file;
                return {
                  status: 200,
                  body: {
                    title: body.title,
                    tags: body.tags,
                    count: body.count,
                    fileName: file.name,
                    fileText: await file.text(),
                  },
                };
              },
            },
          },
          { handlerType },
        );
      const clientFor = (nativeHandler: ReturnType<typeof upload>) =>
        initClient(uploadContract, {
          baseUrl: 'http://localhost',
          api: async ({ path, method, headers, body }) => {
            const response = await nativeHandler(
              controlRequest(new URL(path).pathname, {
                method,
                headers,
                body,
              }),
            );
            return {
              status: response.status,
              body: await response.json(),
              headers: response.headers,
            };
          },
        });
      const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

      it('validates fields and files parsed by route middleware', async () => {
        const client = clientFor(upload([parseUploadFormData]));

        const result = await client.upload({
          body: { title: 'Report', tags: ['a', 'b'], count: 2, file },
        });

        expect(result).toMatchObject({
          status: 200,
          body: {
            title: 'Report',
            tags: ['a', 'b'],
            count: 2,
            fileName: 'hello.txt',
            fileText: 'hello',
          },
        });
      });

      it('reports invalid parsed fields through contract validation', async () => {
        const form = new FormData();
        form.append('title', 'Report');
        form.append('count', '2');

        const response = await upload([parseUploadFormData])(
          controlRequest('/upload', { method: 'POST', body: form }),
        );

        expect(response.status).toBe(400);
        const { bodyErrors } = await response.json();
        expect(
          bodyErrors.issues.map((issue: { path: unknown }) => issue.path),
        ).toEqual([['file']]);
      });

      it('keeps the validation response when no middleware parses the body', async () => {
        const client = clientFor(upload([]));

        const result = await client.upload({
          body: { title: 'Report', tags: [], count: 2, file },
        });

        expect(result.status).toBe(400);
        expect(result.body).toMatchObject({
          bodyErrors: { name: 'ValidationError' },
        });
      });
    });
  });
}
