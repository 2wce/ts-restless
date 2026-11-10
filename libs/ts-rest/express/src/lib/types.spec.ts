import { z } from 'zod';
import { initContract } from '@ts-restless/core';
import {
  AppRouteImplementation,
  TsRestRequestHandler,
  TsRestExpressOptions,
} from './types';
import type { Request, RequestHandler } from 'express';
import { IncomingHttpHeaders } from 'http';

export type Equal<a, b> =
  (<T>() => T extends a ? 1 : 2) extends <T>() => T extends b ? 1 : 2
    ? true
    : false;

export type Expect<a extends true> = a;

const c = initContract();

const contract = c.router({
  postSomethingIndex: {
    method: 'POST',
    path: `/:something/index.html`,
    body: z.object({
      echoHtml: z.string(),
    }),
    query: z.object({
      extraPath: z.string().optional(),
    }),
    headers: z.object({
      'x-application-index': z.literal('index'),
    }),
    pathParams: z.object({
      something: z.string(),
    }),
    responses: {
      200: c.otherResponse({
        contentType: 'text/html',
        body: z.string().regex(/^<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>$/im),
      }),
    },
  },
});

it('should have type inference on req', () => {
  type PostIndexImplementation = AppRouteImplementation<
    typeof contract.postSomethingIndex
  >;

  type PostIndexParam = Parameters<PostIndexImplementation>[0];

  type PostIndexReq = PostIndexParam['req'];

  type PostIndexBod = PostIndexReq['body'];

  type ShouldHaveReq = Expect<Equal<PostIndexBod, unknown>>;

  type PostIndexHeaders = PostIndexReq['headers'];

  type ShouldHaveHeaders = Expect<Equal<PostIndexHeaders, IncomingHttpHeaders>>;

  type PostIndexQuery = PostIndexReq['query'];

  type ShouldHaveQuery = Expect<Equal<PostIndexQuery, Request['query']>>;

  type PostIndexParams = PostIndexReq['params'];

  type ShouldHaveParams = Expect<
    Equal<
      PostIndexParams,
      {
        something: string;
      }
    >
  >;
});

const transformedContract = c.router({
  transform: {
    method: 'POST',
    path: '/raw/:date/:optional?',
    pathParams: z.object({
      date: z.string().transform((value) => new Date(value)),
      optional: z.string().default('5').transform(Number),
    }),
    query: z.object({
      count: z.string().transform(Number),
      limit: z.string().default('10').transform(Number),
      note: z.string().optional(),
    }),
    headers: {
      'X-Count': z.string().transform(Number),
      'X-Default': z.string().default('fallback'),
      'X-Note': z.string().optional(),
    },
    body: z.object({
      value: z.string().transform(Number),
      note: z.string().optional(),
    }),
    responses: { 200: c.type<{ ok: boolean }>() },
  },
});

type RawRoute = typeof transformedContract.transform;
type RawInput = Parameters<AppRouteImplementation<RawRoute>>[0];

export type RawChannelAssertions = [
  Expect<Equal<RawInput['params']['date'], Date>>,
  Expect<Equal<RawInput['params']['optional'], number>>,
  Expect<
    Equal<RawInput['query'], { count: number; limit: number; note?: string }>
  >,
  Expect<Equal<RawInput['body'], { value: number; note?: string }>>,
  Expect<Equal<RawInput['headers']['x-count'], number>>,
  Expect<Equal<RawInput['headers']['x-default'], string>>,
  Expect<Equal<RawInput['req']['params']['date'], string>>,
  Expect<Equal<RawInput['req']['params']['optional'], string | undefined>>,
  Expect<Equal<RawInput['req']['query'], Request['query']>>,
  Expect<Equal<RawInput['req']['body'], unknown>>,
  Expect<Equal<RawInput['req']['headers'], IncomingHttpHeaders>>,
];

const nativeMiddleware: RequestHandler = (_req, _res, next) => next();
const routeMiddleware: TsRestRequestHandler<RawRoute> = (req, res, next) => {
  const date: string = req.params.date;
  const optional: string | undefined = req.params.optional;
  const query: Request['query'] = req.query;
  const body: unknown = req.body;
  const headers: IncomingHttpHeaders = req.headers;
  nativeMiddleware(req, res, next);
  // @ts-expect-error native path parameters have not been transformed
  req.params.date.getFullYear();
  // @ts-expect-error native query values are not validated numbers
  const count: number = req.query.count;
  // @ts-expect-error native headers can be absent and are not transformed numbers
  const headerCount: number = req.headers['x-count'];
  // @ts-expect-error schema defaults are not applied to native headers
  const headerDefault: string = req.headers['x-default'];
  // @ts-expect-error middleware body is unvalidated and parser-owned
  req.body.value;
  void [
    date,
    optional,
    query,
    body,
    headers,
    count,
    headerCount,
    headerDefault,
  ];
  next();
};

const middlewareOptions: TsRestExpressOptions<typeof transformedContract> = {
  globalMiddleware: [routeMiddleware, nativeMiddleware],
};

const transformedImplementation: AppRouteImplementation<RawRoute> = async ({
  req,
  params,
  query,
  body,
  headers,
}) => {
  const date: Date = params.date;
  const count: number = query.count;
  const bodyValue: number = body.value;
  const headerCount: number = headers['x-count'];
  // @ts-expect-error handler native path parameters remain strings after validation
  const nativeDate: Date = req.params.date;
  // @ts-expect-error handler native body is not a validated output
  const nativeBody: number = req.body.value;
  void [date, count, bodyValue, headerCount, nativeDate, nativeBody];
  return { status: 200, body: { ok: true } };
};
void [middlewareOptions, transformedImplementation];

const heterogeneousContract = c.router({
  transform: transformedContract.transform,
  read: {
    method: 'GET',
    path: '/read/:key',
    responses: { 200: c.type<{ value: string }>() },
  },
});
const heterogeneousOptions: TsRestExpressOptions<typeof heterogeneousContract> =
  {
    globalMiddleware: [nativeMiddleware],
    requestValidationErrorHandler: (error, req, res, next) => {
      const body: unknown = req.body;
      const headers: IncomingHttpHeaders = req.headers;
      const query: Request['query'] = req.query;
      nativeMiddleware(req, res, next);
      // @ts-expect-error validation-error callbacks receive unvalidated native bodies
      req.body.value;
      // @ts-expect-error raw headers are not transformed numbers in an error callback
      const count: number = req.headers['x-count'];
      void [body, headers, query, count];
      next(error);
    },
  };
void heterogeneousOptions;
