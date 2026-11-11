import { AppRoute } from '@ts-restless/core';
import {
  resolveSchema,
  AsyncAndSyncHelper,
  GetAsyncFunction,
  GetSyncFunction,
  SchemaTransformerAsync,
  SchemaTransformerSync,
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

const syncFunc: GetSyncFunction<GetQueryParameterHelper> = ({
  transformSchema,
  appRoute,
  id,
  concatenatedPath,
  jsonQuery = false,
}) => {
  const schema = appRoute.query;
  if (schema == null || typeof schema === 'symbol') {
    return [];
  }

  const transformedSchema = resolveSchema(
    transformSchema({
      schema,
      appRoute,
      id,
      concatenatedPath,
      type: 'query',
    }),
  )?.schema;

  if (!transformedSchema) {
    return [];
  }

  return schemaObjectToParameters(
    transformedSchema,
    'query',
    jsonQuery,
    concatenatedPath,
  );
};

const asyncFunc: GetAsyncFunction<GetQueryParameterHelper> = async ({
  transformSchema,
  appRoute,
  id,
  concatenatedPath,
  jsonQuery = false,
}) => {
  const schema = appRoute.query;
  if (schema == null || typeof schema === 'symbol') {
    return [];
  }

  const transformedSchema = resolveSchema(
    await transformSchema({
      schema,
      appRoute,
      id,
      concatenatedPath,
      type: 'query',
    }),
  )?.schema;

  if (!transformedSchema) {
    return [];
  }

  return schemaObjectToParameters(
    transformedSchema,
    'query',
    jsonQuery,
    concatenatedPath,
  );
};

export const getQueryParameterSchema: GetQueryParameterHelper = {
  sync: syncFunc,
  async: asyncFunc,
};
