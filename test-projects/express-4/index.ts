import { createExpressEndpoints, initServer } from '@ts-restless/express';
import express from 'express';
import type { Request, RequestHandler } from 'express';
import type { TsRestRequestHandler } from '@ts-restless/express';
import type { IncomingHttpHeaders } from 'node:http';
import * as bodyParser from 'body-parser';
import { initContract } from '@ts-restless/core';
import { z } from 'zod';
import { toStandardSchema } from '@ts-restless/core/zod3';

const c = initContract();

const PokemonSchema = toStandardSchema(
  z.object({
    id: z.number(),
    name: z.string(),
  }),
);

const contract = c.router({
  raw: {
    method: 'POST',
    path: '/raw/:date/:optional?',
    pathParams: toStandardSchema(
      z.object({
        date: z.string().transform((value) => new Date(value)),
        optional: z.string().default('5').transform(Number),
      }),
    ),
    query: toStandardSchema(
      z
        .object({
          count: z.string().transform(Number),
          limit: z.string().default('10').transform(Number),
          note: z.string().optional(),
        })
        .passthrough(),
    ),
    headers: {
      'X-Count': toStandardSchema(z.string().transform(Number)),
      'X-Default': toStandardSchema(z.string().default('fallback')),
      'X-Note': toStandardSchema(z.string().optional()),
    },
    body: toStandardSchema(
      z.object({
        value: z.string().transform(Number),
        note: z.string().optional(),
      }),
    ),
    responses: {
      200: c.type<{
        date: string;
        optional: number;
        count: number;
        limit: number;
        headerCount: number;
        headerDefault: string;
        value: number;
      }>(),
    },
  },
  getPokemon: {
    method: 'GET',
    path: '/pokemon/:id',
    pathParams: toStandardSchema(
      z.object({
        id: z.coerce.number(),
      }),
    ),
    responses: {
      200: PokemonSchema,
    },
  },
  deletePokemon: {
    method: 'DELETE',
    path: '/pokemon/:id',
    pathParams: toStandardSchema(
      z.object({
        id: z.coerce.number(),
      }),
    ),
    responses: {
      200: c.noBody(),
    },
  },
  updatePokemon: {
    method: 'PATCH',
    path: '/pokemon/:id',
    pathParams: toStandardSchema(
      z.object({
        id: z.coerce.number(),
      }),
    ),
    body: toStandardSchema(
      z.object({
        name: z.string(),
      }),
    ),
    responses: {
      200: toStandardSchema(z.object({ message: z.string() })),
      403: toStandardSchema(z.object({ message: z.string() })),
    },
  },
});

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
export const rawRequests: {
  stage: string;
  params: unknown;
  query: unknown;
  headers: unknown;
  body: unknown;
}[] = [];
const capture = (stage: string, req: Request) =>
  rawRequests.push({
    stage,
    params: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body,
  });
const nativeMiddleware: RequestHandler = (req, _res, next) => {
  capture('route', req);
  next();
};
const rawMiddleware: TsRestRequestHandler<typeof contract.raw> = (
  req,
  res,
  next,
) => {
  type RawDate = Expect<Equal<typeof req.params.date, string>>;
  type RawOptional = Expect<
    Equal<typeof req.params.optional, string | undefined>
  >;
  type RawQuery = Expect<Equal<typeof req.query, Request['query']>>;
  type RawBody = Expect<Equal<typeof req.body, unknown>>;
  type RawHeaders = Expect<Equal<typeof req.headers, IncomingHttpHeaders>>;
  // @ts-expect-error middleware receives a native string, not a transformed Date
  const date: Date = req.params.date;
  // @ts-expect-error parser query values are not validated numbers
  const count: number = req.query.count;
  // @ts-expect-error native headers are strings/arrays/undefined, not transformed numbers
  const headerCount: number = req.headers['x-count'];
  // @ts-expect-error native header defaults are not applied
  const headerDefault: string = req.headers['x-default'];
  void [date, count, headerCount, headerDefault];
  nativeMiddleware(req, res, next);
};

export const app = express();
app.set('query parser', 'extended');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const s = initServer();

const router = s.router(contract, {
  raw: {
    middleware: [rawMiddleware],
    handler: async ({ params, query, body, headers, req }) => {
      type DateOutput = Expect<Equal<typeof params.date, Date>>;
      type OptionalDefault = Expect<Equal<typeof params.optional, number>>;
      type QueryOutput = Expect<Equal<typeof query.count, number>>;
      type BodyOutput = Expect<Equal<typeof body.value, number>>;
      type HeaderOutput = Expect<Equal<(typeof headers)['x-count'], number>>;
      // @ts-expect-error handler native params remain untransformed
      const rawDate: Date = req.params.date;
      // @ts-expect-error native body remains unknown even after validation
      const rawBody: { value: number } = req.body;
      void [rawDate, rawBody];
      capture('handler', req);
      return {
        status: 200,
        body: {
          date: params.date.toISOString(),
          optional: params.optional,
          count: query.count,
          limit: query.limit,
          headerCount: headers['x-count'],
          headerDefault: headers['x-default'],
          value: body.value,
        },
      };
    },
  },
  getPokemon: async ({ params }) => {
    return {
      status: 200,
      body: {
        id: params.id,
        name: 'Charizard',
      },
    };
  },
  deletePokemon: async () => {
    return {
      status: 200,
      body: undefined,
    };
  },
  updatePokemon: async ({ body, params }) => {
    return {
      status: 200,
      body: {
        message: `updated ${params.id} to ${body.name}`,
      },
    };
  },
});

createExpressEndpoints(contract, router, app, {
  logInitialization: false,
  globalMiddleware: [
    (req, _res, next) => {
      if (req.tsRestRoute.path === contract.raw.path) capture('global', req);
      next();
    },
  ],
});

// app.listen(8000, () => {
//   console.log(`Listening on port 8000...`);
// });
