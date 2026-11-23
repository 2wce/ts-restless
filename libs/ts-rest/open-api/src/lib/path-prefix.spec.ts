import { z as z4 } from 'zod4';
import SwaggerParser from '@apidevtools/swagger-parser';
import { initContract, type AppRoute } from '@ts-restless/core';
import type { SchemaObject } from './model';
import type { SchemaTransformerSync } from './types';
import { generateOpenApi, generateOpenApiAsync } from './ts-rest-open-api';
import { generateOpenApi as generateLegacyOpenApi } from '../legacy';

const c = initContract();
const info = { info: { title: 'Prefix', version: '1' } };
const schemaTransformer: SchemaTransformerSync = ({ schema }) =>
  schema instanceof z4.ZodType
    ? (z4.toJSONSchema(schema, { target: 'openapi-3.0' }) as SchemaObject)
    : null;
const asyncSchemaTransformer = async (
  args: Parameters<SchemaTransformerSync>[0],
) => schemaTransformer(args);

const contract = c.router(
  {
    users: c.router({
      getUser: {
        method: 'GET',
        path: '/users/:id',
        pathParams: z4.object({ id: z4.string() }),
        responses: { 200: z4.object({ id: z4.string() }) },
      },
      createUser: {
        method: 'POST',
        path: '/users',
        body: z4.object({ name: z4.string() }),
        responses: { 204: c.noBody() },
      },
    }),
    root: { method: 'GET', path: '/', responses: { 204: c.noBody() } },
  },
  { pathPrefix: '/v1' },
);

const generate = (pathPrefix?: string) =>
  generateOpenApi(contract, info, {
    schemaTransformer,
    setOperationId: 'concatenated-path',
    pathPrefix,
  });

describe('generation pathPrefix', () => {
  it('prepends the prefix to contract paths, including contract pathPrefix and path params', async () => {
    const document = generate('/api');
    expect(Object.keys(document.paths)).toEqual([
      '/api/v1/users/{id}',
      '/api/v1/users',
      '/api/v1/',
    ]);
    expect(document.paths['/api/v1/users/{id}'].get?.parameters).toEqual([
      expect.objectContaining({ name: 'id', in: 'path', required: true }),
    ]);
    await SwaggerParser.validate(structuredClone(document) as never);
  });

  it('applies the same paths in sync, async and legacy generation', async () => {
    const asyncDocument = await generateOpenApiAsync(contract, info, {
      schemaTransformer: asyncSchemaTransformer,
      setOperationId: 'concatenated-path',
      pathPrefix: '/api',
    });
    expect(asyncDocument).toEqual(generate('/api'));
    const legacy = generateLegacyOpenApi(
      c.router({
        get: { method: 'GET', path: '/users', responses: { 204: c.noBody() } },
      }),
      info,
      { pathPrefix: '/api' },
    );
    expect(Object.keys(legacy.paths)).toEqual(['/api/users']);
  });

  it.each([
    ['api', '/api/v1/users'],
    ['/api/', '/api/v1/users'],
    ['//api//internal//', '/api/internal/v1/users'],
    ['/api/internal', '/api/internal/v1/users'],
  ])('normalizes prefix %j', (pathPrefix, expected) => {
    expect(generate(pathPrefix).paths).toHaveProperty([expected]);
  });

  it.each([undefined, '', '/', '///'])(
    'leaves paths unchanged for prefix %j',
    (pathPrefix) => {
      expect(generate(pathPrefix)).toEqual(generate());
      expect(Object.keys(generate(pathPrefix).paths)).toEqual([
        '/v1/users/{id}',
        '/v1/users',
        '/v1/',
      ]);
    },
  );

  it('keeps contract route paths verbatim after the prefix', () => {
    const document = generateOpenApi(
      c.router({
        bare: { method: 'GET', path: 'users', responses: { 204: c.noBody() } },
        empty: { method: 'GET', path: '', responses: { 204: c.noBody() } },
        doubled: {
          method: 'GET',
          path: '//items/',
          responses: { 204: c.noBody() },
        },
      }),
      info,
      { schemaTransformer, pathPrefix: '/api' },
    );
    expect(Object.keys(document.paths)).toEqual([
      '/api/users',
      '/api',
      '/api//items/',
    ]);
  });

  it('preserves contract paths exactly without a prefix', () => {
    const document = generateOpenApi(
      c.router({
        empty: { method: 'GET', path: '', responses: { 204: c.noBody() } },
      }),
      info,
      { schemaTransformer, pathPrefix: '/' },
    );
    expect(Object.keys(document.paths)).toEqual(['']);
  });

  it('does not change operation IDs, tags or the route passed to callbacks', () => {
    const seen: AppRoute[] = [];
    const prefixed = generateOpenApi(contract, info, {
      schemaTransformer: (args) => {
        seen.push(args.appRoute);
        return schemaTransformer(args);
      },
      setOperationId: true,
      operationMapper: (operation, appRoute) => {
        seen.push(appRoute);
        return operation;
      },
      pathPrefix: '/api',
    });
    const operation = prefixed.paths['/api/v1/users/{id}'].get;
    expect(operation?.operationId).toBe('getUser');
    expect(operation?.tags).toEqual(['users']);
    expect(new Set(seen.map((route) => route.path))).toEqual(
      new Set(['/v1/users/:id', '/v1/users', '/v1/']),
    );
  });

  it.each([
    '/tenants/:tenantId',
    '/tenants/{tenantId}',
    '/api?x=1',
    '/api#docs',
    'https://example.com/api',
  ])(
    'rejects non-literal prefix %j before converting schemas',
    async (pathPrefix) => {
      const transformer = vi.fn(schemaTransformer);
      const message = /pathPrefix .* literal path/;
      expect(() =>
        generateOpenApi(contract, info, {
          schemaTransformer: transformer,
          pathPrefix,
        }),
      ).toThrow(message);
      await expect(
        generateOpenApiAsync(contract, info, {
          schemaTransformer: transformer,
          pathPrefix,
        }),
      ).rejects.toThrow(message);
      expect(transformer).not.toHaveBeenCalled();
    },
  );
});
