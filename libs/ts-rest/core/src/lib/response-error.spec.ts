import type { Equal, Expect } from './test-helpers';
import { FlattenAppRouter, initContract } from './dsl';
import { z } from 'zod';
import { TsRestResponseError } from './response-error';
import { HTTPStatusCode } from './status-codes';

const c = initContract();

const contract = c.router(
  {
    posts: {
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: z.object({
            id: z.number(),
            content: z.string(),
          }),
        },
      },
    },
    users: {
      getUser: {
        method: 'GET',
        path: '/users/:id',
        responses: {
          200: z.object({
            id: z.number(),
            name: z.string(),
          }),
        },
      },
    },
  },
  {
    commonResponses: {
      404: z.object({
        message: z.string(),
      }),
    },
  },
);

const notFoundResponse = c.type<{ message: string }>();
const deeplyNestedContract = c.router({
  posts: {
    details: {
      get: {
        method: 'GET',
        path: '/deep/posts/:id',
        responses: {
          200: c.type<{ title: string }>(),
          404: notFoundResponse,
          409: c.type<{ postConflict: string }>(),
        },
      },
    },
  },
  users: {
    byId: {
      details: {
        get: {
          method: 'GET',
          path: '/deep/users/:id',
          responses: {
            201: c.type<{ name: string }>(),
            404: notFoundResponse,
            409: c.type<{ userConflict: number }>(),
          },
        },
      },
    },
  },
  empty: {},
});

describe('TsRestResponseError', () => {
  it('infers only identical common responses across deeply nested branches', () => {
    type FlattenedRoutes = Expect<
      Equal<
        FlattenAppRouter<typeof deeplyNestedContract>,
        | typeof deeplyNestedContract.posts.details.get
        | typeof deeplyNestedContract.users.byId.details.get
      >
    >;
    type CommonResponse = Expect<
      Equal<
        ConstructorParameters<
          typeof TsRestResponseError<typeof deeplyNestedContract>
        >[1],
        { status: 404; body: { message: string } }
      >
    >;
    const error = new TsRestResponseError(deeplyNestedContract, {
      status: 404,
      body: { message: 'Nested resource missing' },
    });
    expect(error.statusCode).toBe(404);
    expect(error.body).toEqual({ message: 'Nested resource missing' });
    expect(error.message).toBe('Nested resource missing');
  });

  it('correctly sets response type for single endpoint', () => {
    type ResponseType = Expect<
      Equal<
        ConstructorParameters<
          typeof TsRestResponseError<typeof contract.posts.getPost>
        >[1],
        | { status: 200; body: { id: number; content: string } }
        | { status: 404; body: { message: string } }
        | { status: Exclude<HTTPStatusCode, 200 | 404>; body: unknown }
      >
    >;
  });

  it('correctly sets response type for entire contract', () => {
    type ResponseType = Expect<
      Equal<
        ConstructorParameters<typeof TsRestResponseError<typeof contract>>[1],
        { status: 404; body: { message: string } }
      >
    >;
  });
});
