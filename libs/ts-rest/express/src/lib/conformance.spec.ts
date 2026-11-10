import { initContract, TsRestResponseValidationError } from '@ts-restless/core';
import { z } from 'zod4';
import express, { ErrorRequestHandler } from 'express';
import supertest from 'supertest';
import {
  describeHttpConformance,
  httpContract,
  HttpHost,
  makeHttpHandlers,
  NativeInput,
  sendHttpRequest,
  TransformInput,
} from '../../../../../tests/conformance/http';
import { createExpressEndpoints, initServer } from './ts-rest-express';

describeHttpConformance(async (): Promise<HttpHost> => {
  const app = express();
  app.use(express.json());
  const inputs: TransformInput[] = [];
  const nativeInputs: NativeInput[] = [];
  const responseErrors: unknown[] = [];
  const handlers = makeHttpHandlers(inputs);
  const s = initServer();
  createExpressEndpoints(
    httpContract,
    s.router(httpContract, {
      ...handlers,
      transform: async (input) => {
        expect(input.req.res).toBe(input.res);
        expect(input.res.req).toBe(input.req);
        expect(input.req.tsRestRoute).toBe(httpContract.transform);
        nativeInputs.push({
          params: input.req.params,
          query: input.req.query,
          headers: input.req.headers,
          body: input.req.body,
        });
        return handlers.transform(input);
      },
    }),
    app,
    { logInitialization: false, responseValidation: true },
  );
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    _next,
  ) => {
    responseErrors.push(error);
    res.status(500).json({ message: 'response rejected by native middleware' });
  };
  app.use(errorHandler);

  return {
    inputs,
    nativeInputs,
    request: (input) => sendHttpRequest(supertest(app), input),
    // Supertest closes the temporary HTTP listener it opens for each request.
    close: async () => {},
    assertRequestError: (result, errors) => {
      const firstPath =
        errors.pathParams ?? errors.headers ?? errors.query ?? errors.body;
      expect(result.body).toMatchObject({
        name: 'ValidationError',
        issues: [expect.objectContaining({ path: [firstPath] })],
      });
      expect(result.body).not.toHaveProperty('pathParameterErrors');
    },
    assertResponseError: (result) => {
      expect(result.body).toEqual({
        message: 'response rejected by native middleware',
      });
      expect(responseErrors).toHaveLength(1);
      expect(responseErrors[0]).toBeInstanceOf(TsRestResponseValidationError);
      expect(responseErrors[0]).toMatchObject({
        appRoute: httpContract.invalidResponse,
        cause: {
          name: 'ValidationError',
          issues: [expect.objectContaining({ path: ['value'] })],
        },
      });
    },
  };
});

describe.each(['simple', 'extended'] as const)(
  'native raw request with %s query parser',
  (parser) => {
    it('keeps raw values through middleware and validation, including defaults and repeated query keys', async () => {
      const app = express();
      app.set('query parser', parser);
      app.use(express.json());
      const snapshots: {
        stage: string;
        params: unknown;
        query: unknown;
        headers: unknown;
        body: unknown;
      }[] = [];
      const inputs: TransformInput[] = [];
      const handlers = makeHttpHandlers(inputs);
      const capture = (stage: string, req: express.Request) =>
        snapshots.push({
          stage,
          params: req.params,
          query: req.query,
          headers: req.headers,
          body: req.body,
        });
      createExpressEndpoints(
        httpContract,
        initServer().router(httpContract, {
          ...handlers,
          transform: {
            middleware: [
              (req, _res, next) => {
                capture('route', req);
                next();
              },
            ],
            handler: async (input) => {
              capture('handler', input.req);
              return handlers.transform(input);
            },
          },
        }),
        app,
        {
          logInitialization: false,
          globalMiddleware: [
            (req, _res, next) => {
              capture('global', req);
              next();
            },
          ],
        },
      );
      const result = await supertest(app)
        .post(
          '/conformance/items/42/untouched?count=3&extra=one&extra=two&nested[key]=value',
        )
        .set('X-Count', '7')
        .send({ title: ' hello ' });
      expect(result.status).toBe(200);
      expect(result.body).toMatchObject({
        id: 42,
        count: 3,
        limit: 5,
        headerCount: 7,
        headerDefault: 'FALLBACK',
        title: 'HELLO',
        extraQuery: ['one', 'two'],
      });
      expect(snapshots.map((snapshot) => snapshot.stage)).toEqual([
        'global',
        'route',
        'handler',
      ]);
      for (const snapshot of snapshots) {
        expect(snapshot.params).toEqual({ id: '42', slug: 'untouched' });
        expect(snapshot.query).toEqual({
          count: '3',
          extra: ['one', 'two'],
          ...(parser === 'extended'
            ? { nested: { key: 'value' } }
            : { 'nested[key]': 'value' }),
        });
        expect(snapshot.headers).toMatchObject({ 'x-count': '7' });
        expect(snapshot.headers).not.toHaveProperty('X-Count');
        expect(snapshot.headers).not.toHaveProperty('x-default');
        expect(snapshot.body).toEqual({ title: ' hello ' });
      }
    });

    it('exposes invalid raw bodies to middleware before rejecting validation', async () => {
      const app = express();
      app.set('query parser', parser);
      app.use(express.json());
      const rawBodies: unknown[] = [];
      const inputs: TransformInput[] = [];
      const handlers = makeHttpHandlers(inputs);
      createExpressEndpoints(
        httpContract,
        initServer().router(httpContract, {
          ...handlers,
          transform: {
            middleware: [
              (req, _res, next) => {
                rawBodies.push(req.body);
                next();
              },
            ],
            handler: handlers.transform,
          },
        }),
        app,
        {
          logInitialization: false,
          globalMiddleware: [
            (req, _res, next) => {
              rawBodies.push(req.body);
              next();
            },
          ],
        },
      );
      const result = await supertest(app)
        .post('/conformance/items/42/untouched?count=3')
        .set('X-Count', '7')
        .send({ title: 42 });
      expect(result.status).toBe(400);
      expect(rawBodies).toEqual([{ title: 42 }, { title: 42 }]);
      expect(inputs).toEqual([]);
    });
  },
);

it('decodes jsonQuery only for validated arguments', async () => {
  const c = initContract();
  const contract = c.router({
    get: {
      method: 'GET',
      path: '/json-query',
      query: z.object({ count: z.number(), tags: z.array(z.string()) }),
      responses: {
        200: c.type<{
          count: number;
          tags: string[];
          rawCount: unknown;
          rawTags: unknown;
        }>(),
      },
    },
  });
  const app = express();
  createExpressEndpoints(
    contract,
    initServer().router(contract, {
      get: async ({ query, req }) => ({
        status: 200,
        body: {
          ...query,
          rawCount: req.query['count'],
          rawTags: req.query['tags'],
        },
      }),
    }),
    app,
    { logInitialization: false, jsonQuery: true },
  );
  const result = await supertest(app)
    .get('/json-query')
    .query({ count: '3', tags: '["one","two"]' });
  expect(result.status).toBe(200);
  expect(result.body).toEqual({
    count: 3,
    tags: ['one', 'two'],
    rawCount: '3',
    rawTags: '["one","two"]',
  });
});
