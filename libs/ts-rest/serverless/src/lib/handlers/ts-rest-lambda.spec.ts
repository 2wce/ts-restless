/**
 * @vitest-environment node
 */

import { initContract } from '@ts-restless/core';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyEventV2,
  Context,
} from 'aws-lambda';
import { parse as parseMultipart, getBoundary } from 'parse-multipart-data';
import merge from 'ts-deepmerge';
import { PartialDeep } from 'type-fest';
import { createLambdaHandler, tsr } from './ts-rest-lambda';
import { z } from 'zod';
import * as apiGatewayEventV1 from '../mappers/aws/test-data/api-gateway-event-v1.json';
import * as apiGatewayEventV2 from '../mappers/aws/test-data/api-gateway-event-v2.json';
import { TsRestResponse } from '../response';
import { TsRestResponseError } from '../http-error';
import { ApiGatewayEvent } from '../mappers/aws/api-gateway';

const c = initContract();

const contract = c.router({
  test: {
    method: 'GET',
    path: '/test',
    query: z.object({
      foo: z.string(),
      throwError: z
        .union([z.literal('custom-json'), z.literal('custom-text')])
        .optional(),
      throwDefinedError: z.boolean().default(false),
      setCookies: z.boolean().default(false),
    }),
    responses: {
      200: z.object({
        foo: z.string(),
      }),
      402: z.literal('Unauthorized'),
    },
  },
  ping: {
    method: 'POST',
    path: '/ping/:id',
    pathParams: z.object({
      id: z.string(),
    }),
    body: z.object({
      ping: z.string(),
    }),
    responses: {
      200: z.object({
        id: z.string(),
        pong: z.string(),
      }),
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
  returnsTheWrongData: {
    method: 'GET',
    path: '/wrong',
    responses: {
      200: z.object({
        foo: z.string(),
      }),
    },
  },
  styles: {
    method: 'GET',
    path: '/styles.css',
    responses: {
      200: c.otherResponse({
        contentType: 'text/css',
        body: z.string(),
      }),
    },
  },
  image: {
    method: 'GET',
    path: '/image',
    query: z.object({
      type: z.union([z.literal('gif'), z.literal('jpeg')]),
    }),
    responses: {
      200: c.otherResponse({
        contentType: 'application/octet-stream',
        body: c.type<Blob>(),
      }),
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
});

const createV1LambdaRequest = (request: PartialDeep<APIGatewayProxyEvent>) => {
  return merge(apiGatewayEventV1, request);
};

const createV2LambdaRequest = (
  request: PartialDeep<APIGatewayProxyEventV2>,
) => {
  return merge(apiGatewayEventV2, request);
};

describe('tsRestLambda', () => {
  type GlobalRequestExtension = {
    context: {
      rawEvent: ApiGatewayEvent;
      lambdaContext: Context;
    };
  };

  const lambdaHandler = createLambdaHandler(
    contract,
    {
      test: async ({ query }, { appRoute, responseHeaders }) => {
        if (query.throwError) {
          throw new Error(query.throwError);
        }

        if (query.throwDefinedError) {
          throw new TsRestResponseError(appRoute, {
            status: 402,
            body: 'Unauthorized',
          });
        }

        if (query.setCookies) {
          responseHeaders.append(
            'set-cookie',
            'foo=bar; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
          );

          responseHeaders.append(
            'set-cookie',
            'bar=foo; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
          );
        }

        return {
          status: 200,
          body: {
            foo: query.foo,
          },
        };
      },
      ping: async ({ body, params }, { responseHeaders }) => {
        responseHeaders.append('Cache-Control', 'no-cache');
        responseHeaders.append('Cache-Control', 'no-store');

        return {
          status: 200,
          body: {
            id: params.id,
            pong: body.ping,
          },
        };
      },
      noContent: async () => {
        return {
          status: 204,
          body: undefined,
        };
      },
      returnsTheWrongData: async () => {
        return {
          status: 200,
          body: {
            foo: 'bar',
            bar: 'foo', // this is extra
          },
        };
      },
      styles: async (_, { responseHeaders }) => {
        responseHeaders.set('cache-control', 'max-age=31536000');

        return {
          status: 200,
          body: 'body { color: red; }',
        };
      },
      image: async ({ query: { type } }) => {
        return {
          status: 200,
          body:
            type === 'jpeg'
              ? new Blob([new Uint8Array([0, 1, 2, 3])])
              : new Blob([new Uint8Array([4, 5, 6, 7])], { type: 'image/gif' }),
        };
      },
      upload: tsr.routeWithMiddleware(contract.upload)<
        GlobalRequestExtension,
        { contentType: string }
      >({
        middleware: [
          async (request, args) => {
            request.contentType = request.headers.get('content-type')!;
          },
        ],
        handler: async (_, { request, responseHeaders }) => {
          const boundary = getBoundary(
            request.headers.get('content-type') as string,
          );

          const bodyBuffer = await request.arrayBuffer();
          const parts = parseMultipart(Buffer.from(bodyBuffer), boundary);
          const blob = new Blob([Uint8Array.from(parts[0].data)], {
            type: parts[0].type,
          });

          responseHeaders.set(
            'x-content-type-echo',
            request.contentType.toString(),
          );

          responseHeaders.set(
            'x-is-base64-encoded-echo',
            request.context.rawEvent.isBase64Encoded.toString(),
          );

          return {
            status: 200,
            body: blob,
          };
        },
      }),
    },
    {
      jsonQuery: true,
      responseValidation: true,
      cors: {
        origin: ['http://localhost'],
        credentials: true,
      },
      requestMiddleware: [
        tsr.middleware<GlobalRequestExtension>(async (request, lambdaArgs) => {
          request.context = lambdaArgs;
        }),
      ],
      errorHandler: (error) => {
        if (error instanceof Error) {
          if (error.message === 'custom-json') {
            return TsRestResponse.fromJson(
              { message: 'Custom Error Handler' },
              { status: 422 },
            );
          } else if (error.message === 'custom-text') {
            return TsRestResponse.fromText('Custom Error Handler', {
              status: 422,
            });
          }
        }

        // if not returning a response, should pass through to the default error handler
        return;
      },
    },
  );

  it('v1 should handle GET with query', async () => {
    const event = createV1LambdaRequest({
      httpMethod: 'GET',
      path: '/test',
      queryStringParameters: {
        foo: 'bar',
      },
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      multiValueHeaders: {
        'access-control-allow-credentials': ['true'],
        'access-control-allow-origin': ['http://localhost'],
        'content-type': ['application/json'],
        vary: ['Origin'],
      },
      body: '{"foo":"bar"}',
      isBase64Encoded: false,
    });
  });

  it('v2 should handle GET with query', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/test',
      rawQueryString: 'foo=bar',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '{"foo":"bar"}',
      isBase64Encoded: false,
    });
  });

  it('v1 should handle POST', async () => {
    const event = createV1LambdaRequest({
      httpMethod: 'POST',
      path: '/ping/222',
      body: '{"ping":"foo"}',
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'cache-control': 'no-cache, no-store',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      multiValueHeaders: {
        'access-control-allow-credentials': ['true'],
        'access-control-allow-origin': ['http://localhost'],
        'cache-control': ['no-cache', 'no-store'],
        'content-type': ['application/json'],
        vary: ['Origin'],
      },
      body: '{"id":"222","pong":"foo"}',
      isBase64Encoded: false,
    });
  });

  it('v2 should handle POST', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'POST',
        },
      },
      rawPath: '/ping/123',
      body: '{"ping":"foo"}',
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'cache-control': 'no-cache, no-store',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '{"id":"123","pong":"foo"}',
      isBase64Encoded: false,
    });
  });

  it('v1 should handle no content', async () => {
    const event = createV1LambdaRequest({
      httpMethod: 'POST',
      path: '/no-content',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Origin',
      },
      multiValueHeaders: {
        'access-control-allow-credentials': ['true'],
        'access-control-allow-origin': ['http://localhost'],
        vary: ['Origin'],
      },
      body: '',
      isBase64Encoded: false,
    });
  });

  it('v2 should handle no content', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'POST',
        },
      },
      rawPath: '/no-content',
      body: '',
      isBase64Encoded: true,
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Origin',
      },
      body: '',
      isBase64Encoded: false,
    });
  });

  it('OPTIONS request should return all CORS headers', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'OPTIONS',
        },
      },
      rawPath: '/test',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': '*',
        'access-control-allow-origin': 'http://localhost',
        vary: 'Access-Control-Request-Headers, Origin',
      },
      body: '',
      isBase64Encoded: false,
    });
  });

  it('OPTIONS request should return not return origin header with mismatched origin', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'OPTIONS',
        },
      },
      rawPath: '/test',
      headers: {
        origin: 'https://example.com',
      },
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 204,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-methods': '*',
        vary: 'Access-Control-Request-Headers, Origin',
      },
      body: '',
      isBase64Encoded: false,
    });
  });

  it('should handle failed request validation', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/test',
      rawQueryString: '',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 400,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '{"message":"Request validation failed","pathParameterErrors":null,"headerErrors":null,"queryParameterErrors":{"name":"ValidationError","issues":[{"code":"invalid_type","expected":"string","received":"undefined","path":["foo"],"message":"Required"}]},"bodyErrors":null}',
      isBase64Encoded: false,
    });
  });

  it('should handle error handled by custom handler returning json', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/test',
      rawQueryString: 'foo=bar&throwError=custom-json',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 422,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '{"message":"Custom Error Handler"}',
      isBase64Encoded: false,
    });
  });

  it('should handle error handled by custom handler returning text', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/test',
      rawQueryString: 'foo=bar&throwError=custom-text',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 422,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'text/plain',
        vary: 'Origin',
      },
      body: 'Custom Error Handler',
      isBase64Encoded: false,
    });
  });

  it('should handle error defined in contract', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/test',
      rawQueryString: 'foo=bar&throwDefinedError=true',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 402,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '"Unauthorized"',
      isBase64Encoded: false,
    });
  });

  it('options.responseValidation true should remove extra properties', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/wrong',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '{"foo":"bar"}',
      isBase64Encoded: false,
    });
  });

  it('should handle non-json response', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/styles.css',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'cache-control': 'max-age=31536000',
        'content-type': 'text/css',
        vary: 'Origin',
      },
      body: 'body { color: red; }',
      isBase64Encoded: false,
    });
  });

  it('should handle blob body without type defined', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/image',
      rawQueryString: 'type=jpeg',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/octet-stream',
        vary: 'Origin',
      },
      body: 'AAECAw==',
      isBase64Encoded: true,
    });
  });

  it('should handle blob body with type defined', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/image',
      rawQueryString: 'type=gif',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'image/gif',
        vary: 'Origin',
      },
      body: 'BAUGBw==',
      isBase64Encoded: true,
    });
  });

  it('should handle file uploads', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'POST',
        },
      },
      rawPath: '/upload',
      body: Buffer.from(
        '-----WebKitFormBoundary7MA4YWxkTrZu0gW\r\n' +
          'Content-Disposition: form-data; name="file"; filename="a.html"\r\n' +
          'Content-Type: text/html\r\n' +
          '\r\n' +
          '<html><body><h1>Hello ts-rest!</h1></body></html>\r\n' +
          '-----WebKitFormBoundary7MA4YWxkTrZu0gW--',
      ).toString('base64'),
      headers: {
        'content-type':
          'multipart/form-data; boundary=---WebKitFormBoundary7MA4YWxkTrZu0gW',
      },
      isBase64Encoded: true,
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'text/html',
        vary: 'Origin',
        'x-content-type-echo':
          'multipart/form-data; boundary=---WebKitFormBoundary7MA4YWxkTrZu0gW',
        'x-is-base64-encoded-echo': 'true',
      },
      body: '<html><body><h1>Hello ts-rest!</h1></body></html>',
      isBase64Encoded: false,
    });
  });

  it('V1 should handle cookies returned in response', async () => {
    const event = createV1LambdaRequest({
      httpMethod: 'GET',
      path: '/test',
      queryStringParameters: {
        foo: 'baz',
        setCookies: 'true',
      },
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        'set-cookie':
          'foo=bar; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict, bar=foo; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
        vary: 'Origin',
      },
      multiValueHeaders: {
        'access-control-allow-credentials': ['true'],
        'access-control-allow-origin': ['http://localhost'],
        'content-type': ['application/json'],
        'set-cookie': [
          'foo=bar; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
          'bar=foo; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
        ],
        vary: ['Origin'],
      },
      body: '{"foo":"baz"}',
      isBase64Encoded: false,
    });
  });

  it('V2 should handle cookies returned in response', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/test',
      rawQueryString: 'foo=baz&setCookies=true',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 200,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        'set-cookie':
          'foo=bar; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict, bar=foo; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
        vary: 'Origin',
      },
      cookies: [
        'foo=bar; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
        'bar=foo; path=/; expires=Thu, 21 Oct 2021 07:28:00 GMT; secure; httponly; samesite=strict',
      ],
      body: '{"foo":"baz"}',
      isBase64Encoded: false,
    });
  });

  it('should handle non-existent route', async () => {
    const event = createV2LambdaRequest({
      requestContext: {
        http: {
          method: 'GET',
        },
      },
      rawPath: '/foo',
    });

    const response = await lambdaHandler(event as any, {} as any);
    expect(response).toEqual({
      statusCode: 404,
      headers: {
        'access-control-allow-credentials': 'true',
        'access-control-allow-origin': 'http://localhost',
        'content-type': 'application/json',
        vary: 'Origin',
      },
      body: '{"message":"Not Found"}',
      isBase64Encoded: false,
    });
  });
});

describe('empty JSON AWS gateway bodies', () => {
  const emptyContract = c.router({
    empty: {
      method: 'POST',
      path: '/empty-json',
      body: z.undefined(),
      responses: { 200: z.undefined() },
    },
    responseOnly: {
      method: 'GET',
      path: '/undefined-response',
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
  const handler = createLambdaHandler(
    emptyContract,
    {
      empty: async () => ({ status: 200, body: undefined }),
      responseOnly: async () => ({ status: 200, body: undefined }),
      noBody: async () => ({ status: 204, body: undefined }),
      required: async ({ body }) => ({ status: 200, body }),
    },
    { responseValidation: true },
  );
  const eventFor = (
    version: number,
    path: string,
    method: string,
    body: string | null,
  ) =>
    version === 1
      ? createV1LambdaRequest({
          path,
          httpMethod: method,
          headers: { 'content-type': 'application/json' },
          multiValueHeaders: { 'content-type': ['application/json'] },
          body,
          isBase64Encoded: false,
        })
      : createV2LambdaRequest({
          rawPath: path,
          requestContext: { http: { method } },
          headers: { 'content-type': 'application/json' },
          body: body ?? undefined,
          isBase64Encoded: false,
        });

  it.each([1, 2])(
    'serializes undefined response as empty nonbinary AWS v%s body',
    async (version) => {
      const response = await handler(
        eventFor(
          version,
          '/undefined-response',
          'GET',
          null,
        ) as ApiGatewayEvent,
        {} as Context,
      );
      expect(response).toMatchObject({
        statusCode: 200,
        body: '',
        isBase64Encoded: false,
      });
      if (typeof response === 'string')
        throw new Error('Expected gateway envelope');
      expect(response.headers?.['content-type']).toBe('application/json');
    },
  );
  it.each([1, 2])(
    'accepts absent and empty JSON request bytes in AWS v%s',
    async (version) => {
      for (const body of [null, '']) {
        const response = await handler(
          eventFor(version, '/empty-json', 'POST', body) as ApiGatewayEvent,
          {} as Context,
        );
        expect(response).toMatchObject({
          statusCode: 200,
          body: '',
          isBase64Encoded: false,
        });
      }
      const noBody = await handler(
        eventFor(version, '/no-body-json', 'POST', null) as ApiGatewayEvent,
        {} as Context,
      );
      expect(noBody).toMatchObject({
        statusCode: 204,
        body: '',
        isBase64Encoded: false,
      });
    },
  );
  it.each([1, 2])(
    'validates missing required JSON and retains valid JSON in AWS v%s',
    async (version) => {
      const invalid = await handler(
        eventFor(version, '/required-json', 'POST', null) as ApiGatewayEvent,
        {} as Context,
      );
      if (typeof invalid === 'string')
        throw new Error('Expected gateway envelope');
      expect(invalid.statusCode).toBe(400);
      expect(JSON.parse(invalid.body as string).bodyErrors.name).toBe(
        'ValidationError',
      );
      const valid = await handler(
        eventFor(
          version,
          '/required-json',
          'POST',
          '{"value":"input"}',
        ) as ApiGatewayEvent,
        {} as Context,
      );
      if (typeof valid === 'string')
        throw new Error('Expected gateway envelope');
      expect(valid.statusCode).toBe(200);
      expect(JSON.parse(valid.body as string)).toEqual({ value: 'input' });
    },
  );
});

describe('returned response headers in AWS gateways', () => {
  it.each([1, 2])(
    'preserves returned/context headers and separate cookies in V%s',
    async (version) => {
      const headerContract = c.router({
        get: {
          method: 'GET',
          path: '/returned-headers',
          responses: { 200: c.type<{ ok: boolean }>() },
        },
      });
      const cookies = [
        'returned=one; Expires=Thu, 21 Oct 2027 07:28:00 GMT; Path=/',
        'returned=two; Path=/other',
        'context=one; Expires=Fri, 22 Oct 2027 07:28:00 GMT; Path=/',
        'context=two; Path=/other',
      ];
      const handler = createLambdaHandler(
        headerContract,
        {
          get: async (_, { responseHeaders }) => {
            responseHeaders.set('X-Shared', 'context');
            responseHeaders.set('vary', 'Origin, ACCEPT-LANGUAGE');
            cookies
              .slice(2)
              .forEach((cookie) =>
                responseHeaders.append('set-cookie', cookie),
              );
            return {
              status: 200,
              body: { ok: true },
              headers: [
                ['x-returned', 'returned'],
                ['vary', 'Accept-Language'],
                ['x-shared', 'returned'],
                ...cookies.slice(0, 2).map((cookie) => ['set-cookie', cookie]),
              ] as [string, string][],
            };
          },
        },
        { responseValidation: true },
      );
      const event =
        version === 1
          ? createV1LambdaRequest({
              path: '/returned-headers',
              httpMethod: 'GET',
            })
          : createV2LambdaRequest({
              rawPath: '/returned-headers',
              requestContext: { http: { method: 'GET' } },
            });
      const response = await handler(event as ApiGatewayEvent, {} as Context);
      if (typeof response === 'string')
        throw new Error('Expected gateway envelope');
      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('{"ok":true}');
      expect(response.headers?.['x-returned']).toBe('returned');
      expect(response.headers?.['x-shared']).toBe('context');
      expect(response.headers?.['vary']).toBe('Accept-Language, Origin');
      expect(response.headers?.['set-cookie']).toBe(cookies.join(', '));
      if (version === 1) {
        if (!('multiValueHeaders' in response))
          throw new Error('Expected V1 multi-value headers');
        expect(response.multiValueHeaders?.['set-cookie']).toEqual(cookies);
      } else {
        if (!('cookies' in response)) throw new Error('Expected V2 cookies');
        expect(response.cookies).toEqual(cookies);
      }
    },
  );
  it.each([1, 2])(
    'preserves shared context response headers in V%s',
    async (version) => {
      const headerContract = c.router({
        get: {
          method: 'GET',
          path: '/shared-headers',
          responses: { 200: c.type<{ ok: boolean }>() },
        },
      });
      const cookie =
        'session=one; Expires=Thu, 21 Oct 2027 07:28:00 GMT; Path=/';
      const handler = createLambdaHandler(
        headerContract,
        {
          get: async (_, { responseHeaders }) => {
            responseHeaders.append('set-cookie', cookie);
            responseHeaders.set('vary', '*');
            return {
              status: 200,
              body: { ok: true },
              headers: responseHeaders,
            };
          },
        },
        { cors: { origin: true } },
      );
      const event =
        version === 1
          ? createV1LambdaRequest({
              path: '/shared-headers',
              httpMethod: 'GET',
              headers: { origin: 'https://client.example' },
            })
          : createV2LambdaRequest({
              rawPath: '/shared-headers',
              requestContext: { http: { method: 'GET' } },
              headers: { origin: 'https://client.example' },
            });
      const response = await handler(event as ApiGatewayEvent, {} as Context);
      if (typeof response === 'string')
        throw new Error('Expected gateway envelope');
      expect(response.headers?.['vary']).toBe('*');
      expect(response.headers?.['set-cookie']).toBe(cookie);
      if (version === 1) {
        if (!('multiValueHeaders' in response))
          throw new Error('Expected V1 multi-value headers');
        expect(response.multiValueHeaders?.['set-cookie']).toEqual([cookie]);
      } else {
        if (!('cookies' in response)) throw new Error('Expected V2 cookies');
        expect(response.cookies).toEqual([cookie]);
      }
    },
  );
});
