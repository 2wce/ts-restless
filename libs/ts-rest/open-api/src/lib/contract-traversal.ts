import {
  AppRouter,
  AppRoute,
  isAppRoute,
  isAppRouteOtherResponse,
} from '@ts-restless/core';
import {
  resolveSchema,
  AsyncAndSyncHelper,
  GetAsyncFunction,
  GetSyncFunction,
  PathSchemaResults,
  RouterPath,
  SchemaTransformerAsync,
  SchemaTransformerSync,
  SchemaTransformerArgs,
  SchemaTransformerResult,
} from './types';
import { getPathParameterSchema } from './parsers/path-params';
import { getHeaderParameterSchema } from './parsers/headers';
import { getQueryParameterSchema } from './parsers/query-params';
import { getBodySchema } from './parsers/body';
import { SchemaObject } from './model';

type PerformContractTraversalHelper = AsyncAndSyncHelper<
  {
    contract: AppRouter;
    jsonQuery: boolean;
  },
  {
    transformSchema: SchemaTransformerSync;
  },
  {
    transformSchema: SchemaTransformerAsync;
  },
  Array<RouterPath & { schemaResults: PathSchemaResults }>
>;

/**
 * Recursively step through the router and get all the individual routes with their paths etc.
 */
const getPathsFromRouter = (
  router: AppRouter,
  pathHistory?: string[],
): RouterPath[] => {
  const paths: RouterPath[] = [];

  Object.keys(router).forEach((key) => {
    const value = router[key];

    if (isAppRoute(value)) {
      const pathWithPathParams = value.path.replace(/:(\w+)/g, '{$1}');

      paths.push({
        id: key,
        path: pathWithPathParams,
        route: value,
        paths: pathHistory ?? [],
      });
    } else {
      paths.push(...getPathsFromRouter(value, [...(pathHistory ?? []), key]));
    }
  });

  return paths;
};

type RouteContext = Pick<
  SchemaTransformerArgs,
  'appRoute' | 'id' | 'concatenatedPath'
>;
const prepareRoute = (path: RouterPath): RouteContext => ({
  appRoute: path.route,
  id: path.id,
  concatenatedPath: [...path.paths, path.id].join('.'),
});
const prepareResponse = (
  context: RouteContext,
  response: AppRoute['responses'][number],
): SchemaTransformerArgs => ({
  schema: isAppRouteOtherResponse(response) ? response.body : response,
  ...context,
  type: 'response',
});
const responseSchema = (result: SchemaTransformerResult) =>
  result ? resolveSchema(result)!.schema : null;
const assembleResponses = (
  entries: Array<[string, SchemaObject | null]>,
): Record<string, SchemaObject> => {
  const responses: Record<string, SchemaObject> = {};
  for (const [status, schema] of entries)
    if (schema) responses[status] = schema;
  return responses;
};
const assembleRoute = (path: RouterPath, schemaResults: PathSchemaResults) => ({
  ...path,
  schemaResults,
});

const syncFunc: GetSyncFunction<PerformContractTraversalHelper> = ({
  contract,
  transformSchema,
  jsonQuery,
}) => {
  const results: Array<RouterPath & { schemaResults: PathSchemaResults }> = [];
  for (const path of getPathsFromRouter(contract)) {
    const context = prepareRoute(path);
    const args = { ...context, transformSchema };
    const pathParams = getPathParameterSchema.sync(args);
    const headers = getHeaderParameterSchema.sync(args);
    const query = getQueryParameterSchema.sync({
      ...args,
      jsonQuery: !!jsonQuery,
    });
    const body = getBodySchema.sync(args);
    const responses = assembleResponses(
      Object.entries(path.route.responses).map(([status, response]) => [
        status,
        responseSchema(transformSchema(prepareResponse(context, response))),
      ]),
    );
    results.push(
      assembleRoute(path, {
        path: pathParams,
        headers,
        query,
        body,
        responses,
      }),
    );
  }
  return results;
};

const asyncFunc: GetAsyncFunction<PerformContractTraversalHelper> = async ({
  contract,
  transformSchema,
  jsonQuery,
}) => {
  const results: Array<RouterPath & { schemaResults: PathSchemaResults }> = [];
  for (const path of getPathsFromRouter(contract)) {
    const context = prepareRoute(path);
    const args = { ...context, transformSchema };
    const pathParams = await getPathParameterSchema.async(args);
    const headers = await getHeaderParameterSchema.async(args);
    const query = await getQueryParameterSchema.async({
      ...args,
      jsonQuery: !!jsonQuery,
    });
    const body = await getBodySchema.async(args);
    const responseEntries: Array<[string, SchemaObject | null]> = [];
    for (const [status, response] of Object.entries(path.route.responses)) {
      responseEntries.push([
        status,
        responseSchema(
          await transformSchema(prepareResponse(context, response)),
        ),
      ]);
    }
    const responses = assembleResponses(responseEntries);
    results.push(
      assembleRoute(path, {
        path: pathParams,
        headers,
        query,
        body,
        responses,
      }),
    );
  }
  return results;
};
export const performContractTraversal: PerformContractTraversalHelper = {
  sync: syncFunc,
  async: asyncFunc,
};
