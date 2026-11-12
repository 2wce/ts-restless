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

type GetQueryParameterHelper = AsyncAndSyncHelper<
  {
    appRoute: AppRoute;
    id: string;
    concatenatedPath: string;
    jsonQuery?: boolean;
  },
  {
    transformSchema: SchemaTransformerSync;
  },
  {
    transformSchema: SchemaTransformerAsync;
  },
  Array<ParameterObject>
>;

type QueryArgs = Pick<
  SchemaTransformerArgs,
  'appRoute' | 'id' | 'concatenatedPath'
> & { jsonQuery?: boolean };

const prepareQuery = ({
  appRoute,
  id,
  concatenatedPath,
}: QueryArgs): SchemaTransformerArgs | null => {
  const schema = appRoute.query;
  if (schema == null || typeof schema === 'symbol') return null;
  return { schema, appRoute, id, concatenatedPath, type: 'query' };
};

const assembleQuery = (
  { jsonQuery = false, concatenatedPath }: QueryArgs,
  result: SchemaTransformerResult,
): ParameterObject[] => {
  const schema = resolveSchema(result)?.schema;
  return schema
    ? schemaObjectToParameters(schema, 'query', jsonQuery, concatenatedPath)
    : [];
};

const syncFunc: GetSyncFunction<GetQueryParameterHelper> = (args) => {
  const context = prepareQuery(args);
  return context ? assembleQuery(args, args.transformSchema(context)) : [];
};
const asyncFunc: GetAsyncFunction<GetQueryParameterHelper> = async (args) => {
  const context = prepareQuery(args);
  return context
    ? assembleQuery(args, await args.transformSchema(context))
    : [];
};
export const getQueryParameterSchema: GetQueryParameterHelper = {
  sync: syncFunc,
  async: asyncFunc,
};
