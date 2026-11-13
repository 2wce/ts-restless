import { AppRoute, ContractNoBody } from '@ts-restless/core';
import {
  resolveSchema,
  SchemaConversion,
  AsyncAndSyncHelper,
  GetAsyncFunction,
  GetSyncFunction,
  SchemaTransformerAsync,
  SchemaTransformerSync,
  SchemaTransformerArgs,
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

const prepareBody = ({
  appRoute,
  id,
  concatenatedPath,
}: Pick<
  SchemaTransformerArgs,
  'appRoute' | 'id' | 'concatenatedPath'
>): SchemaTransformerArgs | null => {
  const schema = 'body' in appRoute ? appRoute.body : undefined;
  if (schema == null || schema === ContractNoBody) return null;
  return { schema, appRoute, id, concatenatedPath, type: 'body' };
};

const syncFunc: GetSyncFunction<GetBodySchemaHelper> = (args) => {
  const context = prepareBody(args);
  return context ? resolveSchema(args.transformSchema(context)) : null;
};

const asyncFunc: GetAsyncFunction<GetBodySchemaHelper> = async (args) => {
  const context = prepareBody(args);
  return context ? resolveSchema(await args.transformSchema(context)) : null;
};

export const getBodySchema: GetBodySchemaHelper = {
  sync: syncFunc,
  async: asyncFunc,
};
