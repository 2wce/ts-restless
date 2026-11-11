import { AppRoute } from '@ts-restless/core';
import { ParameterObject, SchemaObject } from './model';

export type OpenApiVersion = '3.0.2' | '3.1.0';

/** Presence refers to the whole value, not its object properties. No validation runs during generation. */
export type SchemaConversion = { schema: SchemaObject; required: boolean };
export type SchemaTransformerResult = SchemaObject | SchemaConversion | null;

export type SchemaTransformerArgs = {
  /** Target document dialect. Defaults to 3.0.2 in parser helpers. */
  openApiVersion?: OpenApiVersion;
  /**
   * The schema to transform.
   */
  schema: unknown;
  /**
   * The app route.
   */
  appRoute: AppRoute;
  /**
   * The key of the route in a contract e.g. `getPokemon` or `createPokemon`.
   */
  id: string;
  /**
   * The concatenated path of the route. e.g. `pokemon.getPokemon` or `pokemon.createPokemon`.
   */
  concatenatedPath: string;
  /**
   * Where the schema is used, can be used to conditionally transform the schema.
   */
  type: 'body' | 'response' | 'query' | 'header' | 'path';
};

/**
 * Sync schema transformer.
 *
 * This will be invoked for all schemas, e.g. every query, pathParam, body, etc.
 *
 * You should guard against your schema type here, and return null if it's not the schema you want to transform.
 */
export type SchemaTransformerSync = (
  args: SchemaTransformerArgs,
) => SchemaTransformerResult;

/**
 * Async schema transformer.
 *
 * This will be invoked for all schemas, e.g. every query, pathParam, body, etc.
 *
 * You should guard against your schema type here, and return null if it's not the schema you want to transform.
 */
export type SchemaTransformerAsync = (
  args: SchemaTransformerArgs,
) => Promise<SchemaTransformerResult>;

export type SchemaTransformer = SchemaTransformerSync | SchemaTransformerAsync;

/**
 * We need to have many functions that are the same, but some are sync and some are async.
 *
 * This helper lets us make this trivial and avoids having different types for each function.
 *
 * @hidden
 */
export type AsyncAndSyncHelper<T, TFuncSyncArgs, TFuncAsyncArgs, TReturn> = {
  sync: (args: T & TFuncSyncArgs) => TReturn;
  async: (args: T & TFuncAsyncArgs) => Promise<TReturn>;
};

/**
 * @hidden
 */
export type GetSyncFunction<THelper> =
  THelper extends AsyncAndSyncHelper<any, any, any, any>
    ? THelper['sync']
    : never;

/**
 * @hidden
 */
export type GetAsyncFunction<THelper> =
  THelper extends AsyncAndSyncHelper<any, any, any, any>
    ? THelper['async']
    : never;

/**
 * @hidden
 */
export type RouterPath = {
  id: string;
  path: string;
  route: AppRoute;
  paths: string[];
};

/**
 * @hidden
 */
export type PathSchemaResults = {
  path: ParameterObject[];
  headers: ParameterObject[];
  query: ParameterObject[];
  body: SchemaConversion | null;
  /**
   * Status code to response.
   */
  responses: Record<string, SchemaObject>;
};

/** @hidden Normalize old plain-schema returns and explicit whole-value presence. */
export const resolveSchema = (
  result: SchemaTransformerResult,
): SchemaConversion | null => {
  if (result === null) return null;
  if ('schema' in result && typeof result.required === 'boolean') {
    return result as SchemaConversion;
  }
  return { schema: result as SchemaObject, required: true };
};
