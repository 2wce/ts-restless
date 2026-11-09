import {
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
} from '@tanstack/vue-query';
import {
  AppRoute,
  ClientArgs,
  PartialClientInferRequest,
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
  TPageParam = never,
>(
  route: TAppRoute,
  clientArgs: TClientArgs,
  argsMapper?:
    | PartialClientInferRequest<TAppRoute, TClientArgs>
    | ((
        context: QueryFunctionContext<QueryKey, TPageParam>,
      ) => PartialClientInferRequest<TAppRoute, TClientArgs>),
): QueryFunction<DataResponse<TAppRoute>, QueryKey, TPageParam> => {
  return async (queryFnContext) => {
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
