import { AppRoute, isStandardSchema } from '@ts-restless/core';
import type { ParameterObject } from '../model';
import {
  resolveSchema,
  type AsyncAndSyncHelper,
  type SchemaTransformerAsync,
  type SchemaTransformerSync,
} from '../types';
import { schemaObjectToParameters, schemaToParameter } from './utils';

type Args = { appRoute: AppRoute; id: string; concatenatedPath: string };
type GetHeaderParameterHelper = AsyncAndSyncHelper<
  Args,
  { transformSchema: SchemaTransformerSync },
  { transformSchema: SchemaTransformerAsync },
  ParameterObject[]
>;
const isSchema = (value: unknown) =>
  isStandardSchema(value) ||
  (typeof value === 'object' &&
    value !== null &&
    'safeParse' in value &&
    typeof value.safeParse === 'function');

const convertHeaders = (
  args: Args,
  results: Array<{ key?: string; result: ReturnType<typeof resolveSchema> }>,
): ParameterObject[] =>
  results.flatMap(({ key, result }) => {
    if (!result) return [];
    return key === undefined
      ? schemaObjectToParameters(
          result.schema,
          'header',
          false,
          args.concatenatedPath,
        )
      : [
          schemaToParameter(
            result.schema,
            'header',
            result.required,
            key,
            false,
          ),
        ];
  });
const entries = (
  schema: AppRoute['headers'],
): Array<[string | undefined, unknown]> => {
  if (schema == null || typeof schema === 'symbol') return [];
  return isSchema(schema) ? [[undefined, schema]] : Object.entries(schema);
};
export const getHeaderParameterSchema: GetHeaderParameterHelper = {
  sync: (args) =>
    convertHeaders(
      args,
      entries(args.appRoute.headers).map(([key, schema]) => ({
        key,
        result: resolveSchema(
          args.transformSchema({ ...args, schema, type: 'header' }),
        ),
      })),
    ),
  async: async (args) =>
    convertHeaders(
      args,
      await Promise.all(
        entries(args.appRoute.headers).map(async ([key, schema]) => ({
          key,
          result: resolveSchema(
            await args.transformSchema({ ...args, schema, type: 'header' }),
          ),
        })),
      ),
    ),
};
