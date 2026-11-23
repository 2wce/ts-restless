import { StandardSchemaV1 } from './standard-schema';
import {
  LowercaseKeys,
  Merge,
  Opaque,
  Prettify,
  SchemaInputOrType,
  SchemaOutputOrType,
  WithoutUnknown,
} from './type-utils';
import { mergeHeaderSchemasForRoute } from './standard-schema-utils';

type MixedSchemaError<A, B> = Opaque<{ a: A; b: B }, 'MixedSchemaError'>;

/**
 * The path with colon-prefixed parameters
 * e.g. "/posts/:id".
 */
type Path = string;

export type ContractNoBodyType = Opaque<symbol, 'ContractNoBody'>;
export const ContractNoBody: ContractNoBodyType = Symbol.for(
  'ts-restless.ContractNoBody',
) as ContractNoBodyType;

export type ContractPlainType<T> = Opaque<T, 'ContractPlainType'>;
export type ContractNullType = Opaque<symbol, 'ContractNullType'>;
export type ContractAnyType =
  | StandardSchemaV1<any>
  | ContractPlainType<unknown>
  | ContractNullType
  | null;

export type ContractOtherResponse<T extends ContractAnyType> = Opaque<
  { contentType: string; body: T },
  'ContractOtherResponse'
>;

export type AppRouteResponse =
  | ContractAnyType
  | ContractNoBodyType
  | ContractOtherResponse<ContractAnyType>;

type AppRouteCommon = {
  path: Path;
  pathParams?: ContractAnyType;
  query?: ContractAnyType;
  headers?: Record<string, ContractAnyType> | ContractAnyType;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  responses: Record<number, AppRouteResponse>;
  strictStatusCodes?: boolean;
  metadata?: unknown;

  /**
   * @deprecated Use `validateResponse` on the client options
   */
  validateResponseOnClient?: boolean;
};

/**
 * A query endpoint. In REST terms, one using GET.
 */
export type AppRouteQuery = AppRouteCommon & {
  method: 'GET';
  multipart?: never;
};

export type MultipartFieldEncoding = 'form' | 'legacy-json';

/**
 * A request media type serialized with JSON.stringify: `application/json`
 * or a structured `+json` suffix type such as `application/merge-patch+json`.
 */
export type JsonMediaType = 'application/json' | `application/${string}+json`;

/**
 * A mutation endpoint. In REST terms, one using POST, PUT,
 * PATCH, or DELETE.
 */
export type AppRouteMutation = AppRouteCommon & {
  method: 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  body: ContractAnyType | ContractNoBodyType;
} & (
    | {
        contentType: 'multipart/form-data';
        multipart?: { fieldEncoding: MultipartFieldEncoding };
      }
    | {
        contentType?:
          | JsonMediaType
          | 'multipart/form-data'
          | 'application/x-www-form-urlencoded';
        multipart?: never;
      }
  );

/**
 * A mutation endpoint. In REST terms, one using POST, PUT,
 * PATCH, or DELETE.
 */
export type AppRouteDeleteNoBody = AppRouteCommon & {
  method: 'DELETE';
  multipart?: never;
};

type ValidatedHeaders<
  T extends AppRoute,
  TOptions extends RouterOptions,
  TOptionsApplied = ApplyOptions<T, TOptions>,
> = 'headers' extends keyof TOptionsApplied
  ? TOptionsApplied['headers'] extends MixedSchemaError<infer A, infer B>
    ? {
        _error: 'Cannot mix plain object types with StandardSchemaV1 objects for headers';
        a: A;
        b: B;
      }
    : T
  : T;

/**
 * Recursively process a router, allowing for you to define nested routers.
 *
 * The main purpose of this is to convert all path strings into string constants so we can infer the path
 */
type RecursivelyProcessAppRouter<
  T extends AppRouter,
  TOptions extends RouterOptions,
> = {
  [K in keyof T]: T[K] extends AppRoute
    ? ValidatedHeaders<T[K], TOptions>
    : T[K] extends AppRouter
      ? RecursivelyProcessAppRouter<T[K], TOptions>
      : T[K];
};

type RecursivelyApplyOptions<
  TRouter extends AppRouter,
  TOptions extends RouterOptions,
> = {
  [TRouterKey in keyof TRouter]: TRouter[TRouterKey] extends AppRoute
    ? Prettify<ApplyOptions<TRouter[TRouterKey], TOptions>>
    : TRouter[TRouterKey] extends AppRouter
      ? RecursivelyApplyOptions<TRouter[TRouterKey], TOptions>
      : TRouter[TRouterKey];
};

/** Merge whole-object Standard Schemas, field records or plain contract types. */
export type MergeHeadersWithLegacySupport<
  A extends AppRouteCommon['headers'],
  B extends AppRouteCommon['headers'],
> = [A, B] extends [undefined, undefined]
  ? unknown
  : A extends undefined
    ? B
    : B extends undefined
      ? A
      : A extends StandardSchemaV1
        ? B extends StandardSchemaV1
          ? StandardSchemaV1<
              Prettify<
                StandardSchemaV1.InferInput<A> & StandardSchemaV1.InferInput<B>
              >,
              Prettify<
                Merge<
                  StandardSchemaV1.InferOutput<A>,
                  StandardSchemaV1.InferOutput<B>
                >
              >
            >
          : unknown extends B
            ? A
            : MixedSchemaError<A, B>
        : B extends StandardSchemaV1
          ? unknown extends A
            ? B
            : MixedSchemaError<A, B>
          : A extends Record<string, ContractAnyType>
            ? B extends Record<string, ContractAnyType>
              ? MergeObjectBasedHeaders<A, B>
              : unknown
            : Prettify<
                  Merge<
                    LowercaseKeys<
                      A extends ContractPlainType<infer APlain> ? APlain : A
                    >,
                    LowercaseKeys<
                      B extends ContractPlainType<infer BPlain> ? BPlain : B
                    >
                  >
                > extends infer TMerged
              ? [A, B] extends [
                  ContractPlainType<unknown>,
                  ContractPlainType<unknown>,
                ]
                ? ContractPlainType<TMerged>
                : TMerged
              : never;

/**
 * Headers are typed as a Record<string, ContractAnyType>
 *
 * We need to be able to merge together base headers and route headers, this smushes them together taking precedence to route headers
 */
type MergeObjectBasedHeaders<
  T extends Record<string, ContractAnyType>,
  U extends Record<string, ContractAnyType>,
  TNormalized = LowercaseKeys<T>,
  UNormalized = LowercaseKeys<U>,
> = {
  // Keep null removals in the contract so an outer router cannot reintroduce them.
  [K in keyof TNormalized | keyof UNormalized]: K extends keyof UNormalized
    ? UNormalized[K]
    : K extends keyof TNormalized
      ? TNormalized[K]
      : never;
};

type IsEmptyObject<T> = keyof T extends never
  ? {} extends T
    ? true
    : false
  : false;

/**
 * For a given app route, infer the headers input type
 */
export type InferHeadersInput<
  T extends AppRoute,
  THeaders = T['headers'],
> = unknown extends THeaders
  ? undefined
  : THeaders extends ContractPlainType<infer TPlain>
    ? LowercaseKeys<TPlain>
    : // if empty object
      IsEmptyObject<THeaders> extends true
      ? {}
      : // if a whole-object Standard Schema
        THeaders extends StandardSchemaV1
        ? LowercaseKeys<StandardSchemaV1.InferInput<THeaders>>
        : // if modern object-based headers
          THeaders extends Record<string, ContractAnyType>
          ? LowercaseKeys<
              UnknownOrUndefinedObjectValuesToOptionalKeys<{
                [
                  K in keyof THeaders as THeaders[K] extends null ? never : K
                ]: THeaders[K] extends ContractAnyType
                  ? SchemaInputOrType<THeaders[K]>
                  : never;
              }>
            >
          : // else
            undefined;

/**
 * { foo: string | undefined } => { foo?: string | undefined }
 * { foo: unknown } => { foo?: unknown }
 *
 * @internal
 */
export type UnknownOrUndefinedObjectValuesToOptionalKeys<T> = {
  [
    K in keyof T as undefined extends T[K]
      ? K
      : unknown extends T[K]
        ? K
        : never
  ]?: T[K];
} & {
  [
    K in keyof T as undefined extends T[K]
      ? never
      : unknown extends T[K]
        ? never
        : K
  ]: T[K];
};

/**
 * For a given app route, infer the headers output type
 */
export type InferHeadersOutput<
  T extends AppRoute,
  THeaders = T['headers'],
> = unknown extends THeaders
  ? '1'
  : THeaders extends ContractPlainType<infer TPlain>
    ? LowercaseKeys<TPlain>
    : // if empty object
      IsEmptyObject<THeaders> extends true
      ? {}
      : // if a whole-object Standard Schema
        THeaders extends StandardSchemaV1
        ? LowercaseKeys<StandardSchemaV1.InferOutput<THeaders>>
        : // if modern object-based headers
          THeaders extends Record<string, ContractAnyType>
          ? LowercaseKeys<
              UnknownOrUndefinedObjectValuesToOptionalKeys<{
                [
                  K in keyof THeaders as THeaders[K] extends null ? never : K
                ]: THeaders[K] extends ContractAnyType
                  ? SchemaOutputOrType<THeaders[K]>
                  : never;
              }>
            >
          : '3';

type ApplyOptions<
  TRoute extends AppRoute,
  TOptions extends RouterOptions,
> = Omit<TRoute, 'headers' | 'path' | 'responses'> &
  WithoutUnknown<{
    path: TOptions['pathPrefix'] extends string
      ? `${TOptions['pathPrefix']}${TRoute['path']}`
      : TRoute['path'];
    headers: MergeHeadersWithLegacySupport<
      UnknownToUndefined<TOptions['baseHeaders']>,
      UnknownToUndefined<TRoute['headers']>
    >;
    strictStatusCodes: TRoute['strictStatusCodes'] extends boolean
      ? TRoute['strictStatusCodes']
      : TOptions['strictStatusCodes'] extends boolean
        ? TOptions['strictStatusCodes']
        : unknown;
    responses: 'commonResponses' extends keyof TOptions
      ? Prettify<Merge<TOptions['commonResponses'], TRoute['responses']>>
      : TRoute['responses'];
    metadata: 'metadata' extends keyof TOptions
      ? Prettify<Merge<TOptions['metadata'], TRoute['metadata']>>
      : TRoute['metadata'];
  }>;

/**
 * This was needed as **for some reason** headers above end up being `unknown`, our
 * `MergeHeadersWithLegacySupport` function expends undefined, so we need to normalize it
 *
 * Can be moved in V4 when the legacy polyfill is removed
 */
export type UnknownToUndefined<T> = unknown extends T
  ? T extends unknown
    ? undefined
    : T
  : T;

/**
 * A union of all possible endpoint types.
 */
export type AppRoute = AppRouteQuery | AppRouteMutation | AppRouteDeleteNoBody;
export type AppRouteStrictStatusCodes = Omit<AppRoute, 'strictStatusCodes'> & {
  strictStatusCodes: true;
};

/**
 * A router (or contract) in @ts-restless is a collection of more routers or
 * individual routes
 */
export type AppRouter = {
  [key: string]: AppRouter | AppRoute;
};

export type FlattenAppRouter<T extends AppRouter | AppRoute> =
  T extends AppRoute
    ? T
    : {
        [TKey in keyof T]: T[TKey] extends AppRoute
          ? T[TKey]
          : T[TKey] extends AppRouter
            ? FlattenAppRouter<T[TKey]>
            : never;
      }[keyof T];

export type RouterOptions<TPrefix extends string = string> = {
  baseHeaders?: Record<string, ContractAnyType> | ContractAnyType;
  strictStatusCodes?: boolean;
  pathPrefix?: TPrefix;
  commonResponses?: Record<number, AppRouteResponse>;
  metadata?: unknown;

  /**
   * @deprecated Use `validateResponse` on the client options
   */
  validateResponseOnClient?: boolean;
};

/**
 * Differentiate between a route and a router
 *
 * @param obj
 * @returns
 */
export const isAppRoute = (obj: AppRoute | AppRouter): obj is AppRoute => {
  return 'method' in obj && 'path' in obj;
};

export const isAppRouteQuery = (route: AppRoute): route is AppRouteQuery => {
  return route.method === 'GET';
};

export const isAppRouteMutation = (
  route: AppRoute,
): route is AppRouteMutation => {
  return !isAppRouteQuery(route);
};

type NarrowObject<T> = {
  [K in keyof T]: T[K];
};

/**
 * The instantiated ts-rest client
 */
type ContractInstance = {
  /**
   * A collection of routes or routers
   */
  router: <
    TRouter extends AppRouter,
    TPrefix extends string,
    TOptions extends RouterOptions<TPrefix> = {},
  >(
    endpoints: RecursivelyProcessAppRouter<TRouter, TOptions>,
    options?: TOptions,
  ) => RecursivelyApplyOptions<TRouter, TOptions>;
  /**
   * A single query route, should exist within
   * a {@link AppRouter}
   */
  query: <T extends AppRouteQuery>(query: NarrowObject<T>) => T;
  /**
   * A single mutation route, should exist within
   * a {@link AppRouter}
   */
  mutation: <T extends AppRouteMutation>(mutation: NarrowObject<T>) => T;
  responses: <TResponses extends Record<number, AppRouteResponse>>(
    responses: TResponses,
  ) => TResponses;
  /**
   * @deprecated Please use type() instead.
   */
  response: <T>() => T extends null ? ContractNullType : ContractPlainType<T>;
  /**
   * @deprecated Please use type() instead.
   */
  body: <T>() => T extends null ? ContractNullType : ContractPlainType<T>;
  /**
   * Exists to allow storing a Type in the contract (at compile time only)
   */
  type: <T>() => T extends null ? ContractNullType : ContractPlainType<T>;
  /**
   * Define a custom response type
   */
  otherResponse: <T extends ContractAnyType>({
    contentType,
    body,
  }: {
    contentType: string;
    body: T;
  }) => ContractOtherResponse<T>;
  /** Use to indicate that a route takes no body or responds with no body */
  noBody: () => ContractNoBodyType;
};

/**
 *
 * @deprecated Please use {@link initContract} instead.
 */
export const initTsRest = (): ContractInstance => initContract();

const recursivelyApplyOptions = <T extends AppRouter>(
  router: T,
  options?: RouterOptions,
): T => {
  return Object.fromEntries(
    Object.entries(router).map(([key, value]) => {
      if (isAppRoute(value)) {
        return [
          key,
          {
            ...value,
            path: options?.pathPrefix
              ? options.pathPrefix + value.path
              : value.path,
            headers: mergeHeaderSchemasForRoute(
              options?.baseHeaders,
              value.headers,
            ),
            strictStatusCodes:
              value.strictStatusCodes ?? options?.strictStatusCodes,
            validateResponseOnClient:
              value.validateResponseOnClient ??
              options?.validateResponseOnClient,
            responses: {
              ...options?.commonResponses,
              ...value.responses,
            },
            metadata: options?.metadata
              ? {
                  ...options?.metadata,
                  ...(value.metadata ?? {}),
                }
              : value.metadata,
          },
        ];
      } else {
        return [key, recursivelyApplyOptions(value, options)];
      }
    }),
  );
};

export const ContractPlainTypeRuntimeSymbol = Symbol(
  'ContractPlainType',
) as any;

/**
 * Instantiate a ts-rest client, primarily to access `router`, `response`, and `body`
 *
 * @returns {ContractInstance}
 */
export const initContract = (): ContractInstance => {
  return {
    // @ts-expect-error - this is a type error, but it's not clear how to fix it
    router: (endpoints, options) => recursivelyApplyOptions(endpoints, options),
    query: (args) => args,
    mutation: (args) => args,
    responses: (args) => args,
    response: () => ContractPlainTypeRuntimeSymbol,
    body: () => ContractPlainTypeRuntimeSymbol,
    type: () => ContractPlainTypeRuntimeSymbol,
    otherResponse: <T extends ContractAnyType>({
      contentType,
      body,
    }: {
      contentType: string;
      body: T;
    }) =>
      ({
        contentType,
        body,
      }) as ContractOtherResponse<T>,
    noBody: () => ContractNoBody,
  };
};
