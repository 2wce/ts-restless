/* eslint-disable @typescript-eslint/no-unused-vars */
import { z } from 'zod';
import {
  initContract,
  ContractOtherResponse,
  ContractPlainType,
  ContractPlainTypeRuntimeSymbol,
  ContractNoBodyType,
  MergeHeadersWithLegacySupport,
  AppRoute,
  AppRouteMutation,
  InferHeadersInput,
  type JsonMediaType,
} from './dsl';
import type { ClientArgs, OverrideableClientArgs } from './client';
import type {
  ClientInferRequest,
  ClientInferResponseBody,
  ServerInferRequest,
} from './infer-types';
import type { Equal, Expect } from './test-helpers';
import type { StandardSchemaV1 } from './standard-schema';
import { Prettify, type Opaque, type UnwrapOpaque } from './type-utils';
import * as v from 'valibot';

const c = initContract();

describe('contract', () => {
  it('preserves payload properties that match historical string brands', () => {
    type Payload = {
      '~ts-restless.opaque': 'user-value';
      '~ts-restless.no-body': false;
      value: string;
    };
    const route = c.mutation({
      method: 'POST',
      path: '/payload',
      body: c.type<Payload>(),
      responses: { 200: c.type<Payload>() },
    });
    type Request = Expect<
      Equal<ClientInferRequest<typeof route>['body'], Payload>
    >;
    type ServerRequest = Expect<
      Equal<ServerInferRequest<typeof route>['body'], Payload>
    >;
    type Response = Expect<
      Equal<ClientInferResponseBody<typeof route, 200>, Payload>
    >;
    type Unwrapped = Expect<
      Equal<UnwrapOpaque<Opaque<Payload, 'Fixture'>>, Payload>
    >;
    type Indexed = Expect<
      Equal<
        UnwrapOpaque<Opaque<Record<string, string>, 'Fixture'>>,
        Record<string, string>
      >
    >;
    const payload: ClientInferResponseBody<typeof route, 200> = {
      '~ts-restless.opaque': 'user-value',
      '~ts-restless.no-body': false,
      value: 'ok',
    };
    expect(payload.value).toBe('ok');
  });

  it('declares multipart encoding only on multipart mutations without changing body inference', () => {
    const upload = c.mutation({
      method: 'POST',
      path: '/upload',
      contentType: 'multipart/form-data',
      multipart: { fieldEncoding: 'legacy-json' },
      body: c.type<{ name: string; file: File }>(),
      responses: { 204: c.noBody() },
    });
    type Encoding = Expect<
      Equal<typeof upload.multipart.fieldEncoding, 'legacy-json'>
    >;
    type ClientBody = Expect<
      Equal<
        ClientInferRequest<typeof upload>['body'],
        FormData | { name: string; file: File }
      >
    >;
    type ServerBody = Expect<
      Equal<ServerInferRequest<typeof upload>['body'], { name: string }>
    >;
    const valid: AppRouteMutation = upload;
    void valid;
    const broadContentType = undefined as AppRouteMutation['contentType'];
    const existingRoute: AppRouteMutation = {
      method: 'POST',
      path: '/',
      contentType: broadContentType,
      body: c.type<string>(),
      responses: {},
    };
    void existingRoute;
    const invalidRouter = {
      invalid: {
        method: 'POST',
        path: '/',
        contentType: 'application/json',
        body: c.type<string>(),
        responses: {},
        multipart: { fieldEncoding: 'form' },
      },
    } as const;
    // @ts-expect-error routers also reject multipart policies on non-multipart routes
    c.router(invalidRouter);

    // @ts-expect-error multipart policies require multipart contentType
    c.mutation({
      method: 'POST',
      path: '/',
      body: c.type<string>(),
      responses: {},
      multipart: { fieldEncoding: 'form' as const },
    });
    // @ts-expect-error JSON routes cannot declare multipart encoding
    c.mutation({
      method: 'POST',
      path: '/',
      contentType: 'application/json',
      body: c.type<string>(),
      responses: {},
      multipart: { fieldEncoding: 'form' as const },
    });
    // @ts-expect-error URL-encoded routes cannot declare multipart encoding
    c.mutation({
      method: 'POST',
      path: '/',
      contentType: 'application/x-www-form-urlencoded',
      body: c.type<string>(),
      responses: {},
      multipart: { fieldEncoding: 'form' as const },
    });
    c.query({
      method: 'GET',
      path: '/',
      responses: {},
      // @ts-expect-error GET routes cannot declare multipart encoding
      multipart: { fieldEncoding: 'form' as const },
    });
    // @ts-expect-error bodyless DELETE routes cannot declare multipart encoding
    const invalidDelete: AppRoute = {
      method: 'DELETE',
      path: '/',
      responses: {},
      multipart: { fieldEncoding: 'form' as const },
    };
    void invalidDelete;
    c.mutation({
      method: 'POST',
      path: '/',
      contentType: 'multipart/form-data',
      body: c.type<string>(),
      responses: {},
      // @ts-expect-error route policies only admit the two declared encodings
      multipart: { fieldEncoding: 'json' },
    });
    const removedClientOption: ClientArgs = {
      baseUrl: '',
      // @ts-expect-error encoding is declared on the route
      multipartFieldEncoding: 'json',
    };
    const removedRequestOption: Partial<OverrideableClientArgs> = {
      // @ts-expect-error requests cannot override the route's wire agreement
      multipartFieldEncoding: 'native',
    };
    void [removedClientOption, removedRequestOption];
    expect(upload.multipart.fieldEncoding).toBe('legacy-json');
  });

  it('declares structured JSON request media types on mutations', () => {
    const contract = c.router({
      patch: {
        method: 'PATCH',
        path: '/users/:id',
        contentType: 'application/merge-patch+json',
        body: z.object({ name: z.string().nullable().optional() }),
        responses: { 204: c.noBody() },
      },
      operations: {
        method: 'PATCH',
        path: '/users/:id/operations',
        contentType: 'application/json-patch+json',
        body: c.type<Array<{ op: 'replace'; path: string; value: unknown }>>(),
        responses: { 204: c.noBody() },
      },
      resource: {
        method: 'POST',
        path: '/articles',
        contentType: 'application/vnd.api+json',
        body: c.type<{ data: { type: 'articles' } }>(),
        responses: { 201: c.noBody() },
      },
      json: {
        method: 'POST',
        path: '/json',
        contentType: 'application/json',
        body: c.type<{ value: string }>(),
        responses: { 201: c.noBody() },
      },
    });
    type ContentType = Expect<
      Equal<typeof contract.patch.contentType, 'application/merge-patch+json'>
    >;
    type ClientBody = Expect<
      Equal<
        ClientInferRequest<typeof contract.patch>['body'],
        { name?: string | null | undefined }
      >
    >;
    type ServerBody = Expect<
      Equal<
        ServerInferRequest<typeof contract.operations>['body'],
        Array<{ op: 'replace'; path: string; value: unknown }>
      >
    >;
    const declared: JsonMediaType[] = [
      'application/json',
      'application/merge-patch+json',
      'application/vnd.api+json',
    ];
    const broad: AppRouteMutation['contentType'][] = [
      ...declared,
      'multipart/form-data',
      'application/x-www-form-urlencoded',
      undefined,
    ];
    // @ts-expect-error structured JSON media types use the application tree
    const textJson: JsonMediaType = 'text/json';
    // @ts-expect-error only JSON media types are structured JSON
    const xml: JsonMediaType = 'application/problem+xml';
    void [declared, broad, textJson, xml];
    c.mutation({
      method: 'POST',
      path: '/',
      // @ts-expect-error mutations reject undeclared request media types
      contentType: 'text/plain',
      body: c.type<string>(),
      responses: {},
    });
    // @ts-expect-error structured JSON routes cannot declare multipart encoding
    c.mutation({
      method: 'POST',
      path: '/',
      contentType: 'application/merge-patch+json',
      body: c.type<string>(),
      responses: {},
      multipart: { fieldEncoding: 'form' as const },
    });
    expect(contract.resource.contentType).toBe('application/vnd.api+json');
  });

  it('should be typed correctly', () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: z.object({
            id: z.number(),
          }),
        },
      },
    });

    type ContractShape = typeof contract;
    type TestContractShape = Expect<
      Equal<
        ContractShape,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: z.ZodObject<
                {
                  id: z.ZodNumber;
                },
                'strip',
                z.ZodTypeAny,
                {
                  id: number;
                },
                {
                  id: number;
                }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with nested routers', () => {
    const contract = c.router({
      posts: {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: z.object({
              id: z.number(),
            }),
          },
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with headers', () => {
    const contract = c.router({
      posts: {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: z.object({
              id: z.number(),
            }),
          },
          headers: z.object({
            'x-foo': z.string(),
          }),
        },
      },
    });

    type ContractShape = typeof contract.posts.getPost;
    type TestContractShape = Expect<
      Equal<
        ContractShape,
        {
          method: 'GET';
          path: '/posts/:id';
          responses: {
            200: z.ZodObject<
              {
                id: z.ZodNumber;
              },
              'strip',
              z.ZodTypeAny,
              {
                id: number;
              },
              {
                id: number;
              }
            >;
          };
          headers: z.ZodObject<
            { 'x-foo': z.ZodString },
            'strip',
            z.ZodTypeAny,
            { 'x-foo': string },
            { 'x-foo': string }
          >;
        }
      >
    >;
  });

  it('should be typed correctly with base headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: z.ZodObject<
                { 'x-foo': z.ZodString },
                'strip',
                z.ZodTypeAny,
                { 'x-foo': string },
                { 'x-foo': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: z.object({
              'x-bar': z.string(),
            }),
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: StandardSchemaV1<
                { 'x-foo': string; 'x-bar': string },
                { 'x-foo': string; 'x-bar': string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged plain type headers', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: c.type<{ 'x-bar': string }>(),
          },
        },
      },
      {
        baseHeaders: c.type<{ 'x-foo': string }>(),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: ContractPlainType<{
                'x-foo': string;
                'x-bar': string;
              }>;
            };
          };
        }
      >
    >;
  });

  it('requires both opaque header schema inputs and infers the merged output', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
            },
            headers: z.object({
              'x-foo': z.string().optional(),
            }),
          },
        },
      },
      {
        baseHeaders: z.object({
          'x-foo': z.string(),
        }),
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
              };
              headers: StandardSchemaV1<
                { 'x-foo': string },
                { 'x-foo'?: string }
              >;
            };
          };
        }
      >
    >;
  });

  it('should be typed without zod', () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: c.type<{ id: number }>(),
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate query route', () => {
    const getPost = c.query({
      method: 'GET',
      path: '/posts/:id',
      responses: {
        200: c.type<{ id: number }>(),
      },
    });

    const contract = c.router({
      getPost,
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate mutation route', () => {
    const createPost = c.mutation({
      method: 'POST',
      path: '/posts',
      responses: {
        200: c.type<{ id: number }>(),
      },
      body: c.type<{ title: string }>(),
    });

    const contract = c.router({
      createPost,
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          createPost: {
            method: 'POST';
            path: '/posts';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
            body: ContractPlainType<{
              title: string;
            }>;
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate responses', () => {
    const responses = c.responses({
      200: c.type<{ id: number }>(),
    });

    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses,
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with separate responses with spread', () => {
    const responses = c.responses({
      200: c.type<{ id: number }>(),
    });

    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          ...responses,
        },
      },
    });

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          getPost: {
            method: 'GET';
            path: '/posts/:id';
            responses: {
              200: ContractPlainType<{
                id: number;
              }>;
            };
          };
        }
      >
    >;
  });

  it('should add strictStatusCodes=true option to routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      },
      {
        strictStatusCodes: true,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(true);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: true;
        }
      >
    >;
  });

  it('should add strictStatusCodes=false option to routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      },
      {
        strictStatusCodes: false,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(false);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: false;
        }
      >
    >;
  });

  it('should merge strictStatusCodes options correctly is route is true', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
          strictStatusCodes: true,
        },
      },
      {
        strictStatusCodes: false,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(true);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: true;
        }
      >
    >;
  });

  it('should merge strictStatusCodes options correctly if route is false', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
          strictStatusCodes: false,
        },
      },
      {
        strictStatusCodes: true,
      },
    );

    expect(contract.getPost.strictStatusCodes).toStrictEqual(false);

    type ContractShape = Expect<
      Equal<
        Pick<typeof contract.getPost, 'strictStatusCodes'>,
        {
          strictStatusCodes: false;
        }
      >
    >;
  });

  it('should merge metadata options from router to its routes', () => {
    const contract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
        deletePost: {
          method: 'DELETE',
          path: '/posts/:id',
          body: c.type<undefined>(),
          metadata: {
            requireAuth: false,
            headerName: 'x-authorization',
          },
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      },
      {
        metadata: {
          requireAuth: true,
        },
      },
    );

    expect(contract.getPost.metadata).toStrictEqual({
      requireAuth: true,
    });

    expect(contract.deletePost.metadata).toStrictEqual({
      requireAuth: false,
      headerName: 'x-authorization',
    });

    type MetadataShape = Expect<
      Equal<
        typeof contract.getPost.metadata,
        {
          requireAuth: boolean;
        }
      >
    >;

    type MetadataShape2 = Expect<
      Equal<
        Prettify<typeof contract.deletePost.metadata>,
        {
          requireAuth: boolean;
          headerName: string;
        }
      >
    >;
  });

  describe('pathPrefix', () => {
    it('Should recursively apply pathPrefix to path', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
          },
        },
        { pathPrefix: '/posts' },
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { pathPrefix: '/v1' },
      );
      expect(postsContractNested.getPost.path).toStrictEqual('/posts/:id');
      expect(postsContract.posts.getPost.path).toStrictEqual('/v1/posts/:id');

      type PostsContractNestedShape = Expect<
        Equal<
          typeof postsContractNested,
          {
            getPost: {
              path: '/posts/:id';
              method: 'GET';
              responses: { 200: ContractPlainType<{ id: string }> };
            };
          }
        >
      >;

      type PostsContractShape = Expect<
        Equal<
          typeof postsContract,
          {
            posts: {
              getPost: {
                path: '/v1/posts/:id';
                method: 'GET';
                responses: { 200: ContractPlainType<{ id: string }> };
              };
            };
          }
        >
      >;
    });
  });

  describe('validateResponseOnClient', () => {
    it('Should recursively apply validateResponseOnClient to routes', () => {
      const postsContractNested = c.router({
        getPost: {
          path: '/:id',
          method: 'GET',
          responses: { 200: c.type<{ id: string }>() },
        },
      });
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { validateResponseOnClient: true },
      );
      expect(postsContractNested.getPost).toHaveProperty(
        'validateResponseOnClient',
        undefined,
      );
      expect(postsContract.posts.getPost).toHaveProperty(
        'validateResponseOnClient',
        true,
      );
    });

    it('Should not override validateResponseOnClient if set on nested router', () => {
      const postsContractNested = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
          },
        },
        { validateResponseOnClient: false },
      );
      const postsContract = c.router(
        {
          posts: postsContractNested,
        },
        { validateResponseOnClient: true },
      );
      expect(postsContractNested.getPost).toHaveProperty(
        'validateResponseOnClient',
        false,
      );
      expect(postsContract.posts.getPost).toHaveProperty(
        'validateResponseOnClient',
        false,
      );
    });

    it('Should not override validateResponseOnClient when set directly on route', () => {
      const postsContract = c.router(
        {
          getPost: {
            path: '/:id',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
          },
          getPostDangerously: {
            path: '/:id/dangerous',
            method: 'GET',
            responses: { 200: c.type<{ id: string }>() },
            validateResponseOnClient: false,
          },
        },
        { validateResponseOnClient: true },
      );

      expect(postsContract.getPost).toHaveProperty(
        'validateResponseOnClient',
        true,
      );
      expect(postsContract.getPostDangerously).toHaveProperty(
        'validateResponseOnClient',
        false,
      );
    });
  });

  it('should set type correctly for non-json response', () => {
    const contract = c.router({
      getCss: {
        method: 'GET',
        path: '/style.css',
        responses: {
          200: c.otherResponse({
            contentType: 'text/css',
            body: c.type<string>(),
          }),
        },
      },
    });

    expect(contract.getCss.responses['200']).toEqual({
      contentType: 'text/css',
      body: ContractPlainTypeRuntimeSymbol,
    });

    type ResponseType = Expect<
      Equal<
        (typeof contract.getCss.responses)['200'],
        ContractOtherResponse<ContractPlainType<string>>
      >
    >;
  });

  it('should set type correctly for no body', () => {
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/',
        responses: {
          204: c.noBody(),
        },
      },
    });

    type ResponseType = Expect<
      Equal<(typeof contract.get.responses)['204'], ContractNoBodyType>
    >;
  });

  it('should be typed correctly with merged common responses', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
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

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
                404: z.ZodObject<
                  {
                    message: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    message: string;
                  },
                  {
                    message: string;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });

  it('should be typed correctly with merged common responses and overriding common response', () => {
    const contract = c.router(
      {
        posts: {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            responses: {
              200: z.object({
                id: z.number(),
              }),
              400: z.object({
                overrideReason: z.string(),
              }),
            },
          },
        },
      },
      {
        commonResponses: {
          400: z.object({
            reason: z.string(),
          }),
          404: z.object({
            message: z.string(),
          }),
        },
      },
    );

    type ContractShape = Expect<
      Equal<
        typeof contract,
        {
          posts: {
            getPost: {
              method: 'GET';
              path: '/posts/:id';
              responses: {
                200: z.ZodObject<
                  {
                    id: z.ZodNumber;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    id: number;
                  },
                  {
                    id: number;
                  }
                >;
                400: z.ZodObject<
                  {
                    overrideReason: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    overrideReason: string;
                  },
                  {
                    overrideReason: string;
                  }
                >;
                404: z.ZodObject<
                  {
                    message: z.ZodString;
                  },
                  'strip',
                  z.ZodTypeAny,
                  {
                    message: string;
                  },
                  {
                    message: string;
                  }
                >;
              };
            };
          };
        }
      >
    >;
  });
});

describe('header types', () => {
  it('merges the input and output of two Standard Schemas without exposing validator types', () => {
    const leftSchema = z.object({ left: z.string() });
    const rightSchema = z.object({ right: z.string() });
    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;
    type Assert = Expect<
      Equal<
        Result,
        StandardSchemaV1<
          { left: string; right: string },
          { left: string; right: string }
        >
      >
    >;
  });
  it('should handle left being undefined', () => {
    const leftSchema = undefined;
    const rightSchema = z.object({
      right: z.string(),
    });

    type Resut = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;
    type TestResult = Expect<
      Equal<
        Resut,
        z.ZodObject<
          {
            right: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            right: string;
          },
          {
            right: string;
          }
        >
      >
    >;
  });

  it('should handle right being undefined', () => {
    const leftSchema = z.object({
      left: z.string(),
    });

    const rightSchema = undefined;

    type Resut = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;
    type TestResult = Expect<
      Equal<
        Resut,
        z.ZodObject<
          {
            left: z.ZodString;
          },
          'strip',
          z.ZodTypeAny,
          {
            left: string;
          },
          {
            left: string;
          }
        >
      >
    >;
  });

  it('should handle both being undefined', () => {
    const leftSchema = undefined;
    const rightSchema = undefined;

    type Resut = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;
    type TestResult = Expect<Equal<Resut, unknown>>;
  });

  it('should handle two records', () => {
    const leftSchema = {
      left: z.string(),
    };

    const rightSchema = {
      right: z.string(),
    };

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<
      Equal<
        Result,
        {
          left: z.ZodString;
          right: z.ZodString;
        }
      >
    >;
  });

  it('should handle left undefined and right record', () => {
    const leftSchema = undefined;
    const rightSchema = {
      right: z.string(),
    };

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<
      Equal<
        Result,
        {
          right: z.ZodString;
        }
      >
    >;
  });

  it('should handle left record and right undefined', () => {
    const leftSchema = {
      left: z.string(),
    };

    const rightSchema = undefined;

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<Equal<Result, { left: z.ZodString }>>; // left wins
  });

  it('should handle right null and left record', () => {
    const leftSchema = {
      left: z.string(),
    };

    const rightSchema = {
      left: null,
    };

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<Equal<Result, { left: null }>>; // retain the removal for outer routers
  });

  it('should handle left null and right record', () => {
    const leftSchema = {
      left: null,
    };

    const rightSchema = {
      right: z.string(),
    };

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<Equal<Result, { left: null; right: z.ZodString }>>;
  });

  it('should handle both null', () => {
    const leftSchema = {
      left: null,
    };

    const rightSchema = {
      right: null,
    };

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<Equal<Result, { left: null; right: null }>>;
  });

  it('should handle both entirely undefined', () => {
    const leftSchema = undefined;
    const rightSchema = undefined;

    type Result = MergeHeadersWithLegacySupport<
      typeof leftSchema,
      typeof rightSchema
    >;

    type TestResult = Expect<Equal<Result, unknown>>;
  });

  describe('InferHeadersInput', () => {
    it('should handle undefined', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ id: number }>(),
          },
          headers: undefined,
        },
      });

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<Equal<Actual, undefined>>;
    });

    it('should handle empty object', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: {},
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      });

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<Equal<Actual, {}>>;
    });

    it('should handle zod object', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: z.object({
            'x-foo': z.string(),
          }),
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      });

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<Equal<Actual, { 'x-foo': string }>>;
    });

    it('should lowercase keys', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: z.object({
            'X-FOO': z.string(),
          }),
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      });

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<Equal<Actual, { 'x-foo': string }>>;
    });

    it('should handle standard schema', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: {
            'x-foo': v.string(),
          },
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      });

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<Equal<Actual, { 'x-foo': string }>>;
    });

    it('should handle mixed object and zod', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: {
            'x-foo': v.string(),
            'x-bar': z.string(),
          },
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      });

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<
        Equal<Actual, { 'x-foo': string; 'x-bar': string }>
      >;
    });

    it('should handle optional headers', () => {
      const route = c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: {
            'x-foo': v.optional(v.string()),
          },
          responses: {
            200: c.type<{ id: number }>(),
          },
        },
      });

      const headers = {
        'x-foo': v.optional(v.string()),
      };

      type Actual = InferHeadersInput<typeof route.getPost, typeof headers>;
      type TestResult = Expect<Equal<Actual, { 'x-foo'?: string | undefined }>>;
    });

    it('should handle optional headers with base headers', () => {
      const route = c.router(
        {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            headers: {
              'x-foo': v.string(),
            },
            responses: {
              200: c.type<{ id: number }>(),
            },
          },
        },
        {
          baseHeaders: {
            'x-bar': v.string(),
          },
        },
      );

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<
        Equal<Actual, { 'x-foo': string; 'x-bar': string }>
      >;
    });

    it('should unset header with null', () => {
      const route = c.router(
        {
          getPost: {
            method: 'GET',
            path: '/posts/:id',
            headers: {
              'x-foo': null,
            },
            responses: {
              200: c.type<{ id: number }>(),
            },
          },
        },
        {
          baseHeaders: {
            'x-foo': v.string(),
          },
        },
      );

      type Actual = InferHeadersInput<typeof route.getPost>;
      type TestResult = Expect<Equal<Actual, {}>>;
    });
  });
});
