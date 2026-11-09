import {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
} from '@tanstack/vue-query';
import {
  AppRoute,
  AppRouteMutation,
  ClientArgs,
  ClientInferRequest,
  ClientInferResponses,
  ErrorHttpStatusCode,
  SuccessfulHttpStatusCode,
  executeQueryRequest,
  evaluateFetchApiArgs,
} from '@ts-restless/core';

// Data response if it's a 2XX
export type DataResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  SuccessfulHttpStatusCode,
  'force'
>;

// Error response if it's not a 2XX
export type ErrorResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  ErrorHttpStatusCode,
  'ignore'
>;

export const queryFn = <
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
>(
  route: TAppRoute,
  clientArgs: TClientArgs,
  argsMapper?:
    | ClientInferRequest<AppRouteMutation, ClientArgs>
    | ((
        context: QueryFunctionContext<QueryKey>,
      ) => ClientInferRequest<AppRouteMutation, ClientArgs>),
): QueryFunction<DataResponse<TAppRoute>> => {
  return async (queryFnContext: QueryFunctionContext) => {
    const args =
      typeof argsMapper === 'function'
        ? argsMapper(queryFnContext)
        : argsMapper;

    const fetchApiArgs = evaluateFetchApiArgs(route, clientArgs, args);
    return executeQueryRequest(
      { ...fetchApiArgs, route },
      queryFnContext?.signal,
    );
  };
};
