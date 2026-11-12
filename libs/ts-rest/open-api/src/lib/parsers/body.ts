import { AppRoute, ContractNoBody } from '@ts-restless/core';
import {
  resolveSchema,
  SchemaConversion,
  AsyncAndSyncHelper,
  GetAsyncFunction,
  GetSyncFunction,
  SchemaTransformerAsync,
  SchemaTransformerSync,
} from '../types';

type GetBodySchemaHelper = AsyncAndSyncHelper<
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
  SchemaConversion | null
>;

const syncFunc: GetSyncFunction<GetBodySchemaHelper> = ({
  transformSchema,
  appRoute,
  id,
  concatenatedPath,
}) => {
  const schema = 'body' in appRoute ? appRoute.body : undefined;
  if (schema == null || schema === ContractNoBody) return null;

  const transformedSchema = resolveSchema(
    transformSchema({
      schema,
      appRoute,
      id,
      concatenatedPath,
      type: 'body',
    }),
  );

  if (!transformedSchema) {
    return null;
  }

  return transformedSchema;
};

const asyncFunc: GetAsyncFunction<GetBodySchemaHelper> = async ({
  transformSchema,
  appRoute,
  id,
  concatenatedPath,
}) => {
  const schema = 'body' in appRoute ? appRoute.body : undefined;
  if (schema == null || schema === ContractNoBody) return null;

  const transformedSchema = resolveSchema(
    await transformSchema({
      schema,
      appRoute,
      id,
      concatenatedPath,
      type: 'body',
    }),
  );

  return transformedSchema;
};

export const getBodySchema: GetBodySchemaHelper = {
  sync: syncFunc,
  async: asyncFunc,
};
