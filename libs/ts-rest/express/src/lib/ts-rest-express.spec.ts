import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import type { AddressInfo } from 'node:net';
import {
  StandardSchemaV1,
  initContract,
  initClient,
  TsRestResponseValidationError as ResponseValidationError,
  TsRestResponseError,
} from '@ts-restless/core';
import supertest from 'supertest';
import express from 'express';
import { z } from 'zod';
import { z as zod4 } from 'zod4';
import { createExpressEndpoints, initServer } from './ts-rest-express';
import multer from 'multer';
import { RequestValidationError } from './request-validation-error';
import * as v from 'valibot';

const upload = multer();

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
const DefaultRequestValidationErrorSchema = ValidationErrorSchema;
const CombinedRequestValidationErrorSchema = z.object({
  pathParameterErrors: ValidationErrorSchema.nullable(),
  headerErrors: ValidationErrorSchema.nullable(),
  queryParameterErrors: ValidationErrorSchema.nullable(),
  bodyErrors: ValidationErrorSchema.nullable(),
});

const c = initContract();
const s = initServer();

const postsRouter = c.router({
  getPost: {
    method: 'GET',
    path: `/posts/:id`,
    responses: {
      200: null,
    },
  },
});

describe('strict mode', () => {
  it('allows unknown responses when not in strict mode', () => {
    const cLoose = c.router({ posts: postsRouter });

    s.router(cLoose, {
      posts: {
        getPost: async ({ params: { id } }) => {
          return {
            status: 201,
            body: null,
          };
        },
      },
    });
  });

  it('does not allow unknown statuses when in strict mode', () => {
    const cStrict = c.router(
      { posts: postsRouter },
      { strictStatusCodes: true },
    );

    s.router(cStrict, {
      posts: {
        // @ts-expect-error 201 is not defined as a known response
        getPost: async ({ params: { id } }) => {
          return {
            status: 201,
            body: null,
          };
        },
      },
    });
  });
});

describe('response evaluation compatibility', () => {
  it.each([true, false])(
    'runs a non-idempotent text transform according to validation=%s',
    async (responseValidation) => {
      const validate = vi.fn((value: unknown) => ({ value: `${value}!` }));
      const schema: StandardSchemaV1<string> = {
        '~standard': { version: 1, vendor: 'test', validate },
      };
      const contract = c.router({
        get: {
          method: 'GET',
          path: '/response-count',
          responses: {
            200: c.otherResponse({ contentType: 'text/plain', body: schema }),
          },
        },
      });
      const app = express();
      createExpressEndpoints(
        contract,
        s.router(contract, {
          get: async () => ({ status: 200, body: 'value' }),
        }),
        app,
        { responseValidation, logInitialization: false },
      );
      const response = await supertest(app).get('/response-count');
      expect(response.status).toBe(200);
      expect(response.text).toBe(responseValidation ? 'value!' : 'value');
      expect(response.headers['content-type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(validate).toHaveBeenCalledTimes(responseValidation ? 1 : 0);
    },
  );

  it('passes through an undeclared status with validation enabled', async () => {
    const validate = vi.fn(() => ({ issues: [{ message: 'Do not call' }] }));
    const schema: StandardSchemaV1<string> = {
      '~standard': { version: 1, vendor: 'test', validate },
    };
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/undeclared',
        responses: { 200: schema },
      },
    });
    const app = express();
    createExpressEndpoints(
      contract,
      s.router(contract, {
        get: async () => ({ status: 201, body: 'unknown' }),
      }),
      app,
      { responseValidation: true, logInitialization: false },
    );
    const response = await supertest(app).get('/undeclared');
    expect(response.status).toBe(201);
    expect(response.body).toBe('unknown');
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(validate).not.toHaveBeenCalled();
  });

  it('bypasses response validation for a real stream', async () => {
    const validate = vi.fn(() => ({
      issues: [{ message: 'Stream must bypass validation' }],
    }));
    const schema: StandardSchemaV1 = {
      '~standard': { version: 1, vendor: 'test', validate },
    };
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/stream-count',
        responses: { 200: schema },
      },
    });
    const app = express();
    createExpressEndpoints(
      contract,
      s.router(contract, {
        get: async ({ res }) => {
          res.setHeader('content-type', 'text/plain');
          return { status: 200, body: Readable.from(['streamed']) };
        },
      }),
      app,
      { responseValidation: true, logInitialization: false },
    );
    const response = await supertest(app).get('/stream-count');
    expect(response.status).toBe(200);
    expect(response.text).toBe('streamed');
    expect(response.headers['content-type']).toBe('text/plain');
    expect(validate).not.toHaveBeenCalled();
  });

  it('evaluates an ordinary JSON response once', async () => {
    const validate = vi.fn((value: unknown) => ({
      value: { transformed: value },
    }));
    const schema: StandardSchemaV1<unknown, { transformed: unknown }> = {
      '~standard': { version: 1, vendor: 'test', validate },
    };
    const contract = c.router({
      get: {
        method: 'GET',
        path: '/json-count',
        responses: { 200: schema },
      },
    });
    const app = express();
    createExpressEndpoints(
      contract,
      s.router(contract, {
        get: async () => ({ status: 200, body: 'input' }),
      }),
      app,
      { responseValidation: true, logInitialization: false },
    );
    const response = await supertest(app).get('/json-count');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ transformed: 'input' });
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(validate).toHaveBeenCalledExactlyOnceWith('input');
  });
});

describe('ts-rest-express', () => {
  it('validates mixed-case header declarations through a real HTTP request', async () => {
    const contract = c.router(
      {
        get: {
          method: 'GET',
          path: '/header-inference',
          headers: {
            'Idempotency-Key': zod4.string(),
            'x-count': zod4.string().transform(Number),
            'X-Note': v.optional(v.string()),
            Authorization: null,
          },
          responses: {
            200: c.type<{ key: string; count: number; note?: string }>(),
          },
        },
      },
      {
        baseHeaders: {
          'X-Count': zod4.literal('base'),
          authorization: zod4.string(),
        },
      },
    );
    const app = express();
    const handler = vi.fn();
    createExpressEndpoints(
      contract,
      s.router(contract, {
        get: async ({ headers }) => {
          handler(headers);
          return {
            status: 200,
            body: {
              key: headers['idempotency-key'],
              count: headers['x-count'],
              note: headers['x-note'],
            },
          };
        },
      }),
      app,
    );

    const accepted = await supertest(app)
      .get('/header-inference')
      .set('Idempotency-Key', 'request-1')
      .set('X-Count', '12');
    expect(accepted.status).toBe(200);
    expect(accepted.body).toEqual({ key: 'request-1', count: 12 });
    expect(handler).toHaveBeenCalledOnce();

    const missing = await supertest(app)
      .get('/header-inference')
      .set('X-Count', '12');
    expect(missing.status).toBe(400);
    expect(missing.body).toMatchObject({
      name: 'ValidationError',
      issues: [expect.objectContaining({ path: ['idempotency-key'] })],
    });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('should handle non-json response types from contract', async () => {
    const contract = c.router({
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

    const postIndex = s.route(
      contract.postIndex,
      async ({ body: { echoHtml } }) => {
        return {
          status: 200,
          body: echoHtml,
        };
      },
    );

    const router = s.router(contract, {
      postIndex,
      getRobots: async () => {
        return {
          status: 200,
          body: 'User-agent: * Disallow: /',
        };
      },
      getCss: async () => {
        return {
          status: 200,
          body: 'body { color: red; }',
        };
      },
    });

    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    createExpressEndpoints(contract, router, app, {
      responseValidation: true,
    });

    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (err instanceof ResponseValidationError) {
          res.status(500).send('Response validation failed');
          return;
        }

        next(err);
      },
    );

    const responseHtml = await supertest(app)
      .post('/index.html')
      .send({ echoHtml: '<h1>hello world</h1>' });
    expect(responseHtml.status).toEqual(200);
    expect(responseHtml.text).toEqual('<h1>hello world</h1>');
    expect(responseHtml.header['content-type']).toEqual(
      'text/html; charset=utf-8',
    );

    const responseHtmlFail = await supertest(app)
      .post('/index.html')
      .send({ echoHtml: 'hello world' });
    expect(responseHtmlFail.status).toEqual(500);
    expect(responseHtmlFail.text).toEqual('Response validation failed');
    expect(responseHtmlFail.header['content-type']).toEqual(
      'text/html; charset=utf-8',
    );

    const responseTextPlain = await supertest(app).get('/robots.txt');
    expect(responseTextPlain.status).toEqual(200);
    expect(responseTextPlain.text).toEqual('User-agent: * Disallow: /');
    expect(responseTextPlain.header['content-type']).toEqual(
      'text/plain; charset=utf-8',
    );

    const responseCss = await supertest(app).get('/style.css');
    expect(responseCss.status).toEqual(200);
    expect(responseCss.text).toEqual('body { color: red; }');
    expect(responseCss.header['content-type']).toEqual(
      'text/css; charset=utf-8',
    );
  });

  it('should handle no content body', async () => {
    const contract = c.router({
      noContent: {
        method: 'POST',
        path: '/:status',
        pathParams: z.object({
          status: z.coerce
            .number()
            .pipe(z.union([z.literal(200), z.literal(204)])),
        }),
        body: c.noBody(),
        responses: {
          200: c.noBody(),
          204: c.noBody(),
        },
      },
    });

    const router = s.router(contract, {
      noContent: async ({ params }) => {
        return {
          status: params.status,
          body: undefined,
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .post('/200')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.text).toEqual('');
        expect(res.header['content-type']).toBeUndefined();
        expect(res.header['content-length']).toStrictEqual('0');
      });

    await supertest(app)
      .post('/204')
      .expect((res) => {
        expect(res.status).toEqual(204);
        expect(res.text).toEqual('');
        expect(res.header['content-type']).toBeUndefined();
        expect(res.header['content-length']).toBeUndefined();
      });
  });

  it('should handle optional url params', async () => {
    const contract = c.router({
      getPosts: {
        method: 'GET',
        path: '/posts/:id?',
        pathParams: z.object({
          id: z.string().optional(),
        }),
        responses: {
          200: z.object({
            id: z.string().optional(),
          }),
        },
      },
    });

    const router = s.router(contract, {
      getPosts: async ({ params }) => {
        return {
          status: 200,
          body: {
            id: params.id,
          },
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .get('/posts')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({});
      });

    await supertest(app)
      .get('/posts/10')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '10' });
      });
  });

  it('should handle two levels of optional url params', async () => {
    const contract = c.router({
      getPosts: {
        method: 'GET',
        path: '/posts/:year?/:month?',
        responses: {
          200: z.object({
            id: z.string().optional(),
          }),
        },
      },
    });

    const router = s.router(contract, {
      getPosts: async ({ params }) => {
        return {
          status: 200,
          body: {
            id: `${params.year}-${params.month}`,
          },
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .get('/posts')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({
          id: `undefined-undefined`,
        });
      });

    await supertest(app)
      .get('/posts/2025')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '2025-undefined' });
      });

    await supertest(app)
      .get('/posts/2025/01')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({ id: '2025-01' });
      });
  });

  it('should handle multipart/form-data', async () => {
    const contract = c.router({
      uploadFiles: {
        method: 'POST',
        path: '/upload',
        body: z.object({
          files: z.custom<File[]>().optional(),
          file: z.custom<File>().optional(),
          foo: z.string(),
          email: z.string().email(),
        }),
        responses: {
          200: c.type<{
            fileFields: string[];
            body: {
              foo: string;
              email: string;
            };
          }>(),
        },
        contentType: 'multipart/form-data',
      },
    });

    const router = s.router(contract, {
      uploadFiles: {
        middleware: [upload.any()],
        handler: async ({ files, body }) => {
          const filesArray = files as Express.Multer.File[];

          return {
            status: 200,
            body: {
              fileFields: filesArray.map((file) => file.fieldname),
              body,
            },
          };
        },
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .post('/upload')
      .attach('files', Buffer.from(''), {
        filename: 'filename-1',
        contentType: 'text/plain',
      })
      .attach('files', Buffer.from(''), {
        filename: 'filename-2',
        contentType: 'text/plain',
      })
      .attach('file', Buffer.from(''), {
        filename: 'filename-3',
        contentType: 'text/plain',
      })
      .field('foo', 'bar')
      .field('email', 'alice@example.com')
      .expect((res) => {
        expect(res.status).toEqual(200);
        expect(res.body).toEqual({
          fileFields: ['files', 'files', 'file'],
          body: {
            foo: 'bar',
            email: 'alice@example.com',
          },
        });
      });

    const server = app.listen(0, '127.0.0.1');
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
      });
      const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const client = initClient(contract, { baseUrl });
      const jsonClient = initClient(contract, {
        baseUrl,
        multipartFieldEncoding: 'json',
      });
      const body = {
        foo: 'bar',
        email: 'alice@example.com',
        files: [new File(['one'], 'one.txt'), new File(['two'], 'two.txt')],
        file: new File(['three'], 'three.txt'),
      };
      const expected = {
        fileFields: ['files', 'files', 'file'],
        body: { foo: 'bar', email: 'alice@example.com' },
      };
      const native = await client.uploadFiles({ body });
      expect(native.status).toBe(200);
      expect(native.body).toEqual(expected);
      expect((await jsonClient.uploadFiles({ body })).status).toBe(400);
      const overridden = await jsonClient.uploadFiles({
        body,
        overrideClientOptions: { multipartFieldEncoding: 'native' },
      });
      expect(overridden.status).toBe(200);
      expect(overridden.body).toEqual(expected);
      const form = new FormData();
      form.append('foo', 'bar');
      form.append('email', 'alice@example.com');
      const explicit = await jsonClient.uploadFiles({ body: form });
      expect(explicit.status).toBe(200);
      expect(explicit.body).toEqual({ ...expected, fileFields: [] });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('allows download image', async () => {
    const contract = c.router({
      getFile: {
        method: 'GET',
        path: `/image`,
        headers: z.object({
          'Content-Type': z.string().optional(),
          'Content-disposition': z.string().optional(),
        }),
        responses: {
          200: z.unknown(),
        },
        summary: 'Get an image',
      },
    });

    const originalFilePath = path.join(__dirname, 'assets/logo.png');

    const router = s.router(contract, {
      getFile: async ({ res }) => {
        res.setHeader('Content-type', 'image/png');

        return {
          status: 200,
          body: fs.createReadStream(originalFilePath),
        };
      },
    });

    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    createExpressEndpoints(contract, router, app, {
      responseValidation: true,
    });

    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        if (err instanceof ResponseValidationError) {
          res.status(500).send('Response validation failed');
          return;
        }

        next(err);
      },
    );

    const responseImage = await supertest(app).get('/image');
    expect(responseImage.status).toEqual(200);
    expect(responseImage.body.toString()).toEqual(
      fs.readFileSync(originalFilePath, { encoding: 'utf-8' }),
    );
    expect(responseImage.headers['content-type']).toEqual('image/png');
  });

  it('should handle thrown TsRestResponseError', async () => {
    const contract = c.router({
      getPost: {
        method: 'GET',
        path: '/posts/:id',
        responses: {
          200: z.object({
            id: z.string(),
          }),
          404: z.object({
            message: z.literal('Not found'),
          }),
          500: c.noBody(),
        },
      },
    });

    const router = s.router(contract, {
      getPost: async ({ params: { id } }) => {
        if (id === '500') {
          throw new TsRestResponseError(contract.getPost, {
            status: 500,
            body: undefined,
          });
        }

        throw new TsRestResponseError(contract.getPost, {
          status: 404,
          body: {
            message: 'Not found',
          },
        });
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app);

    await supertest(app)
      .get('/posts/500')
      .expect((res) => {
        expect(res.status).toEqual(500);
        expect(res.text).toEqual('');
      });

    await supertest(app)
      .get('/posts/10')
      .expect((res) => {
        expect(res.status).toEqual(404);
        expect(res.body).toEqual({ message: 'Not found' });
      });
  });

  it("should throw default requestValidation error if body doesn't match", async () => {
    const contract = c.router({
      createPost: {
        method: 'POST',
        path: '/posts',
        body: z.object({
          id: z.string(),
          content: z.string(),
        }),
        responses: {
          200: c.noBody(),
          400: DefaultRequestValidationErrorSchema,
        },
      },
    });

    const router = s.router(contract, {
      createPost: async () => {
        return {
          status: 200,
          body: undefined,
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app, {
      requestValidationErrorHandler: 'default',
    });

    await supertest(app)
      .post('/posts')
      .expect((res) => {
        expect(res.status).toEqual(400);
        expect(() =>
          DefaultRequestValidationErrorSchema.parse(res.body),
        ).not.toThrowError();
      });
  });

  it("should throw combined requestValidation error if body doesn't match", async () => {
    const contract = c.router({
      createPost: {
        method: 'POST',
        path: '/posts',
        body: z.object({
          id: z.string(),
          content: z.string(),
        }),
        responses: {
          200: c.noBody(),
          400: DefaultRequestValidationErrorSchema,
        },
      },
    });

    const router = s.router(contract, {
      createPost: async () => {
        return {
          status: 200,
          body: undefined,
        };
      },
    });

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    createExpressEndpoints(contract, router, app, {
      requestValidationErrorHandler: 'combined',
    });

    await supertest(app)
      .post('/posts')
      .expect((res) => {
        expect(res.status).toEqual(400);
        expect(() =>
          CombinedRequestValidationErrorSchema.parse(res.body),
        ).not.toThrowError();
      });
  });

  describe('valibot', () => {
    it('should handle default error handler', async () => {
      const contract = c.router({
        createPost: {
          method: 'POST',
          path: '/posts',
          body: v.object({
            id: v.string(),
            content: v.string(),
          }),
          responses: {
            200: c.noBody(),
          },
        },
      });

      const router = s.router(contract, {
        createPost: async () => {
          return {
            status: 200,
            body: undefined,
          };
        },
      });

      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      createExpressEndpoints(contract, router, app, {});

      await supertest(app)
        .post('/posts')
        .expect((res) => {
          expect(res.status).toEqual(400);
          expect(res.body).toStrictEqual({
            name: 'ValidationError',
            issues: [
              {
                expected: 'Object',
                kind: 'schema',
                message: 'Invalid type: Expected Object but received undefined',
                received: 'undefined',
                type: 'object',
              },
            ],
          });
        });
    });

    it('should work with combined error handler', async () => {
      const contract = c.router({
        createPost: {
          method: 'POST',
          path: '/posts',
          body: v.object({
            id: v.string(),
            content: v.string(),
          }),
          responses: {
            200: c.noBody(),
          },
        },
      });

      const router = s.router(contract, {
        createPost: async () => {
          return {
            status: 200,
            body: undefined,
          };
        },
      });

      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      createExpressEndpoints(contract, router, app, {
        requestValidationErrorHandler: 'combined',
      });

      await supertest(app)
        .post('/posts')
        .expect((res) => {
          expect(res.status).toEqual(400);
          expect(res.body).toStrictEqual({
            bodyErrors: {
              issues: [
                {
                  expected: 'Object',
                  kind: 'schema',
                  message:
                    'Invalid type: Expected Object but received undefined',
                  received: 'undefined',
                  type: 'object',
                },
              ],
              name: 'ValidationError',
            },
            headerErrors: null,
            pathParameterErrors: null,
            queryParameterErrors: null,
          });
        });
    });

    it('should work with custom error handler', async () => {
      const contract = c.router({
        createPost: {
          method: 'POST',
          path: '/posts',
          body: v.object({
            id: v.string(),
            content: v.string(),
          }),
          responses: {
            200: c.noBody(),
          },
        },
      });

      const router = s.router(contract, {
        createPost: async () => {
          return {
            status: 200,
            body: undefined,
          };
        },
      });

      const app = express();
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      createExpressEndpoints(contract, router, app, {
        requestValidationErrorHandler: (
          err: RequestValidationError,
          req: express.Request,
          res: express.Response,
          next: express.NextFunction,
        ) => {
          res.status(400).json({
            custom: 'error',
            countOfIssues:
              (err.body?.issues?.length ?? 0) +
              (err.query?.issues?.length ?? 0) +
              (err.pathParams?.issues?.length ?? 0),
          });
          return;
        },
      });

      await supertest(app)
        .post('/posts')
        .expect((res) => {
          expect(res.status).toEqual(400);
          expect(res.body).toStrictEqual({
            custom: 'error',
            countOfIssues: 1,
          });
        });
    });
  });
});
