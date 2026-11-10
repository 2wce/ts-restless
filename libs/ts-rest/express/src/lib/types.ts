import {
  AppRoute,
  AppRouteDeleteNoBody,
  AppRouteMutation,
  AppRouteQuery,
  AppRouter,
  FlattenAppRouter,
  ParamsFromUrl,
  ServerInferRequest,
  ServerInferResponseBody,
  ServerInferResponses,
} from '@ts-restless/core';
import { Express, NextFunction, Response, Request } from 'express';
import { RequestValidationError } from './request-validation-error';

export type AppRouteQueryImplementation<
  T extends AppRouteQuery | AppRouteDeleteNoBody,
> = (
  input: ServerInferRequest<T, Express['request']['headers']> & {
    req: TsRestRequest<T>;
    res: Response;
  },
) => Promise<ServerInferResponses<T>>;

export type AppRouteMutationImplementation<T extends AppRouteMutation> = (
  input: ServerInferRequest<T, Express['request']['headers']> & {
    files: unknown;
    file: unknown;
    req: TsRestRequest<T>;
    res: Response;
  },
) => Promise<ServerInferResponses<T>>;

export type AppRouteImplementation<T extends AppRoute> =
  T extends AppRouteMutation
    ? AppRouteMutationImplementation<T>
    : T extends AppRouteQuery | AppRouteDeleteNoBody
      ? AppRouteQueryImplementation<T>
      : never;

/**
 * The untouched native request. Only the handler's top-level arguments have
 * passed contract validation. Parsers and middleware own the raw body/query.
 */
export type TsRestRequest<
  T extends AppRouter | AppRoute,
  F extends FlattenAppRouter<T> = FlattenAppRouter<T>,
> = Request<
  ParamsFromUrl<F['path']>,
  F extends AppRoute ? ServerInferResponseBody<F> : never,
  unknown,
  Express['request']['query']
> & { tsRestRoute: F };

export type TsRestRequestHandler<T extends AppRouter | AppRoute> = (
  req: TsRestRequest<T>,
  res: Response,
  next: NextFunction,
) => void;

export interface AppRouteOptions<TRoute extends AppRoute> {
  middleware?: TsRestRequestHandler<TRoute>[];
  handler: TRoute extends AppRouteQuery | AppRouteDeleteNoBody
    ? AppRouteQueryImplementation<TRoute>
    : TRoute extends AppRouteMutation
      ? AppRouteMutationImplementation<TRoute>
      : never;
}

export type AppRouteImplementationOrOptions<TRoute extends AppRoute> =
  | AppRouteOptions<TRoute>
  | AppRouteImplementation<TRoute>;

export const isAppRouteImplementation = <TRoute extends AppRoute>(
  obj: AppRouteImplementationOrOptions<TRoute>,
): obj is AppRouteImplementation<TRoute> => {
  return typeof obj === 'function';
};

export type RouterImplementation<T extends AppRouter> = {
  [TKey in keyof T]: T[TKey] extends AppRouter
    ? RouterImplementation<T[TKey]>
    : T[TKey] extends AppRoute
      ? AppRouteImplementationOrOptions<T[TKey]>
      : never;
};

type TsRestValidationErrorRequest<T extends AppRouter> = Omit<
  TsRestRequest<FlattenAppRouter<T>>,
  'params'
> & {
  // Express can rematch the error middleware layer and clear route params.
  params: Partial<TsRestRequest<FlattenAppRouter<T>>['params']>;
};

export type TsRestExpressOptions<T extends AppRouter> = {
  logInitialization?: boolean;
  jsonQuery?: boolean;
  responseValidation?: boolean;
  globalMiddleware?: TsRestRequestHandler<FlattenAppRouter<T>>[];
  requestValidationErrorHandler?:
    | 'default'
    | 'combined'
    | ((
        err: RequestValidationError,
        req: TsRestValidationErrorRequest<T>,
        res: Response,
        next: NextFunction,
      ) => void);
};
