import { AppRoute } from '@ts-restless/core';
import {
  resolveSchema,
  AsyncAndSyncHelper,
  GetAsyncFunction,
  GetSyncFunction,
  SchemaTransformerAsync,
  SchemaTransformerSync,
  SchemaTransformerArgs,
  SchemaTransformerResult,
} from '../types';
import { ParameterObject } from '../model';
import { schemaObjectToParameters } from './utils';

type GetPathParameterHelper = AsyncAndSyncHelper<
  {
    appRoute: AppRoute;
    id: string;
    concatenatedPath: string;
  },
  {
    transformSchema: SchemaTransformerSync;
  },
  {
    transformSchema: SchemaTransformerAsync;
  },
  Array<ParameterObject>
>;

/**
 * We build up the params from both the path and the schema.
 *
 * This builds up the record of name -> parameter object.
 */
export const getParamsFromPathOnly = (
  path: string,
): Map<string, ParameterObject> => {
  const params = new Map<string, ParameterObject>();

  const paramsInPath =
    path.match(/:([^/]+)/g)?.map((param) => param.slice(1)) || [];

  for (const param of paramsInPath) {
    params.set(param, {
      name: param,
      in: 'path' as const,
      required: true,
      schema: { type: 'string' },
    });
  }

  return params;
};

/**
 * Should return schema params as priority, and then path params as fallback
 *
 * @param pathParams - params inferred from the path i.e. just from the string
 * @param schemaParams - params from the schema
 */
const mergeParams = (
  pathParams: Map<string, ParameterObject>,
  schemaParams: Map<string, ParameterObject>,
): Array<ParameterObject> => {
  const resultMap = new Map<string, ParameterObject>();

  for (const [name, param] of pathParams.entries()) {
    resultMap.set(name, param);
  }

  for (const [name, param] of schemaParams.entries()) {
    resultMap.set(name, param);
  }

  return Array.from(resultMap.values());
};

const preparePath = ({
  appRoute,
  id,
  concatenatedPath,
}: Pick<SchemaTransformerArgs, 'appRoute' | 'id' | 'concatenatedPath'>) => {
  const schema = appRoute.pathParams;
  const params = getParamsFromPathOnly(appRoute.path);
  return {
    params,
    context: { schema, appRoute, id, concatenatedPath, type: 'path' as const },
  };
};

const assemblePath = (
  params: Map<string, ParameterObject>,
  concatenatedPath: string,
  result: SchemaTransformerResult,
): ParameterObject[] => {
  const schema = resolveSchema(result)?.schema;
  if (!schema) return Array.from(params.values());
  const schemaParams = schemaObjectToParameters(
    schema,
    'path',
    false,
    concatenatedPath,
  );
  return mergeParams(
    params,
    new Map(schemaParams.map((param) => [param.name, param])),
  );
};

const syncFunc: GetSyncFunction<GetPathParameterHelper> = (args) => {
  const { params, context } = preparePath(args);
  return assemblePath(
    params,
    args.concatenatedPath,
    args.transformSchema(context),
  );
};
const asyncFunc: GetAsyncFunction<GetPathParameterHelper> = async (args) => {
  const { params, context } = preparePath(args);
  return assemblePath(
    params,
    args.concatenatedPath,
    await args.transformSchema(context),
  );
};
export const getPathParameterSchema: GetPathParameterHelper = {
  sync: syncFunc,
  async: asyncFunc,
};
