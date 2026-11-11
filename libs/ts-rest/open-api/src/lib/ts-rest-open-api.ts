import {
  type AppRoute,
  type AppRouter,
  isAppRouteOtherResponse,
} from '@ts-restless/core';
import type {
  ExamplesObject,
  InfoObject,
  OpenAPIObject,
  OpenApiDocument,
  ResponseObject,
  OperationObject,
  PathsObject,
  SchemaObject,
} from './model';
import {
  PathSchemaResults,
  RouterPath,
  SchemaTransformer,
  SchemaTransformerAsync,
  SchemaTransformerSync,
  OpenApiVersion,
  resolveSchema,
} from './types';
import { performContractTraversal } from './contract-traversal';
import {
  convertSchemaObjectToMediaTypeObject,
  extractReferenceSchemas,
} from './utils';
import { normalizeSchema, validateReferences } from './schema-conversion';

/**
 * Generate OpenAPI specification from ts-rest router
 *
 * @param router - The ts-rest router to generate OpenAPI from
 * @param apiDoc - Base OpenAPI document configuration
 * @param options - Generation options
 * @param options.setOperationId - Whether to set operation IDs (true, false, or 'concatenated-path')
 * @param options.jsonQuery - Enable JSON query parameters, [see](/docs/open-api#json-query-params)
 * @param options.operationMapper - Function to customize OpenAPI operations. Receives the operation object, app route, and operation ID
 * @returns OpenAPI specification object
 */
export function generateOpenApi<V extends OpenApiVersion = '3.0.2'>(
  router: AppRouter,
  apiDoc: Omit<OpenAPIObject, 'paths' | 'openapi'> & { info: InfoObject },
  options: {
    setOperationId?: boolean | 'concatenated-path';
    jsonQuery?: boolean;
    operationMapper?: (
      operation: OperationObject,
      appRoute: AppRoute,
      id: string,
    ) => OperationObject;
    schemaTransformer: SchemaTransformerSync;
    openApiVersion?: V;
  },
): OpenApiDocument<V> {
  const references: Record<string, SchemaObject> = structuredClone(
    apiDoc.components?.schemas ?? {},
  );
  const openApiVersion = options?.openApiVersion ?? '3.0.2';
  const transformSchema = prepareTransformer(
    options?.schemaTransformer,
    openApiVersion,
    references,
    false,
  ) as SchemaTransformerSync;

  const paths = performContractTraversal.sync({
    contract: router,
    transformSchema,
    jsonQuery: !!options?.jsonQuery,
  });

  return traversedPathsToOpenApi(paths, apiDoc, {
    openApiVersion,
    references,
    setOperationId: options?.setOperationId,
    jsonQuery: options?.jsonQuery,
    operationMapper: options?.operationMapper,
  }) as OpenApiDocument<V>;
}

/**
 * Generate OpenAPI specification from ts-rest router with custom schema transformer
 *
 * @param router - The ts-rest router to generate OpenAPI from
 * @param apiDoc - Base OpenAPI document configuration
 * @param options - Generation options
 * @param options.setOperationId - Whether to set operation IDs (true, false, or 'concatenated-path')
 * @param options.jsonQuery - Enable JSON query parameters, [see](/docs/open-api#json-query-params)
 * @param options.operationMapper - Function to customize OpenAPI operations. Receives the operation object, app route, and operation ID
 * @param options.schemaTransformer - Explicit validator-to-schema converter. Async generation accepts sync or async converters.
 */
export async function generateOpenApiAsync<V extends OpenApiVersion = '3.0.2'>(
  router: AppRouter,
  apiDoc: Omit<OpenAPIObject, 'paths' | 'openapi'> & { info: InfoObject },
  options: {
    setOperationId?: boolean | 'concatenated-path';
    jsonQuery?: boolean;
    operationMapper?: (
      operation: OperationObject,
      appRoute: AppRoute,
      id: string,
    ) => OperationObject;
    schemaTransformer: SchemaTransformer;
    openApiVersion?: V;
  },
): Promise<OpenApiDocument<V>> {
  const references: Record<string, SchemaObject> = structuredClone(
    apiDoc.components?.schemas ?? {},
  );
  const openApiVersion = options?.openApiVersion ?? '3.0.2';
  const transformSchema = prepareTransformer(
    options?.schemaTransformer,
    openApiVersion,
    references,
    true,
  ) as SchemaTransformerAsync;
  const paths = await performContractTraversal.async({
    contract: router,
    transformSchema,
    jsonQuery: !!options.jsonQuery,
  });

  return traversedPathsToOpenApi(paths, apiDoc, {
    openApiVersion,
    references,
    setOperationId: options.setOperationId,
    jsonQuery: options.jsonQuery,
    operationMapper: options.operationMapper,
  }) as OpenApiDocument<V>;
}

/**
 * Inner function to be reused by both sync and async functions
 */
const traversedPathsToOpenApi = (
  paths: Array<RouterPath & { schemaResults: PathSchemaResults }>,
  apiDoc: Omit<OpenAPIObject, 'paths' | 'openapi'> & { info: InfoObject },
  options: {
    openApiVersion?: OpenApiVersion;
    references?: Record<string, SchemaObject>;
    setOperationId?: boolean | 'concatenated-path';
    jsonQuery?: boolean;
    operationMapper?: (
      operation: OperationObject,
      appRoute: AppRoute,
      id: string,
    ) => OperationObject;
  },
) => {
  const mapMethod = {
    GET: 'get',
    POST: 'post',
    PUT: 'put',
    DELETE: 'delete',
    PATCH: 'patch',
  };

  const operationIds = new Map<string, string[]>();

  const referenceSchemas: Record<string, SchemaObject> = {
    ...apiDoc.components?.schemas,
    ...options.references,
  };

  const pathObject: PathsObject = {};

  for (const path of paths) {
    if (options.setOperationId === true) {
      const existingOp = operationIds.get(path.id);
      if (existingOp) {
        throw new Error(
          `Route '${path.id}' already defined under ${existingOp.join('.')}`,
        );
      }
      operationIds.set(path.id, path.paths);
    }

    const _bodySchema = path.schemaResults.body?.schema;
    const bodySchema = _bodySchema
      ? extractReferenceSchemas(_bodySchema, referenceSchemas)
      : null;

    const responses: Record<string, ResponseObject> = {};

    for (const [statusCode, response] of Object.entries(path.route.responses)) {
      const contentType = isAppRouteOtherResponse(response)
        ? response.contentType
        : 'application/json';

      const responseSchemaObject = path.schemaResults.responses[statusCode];
      const responseSchemaObjectWithReferences = responseSchemaObject
        ? extractReferenceSchemas(responseSchemaObject, referenceSchemas)
        : null;

      const description =
        response &&
        typeof response === 'object' &&
        'description' in response &&
        typeof response.description === 'string' &&
        response.description
          ? response.description
          : statusCode;

      responses[statusCode] = {
        description,
        ...(responseSchemaObjectWithReferences
          ? {
              content: {
                [contentType]: {
                  ...convertSchemaObjectToMediaTypeObject(
                    responseSchemaObjectWithReferences,
                  ),
                },
              },
            }
          : {}),
      };
    }

    const contentType =
      path.route?.method !== 'GET' && 'contentType' in path.route
        ? (path.route?.contentType ?? 'application/json')
        : 'application/json';

    const pathOperation: OperationObject = {
      description: path.route.description,
      summary: path.route.summary,
      deprecated: path.route.deprecated,
      tags: path.paths,
      parameters: [
        ...path.schemaResults.path,
        ...path.schemaResults.headers,
        ...path.schemaResults.query,
      ].map((parameter) => ({
        ...parameter,
        ...(parameter.schema && {
          schema: extractReferenceSchemas(parameter.schema, referenceSchemas),
        }),
        ...(parameter.content && {
          content: Object.fromEntries(
            Object.entries(parameter.content).map(([type, media]) => [
              type,
              {
                ...media,
                ...(media.schema && {
                  schema: extractReferenceSchemas(
                    media.schema,
                    referenceSchemas,
                  ),
                }),
              },
            ]),
          ),
        }),
      })),
      ...(options.setOperationId
        ? {
            operationId:
              options.setOperationId === 'concatenated-path'
                ? [...path.paths, path.id].join('.')
                : path.id,
          }
        : {}),
      ...(bodySchema
        ? {
            requestBody: {
              description: 'Body',
              required: path.schemaResults.body!.required,
              content: {
                [contentType]: {
                  ...convertSchemaObjectToMediaTypeObject(bodySchema),
                },
              },
            },
          }
        : {}),
      responses,
    };

    pathObject[path.path] = {
      ...pathObject[path.path],
      [mapMethod[path.route.method]]: options.operationMapper
        ? options.operationMapper(pathOperation, path.route, path.id)
        : pathOperation,
    };
  }

  const document: OpenAPIObject = {
    ...apiDoc,
    openapi: options.openApiVersion ?? '3.0.2',
    paths: pathObject,
    ...(Object.keys(referenceSchemas).length && {
      components: { ...apiDoc.components, schemas: referenceSchemas },
    }),
  };
  validateReferences(document);
  return document;
};

const prepareTransformer = (
  transformer: SchemaTransformer | undefined,
  openApiVersion: OpenApiVersion,
  references: Record<string, SchemaObject>,
  async: boolean,
): SchemaTransformer => {
  if (openApiVersion !== '3.0.2' && openApiVersion !== '3.1.0')
    throw new Error(`Unsupported OpenAPI version '${openApiVersion}'`);
  if (!transformer)
    throw new Error(
      'Provide a schemaTransformer, or import generateOpenApi from @ts-restless/open-api/legacy for Zod 3 compatibility.',
    );
  const finish = (
    result: Awaited<ReturnType<SchemaTransformer>>,
    args: Parameters<SchemaTransformer>[0],
  ) => {
    const converted = resolveSchema(result);
    if (!converted) {
      if (
        args.schema &&
        typeof args.schema === 'object' &&
        ('~standard' in args.schema || 'safeParse' in args.schema)
      ) {
        throw new Error(
          `No schema conversion for '${args.concatenatedPath}' (${args.type}). Supply a transformer for this validator.`,
        );
      }
      return null;
    }
    const schema = normalizeSchema(
      converted.schema,
      references,
      openApiVersion,
    );
    if (['path', 'query', 'header'].includes(args.type) && schema.$ref) {
      const match = /^#\/components\/schemas\/([^/]+)$/.exec(schema.$ref);
      if (!match)
        throw new Error(
          `Root ${args.type} schema for '${args.concatenatedPath}' must use a direct local component reference, received '${schema.$ref}'.`,
        );
      const name = decodeURIComponent(match[1])
        .replace(/~1/g, '/')
        .replace(/~0/g, '~');
      const referenced = references[name];
      if (!referenced || referenced.$ref)
        throw new Error(
          `Cannot resolve root ${args.type} schema '${schema.$ref}'`,
        );
      return {
        ...converted,
        schema: {
          ...referenced,
          ...Object.fromEntries(
            Object.entries(schema).filter(([key]) => key !== '$ref'),
          ),
        },
      };
    }
    return { ...converted, schema };
  };
  if (async)
    return async (args) =>
      finish(await transformer({ ...args, openApiVersion }), args);
  return (args) => {
    const result = transformer({ ...args, openApiVersion });
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      // Consume rejection too: the diagnostic must not produce an unhandled rejection.
      void Promise.resolve(result).catch(() => undefined);
      throw new Error('Async schemaTransformer requires generateOpenApiAsync.');
    }
    return finish(result as Awaited<ReturnType<SchemaTransformer>>, args);
  };
};
