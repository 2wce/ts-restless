import { vi, type Mock } from 'vitest';
import fetchMock from '@fetch-mock/vitest';
import {
  FetchOptions,
  StandardSchemaV1,
  HTTPStatusCode,
  initContract,
  OverrideableClientArgs,
} from '..';
import {
  ApiFetcherArgs,
  initClient,
  getCompleteUrl,
  evaluateFetchApiArgs,
  executeQueryRequest,
  fetchApi,
  tsRestFetchApi,
} from './client';
import { Equal, Expect } from './test-helpers';
import { z } from 'zod';
import { StandardSchemaError } from './validation-error';
import * as v from 'valibot';

const c = initContract();

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  published: z.boolean(),
  authorId: z.string(),
});
export type Post = z.infer<typeof postSchema>;

export type User = {
  id: string;
  email: string;
  name: string | null;
};

const postsRouter = c.router({
  getPost: {
    method: 'GET',
    path: `/posts/:id`,
    headers: {
      'x-api-key': z.string().optional(),
    },
    responses: {
      200: postSchema.nullable(),
    },
  },
  getPostWithCoercedParams: {
    method: 'GET',
    path: `/posts/:id`,
    pathParams: z.object({
      id: z.coerce.number().optional(),
    }),
    responses: {
      200: postSchema.nullable(),
    },
  },
  getPosts: {
    method: 'GET',
    path: '/posts',
    headers: {
      'x-pagination': z.coerce.number().optional(),
    },
    responses: {
      200: c.type<Post[]>(),
    },
    query: z.object({
      take: z.number().optional(),
      skip: z.number().optional(),
      order: z.string().optional(),
    }),
  },
  createPost: {
    method: 'POST',
    path: '/posts',
    responses: {
      200: c.type<Post>(),
    },
    body: z.object({
      title: z.string(),
      content: z.string(),
      published: z.boolean().optional(),
      description: z.string().optional(),
      authorId: z.string(),
    }),
  },
  echoPostXForm: {
    method: 'POST',
    path: '/echo',
    contentType: 'application/x-www-form-urlencoded',
    body: z.object({
      foo: z.string(),
      bar: z.string(),
    }),
    responses: {
      200: c.otherResponse({
        contentType: 'text/plain',
        body: z.string(),
      }),
    },
  },
  mutationWithQuery: {
    method: 'POST',
    path: '/posts',
    responses: {
      200: c.type<Post>(),
    },
    body: z.object({}),
    query: z.object({
      test: z.string(),
    }),
  },
  updatePost: {
    method: 'PUT',
    path: `/posts/:id`,
    responses: {
      200: c.type<Post>(),
    },
    body: z.object({
      title: z.string(),
      content: z.string(),
      published: z.boolean().optional(),
      description: z.string().optional(),
      authorId: z.string(),
    }),
  },
  patchPost: {
    method: 'PATCH',
    path: `/posts/:id`,
    responses: {
      200: c.type<Post>(),
    },
    headers: {
      'content-type': z.literal('application/merge-patch+json'),
    },
    body: z.object({}).passthrough(),
  },
  deletePost: {
    method: 'DELETE',
    path: `/posts/:id`,
    body: c.noBody(),
    responses: {
      204: c.noBody(),
    },
  },
  deletePostUndefinedBody: {
    method: 'DELETE',
    path: `/posts/:id`,
    responses: {
      204: c.noBody(),
    },
  },
});

// Three endpoints, two for posts, and one for health
export const router = c.router(
  {
    posts: postsRouter,
    health: {
      method: 'GET',
      path: '/health',
      responses: {
        200: c.type<{ message: string }>(),
      },
    },
    upload: {
      method: 'POST',
      path: '/upload',
      body: c.type<{ file: File }>(),
      responses: {
        200: c.type<{ message: string }>(),
      },
      contentType: 'multipart/form-data',
    },
    uploadArray: {
      method: 'POST',
      path: '/upload-array',
      body: c.type<{ files: File[] }>(),
      responses: {
        200: c.type<{ message: string }>(),
      },
      contentType: 'multipart/form-data',
    },
  },
  {
    baseHeaders: {
      'x-api-key': z.string(),
      'x-test': z.string().optional(),
      'base-header': z.string().optional(),
    },
  },
);

const routerStrict = c.router(router, {
  strictStatusCodes: true,
});

const client = initClient(router, {
  baseUrl: 'https://api.com/',
  baseHeaders: {
    'X-Api-Key': 'foo',
  },
});

const clientWithoutBaseHeaders = initClient(router, {
  baseUrl: 'https://api.com',
});

const clientStrict = initClient(routerStrict, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'X-Api-Key': 'foo',
  },
});

/**
 * @name ClientGetPostsWithBaseHeaders
 * Expect the client.posts.getPosts parameters to be optional when base headers are provided,
 * allowing all headers to be optional since they're merged with base headers
 */
type ClientGetPostsWithBaseHeaders = Parameters<
  typeof client.posts.getPosts
>[0];
type TestClientGetPostsWithBaseHeaders = Expect<
  Equal<
    ClientGetPostsWithBaseHeaders,
    | {
        query?: {
          take?: number;
          skip?: number;
          order?: string;
        };
        headers?: {
          'x-pagination'?: number;
          'x-test'?: string;
          'base-header'?: string;
          'x-api-key'?: string;
        };
        extraHeaders?: {
          'x-pagination'?: undefined;
          'x-test'?: undefined;
          'base-header'?: undefined;
          'x-api-key'?: undefined;
        } & Record<string, string>;
        fetchOptions?: FetchOptions;
        overrideClientOptions?: Partial<OverrideableClientArgs>;
        cache?: FetchOptions['cache'];
      }
    | undefined
  >
>;

it('should require header when no base headers are provided', () => {
  type Actual = Parameters<typeof clientWithoutBaseHeaders.posts.getPosts>[0];
  type Assert = Expect<
    Equal<
      Actual,
      {
        query?: {
          take?: number;
          skip?: number;
          order?: string;
        };
        headers: {
          'x-pagination'?: number;
          'x-test'?: string;
          'base-header'?: string;
          'x-api-key': string;
        };
        extraHeaders?: {
          'x-pagination'?: undefined;
          'x-test'?: undefined;
          'base-header'?: undefined;
          'x-api-key'?: undefined;
        } & Record<string, string>;
        fetchOptions?: FetchOptions;
        overrideClientOptions?: Partial<OverrideableClientArgs>;
        cache?: FetchOptions['cache'];
      }
    >
  >;
});

/**
 * @name ClientGetPostWithParams
 * Expect the client.posts.getPost parameters to require params for path parameters,
 * while headers remain optional due to base headers being provided
 */
type ClientGetPostWithParams = Omit<
  Parameters<typeof client.posts.getPost>[0],
  'next'
>;
type TestClientGetPostWithParams = Expect<
  Equal<
    ClientGetPostWithParams,
    {
      params: {
        id: string;
      };
      headers?: {
        'x-test'?: string;
        'base-header'?: string;
        'x-api-key'?: string;
      };
      extraHeaders?: {
        'x-test'?: never;
        'base-header'?: never;
        'x-api-key'?: never;
      } & Record<string, string>;
      fetchOptions?: FetchOptions;
      overrideClientOptions?: Partial<OverrideableClientArgs>;
      cache?: FetchOptions['cache'];
    }
  >
>;

/**
 * @name RouterStrictStatusCodesHealth
 * Expect the router with strict status codes to have strictStatusCodes property set to true
 * for the health endpoint
 */
type RouterStrictStatusCodesHealth =
  (typeof routerStrict.health)['strictStatusCodes'];
type TestRouterStrictStatusCodesHealth = Expect<
  Equal<RouterStrictStatusCodesHealth, true>
>;

/**
 * @name RouterStrictStatusCodesGetPost
 * Expect the router with strict status codes to have strictStatusCodes property set to true
 * for the nested posts.getPost endpoint
 */
type RouterStrictStatusCodesGetPost =
  (typeof routerStrict.posts.getPost)['strictStatusCodes'];
type TestRouterStrictStatusCodesGetPost = Expect<
  Equal<RouterStrictStatusCodesGetPost, true>
>;

/**
 * @name ClientStrictHealthResponse
 * Expect the strict client health response to have exact status code type (200) instead of union,
 * demonstrating strict status code enforcement
 */
type ClientStrictHealthResponse = Awaited<
  ReturnType<typeof clientStrict.health>
>;
type TestClientStrictHealthResponse = Expect<
  Equal<
    ClientStrictHealthResponse,
    { status: 200; body: { message: string }; headers: Headers }
  >
>;

describe('client', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockGlobal();
  });

  describe('get', () => {
    it('w/ no parameters', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts',
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPosts({});

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ no query parameters', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts',
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPosts({ query: {} });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ no parameters (not provided)', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts',
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPosts();

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ query parameters', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts?take=10',
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPosts({ query: { take: 10 } });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ json query parameters', async () => {
      const client = initClient(
        c.router({
          getPosts: {
            ...postsRouter.getPosts,
            query: postsRouter.getPosts.query.extend({
              published: z.boolean(),
              filter: z.object({
                title: z.string(),
              }),
            }),
          },
        }),
        {
          baseUrl: 'https://api.com',
          baseHeaders: {},
          jsonQuery: true,
        },
      );

      const value = { key: 'value' };
      fetchMock.route({
        url: `https://api.com/posts?take=10&order=asc&published=true&filter=${encodeURIComponent(
          '{"title":"test"}',
        )}`,
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.getPosts({
        query: {
          take: 10,
          order: 'asc',
          published: true,
          filter: { title: 'test' },
        },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ undefined query parameters', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts?take=10',
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPosts({
        query: { take: 10, skip: undefined },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
    });

    it('w/ sub path', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts/1',
        response: { body: value, status: 200 },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPost({ params: { id: '1' } });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
    });

    describe('coerced params', () => {
      it('w/ sub path with non zero', async () => {
        const value = { key: 'value' };
        fetchMock.route({
          url: 'https://api.com/posts/1',
          response: { body: value, status: 200 },
          method: 'GET',
          repeat: 1,
        });

        const result = await client.posts.getPostWithCoercedParams({
          params: { id: 1 },
        });

        expect(result.body).toStrictEqual(value);
        expect(result.status).toBe(200);
        expect(result.headers.get('Content-Length')).toBe('15');
      });

      it('w/ sub path with zero', async () => {
        const value = { key: 'value' };
        fetchMock.route({
          url: 'https://api.com/posts/0',
          response: { body: value, status: 200 },
          method: 'GET',
          repeat: 1,
        });

        const result = await client.posts.getPostWithCoercedParams({
          params: { id: 0 },
        });

        expect(result.body).toStrictEqual(value);
        expect(result.status).toBe(200);
        expect(result.headers.get('Content-Length')).toBe('15');
      });

      it('w/ sub path with undefined', async () => {
        const value = { key: 'value' };
        fetchMock.route({
          url: 'https://api.com/posts/undefined',
          response: { body: value, status: 200 },
          method: 'GET',
          repeat: 1,
        });

        const result = await client.posts.getPostWithCoercedParams({
          params: { id: undefined },
        });

        expect(result.body).toStrictEqual(value);
        expect(result.status).toBe(200);
        expect(result.headers.get('Content-Length')).toBe('15');
      });
    });

    it('w/ a non json response (string, text/plain)', async () => {
      fetchMock.route({
        url: 'https://api.com/posts',
        response: {
          headers: {
            'Content-Type': 'text/plain',
          },
          body: 'string',
          status: 200,
        },
        method: 'GET',
        repeat: 1,
      });

      const result = await client.posts.getPosts({});

      expect(result.body).toStrictEqual('string');
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('6');
      expect(result.headers.get('Content-Type')).toBe('text/plain');
    });
  });

  it('w/ a non json response (string, text/html)', async () => {
    fetchMock.route({
      url: 'https://api.com/posts',
      response: {
        headers: {
          'Content-Type': 'text/html',
        },
        body: 'string',
        status: 200,
      },
      method: 'GET',
      repeat: 1,
    });

    const result = await client.posts.getPosts({});

    expect(result.body).toStrictEqual('string');
    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Length')).toBe('6');
    expect(result.headers.get('Content-Type')).toBe('text/html');
  });

  describe('post', () => {
    it('w/ body', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts',
        headers: {
          'Content-Type': 'application/json',
        },
        response: { body: value, status: 200 },
        method: 'POST',
        repeat: 1,
      });

      const result = await client.posts.createPost({
        body: { title: 'title', content: 'content', authorId: 'authorId' },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });

    it('w/ query params', async () => {
      fetchMock.route({
        url: 'https://api.com/posts?test=test',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {},
        response: { body: {}, status: 200 },
        method: 'POST',
        repeat: 1,
      });

      const result = await client.posts.mutationWithQuery({
        query: { test: 'test' },
        body: {},
      });

      expect(result.body).toStrictEqual({});
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('2');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('put', () => {
    it('w/ sub path and body', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/posts/1',
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          title: 'title',
          content: 'content',
          authorId: 'authorId',
        },
        response: { body: value, status: 200 },
        method: 'PUT',
        repeat: 1,
      });

      const result = await client.posts.updatePost({
        params: { id: '1' },
        body: { title: 'title', content: 'content', authorId: 'authorId' },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('patch', () => {
    it('w/ body', async () => {
      const value = { key: 'value' };

      fetchMock.route({
        url: 'https://api.com/posts/1',
        response: ({ options: req }) => ({
          body: {
            contentType: (req.headers as any)['content-type'],
            reqBody: JSON.parse(req.body as string),
          },
          status: 200,
        }),
        method: 'PATCH',
        repeat: 1,
      });

      const result = await client.posts.patchPost({
        params: { id: '1' },
        headers: {
          'content-type': 'application/merge-patch+json',
        },
        body: value,
      });

      expect(result.body).toEqual({
        contentType: 'application/merge-patch+json',
        reqBody: value,
      });
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('delete', () => {
    it('w/ no body', async () => {
      fetchMock.route({
        url: 'https://api.com/posts/1',
        response: { status: 204 },
        method: 'DELETE',
        repeat: 1,
        includeContentLength: false,
      });

      const result = await client.posts.deletePost({
        params: { id: '1' },
      });

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(result.headers.has('Content-Length')).toBe(false);
      expect(result.headers.has('Content-Type')).toBe(false);
    });

    it('w/ undefined body', async () => {
      fetchMock.route({
        url: 'https://api.com/posts/1',
        response: { status: 204 },
        method: 'DELETE',
        repeat: 1,
        includeContentLength: false,
      });

      const result = await client.posts.deletePostUndefinedBody({
        params: { id: '1' },
      });

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(result.headers.has('Content-Length')).toBe(false);
      expect(result.headers.has('Content-Type')).toBe(false);
    });

    it('w/ undefined body and content-type json', async () => {
      fetchMock.route({
        url: 'https://api.com/posts/2',
        response: {
          status: 204,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
          },
        },
        method: 'DELETE',
        repeat: 1,
        includeContentLength: false,
      });

      const result = await client.posts.deletePostUndefinedBody({
        params: { id: '2' },
      });

      expect(result.body).toBeUndefined();
      expect(result.status).toBe(204);
      expect(result.headers.has('Content-Length')).toBe(false);
      expect(result.headers.get('Content-Type')).toBe(
        'application/json; charset=utf-8',
      );
    });
  });

  describe('multipart/form-data', () => {
    it('w/ body', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/upload',
        response: { body: value, status: 200 },
        method: 'POST',
        repeat: 1,
      });

      const file = new File([''], 'filename', { type: 'text/plain' });

      const result = await client.upload({
        body: { file },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');

      expect(fetchMock).toHaveLastFetched('*', {
        matcherFunction: ({ options }) => {
          const formData = options.body as FormData;
          return formData.get('file') === file;
        },
      });
    });

    it('w/ FormData', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/upload',
        response: { body: value, status: 200 },
        method: 'POST',
        repeat: 1,
      });

      const formData = new FormData();
      formData.append('test', 'test');

      const result = await client.upload({
        body: formData,
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');

      expect(fetchMock).toHaveLastFetched('*', {
        matcherFunction: ({ options }) => {
          const formData = options.body as FormData;
          return formData.get('test') === 'test';
        },
      });
    });

    it('w/ File Array', async () => {
      const value = { key: 'value' };
      fetchMock.route({
        url: 'https://api.com/upload-array',
        response: { body: value, status: 200 },
        method: 'POST',
        repeat: 1,
      });

      const files = [
        new File([''], 'filename-1', { type: 'text/plain' }),
        new File([''], 'filename-2', { type: 'text/plain' }),
      ];

      const result = await client.uploadArray({
        body: { files },
      });

      expect(result.body).toStrictEqual(value);
      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Length')).toBe('15');
      expect(result.headers.get('Content-Type')).toBe('application/json');

      expect(fetchMock).toHaveLastFetched('*', {
        matcherFunction: ({ options }) => {
          const formData = options.body as FormData;
          const formDataFiles = formData.getAll('files');
          return formDataFiles[0] === files[0] && formDataFiles[1] === files[1];
        },
      });
    });
  });

  describe('application/x-www-form-urlencoded', () => {
    it('w/object', async () => {
      fetchMock.route({
        url: 'https://api.com/echo',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        response: ({ options: req }) => {
          expect(req.body).toBeInstanceOf(URLSearchParams);

          return {
            body: req.body!.toString(),
            status: 200,
          };
        },
        method: 'POST',
        repeat: 1,
      });

      const result = await client.posts.echoPostXForm({
        body: {
          foo: 'foo',
          bar: 'bar',
        },
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe(
        'text/plain;charset=UTF-8',
      );
      expect(result.body).toBe('foo=foo&bar=bar');
    });

    it('w/string', async () => {
      fetchMock.route({
        url: 'https://api.com/echo',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        response: ({ options: req }) => {
          expect(typeof req.body).toBe('string');

          return {
            body: req.body,
            status: 200,
          };
        },
        method: 'POST',
        repeat: 1,
      });

      const result = await client.posts.echoPostXForm({
        body: 'foo=foo&bar=bar',
      });

      expect(result.status).toBe(200);
      expect(result.headers.get('Content-Type')).toBe(
        'text/plain;charset=UTF-8',
      );
      expect(result.body).toBe('foo=foo&bar=bar');
    });
  });

  describe('next', () => {
    it('should include "next" property in the fetch request', async () => {
      const client = initClient(router, {
        baseHeaders: {},
        baseUrl: 'http://localhost:5002',
      });

      globalThis.fetch = vi.fn(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              id: '1',
              name: 'John',
              email: 'some@email',
            }),
          headers: new Headers({
            'content-type': 'application/json',
          }),
        } as Response),
      );

      await client.posts.getPost({
        params: { id: '1' },
        fetchOptions: {
          next: {
            revalidate: 1,
            tags: ['user1'],
          },
        } as RequestInit,
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:5002/posts/1',
        {
          cache: undefined,
          headers: {},
          body: undefined,
          credentials: undefined,
          method: 'GET',
          signal: undefined,
          next: {
            revalidate: 1,
            tags: ['user1'],
          },
        },
      );
      (globalThis.fetch as Mock).mockClear();
    });
  });
});

const argsCalledMock = vi.fn();

const customClient = initClient(router, {
  baseUrl: 'https://api.com',
  baseHeaders: {
    'Base-Header': 'foo',
  },
  api: async (
    args: ApiFetcherArgs & { uploadProgress?: (progress: number) => void },
  ) => {
    args.uploadProgress?.(10);

    // Do something with the path, body, etc.

    args.uploadProgress?.(100);

    argsCalledMock(args);

    return {
      status: 200,
      body: { message: 'Hello' },
      headers: new Headers(),
    };
  },
});

/**
 * @name CustomClientGetPostsWithUploadProgress
 * Expect the custom client.posts.getPosts to include uploadProgress callback in parameters
 * when using a custom API implementation that supports upload progress tracking
 */
type CustomClientGetPostsWithUploadProgress = Pick<
  Parameters<typeof customClient.posts.getPosts>[0],
  'uploadProgress'
>;
type TestCustomClientGetPostsWithUploadProgress = Expect<
  Equal<
    CustomClientGetPostsWithUploadProgress,
    {
      uploadProgress?: (progress: number) => void;
    }
  >
>;

describe('custom api', () => {
  beforeEach(() => {
    argsCalledMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockGlobal();
  });

  it('should allow a uploadProgress attribute on the api call', async () => {
    const uploadProgress = vi.fn();
    await customClient.posts.getPost({
      params: { id: '1' },
      uploadProgress,
    });
    expect(uploadProgress).toBeCalledWith(10);
    expect(uploadProgress).toBeCalledWith(100);

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        uploadProgress,
      }),
    );
  });

  it('should allow extra headers to be passed in', async () => {
    await customClient.posts.getPost({
      params: { id: '1' },
      headers: {
        'x-test': 'test',
      },
    });

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        headers: {
          'base-header': 'foo',
          'x-test': 'test',
        },
      }),
    );
  });

  it('extra headers should override base headers', async () => {
    await customClient.posts.getPost({
      params: { id: '1' },
      headers: {
        'base-header': 'bar',
      },
      extraHeaders: {
        'content-type': 'application/html',
      },
    });

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        headers: {
          'base-header': 'bar',
          'content-type': 'application/html',
        },
      }),
    );
  });

  it('works for mutations', async () => {
    await customClient.posts.mutationWithQuery({
      query: { test: 'test' },
      body: {},
      headers: {
        'x-api-key': '123',
        'x-test': 'test',
      },
      uploadProgress: () => {
        // noop
      },
    });

    expect(argsCalledMock).toBeCalledWith(
      expect.objectContaining({
        headers: {
          'x-api-key': '123',
          'base-header': 'foo',
          'content-type': 'application/json',
          'x-test': 'test',
        },
        uploadProgress: expect.any(Function),
      }),
    );
  });

  it('has correct types when throwOnUnknownStatus only is configured', async () => {
    const client = initClient(router, {
      baseUrl: 'https://api.com',
      baseHeaders: {
        'X-Api-Key': 'foo',
      },
      throwOnUnknownStatus: true,
    });

    fetchMock.route({
      url: 'https://api.com/posts',
      response: { status: 200 },
      method: 'GET',
      repeat: 1,
    });

    const result = await client.posts.getPosts({});

    /**
     * @name ClientResponseStatusWithThrowOnUnknownStatus
     * Expect the response status to be HTTPStatusCode union when throwOnUnknownStatus is enabled,
     * allowing any valid HTTP status code but enabling runtime validation
     */
    type ClientResponseStatusWithThrowOnUnknownStatus = typeof result.status;
    type TestClientResponseStatusWithThrowOnUnknownStatus = Expect<
      Equal<ClientResponseStatusWithThrowOnUnknownStatus, HTTPStatusCode>
    >;
  });

  it('has correct types when strictStatusCode is configured', async () => {
    fetchMock.route({
      url: 'https://api.com/posts',
      response: { status: 200 },
      method: 'GET',
      repeat: 1,
    });

    const result = await clientStrict.posts.getPosts({});

    /**
     * @name ClientResponseStatusWithStrictStatusCodes
     * Expect the response status to be exact literal type (200) when strictStatusCodes is enabled,
     * providing compile-time guarantees about response status codes
     */
    type ClientResponseStatusWithStrictStatusCodes = typeof result.status;
    type TestClientResponseStatusWithStrictStatusCodes = Expect<
      Equal<ClientResponseStatusWithStrictStatusCodes, 200>
    >;
  });

  it('throws an error when throwOnUnknownStatus is configured and response is unknown', async () => {
    const client = initClient(router, {
      baseUrl: 'https://isolated.com',
      baseHeaders: {
        'X-Api-Key': 'foo',
      },
      throwOnUnknownStatus: true,
    });

    fetchMock.route({
      url: 'https://isolated.com/posts',
      response: { status: 419 },
      method: 'GET',
      repeat: 1,
    });

    await expect(client.posts.getPosts({})).rejects.toThrowError(
      'Server returned unexpected response. Expected one of: 200 got: 419',
    );
  });

  it('throw an error when validateResponse is configured and response is invalid', async () => {
    const client = initClient(router, {
      baseUrl: 'https://isolated.com',
      baseHeaders: {
        'X-Api-Key': 'foo',
      },
      validateResponse: true,
    });
    fetchMock.route({
      url: 'https://isolated.com/posts/1',
      response: { status: 200, body: { key: 'invalid value' } },
      method: 'GET',
      repeat: 1,
    });

    await expect(
      client.posts.getPost({ params: { id: '1' } }),
    ).rejects.toThrowError(StandardSchemaError);
  });
});

describe('getCompleteUrl', () => {
  describe('should avoid double slashes if both path and baseUrl have trailing slashes', () => {
    it.each([
      {
        baseUrl: 'https://api.com/',
        path: '/posts/:id',
        expected: 'https://api.com/posts/123',
      },
      {
        baseUrl: 'https://api.com',
        path: '/posts/:id',
        expected: 'https://api.com/posts/123',
      },
      {
        baseUrl: 'https://api.com',
        path: '/posts/:id',
        expected: 'https://api.com/posts/123',
      },
      {
        baseUrl: 'https://api.com/',
        path: 'posts/:id',
        expected: 'https://api.com/posts/123',
      },
    ])(
      'should avoid double slashes if both path and baseUrl have trailing slashes',
      ({ baseUrl, path, expected }) => {
        const result = getCompleteUrl(
          null,
          baseUrl,
          { id: '123' },
          {
            method: 'GET' as const,
            responses: { 200: z.string() },
            path,
          },
          false,
        );

        expect(result).toBe(expected);
      },
    );
  });
});

// Compile-time Valibot inference assertions.
{
  const contractValibot = c.router(
    {
      routeBasic: {
        method: 'GET',
        path: '/route-basic',
        responses: {
          200: v.object({
            message: v.string(),
          }),
        },
      },
      routeRemovedApiKey: {
        method: 'GET',
        path: '/route-removed-api-key',
        responses: {
          200: v.object({
            message: v.string(),
          }),
        },
        headers: {
          'x-api-key': null,
        },
      },
      routeWithModifiedHeaders: {
        method: 'GET',
        path: '/route-with-modified-headers',
        responses: {
          200: v.object({
            message: v.string(),
          }),
        },
        headers: {
          'x-api-key': null, // removed this one
          'x-test': v.string(), // added this one
        },
      },
    },
    {
      baseHeaders: {
        'x-api-key': v.string(),
      },
    },
  );
  const clientValibot = initClient(contractValibot, {
    baseUrl: 'https://api.com',
  });

  /**
   * @name HeadersRequiredWhenBaseHeaders
   * Expect the headers object is required, as the contract has base headers defined
   */
  type HeadersRequiredWhenBaseHeaders = Parameters<
    typeof clientValibot.routeBasic
  >[0];
  type TestHeadersRequiredWhenBaseHeaders = Expect<
    Equal<
      HeadersRequiredWhenBaseHeaders['headers'],
      {
        'x-api-key': string;
      } // <- Required
    >
  >;

  /**
   * @name HeadersOptionalWhenBaseHeadersNullified
   * Expect the headers object is now entirely optional, as the AppRoute forced the `x-api-key`
   * header to be undefined
   */
  type HeadersOptionalWhenBaseHeadersNullified = NonNullable<
    Parameters<typeof clientValibot.routeRemovedApiKey>[0]
  >['headers'];
  type TestHeadersOptionalWhenBaseHeadersNullified = Expect<
    Equal<
      HeadersOptionalWhenBaseHeadersNullified,
      {} | undefined // <- Became optional
    >
  >;

  /**
   * @name HeadersWithModifiedHeaders
   * Expect headers to have been changed, removing the `x-api-key` header and adding the `x-test` header
   */
  type HeadersWithModifiedHeaders = NonNullable<
    Parameters<typeof clientValibot.routeWithModifiedHeaders>[0]
  >['headers'];
  type TestHeadersWithModifiedHeaders = Expect<
    Equal<
      HeadersWithModifiedHeaders,
      {
        'x-test': string;
      } // <- Required
    >
  >;
}

describe('async base headers', () => {
  afterEach(() => vi.unstubAllGlobals());

  const deferred = () => {
    let resolve!: (value: string | undefined) => void;
    const promise = new Promise<string | undefined>((fulfill) => {
      resolve = fulfill;
    });
    return { promise, resolve };
  };

  it.each(['default', 'custom', 'delegated', 'query'] as const)(
    'resolves headers before %s dispatch and validates exactly once',
    async (mode) => {
      let validations = 0;
      const schema: StandardSchemaV1<string, string> = {
        '~standard': {
          version: 1,
          vendor: 'async-headers',
          validate: (value) => {
            validations += 1;
            return { value: String(value) + '!' };
          },
        },
      };
      const contract = c.router({
        read: { method: 'GET', path: '/headers', responses: { 200: schema } },
      });
      const signal = new AbortController().signal;
      const nativeFetch = vi.fn(
        async (_url: string, _init?: RequestInit) =>
          new Response('"input"', {
            headers: { 'content-type': 'application/json' },
          }),
      );
      vi.stubGlobal('fetch', nativeFetch);
      const api = vi.fn(async (args: ApiFetcherArgs) =>
        mode === 'delegated'
          ? tsRestFetchApi(args)
          : { status: 200, body: 'input', headers: new Headers() },
      );
      const clientArgs = {
        baseUrl: 'https://headers.example',
        validateResponse: true,
        baseHeaders: {
          Authorization: async (options: Parameters<typeof fetchApi>[0]) => {
            expect(options.path).toBe('https://headers.example/headers');
            expect(options.route).toBe(contract.read);
            expect(options.fetchOptions?.signal).toBe(signal);
            expect(options.clientArgs.baseUrl).toBe('https://headers.example');
            return 'Bearer async';
          },
          'X-Static': 'static',
          'X-Sync': () => 'sync',
        },
        ...(mode === 'custom' || mode === 'delegated' ? { api } : {}),
      };
      const result =
        mode === 'query'
          ? await executeQueryRequest(
              {
                ...evaluateFetchApiArgs(contract.read, clientArgs),
                route: contract.read,
              },
              signal,
            )
          : await initClient(contract, clientArgs).read({
              fetchOptions: { signal },
            });
      expect(result.body).toBe('input!');
      expect(validations).toBe(1);
      const expectedHeaders = {
        authorization: 'Bearer async',
        'x-static': 'static',
        'x-sync': 'sync',
      };
      if (mode === 'custom' || mode === 'delegated') {
        expect(api.mock.calls[0][0].headers).toEqual(expectedHeaders);
        expect(api.mock.calls[0][0].validateResponse).toBe(false);
        expect(api.mock.calls[0][0].fetchOptions?.signal).toBe(signal);
      }
      if (mode !== 'custom') {
        expect(nativeFetch.mock.calls[0][1]?.headers).toEqual(expectedHeaders);
        expect(nativeFetch.mock.calls[0][1]?.signal).toBe(signal);
      }
    },
  );

  it('keeps mixed-case overrides and removes undefined headers after resolution', async () => {
    const route = c.router({
      read: { method: 'GET', path: '/headers', responses: { 200: c.type() } },
    }).read;
    const api = vi.fn(async (_args: ApiFetcherArgs) => ({
      status: 200,
      body: 'ok',
      headers: new Headers(),
    }));
    await fetchApi({
      ...evaluateFetchApiArgs(route, {
        baseUrl: 'https://headers.example',
        api,
        baseHeaders: {
          Authorization: async () => 'base',
          'X-Deleted': async () => 'base',
          'X-Async-Optional': async () => undefined,
          'X-Sync-Optional': () => undefined,
          'X-Duplicate': async () => 'first',
          'x-duplicate': async () => 'last',
        },
      }),
      headers: { AUTHORIZATION: 'explicit', 'x-deleted': undefined },
    });
    expect(api.mock.calls[0][0].headers).toEqual({
      authorization: 'explicit',
      'x-duplicate': 'last',
    });
  });

  it('starts callbacks concurrently and preserves entry order when they finish out of order', async () => {
    const first = deferred();
    const second = deferred();
    const started: string[] = [];
    const route = c.router({
      read: { method: 'GET', path: '/headers', responses: { 200: c.type() } },
    }).read;
    const api = vi.fn(async (_args: ApiFetcherArgs) => ({
      status: 200,
      body: 'ok',
      headers: new Headers(),
    }));
    const pending = fetchApi(
      evaluateFetchApiArgs(route, {
        baseUrl: 'https://headers.example',
        api,
        baseHeaders: {
          'X-First': () => {
            started.push('first');
            return first.promise;
          },
          'x-first': () => {
            started.push('second');
            return second.promise;
          },
        },
      }),
    );
    expect(started).toEqual(['first', 'second']);
    expect(api).not.toHaveBeenCalled();
    second.resolve('second');
    await Promise.resolve();
    expect(api).not.toHaveBeenCalled();
    first.resolve('first');
    await pending;
    expect(api.mock.calls[0][0].headers).toEqual({ 'x-first': 'second' });
  });

  it('isolates concurrent requests resolved out of order without caching or mutation', async () => {
    const first = deferred();
    const second = deferred();
    const callbacks: unknown[] = [];
    const seen: Record<string, string>[] = [];
    const contract = c.router({
      read: {
        method: 'GET',
        path: '/headers',
        query: c.type<{ id: string }>(),
        responses: { 200: c.type() },
      },
    });
    const baseHeaders = Object.freeze({
      Authorization: (options: Parameters<typeof fetchApi>[0]) => {
        callbacks.push(options.query);
        return (options.query as { id: string }).id === 'first'
          ? first.promise
          : second.promise;
      },
    });
    const client = initClient(contract, {
      baseUrl: 'https://headers.example',
      baseHeaders,
      api: async (args) => {
        seen.push(args.headers);
        return {
          status: 200,
          body: args.headers['authorization'],
          headers: new Headers(),
        };
      },
    });
    const firstRequest = client.read({ query: { id: 'first' } });
    const secondRequest = client.read({ query: { id: 'second' } });
    second.resolve('Bearer second');
    const secondResult = await secondRequest;
    first.resolve('Bearer first');
    const firstResult = await firstRequest;
    expect(secondResult.body).toBe('Bearer second');
    expect(firstResult.body).toBe('Bearer first');
    expect(callbacks).toEqual([{ id: 'first' }, { id: 'second' }]);
    expect(seen).toEqual([
      { authorization: 'Bearer second' },
      { authorization: 'Bearer first' },
    ]);
    expect(seen[0]).not.toBe(seen[1]);
    expect(typeof baseHeaders.Authorization).toBe('function');
  });

  it.each(['sync', 'async'] as const)(
    'preserves %s header failure identity and prevents transport',
    async (mode) => {
      const failure = new Error('auth failed');
      const rejected = Promise.reject<string>(failure);
      // Mark the original promise handled even while exercising the old client.
      void rejected.catch(() => undefined);
      const contract = c.router({
        read: { method: 'GET', path: '/headers', responses: { 200: c.type() } },
      });
      const api = vi.fn(async (_args: ApiFetcherArgs) => ({
        status: 200,
        body: 'ok',
        headers: new Headers(),
      }));
      const nativeFetch = vi.fn(async () => new Response('ok'));
      vi.stubGlobal('fetch', nativeFetch);
      for (const custom of [false, true]) {
        const client = initClient(contract, {
          baseUrl: 'https://headers.example',
          ...(custom ? { api } : {}),
          baseHeaders: {
            Authorization: () => {
              if (mode === 'sync') throw failure;
              return rejected;
            },
          },
        });
        await expect(client.read()).rejects.toBe(failure);
      }
      expect(api).not.toHaveBeenCalled();
      expect(nativeFetch).not.toHaveBeenCalled();
    },
  );
});

describe('validated client response contracts', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockGlobal();
  });

  it('accepts a JSON response with an explicit content type', async () => {
    const contract = c.router({
      response: {
        method: 'GET',
        path: '/other-json',
        responses: {
          200: c.otherResponse({
            contentType: 'application/json',
            body: z.object({ value: z.string() }),
          }),
        },
      },
    });
    fetchMock.get('http://localhost/other-json', {
      status: 200,
      body: { value: 'hello' },
    });
    const client = initClient(contract, {
      baseUrl: 'http://localhost',
      validateResponse: true,
    });
    await expect(client.response()).resolves.toMatchObject({
      status: 200,
      body: { value: 'hello' },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(['json', 'text', 'custom', 'delegated', 'standalone'] as const)(
    'validates %s responses exactly once, including declared errors',
    async (mode) => {
      for (const status of [200, 400]) {
        let calls = 0;
        const schema: StandardSchemaV1<string, string> = {
          '~standard': {
            version: 1,
            vendor: 'F04',
            validate: (value) => {
              calls += 1;
              return typeof value === 'string'
                ? { value: value + '!' }
                : { issues: [{ message: 'Expected string' }] };
            },
          },
        };
        const route = c.router({
          read: {
            method: 'GET',
            path: '/f04',
            responses: {
              200: c.otherResponse({ contentType: 'text/plain', body: schema }),
              400: schema,
            },
          },
        }).read;
        const native = new Response(mode === 'json' ? '"input"' : 'input', {
          status,
          headers: {
            'content-type': mode === 'json' ? 'application/json' : 'text/plain',
            'x-response': 'preserved',
          },
        });
        vi.stubGlobal('fetch', async () => native);
        const custom = { status, body: 'input', headers: native.headers };
        const api =
          mode === 'custom'
            ? async () => custom
            : mode === 'delegated'
              ? async (args: ApiFetcherArgs) => tsRestFetchApi(args)
              : undefined;
        const result =
          mode === 'standalone'
            ? await tsRestFetchApi({
                route,
                path: 'http://localhost/f04',
                method: 'GET',
                headers: {},
                body: undefined,
                rawBody: undefined,
                rawQuery: undefined,
                contentType: undefined,
                validateResponse: true,
              })
            : await initClient(
                { read: route },
                {
                  baseUrl: 'http://localhost',
                  validateResponse: true,
                  api,
                },
              ).read();
        expect(result.body).toBe('input!');
        expect(calls).toBe(1);
        expect(result.status).toBe(status);
        expect(result.headers).toBe(native.headers);
        expect(result.headers.get('x-response')).toBe('preserved');
        if (mode !== 'custom') expect(native.bodyUsed).toBe(true);
      }
    },
  );

  it.each(['text', 'binary', 'custom', 'standalone'] as const)(
    'rejects invalid %s responses',
    async (mode) => {
      const schema =
        mode === 'binary'
          ? z.instanceof(Blob).refine((value) => value.size > 5)
          : z.string().min(5);
      const route = c.router({
        read: { method: 'GET', path: '/f04', responses: { 200: schema } },
      }).read;
      vi.stubGlobal(
        'fetch',
        async () =>
          new Response('bad', {
            headers: {
              'content-type':
                mode === 'binary' ? 'application/octet-stream' : 'text/plain',
            },
          }),
      );
      const pending =
        mode === 'standalone'
          ? tsRestFetchApi({
              route,
              path: 'http://localhost/f04',
              method: 'GET',
              headers: {},
              body: undefined,
              rawBody: undefined,
              rawQuery: undefined,
              contentType: undefined,
              validateResponse: true,
            })
          : initClient(
              { read: route },
              {
                baseUrl: 'http://localhost',
                validateResponse: true,
                api:
                  mode === 'custom'
                    ? async () => ({
                        status: 200,
                        body: 'bad',
                        headers: new Headers(),
                      })
                    : undefined,
              },
            ).read();
      await expect(pending).rejects.toBeInstanceOf(StandardSchemaError);
    },
  );

  it('transforms a binary otherResponse and keeps schema-less responses unchanged', async () => {
    const route = c.router({
      read: {
        method: 'GET',
        path: '/f04',
        responses: {
          200: c.otherResponse({
            contentType: 'application/octet-stream',
            body: z.instanceof(Blob).transform((value) => value.size),
          }),
          201: c.type<Blob>(),
        },
      },
    }).read;
    for (const status of [200, 201]) {
      vi.stubGlobal(
        'fetch',
        async () =>
          new Response('abc', {
            status,
            headers: { 'content-type': 'application/octet-stream' },
          }),
      );
      const result = await initClient(
        { read: route },
        {
          baseUrl: 'http://localhost',
          validateResponse: true,
        },
      ).read();
      if (result.status === 200) expect(result.body).toBe(3);
      else expect((result.body as Blob).size).toBe(3);
    }
  });

  it.each([true, false, undefined])(
    'applies client/route validation precedence for %s',
    async (validateResponse) => {
      let calls = 0;
      const schema: StandardSchemaV1<string, string> = {
        '~standard': {
          version: 1,
          vendor: 'F04',
          validate: (value) => {
            calls += 1;
            return { value: String(value) + '!' };
          },
        },
      };
      const route = c.router({
        read: {
          method: 'GET',
          path: '/f04',
          responses: { 200: schema },
          validateResponseOnClient: true,
        },
      }).read;
      const original = { status: 200, body: 'input', headers: new Headers() };
      const result = await initClient(
        { read: route },
        {
          baseUrl: 'http://localhost',
          validateResponse,
          api: async () => original,
        },
      ).read();
      expect(result.body).toBe(validateResponse === false ? 'input' : 'input!');
      expect(calls).toBe(validateResponse === false ? 0 : 1);
      if (validateResponse === false) expect(result).toBe(original);
    },
  );

  it('prevents extra fetcher arguments from enabling delegate validation', async () => {
    let calls = 0;
    const schema: StandardSchemaV1<string, string> = {
      '~standard': {
        version: 1,
        vendor: 'F04',
        validate: (value) => {
          calls += 1;
          return { value: String(value) + '!' };
        },
      },
    };
    const route = c.router({
      read: {
        method: 'GET',
        path: '/f04',
        responses: { 200: schema },
        validateResponseOnClient: true,
      },
    }).read;
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response('input', { headers: { 'content-type': 'text/plain' } }),
    );
    const result = await fetchApi({
      ...evaluateFetchApiArgs(route, {
        baseUrl: 'http://localhost',
        validateResponse: true,
        api: async (args) => tsRestFetchApi(args),
      }),
      route,
      extraInputArgs: { validateResponse: true },
    });
    expect(result.body).toBe('input!');
    expect(calls).toBe(1);
  });

  it.each([
    undefined,
    'application/json',
    'text/plain',
    'application/octet-stream',
  ])(
    'normalizes declared no-body with content type %s, even when validation is disabled',
    async (contentType) => {
      const contract = c.router({
        read: { method: 'GET', path: '/f04', responses: { 200: c.noBody() } },
      });
      const native = new Response('ignored', {
        headers: contentType ? { 'content-type': contentType } : {},
      });
      vi.stubGlobal('fetch', async () => native);
      const result = await initClient(contract, {
        baseUrl: 'http://localhost',
        validateResponse: false,
      }).read();
      expect(result.body).toBeUndefined();
      expect(result.headers).toBe(native.headers);
      expect(native.bodyUsed).toBe(false);
      const custom = { status: 200, body: 'ignored', headers: native.headers };
      const customResult = await initClient(contract, {
        baseUrl: 'http://localhost',
        validateResponse: false,
        api: async () => custom,
      }).read();
      expect(customResult.body).toBeUndefined();
      expect(customResult.headers).toBe(custom.headers);
    },
  );

  it.each(['', '{broken'])(
    'preserves JSON parse failure for required JSON body %j',
    async (body) => {
      const contract = c.router({
        read: {
          method: 'GET',
          path: '/f04',
          responses: { 200: z.object({ value: z.string() }) },
        },
      });
      vi.stubGlobal(
        'fetch',
        async () =>
          new Response(body, {
            headers: { 'content-type': 'application/json' },
          }),
      );
      await expect(
        initClient(contract, {
          baseUrl: 'http://localhost',
          validateResponse: true,
        }).read(),
      ).rejects.toBeInstanceOf(SyntaxError);
    },
  );

  it.each([true, false])(
    'honors request-time validation override %s',
    async (validateResponse) => {
      let calls = 0;
      const schema: StandardSchemaV1<string, string> = {
        '~standard': {
          version: 1,
          vendor: 'F04',
          validate: (value) => {
            calls += 1;
            return { value: String(value) + '!' };
          },
        },
      };
      const route = c.router({
        read: { method: 'GET', path: '/f04', responses: { 200: schema } },
      }).read;
      const client = initClient(
        { read: route },
        {
          baseUrl: 'http://localhost',
          validateResponse: !validateResponse,
          api: async () => ({
            status: 200,
            body: 'input',
            headers: new Headers(),
          }),
        },
      );
      const result = await client.read({
        overrideClientOptions: { validateResponse },
      });
      expect(result.body).toBe(validateResponse ? 'input!' : 'input');
      expect(calls).toBe(validateResponse ? 1 : 0);
    },
  );

  it('validates custom query error bodies once before rejecting the resulting envelope', async () => {
    let calls = 0;
    const schema: StandardSchemaV1<string, string> = {
      '~standard': {
        version: 1,
        vendor: 'F04',
        validate: (value) => {
          calls += 1;
          return { value: String(value) + '!' };
        },
      },
    };
    const route = c.router({
      read: { method: 'GET', path: '/f04', responses: { 400: schema } },
    }).read;
    const headers = new Headers({ 'x-response': 'preserved' });
    const options = {
      ...evaluateFetchApiArgs(route, {
        baseUrl: 'http://localhost',
        validateResponse: true,
        api: async () => ({ status: 400, body: 'input', headers }),
      }),
      route,
    };
    const failure = await executeQueryRequest(options).catch(
      (error: unknown) => error,
    );
    expect(failure).toEqual({ status: 400, body: 'input!', headers });
    expect((failure as { headers: Headers }).headers).toBe(headers);
    expect(calls).toBe(1);
  });
});

describe('executeQueryRequest', () => {
  const route = c.router({
    read: {
      method: 'GET',
      path: '/a11',
      responses: {
        200: c.type<{ value: string }>(),
        404: c.type<{ missing: true }>(),
      },
    },
  }).read;
  it.each([200, 204, 299, 300, 404, 500, 599, 100, 600])(
    'preserves existing response identity and status policy for %s',
    async (status) => {
      const response = {
        status,
        body: { value: 'ok' },
        headers: new Headers(),
      };
      const api = vi.fn(async (_args: ApiFetcherArgs) => response);
      const options = {
        ...evaluateFetchApiArgs(route, { baseUrl: 'https://a11.example', api }),
        route,
      };
      const pending = executeQueryRequest(options);
      if (status >= 300 && status < 600)
        await expect(pending).rejects.toBe(response);
      else await expect(pending).resolves.toBe(response);
      expect(api).toHaveBeenCalledTimes(1);
    },
  );
  it('preserves all three signal precedence cases', async () => {
    const native = new AbortController();
    const request = new AbortController();
    const response = {
      status: 200,
      body: { value: 'ok' },
      headers: new Headers(),
    };
    for (const [fetchOptions, expected] of [
      [{}, native.signal],
      [{ signal: request.signal }, request.signal],
      [{ signal: undefined }, undefined],
    ] as const) {
      const api = vi.fn(async (_args: ApiFetcherArgs) => response);
      const options = {
        ...evaluateFetchApiArgs(route, { baseUrl: 'https://a11.example', api }),
        route,
        fetchOptions,
      };
      await executeQueryRequest(options, native.signal);
      expect(api.mock.calls[0][0].fetchOptions?.signal).toBe(expected);
    }
  });
  it('preserves exception identity and request-time override inputs', async () => {
    const failure = new Error('transport failed');
    const api = vi.fn(async (_args: ApiFetcherArgs) => {
      throw failure;
    });
    const options = {
      ...evaluateFetchApiArgs(
        route,
        {
          baseUrl: 'https://initial.example',
          api,
        },
        {
          params: {},
          body: undefined,
          query: undefined,
          headers: {},
          overrideClientOptions: {
            baseUrl: 'https://override.example',
            validateResponse: true,
          },
        },
      ),
      route,
    };
    await expect(executeQueryRequest(options)).rejects.toBe(failure);
    expect(api.mock.calls[0][0].path).toBe('https://override.example/a11');
    expect(api.mock.calls[0][0].validateResponse).toBe(false);
  });
});

it.each([true, false])(
  'executeQueryRequest preserves validation dispatch %s',
  async (validateResponse) => {
    let calls = 0;
    const schema: StandardSchemaV1<string, string> = {
      '~standard': {
        version: 1,
        vendor: 'A11',
        validate: (value) => {
          calls += 1;
          return { value: String(value) + '!' };
        },
      },
    };
    const route = c.router({
      read: { method: 'GET', path: '/a11', responses: { 200: schema } },
    }).read;
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify('input'), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    try {
      const options = {
        ...evaluateFetchApiArgs(route, {
          baseUrl: 'https://a11.example',
          validateResponse,
        }),
        route,
      };
      const result = await executeQueryRequest(options);
      expect(result.body).toBe(validateResponse ? 'input!' : 'input');
      expect(calls).toBe(validateResponse ? 1 : 0);
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('executeQueryRequest preserves mutation signal and custom fetcher inputs', async () => {
  const route = c.router({
    update: {
      method: 'POST',
      path: '/a11',
      body: c.type<{ value: string }>(),
      responses: { 200: c.type<{ value: string }>() },
    },
  }).update;
  const signal = new AbortController().signal;
  const response = {
    status: 200,
    body: { value: 'ok' },
    headers: new Headers(),
  };
  const api = vi.fn(async (_args: ApiFetcherArgs) => response);
  const options = {
    ...evaluateFetchApiArgs(route, { baseUrl: 'https://a11.example', api }),
    route,
    body: { value: 'input' },
    fetchOptions: { signal },
    extraInputArgs: { tenant: 'example' },
  };
  await expect(executeQueryRequest(options)).resolves.toBe(response);
  expect(api).toHaveBeenCalledTimes(1);
  expect(api.mock.calls[0][0]).toMatchObject({
    tenant: 'example',
    fetchOptions: { signal },
  });
});
