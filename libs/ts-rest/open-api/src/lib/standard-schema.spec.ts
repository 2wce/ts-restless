import { z as z4 } from 'zod4';
import { toJsonSchema } from '@valibot/to-json-schema';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { SchemaTransformerSync } from './types';
import type { SchemaObject } from './model';
import * as v from 'valibot';
import {
  initContract,
  isStandardSchema,
  type StandardSchemaV1,
} from '@ts-restless/core';
import { generateOpenApi, generateOpenApiAsync } from './ts-rest-open-api';
import { VALIBOT_ASYNC } from './parsers/test-helpers';

const c = initContract();

const PostContentTitleSchema = v.object({
  type: v.literal('title'),
  title: v.string(),
});

const PostContentContentSchema = v.object({
  type: v.literal('content'),
  content: v.string(),
});

const PostContentImageSchema = v.object({
  type: v.literal('image'),
  imageUrl: v.pipe(
    v.string(),
    v.nonEmpty('Please enter your url.'),
    v.url('The url is badly formatted.'),
    v.endsWith('.com', 'Only ".com" domains are allowed.'),
  ),
});

const PostContentSchema = v.union([
  PostContentTitleSchema,
  PostContentContentSchema,
  PostContentImageSchema,
]);

const PostSchema = v.object({
  id: v.number(),
  title: v.string(),
  content: v.pipe(
    v.array(PostContentSchema),
    v.minLength(1, 'At least one content item is required'),
  ),
});

const IdPathParam = v.pipe(
  v.string(),
  v.transform((i) => Number(i)),
  v.integer(),
  v.description('The id of the post'),
);

const contract = c.router({
  updateVisibility: {
    method: 'POST',
    path: `/posts/:id/visibility/:visibility`,
    pathParams: v.object({
      id: IdPathParam,
      visibility: v.picklist(['public', 'private']),
    }),
    body: v.object({
      bodyProperty: v.array(v.string()),
    }),
    responses: {
      200: v.object({
        visibility: v.string(),
      }),
    },
  },
  updatePost: {
    method: 'PUT',
    path: `/posts/:id`,
    headers: {
      'x-required-header': v.string(),
      'x-optional-header': v.optional(v.string()),
    },
    pathParams: v.object({
      id: IdPathParam,
    }),
    body: PostSchema,
    responses: {
      200: PostSchema,
    },
  },
});

describe('standard schema', () => {
  it('should allow custom schema transformers', () => {
    const schema = generateOpenApi(
      c.router({
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          responses: {
            200: c.type<{ message: string }>(),
          },
        },
      }),
      {
        info: {
          title: 'Blog API',
          version: '0.1',
        },
      },
      {
        schemaTransformer: ({
          schema,
          appRoute,
          id,
          type,
          concatenatedPath,
        }) => {
          if (type === 'path') {
            return {
              type: 'object',
              properties: {
                id: { type: 'string', pattern: '^[0-9]+$', pathTest: 'test' },
              },
            };
          }

          return {
            topLevelReturn: true,
            description: type,
          };
        },
      },
    );

    expect(schema).toStrictEqual({
      info: {
        title: 'Blog API',
        version: '0.1',
      },
      openapi: '3.0.2',
      paths: {
        '/posts/{id}': {
          get: {
            deprecated: undefined,
            description: undefined,
            parameters: [
              {
                in: 'path',
                name: 'id',
                required: true,
                schema: {
                  type: 'string',
                  pattern: '^[0-9]+$',
                  pathTest: 'test',
                },
              },
            ],
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      description: 'response',
                      topLevelReturn: true,
                    },
                  },
                },
                description: '200',
              },
            },
            summary: undefined,
            tags: [],
          },
        },
      },
    });
  });

  it('async valibot schema', async () => {
    const openApiSchema = await generateOpenApiAsync(
      contract,
      {
        info: {
          title: 'Blog API',
          version: '0.1',
        },
      },
      {
        schemaTransformer: VALIBOT_ASYNC,
      },
    );

    // Write to FS
    // fs.writeFileSync(
    //   'valibot-openapi.json',
    //   JSON.stringify(openApiSchema, null, 2),
    // );

    const schema = {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        content: {
          type: 'array',
          minItems: 1,
          items: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  type: { enum: ['title'] },
                  title: { type: 'string' },
                },
                required: ['type', 'title'],
              },
              {
                type: 'object',
                properties: {
                  type: { enum: ['content'] },
                  content: { type: 'string' },
                },
                required: ['type', 'content'],
              },
              {
                type: 'object',
                properties: {
                  type: { enum: ['image'] },
                  imageUrl: {
                    type: 'string',
                    format: 'uri',
                    minLength: 1,
                    pattern: '\\.com$',
                  },
                },
                required: ['type', 'imageUrl'],
              },
            ],
          },
        },
      },
      required: ['id', 'title', 'content'],
    };

    expect(openApiSchema.paths['/posts/{id}']).toStrictEqual({
      put: {
        deprecated: undefined,
        description: undefined,
        parameters: [
          {
            in: 'path',
            name: 'id',
            description: 'The id of the post',
            required: true,
            schema: {
              type: 'integer',
            },
          },
          {
            in: 'header',
            name: 'x-required-header',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            in: 'header',
            name: 'x-optional-header',
            schema: {
              type: 'string',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema,
            },
          },
          description: 'Body',
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema,
              },
            },
            description: '200',
          },
        },
        summary: undefined,
        tags: [],
      },
    });

    expect(
      openApiSchema.paths['/posts/{id}/visibility/{visibility}'],
    ).toStrictEqual({
      post: {
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            description: 'The id of the post',
            schema: {
              type: 'integer',
            },
          },
          {
            in: 'path',
            name: 'visibility',
            required: true,
            schema: {
              enum: ['public', 'private'],
              type: 'string',
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                properties: {
                  bodyProperty: {
                    items: {
                      type: 'string',
                    },
                    type: 'array',
                  },
                },
                required: ['bodyProperty'],
                type: 'object',
              },
            },
          },
          description: 'Body',
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    visibility: {
                      type: 'string',
                    },
                  },
                  required: ['visibility'],
                  type: 'object',
                },
              },
            },
            description: '200',
          },
        },
        summary: undefined,
        deprecated: undefined,
        description: undefined,
        tags: [],
      },
    });
  });

  it('should handle complex headers, inheritence, transformation and optional headers', async () => {
    const postContract = c.router(
      {
        getPost: {
          method: 'GET',
          path: '/posts/:id',
          headers: {
            'x-route-required-header': v.string(),
            'x-route-optional-header': v.optional(v.string()),
            'x-unset': null,
          },
          responses: {
            200: v.object({
              message: v.string(),
            }),
          },
        },
      },
      {
        baseHeaders: {
          'x-base-required-header': v.string(),
          'x-base-optional-header': v.optional(v.string()),
        },
      },
    );

    const parentContract = c.router(
      {
        posts: postContract,
      },
      {
        baseHeaders: {
          'x-parent-required-header': v.string(),
          'x-parent-optional-header': v.optional(v.string()),
          'x-unset': v.string(),
        },
      },
    );

    const openApiSchema = await generateOpenApiAsync(
      parentContract,
      {
        info: {
          title: 'Blog API',
          version: '0.1',
        },
      },
      {
        schemaTransformer: VALIBOT_ASYNC,
      },
    );

    expect(openApiSchema.paths['/posts/{id}'].get!.parameters).toStrictEqual([
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'x-parent-required-header',
        in: 'header',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'x-parent-optional-header',
        in: 'header',
        schema: { type: 'string' },
      },
      {
        name: 'x-base-required-header',
        in: 'header',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'x-base-optional-header',
        in: 'header',
        schema: { type: 'string' },
      },
      {
        name: 'x-route-required-header',
        in: 'header',
        required: true,
        schema: { type: 'string' },
      },
      {
        name: 'x-route-optional-header',
        in: 'header',
        schema: { type: 'string' },
      },
    ]);
  });
});

describe('Standard Schema response description metadata', () => {
  it.each([
    {
      label: 'object metadata',
      description: { text: 'not an OpenAPI description' },
      expected: '200',
    },
    { label: 'numeric metadata', description: 42, expected: '200' },
    { label: 'empty description', description: '', expected: '200' },
    {
      label: 'string description',
      description: 'The requested value',
      expected: 'The requested value',
    },
  ])(
    'uses an OpenAPI string description for $label',
    ({ description, expected }) => {
      const responseSchema: StandardSchemaV1<string> & {
        description: unknown;
      } = {
        description,
        '~standard': {
          version: 1,
          vendor: 'description-test',
          validate: (value) =>
            typeof value === 'string'
              ? { value }
              : { issues: [{ message: 'Expected a string' }] },
        },
      };
      const document = generateOpenApi(
        c.router({
          getValue: {
            method: 'GET',
            path: '/metadata',
            responses: { 200: responseSchema },
          },
        }),
        { info: { title: 'Metadata API', version: '1.0' } },
        {
          schemaTransformer: ({ type }) =>
            type === 'response' ? { type: 'string' } : null,
        },
      );
      expect(document.paths['/metadata'].get?.responses!['200']).toEqual({
        description: expected,
        content: { 'application/json': { schema: { type: 'string' } } },
      });
    },
  );
});

// The same converter recipes are used by the public checked guide.
const zod4Converter: SchemaTransformerSync = ({
  schema,
  type,
  openApiVersion,
}) => {
  if (!(schema instanceof z4.ZodType)) return null;
  return {
    schema: z4.toJSONSchema(schema, {
      target: openApiVersion === '3.1.0' ? 'draft-2020-12' : 'openapi-3.0',
      io: type === 'response' ? 'output' : 'input',
    }) as SchemaObject,
    required: !(schema instanceof z4.ZodOptional),
  };
};
const valibotConverter: SchemaTransformerSync = ({
  schema,
  openApiVersion,
}) => {
  if (!isStandardSchema(schema) || schema['~standard'].vendor !== 'valibot')
    return null;
  return {
    schema: toJsonSchema(schema as v.GenericSchema, {
      target: openApiVersion === '3.1.0' ? 'draft-2020-12' : 'openapi-3.0',
    }) as SchemaObject,
    required: (schema as v.GenericSchema).type !== 'optional',
  };
};

describe('explicit conversion and dialects', () => {
  const info = { info: { title: 'Conversion', version: '1' } };
  const marker: StandardSchemaV1 = {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: () => {
        throw new Error('Generation must not validate');
      },
    },
  };
  const contract = c.router({
    create: {
      method: 'POST',
      path: '/body',
      body: marker,
      responses: { 204: c.noBody() },
    },
  });

  it('requires a converter and rejects an unsupported validator', () => {
    expect(() => generateOpenApi(contract, info, undefined as never)).toThrow(
      /schemaTransformer/,
    );
    expect(() =>
      generateOpenApi(contract, info, { schemaTransformer: () => null }),
    ).toThrow(/No schema conversion.*create.*body/);
  });

  it('rejects an async converter in synchronous generation, even from JavaScript', () => {
    expect(() =>
      generateOpenApi(contract, info, {
        schemaTransformer: (async () =>
          null) as unknown as SchemaTransformerSync,
      }),
    ).toThrow(/generateOpenApiAsync/);
  });

  it.each([true, false])(
    'uses explicit whole-body presence %s without running validation',
    async (required) => {
      const converter: SchemaTransformerSync = ({ schema }) =>
        schema === marker
          ? {
              schema: {
                type: 'object',
                properties: { field: { type: 'string' } },
                required: ['field'],
              },
              required,
            }
          : null;
      const sync = generateOpenApi(contract, info, {
        schemaTransformer: converter,
      });
      const async = await generateOpenApiAsync(contract, info, {
        schemaTransformer: async (args) => converter(args),
      });
      expect(sync.paths['/body'].post?.requestBody).toMatchObject({ required });
      expect(async).toEqual(sync);
      await SwaggerParser.validate(structuredClone(sync) as never);
    },
  );

  it.each(['3.0.2', '3.1.0'] as const)(
    'validates Zod4 and Valibot documents for %s',
    async (openApiVersion) => {
      for (const [schema, optional, converter] of [
        [
          z4.object({
            name: z4.string(),
            maybe: z4.string().nullable(),
            choice: z4.union([z4.string(), z4.number()]),
          }),
          z4.optional(z4.string()),
          zod4Converter,
        ],
        [
          v.object({
            name: v.string(),
            maybe: v.nullable(v.string()),
            choice: v.union([v.string(), v.number()]),
          }),
          v.optional(v.string()),
          valibotConverter,
        ],
      ] as const) {
        const routes = c.router({
          create: {
            method: 'POST',
            path: '/values/:name',
            pathParams: schema,
            query: schema,
            headers: { 'x-optional': optional },
            body: schema,
            responses: {
              200: schema,
              204: c.noBody(),
              400: c.otherResponse({
                contentType: 'text/plain',
                body: optional,
              }),
            },
          },
        });
        const sync = generateOpenApi(routes, info, {
          schemaTransformer: converter,
          openApiVersion,
        });
        const async = await generateOpenApiAsync(routes, info, {
          schemaTransformer: async (args) => converter(args),
          openApiVersion,
        });
        expect(sync).toEqual(async);
        expect(sync.openapi).toBe(openApiVersion);
        expect(sync.paths['/values/{name}'].post?.requestBody).toMatchObject({
          required: true,
        });
        expect(sync.paths['/values/{name}'].post?.responses?.['204']).toEqual({
          description: '204',
        });
        expect(
          sync.paths['/values/{name}'].post?.responses?.['400'],
        ).toHaveProperty('content.text/plain');
        expect(sync.paths['/values/{name}'].post?.parameters).toContainEqual({
          name: 'x-optional',
          in: 'header',
          schema: { type: 'string' },
        });
        await SwaggerParser.validate(structuredClone(sync) as never);
      }
    },
  );

  it('hoists shared definitions, preserves recursive refs, and resolves root parameter refs', async () => {
    const schema: SchemaObject = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: {
        Shared: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            next: { $ref: '#/$defs/Shared' },
          },
          required: ['name'],
        },
      },
      $ref: '#/$defs/Shared',
    };
    const converter: SchemaTransformerSync = ({ schema: input }) =>
      input === marker ? schema : null;
    const routes = c.router({
      create: {
        method: 'POST',
        path: '/refs',
        query: marker,
        body: marker,
        responses: { 200: marker },
      },
    });
    const document = generateOpenApi(
      routes,
      {
        ...info,
        components: {
          schemas: { Existing: { type: 'string' } },
          securitySchemes: { token: { type: 'http', scheme: 'bearer' } },
        },
      },
      { schemaTransformer: converter, openApiVersion: '3.1.0' },
    );
    expect(document.components?.schemas?.['Shared']).toMatchObject({
      properties: { next: { $ref: '#/components/schemas/Shared' } },
    });
    expect(document.components?.schemas?.['Existing']).toEqual({
      type: 'string',
    });
    expect(document.components?.securitySchemes?.['token']).toEqual({
      type: 'http',
      scheme: 'bearer',
    });
    expect(document.paths['/refs'].post?.parameters).toContainEqual({
      name: 'name',
      in: 'query',
      required: true,
      schema: { type: 'string' },
    });
    expect(schema).toHaveProperty('$defs');
    await SwaggerParser.validate(structuredClone(document) as never);
  });

  it.each([
    { schema: { $ref: '#/$defs/Missing' }, error: /Unresolved/ },
    {
      schema: { $schema: 'http://json-schema.org/draft-07/schema#' },
      error: /dialect/,
    },
    { schema: { const: 'x' }, error: /incompatible/ },
    { schema: { $id: 'https://example.com/schema' }, error: /resource IDs/ },
  ])('rejects incompatible conversion $schema', ({ schema, error }) => {
    expect(() =>
      generateOpenApi(contract, info, {
        schemaTransformer: ({ schema: input }) =>
          input === marker ? schema : null,
      }),
    ).toThrow(error);
  });

  it.each([
    { type: 'number', minimum: 5, exclusiveMinimum: true },
    { type: 'number', maximum: 5, exclusiveMaximum: false },
    {
      type: 'object',
      properties: { value: { type: 'number', exclusiveMinimum: false } },
    },
    {
      type: 'array',
      unevaluatedItems: { type: 'number', exclusiveMaximum: true },
    },
  ] as SchemaObject[])(
    'rejects boolean exclusive bounds when targeting 3.1',
    async (schema) => {
      const options = {
        schemaTransformer: ({ schema: input }: { schema: unknown }) =>
          input === marker ? schema : null,
        openApiVersion: '3.1.0' as const,
      };
      expect(() => generateOpenApi(contract, info, options)).toThrow(
        /exclusive.*3.1/,
      );
      await expect(
        generateOpenApiAsync(contract, info, options),
      ).rejects.toThrow(/exclusive.*3.1/);
    },
  );

  it('does not overwrite conflicting caller components', () => {
    expect(() =>
      generateOpenApi(
        contract,
        { ...info, components: { schemas: { Shared: { type: 'number' } } } },
        {
          schemaTransformer: ({ schema }) =>
            schema === marker
              ? {
                  $defs: { Shared: { type: 'string' } },
                  $ref: '#/$defs/Shared',
                }
              : null,
        },
      ),
    ).toThrow(/different schema/);
  });

  it('rejects external parameter references before resolving local components', () => {
    const routes = c.router({
      find: {
        method: 'GET',
        path: '/find',
        query: marker,
        responses: { 204: c.noBody() },
      },
    });
    expect(() =>
      generateOpenApi(
        routes,
        {
          ...info,
          components: {
            schemas: {
              Shared: {
                type: 'object',
                properties: { unrelated: { type: 'string' } },
              },
            },
          },
        },
        {
          schemaTransformer: ({ schema }) =>
            schema === marker ? { $ref: 'https://example.com/Shared' } : null,
        },
      ),
    ).toThrow(/direct local component reference/);
  });

  it.each([{ dependentRequired: { a: ['b'] } }, { unevaluatedItems: false }])(
    'rejects additional unsupported 3.0 keywords',
    (schema) => {
      expect(() =>
        generateOpenApi(contract, info, {
          schemaTransformer: ({ schema: input }) =>
            input === marker ? schema : null,
        }),
      ).toThrow(/incompatible/);
    },
  );

  it.each([false, true])(
    'diagnoses union query conversion for sync/async (%s)',
    async (async) => {
      const routes = c.router({
        find: {
          method: 'GET',
          path: '/find',
          query: marker,
          responses: { 204: c.noBody() },
        },
      });
      const converter: SchemaTransformerSync = ({ schema }) =>
        schema === marker
          ? ({
              oneOf: [
                { type: 'object', properties: { a: { type: 'string' } } },
                { type: 'object', properties: { b: { type: 'string' } } },
              ],
            } as SchemaObject)
          : null;
      if (async)
        await expect(
          generateOpenApiAsync(routes, info, {
            schemaTransformer: async (args) => converter(args),
          }),
        ).rejects.toThrow(/query.*find.*plain object/);
      else
        expect(() =>
          generateOpenApi(routes, info, { schemaTransformer: converter }),
        ).toThrow(/query.*find.*plain object/);
    },
  );
});
