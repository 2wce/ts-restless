import {
  initContract,
  TsRestResponseError,
  StandardSchemaV1,
} from '@ts-restless/core';
import {
  nestControllerContract,
  NestControllerInterface,
  NestRequestShapes,
  NestResponseShapes,
} from './ts-rest-nest';
import { TsRest } from './ts-rest.decorator';
import { TsRestRequest } from './ts-rest-request.decorator';
import {
  Controller,
  INestApplication,
  ModuleMetadata,
  Type,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import supertest from 'supertest';
import { z } from 'zod';
import { TsRestModule } from './ts-rest.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { tsRestHandler, TsRestHandler } from './ts-rest-nest-handler';

const c = initContract();
const postsRouter = c.router({
  getPost: {
    method: 'GET',
    path: `/posts/:id`,
    responses: {
      200: null,
    },
  },
});

it('allows unknown statuses when not in strict mode', () => {
  const cLoose = c.router({ posts: postsRouter });
  const nestContract = nestControllerContract(cLoose.posts);
  type RequestShapes = NestRequestShapes<typeof nestContract>;
  type ResponseShapes = NestResponseShapes<typeof nestContract>;

  const responseTypeCheck: Awaited<ResponseShapes['getPost']> = {
    status: 419,
    body: 'invalid status and response',
  };
  class PostController implements NestControllerInterface<typeof nestContract> {
    @TsRest(nestContract.getPost)
    async getPost(
      @TsRestRequest() { params: { id } }: RequestShapes['getPost'],
    ) {
      return { status: 201 as const, body: null };
    }
  }
});

it('does not allow unknown statuses when in strict mode', () => {
  const cStrict = c.router({ posts: postsRouter }, { strictStatusCodes: true });
  const nestContract = nestControllerContract(cStrict.posts);
  type contractType = typeof nestContract;
  type RequestShapes = NestRequestShapes<contractType>;
  type ResponseShapes = NestResponseShapes<typeof nestContract>;

  const responseTypeCheck: Awaited<ResponseShapes['getPost']> = {
    // @ts-expect-error 419 is not defined as a known response
    status: 419,
    // @ts-expect-error 419 is not defined as a known response
    body: 'invalid status and response',
  };

  class PostController implements NestControllerInterface<typeof nestContract> {
    @TsRest(nestContract.getPost)
    // @ts-expect-error 201 is not defined as a known response
    async getPost(
      @TsRestRequest() { params: { id } }: RequestShapes['getPost'],
    ) {
      return { status: 201 as const, body: null };
    }
  }
});

it('allows responseShapes types to be used in controller logic', () => {
  const cStrict = c.router({ posts: postsRouter }, { strictStatusCodes: true });
  const nestContract = nestControllerContract(cStrict.posts);
  type contractType = typeof nestContract;
  type RequestShapes = NestRequestShapes<contractType>;
  type ResponseShapes = NestResponseShapes<typeof nestContract>;

  class PostController implements NestControllerInterface<typeof nestContract> {
    @TsRest(nestContract.getPost)
    async getPost(
      @TsRestRequest() { params: { id } }: RequestShapes['getPost'],
    ) {
      const result: ResponseShapes['getPost'] = {
        status: 200 as const,
        body: null,
      };
      return result;
    }
  }
});

describe('request validation', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  const initializeApp = async (controller: Type) => {
    const moduleRef = await Test.createTestingModule({
      controllers: [controller],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    return app.getHttpServer();
  };

  describe.each(['modern', 'legacy'] as const)(
    '%s request evaluation',
    (api) => {
      it.each([
        {
          label: 'false',
          output: false,
          expected: {
            body: false,
            query: false,
            headers: false,
            undefinedOutput: false,
          },
        },
        {
          label: 'zero',
          output: 0,
          expected: { body: 0, query: 0, headers: 0, undefinedOutput: false },
        },
        {
          label: 'empty string',
          output: '',
          expected: {
            body: '',
            query: '',
            headers: '',
            undefinedOutput: false,
          },
        },
        {
          label: 'undefined',
          output: undefined,
          expected: { undefinedOutput: true },
        },
      ])(
        'retains successful $label transforms in the HTTP handler',
        async ({ output, expected }) => {
          const transform: StandardSchemaV1<unknown, unknown> = {
            '~standard': {
              version: 1,
              vendor: 'native-request-regression',
              validate: () => ({ value: output }),
            },
          };
          const route = c.router({
            create: {
              method: 'POST',
              path: '/transformed',
              headers: transform,
              query: transform,
              body: transform,
              responses: { 200: c.type<Record<string, unknown>>() },
            },
          }).create;
          const echo = ({
            body,
            query,
            headers,
          }: {
            body: unknown;
            query: unknown;
            headers: unknown;
          }) => ({
            status: 200 as const,
            body: {
              body,
              query,
              headers,
              undefinedOutput:
                body === undefined &&
                query === undefined &&
                headers === undefined,
            },
          });
          @Controller()
          class ModernController {
            @TsRestHandler(route)
            handler() {
              return tsRestHandler(route, async (request) => echo(request));
            }
          }
          @Controller()
          class LegacyController {
            @TsRest(route)
            handler(
              @TsRestRequest() request: {
                body: unknown;
                query: unknown;
                headers: unknown;
              },
            ) {
              return echo(request);
            }
          }
          const server = await initializeApp(
            api === 'modern' ? ModernController : LegacyController,
          );
          const response = await supertest(server)
            .post('/transformed?raw=query')
            .set('x-raw', 'header')
            .send({ raw: 'body' });
          expect(response.status).toBe(200);
          expect(response.body).toEqual(expected);
        },
      );

      it('passes raw values for failed locations when rejection is disabled', async () => {
        const reject: StandardSchemaV1 = {
          '~standard': {
            version: 1,
            vendor: 'disabled-validation',
            validate: () => ({ issues: [{ message: 'rejected' }] }),
          },
        };
        const route = c.router({
          create: {
            method: 'POST',
            path: '/disabled',
            headers: reject,
            query: reject,
            body: reject,
            responses: { 200: c.type<Record<string, unknown>>() },
          },
        }).create;
        const options = {
          validateRequestHeaders: false,
          validateRequestQuery: false,
          validateRequestBody: false,
          jsonQuery: true,
        };
        const echo = (request: {
          body: unknown;
          query: unknown;
          headers: unknown;
        }) => ({
          status: 200 as const,
          body: {
            body: request.body,
            query: request.query,
            header: (request.headers as Record<string, string>)['x-raw'],
          },
        });
        @Controller()
        class ModernController {
          @TsRestHandler(route, options)
          handler() {
            return tsRestHandler(route, async (request) => echo(request));
          }
        }
        @Controller()
        class LegacyController {
          @TsRest(route, options)
          handler(
            @TsRestRequest() request: {
              body: unknown;
              query: unknown;
              headers: unknown;
            },
          ) {
            return echo(request);
          }
        }
        const server = await initializeApp(
          api === 'modern' ? ModernController : LegacyController,
        );
        const response = await supertest(server)
          .post('/disabled?count=3')
          .set('x-raw', 'header')
          .send({ raw: 'body' });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          body: { raw: 'body' },
          query: { count: '3' },
          header: 'header',
        });
      });

      it('preserves validation order and the native rejection policy', async () => {
        const calls: string[] = [];
        const schema = (
          location: string,
          reject = false,
        ): StandardSchemaV1 => ({
          '~standard': {
            version: 1,
            vendor: 'native-request-order',
            validate(input) {
              calls.push(location);
              return reject
                ? { issues: [{ message: 'invalid path' }] }
                : { value: input };
            },
          },
        });
        const route = c.router({
          create: {
            method: 'POST',
            path: '/order/:id',
            pathParams: schema('params', true),
            headers: schema('headers'),
            query: schema('query'),
            body: schema('body'),
            responses: { 200: c.type<string>() },
          },
        }).create;
        @Controller()
        class ModernController {
          @TsRestHandler(route)
          handler() {
            return tsRestHandler(route, async () => ({
              status: 200,
              body: 'unreachable',
            }));
          }
        }
        @Controller()
        class LegacyController {
          @TsRest(route)
          handler(@TsRestRequest() request: unknown) {
            return { status: 200, body: 'unreachable' };
          }
        }
        const server = await initializeApp(
          api === 'modern' ? ModernController : LegacyController,
        );
        const response = await supertest(server)
          .post('/order/42')
          .send({ raw: 'body' });
        expect(response.status).toBe(400);
        expect(calls).toEqual(
          api === 'modern'
            ? ['params', 'headers', 'query', 'body']
            : ['params'],
        );
      });
    },
  );

  const contract = initContract().router({
    withBody: {
      method: 'POST',
      path: `/`,
      body: z.object({
        title: z.string(),
      }),
      responses: {
        200: z.object({
          title: z.string(),
        }),
      },
    },
    withQuery: {
      method: 'GET',
      path: '/',
      query: z.object({
        id: z.string(),
      }),
      responses: {
        200: z.object({
          title: z.string(),
        }),
      },
    },
    withHeaders: {
      method: 'GET',
      path: '/admin',
      headers: z.object({
        token: z.string(),
      }),
      responses: {
        200: z.object({
          title: z.string(),
        }),
      },
    },
  });

  const nestContract = nestControllerContract(contract);
  type contractType = typeof nestContract;
  type RequestShapes = NestRequestShapes<contractType>;
  type ResponseShapes = NestResponseShapes<typeof nestContract>;

  it('should validate body without validateRequestBody param', async () => {
    @Controller()
    @TsRest({})
    class MyController {
      @TsRest(contract.withBody)
      async create(@TsRestRequest() { body }: RequestShapes['withBody']) {
        const response: ResponseShapes['withBody'] = {
          status: 200,
          body: { title: body.title },
        };

        return response;
      }
    }

    const server = await initializeApp(MyController);
    const serverResponse = await supertest(server)
      .post(contract.withBody.path)
      .send({ title: 123 });

    expect(serverResponse.status).toEqual(400);
    expect(serverResponse.body.issues.length > 0).toBeTruthy();
    expect(serverResponse.body.issues[0].code).toBe('invalid_type');
  });

  it('should validate body with validateRequestBody: true', async () => {
    @Controller()
    @TsRest({
      validateRequestBody: true,
    })
    class MyController {
      @TsRest(contract.withBody)
      async create(@TsRestRequest() { body }: RequestShapes['withBody']) {
        const response: ResponseShapes['withBody'] = {
          status: 200,
          body: { title: body.title },
        };

        return response;
      }
    }

    const server = await initializeApp(MyController);
    const serverResponse = await supertest(server)
      .post(contract.withBody.path)
      .send({ title: 123 });

    expect(serverResponse.status).toEqual(400);
    expect(serverResponse.body.issues.length > 0).toBeTruthy();
    expect(serverResponse.body.issues[0].code).toBe('invalid_type');
  });

  it('route param should override class param', async () => {
    @Controller()
    @TsRest({
      validateRequestBody: true,
    })
    class TestController {
      @TsRest(contract.withBody, {
        validateRequestBody: false,
      })
      async create(@TsRestRequest() { body }: RequestShapes['withBody']) {
        const response: ResponseShapes['withBody'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .post(contract.withBody.path)
      .send({ title: 432213 });

    expect(serverResponse.status).toEqual(200);
    expect(serverResponse.body.title).toBe('ok');
  });

  it("only method param - shouldn't validate body", async () => {
    @Controller()
    class TestController {
      @TsRest(contract.withBody, {
        validateRequestBody: false,
      })
      async create(@TsRestRequest() { body }: RequestShapes['withBody']) {
        const response: ResponseShapes['withBody'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .post(contract.withBody.path)
      .send({ title: 432213 });

    expect(serverResponse.status).toEqual(200);
    expect(serverResponse.body.title).toBe('ok');
  });

  it("shouldn't validate body", async () => {
    @Controller()
    @TsRest({
      validateRequestBody: false,
    })
    class TestController {
      @TsRest(contract.withBody)
      async create(@TsRestRequest() { body }: RequestShapes['withBody']) {
        const response: ResponseShapes['withBody'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .post(contract.withBody.path)
      .send({ title: 432213 });

    expect(serverResponse.status).toEqual(200);
    expect(serverResponse.body.title).toBe('ok');
  });

  it('should validate headers', async () => {
    @Controller()
    @TsRest({
      validateRequestHeaders: true,
    })
    class TestController {
      @TsRest(contract.withHeaders)
      async create(@TsRestRequest() { headers }: RequestShapes['withHeaders']) {
        const response: ResponseShapes['withHeaders'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .get(contract.withHeaders.path)
      .send();

    expect(serverResponse.status).toEqual(400);
    expect(serverResponse.body.issues.length > 0).toBeTruthy();
    expect(serverResponse.body.issues[0].code).toBe('invalid_type');
    expect(serverResponse.body.issues[0].path[0]).toBe('token');
  });

  it("shouldn't validate headers", async () => {
    @Controller()
    @TsRest({
      validateRequestHeaders: false,
    })
    class TestController {
      @TsRest(contract.withHeaders)
      async create(@TsRestRequest() { headers }: RequestShapes['withHeaders']) {
        const response: ResponseShapes['withHeaders'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .get(contract.withHeaders.path)
      .send();

    expect(serverResponse.status).toEqual(200);
    expect(serverResponse.body.title).toBe('ok');
  });

  it('should validate query', async () => {
    @Controller()
    @TsRest({
      validateRequestQuery: true,
    })
    class TestController {
      @TsRest(contract.withQuery)
      async create(@TsRestRequest() { headers }: RequestShapes['withQuery']) {
        const response: ResponseShapes['withQuery'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .get(contract.withQuery.path)
      .send();

    expect(serverResponse.status).toEqual(400);
    expect(serverResponse.body.issues.length > 0).toBeTruthy();
    expect(serverResponse.body.issues[0].code).toBe('invalid_type');
    expect(serverResponse.body.issues[0].path[0]).toBe('id');
  });

  it("shouldn't validate query", async () => {
    @Controller()
    @TsRest({
      validateRequestQuery: false,
    })
    class TestController {
      @TsRest(contract.withQuery)
      async create(@TsRestRequest() { headers }: RequestShapes['withQuery']) {
        const response: ResponseShapes['withQuery'] = {
          status: 200,
          body: { title: 'ok' },
        };

        return response;
      }
    }

    const server = await initializeApp(TestController);
    const serverResponse = await supertest(server)
      .get(contract.withQuery.path)
      .send();

    expect(serverResponse.status).toEqual(200);
    expect(serverResponse.body.title).toBe('ok');
  });
});

describe('ts-rest-nest', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  const initializeApp = async (
    moduleMetadata: ModuleMetadata = {},
    adapter: 'express' | 'fastify' = 'express',
  ) => {
    const moduleRef = await Test.createTestingModule(moduleMetadata).compile();

    app =
      adapter === 'express'
        ? moduleRef.createNestApplication()
        : moduleRef.createNestApplication<NestFastifyApplication>(
            new FastifyAdapter(),
          );

    await app.init();

    if (adapter === 'fastify') {
      await app.getHttpAdapter().getInstance().ready();
    }

    return app.getHttpServer();
  };

  describe('should handle non-json response types from contract', () => {
    const c = initContract();
    const nonJsonContract = c.router({
      postIndex: {
        method: 'POST',
        path: `/index.html`,
        body: z.object({
          echoHtml: z.string(),
        }),
        responses: {
          200: c.otherResponse({
            contentType: 'text/html',
            body: z.string().regex(/^<([a-z][a-z0-9]*)\b[^>]*>(.*?)<\/\1>$/im),
          }),
        },
      },
      getRobots: {
        method: 'GET',
        path: `/robots.txt`,
        responses: {
          200: c.otherResponse({
            contentType: 'text/plain',
            body: c.type<string>(),
          }),
        },
      },
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

    @TsRest({ validateResponses: true })
    @Controller()
    class NonJsonController implements NestControllerInterface<
      typeof nonJsonContract
    > {
      @TsRest(nonJsonContract.postIndex)
      async postIndex(
        @TsRestRequest()
        {
          body: { echoHtml },
        }: NestRequestShapes<typeof nonJsonContract>['postIndex'],
      ) {
        return {
          status: 200,
          body: echoHtml,
        } as const;
      }

      @TsRest(nonJsonContract.getRobots)
      async getRobots(@TsRestRequest() _: any) {
        return {
          status: 200,
          body: 'User-agent: * Disallow: /',
        } as const;
      }

      @TsRest(nonJsonContract.getCss)
      async getCss(@TsRestRequest() _: any) {
        return {
          status: 200,
          body: 'body { color: red; }',
        } as const;
      }
    }

    it('express', async () => {
      const server = await initializeApp({ controllers: [NonJsonController] });

      const responseHtml = await supertest(server)
        .post('/index.html')
        .send({ echoHtml: '<h1>hello world</h1>' });
      expect(responseHtml.status).toEqual(200);
      expect(responseHtml.text).toEqual('<h1>hello world</h1>');
      expect(responseHtml.header['content-type']).toEqual(
        'text/html; charset=utf-8',
      );

      const responseHtmlFail = await supertest(server)
        .post('/index.html')
        .send({
          echoHtml: 'hello world',
        });
      expect(responseHtmlFail.status).toEqual(500);
      expect(responseHtmlFail.body).toEqual({
        message: 'Internal server error',
        statusCode: 500,
      });
      expect(responseHtmlFail.header['content-type']).toEqual(
        'application/json; charset=utf-8',
      );

      const responseTextPlain = await supertest(server).get('/robots.txt');
      expect(responseTextPlain.status).toEqual(200);
      expect(responseTextPlain.text).toEqual('User-agent: * Disallow: /');
      expect(responseTextPlain.header['content-type']).toEqual(
        'text/plain; charset=utf-8',
      );

      const responseCss = await supertest(server).get('/style.css');
      expect(responseCss.status).toEqual(200);
      expect(responseCss.text).toEqual('body { color: red; }');
      expect(responseCss.header['content-type']).toEqual(
        'text/css; charset=utf-8',
      );
    });

    it('fastify', async () => {
      const server = await initializeApp(
        {
          controllers: [NonJsonController],
        },
        'fastify',
      );

      const responseHtml = await supertest(server)
        .post('/index.html')
        .send({ echoHtml: '<h1>hello world</h1>' });
      expect(responseHtml.status).toEqual(200);
      expect(responseHtml.text).toEqual('<h1>hello world</h1>');
      expect(responseHtml.header['content-type']).toEqual('text/html');

      const responseHtmlFail = await supertest(server)
        .post('/index.html')
        .send({
          echoHtml: 'hello world',
        });
      expect(responseHtmlFail.status).toEqual(500);
      expect(responseHtmlFail.body).toEqual({
        message: 'Internal server error',
        statusCode: 500,
      });
      expect(responseHtmlFail.header['content-type']).toEqual(
        'application/json; charset=utf-8',
      );

      const responseTextPlain = await supertest(server).get('/robots.txt');
      expect(responseTextPlain.status).toEqual(200);
      expect(responseTextPlain.text).toEqual('User-agent: * Disallow: /');
      expect(responseTextPlain.header['content-type']).toEqual('text/plain');

      const responseCss = await supertest(server).get('/style.css');
      expect(responseCss.status).toEqual(200);
      expect(responseCss.text).toEqual('body { color: red; }');
      expect(responseCss.header['content-type']).toEqual('text/css');
    });
  });

  describe('should handle global configuration', () => {
    const c = initContract();
    const contract = c.router({
      getIndex: {
        method: 'GET',
        path: '/',
        query: z.object({
          foo: z.boolean(),
        }),
        responses: {
          200: z.object({
            foo: z.boolean(),
          }),
        },
      },
    });

    @Controller()
    class TestController implements NestControllerInterface<typeof contract> {
      @TsRest(contract.getIndex)
      async getIndex(
        @TsRestRequest()
        { query }: NestRequestShapes<typeof contract>['getIndex'],
      ) {
        return {
          status: 200,
          body: query,
        } as const;
      }
    }

    it('express', async () => {
      const server = await initializeApp({
        controllers: [TestController],
        imports: [
          TsRestModule.register({ validateResponses: true, jsonQuery: true }),
        ],
      });

      const response = await supertest(server).get('/?foo=true');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ foo: true });
    });

    it('fastify', async () => {
      const server = await initializeApp(
        {
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        },
        'fastify',
      );

      const response = await supertest(server).get('/?foo=true');
      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ foo: true });
    });

    describe('should handle overrides', () => {
      it('method override', async () => {
        @Controller()
        class TestController {
          @TsRestHandler(contract, { jsonQuery: false })
          async handler() {
            return tsRestHandler(contract, {
              getIndex: async ({ query }) => ({
                status: 200,
                body: query,
              }),
            });
          }
        }

        const server = await initializeApp({
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        });

        const response = await supertest(server).get('/?foo=true');
        expect(response.status).toEqual(400);
        expect(response.body).toEqual({
          bodyResult: null,
          headersResult: null,
          paramsResult: null,
          queryResult: {
            issues: [
              {
                code: 'invalid_type',
                expected: 'boolean',
                message: 'Expected boolean, received string',
                path: ['foo'],
                received: 'string',
              },
            ],
            name: 'ValidationError',
          },
        });
      });

      it('class override', async () => {
        @Controller()
        @TsRest({ jsonQuery: false })
        class TestController {
          @TsRestHandler(contract)
          async handler() {
            return tsRestHandler(contract, {
              getIndex: async ({ query }) => ({
                status: 200,
                body: query,
              }),
            });
          }
        }

        const server = await initializeApp({
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        });

        const response = await supertest(server).get('/?foo=true');
        expect(response.status).toEqual(400);
        expect(response.body).toEqual({
          bodyResult: null,
          headersResult: null,
          paramsResult: null,
          queryResult: {
            issues: [
              {
                code: 'invalid_type',
                expected: 'boolean',
                message: 'Expected boolean, received string',
                path: ['foo'],
                received: 'string',
              },
            ],
            name: 'ValidationError',
          },
        });
      });

      it('method overriding class', async () => {
        @Controller()
        @TsRest({ jsonQuery: false })
        class TestController {
          @TsRestHandler(contract, { jsonQuery: true })
          async handler() {
            return tsRestHandler(contract, {
              getIndex: async ({ query }) => ({
                status: 200,
                body: query,
              }),
            });
          }
        }

        const server = await initializeApp({
          controllers: [TestController],
          imports: [
            TsRestModule.register({ validateResponses: true, jsonQuery: true }),
          ],
        });

        const response = await supertest(server).get('/?foo=true');
        expect(response.status).toEqual(200);
        expect(response.body).toEqual({ foo: true });
      });
    });
  });

  describe('should handle no body', () => {
    const c = initContract();
    const contract = c.router({
      getIndex: {
        method: 'POST',
        path: '/',
        body: c.noBody(),
        responses: {
          204: c.noBody(),
        },
      },
    });

    @Controller()
    class TestController implements NestControllerInterface<typeof contract> {
      @TsRest(contract.getIndex)
      async getIndex(
        @TsRestRequest()
        _: NestRequestShapes<typeof contract>['getIndex'],
      ) {
        return {
          status: 204,
          body: undefined,
        } as const;
      }
    }

    it('express', async () => {
      const server = await initializeApp({
        controllers: [TestController],
      });

      const response = await supertest(server).post('/');
      expect(response.status).toEqual(204);
      expect(response.text).toEqual('');
      expect(response.headers['content-length']).toBeUndefined();
      expect(response.headers['content-type']).toBeUndefined();
    });

    it('fastify', async () => {
      const server = await initializeApp(
        {
          controllers: [TestController],
        },
        'fastify',
      );

      const response = await supertest(server).post('/');
      expect(response.status).toEqual(204);
      expect(response.text).toEqual('');
      expect(response.headers['content-length']).toBeUndefined();
      expect(response.headers['content-type']).toBeUndefined();
    });
  });

  describe('should handle thrown TsRestResponseError', () => {
    const c = initContract();
    const contract = c.router({
      getIndex: {
        method: 'GET',
        path: '/:id',
        responses: {
          200: z.object({
            id: z.string(),
          }),
          404: z.object({
            message: z.literal('Not Found'),
          }),
          500: c.noBody(),
        },
      },
    });

    @Controller()
    class TestController implements NestControllerInterface<typeof contract> {
      @TsRest(contract.getIndex)
      async getIndex(
        @TsRestRequest()
        { params: { id } }: NestRequestShapes<typeof contract>['getIndex'],
      ) {
        if (id === '500') {
          throw new TsRestResponseError(contract.getIndex, {
            status: 500,
            body: undefined,
          });
        }

        if (id === '404') {
          throw new TsRestResponseError(contract.getIndex, {
            status: 404,
            body: {
              message: 'Not Found',
            },
          });
        }

        return {
          status: 204,
          body: undefined,
        } as const;
      }
    }

    it('express', async () => {
      const server = await initializeApp({
        controllers: [TestController],
      });

      await supertest(server)
        .get('/404')
        .expect((response) => {
          expect(response.status).toEqual(404);
          expect(response.body).toEqual({ message: 'Not Found' });
        });

      await supertest(server)
        .get('/500')
        .expect((response) => {
          expect(response.status).toEqual(500);
          expect(response.text).toEqual('');
          expect(response.headers['content-length']).toEqual('0');
          expect(response.headers['content-type']).toBeUndefined();
        });
    });

    it('fastify', async () => {
      const server = await initializeApp(
        {
          controllers: [TestController],
        },
        'fastify',
      );

      await supertest(server)
        .get('/404')
        .expect((response) => {
          expect(response.status).toEqual(404);
          expect(response.body).toEqual({ message: 'Not Found' });
        });

      await supertest(server)
        .get('/500')
        .expect((response) => {
          expect(response.status).toEqual(500);
          expect(response.text).toEqual('');
          expect(response.headers['content-length']).toEqual('0');
          expect(response.headers['content-type']).toBeUndefined();
        });
    });
  });
});
