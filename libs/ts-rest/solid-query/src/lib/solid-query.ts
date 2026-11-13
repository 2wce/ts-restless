import {
  createInfiniteQuery,
  CreateInfiniteQueryResult,
  createMutation,
  CreateMutationResult,
  createQuery,
  CreateQueryResult,
  QueryFunction,
  QueryFunctionContext,
  QueryKey,
  InfiniteData,
} from '@tanstack/solid-query';
import {
  AppRoute,
  AppRouteMutation,
  AppRouteFunction,
  AppRouteQuery,
  AppRouter,
  ClientArgs,
  ClientInferResponses,
  ErrorHttpStatusCode,
  evaluateFetchApiArgs,
  executeQueryRequest,
  getRouteQuery,
  isAppRoute,
  PartialClientInferRequest,
  SuccessfulHttpStatusCode,
  Without,
} from '@ts-restless/core';

type RecursiveProxyObj<T extends AppRouter, TClientArgs extends ClientArgs> = {
  [TKey in keyof T]: T[TKey] extends AppRoute
    ? Without<UseQueryArgs<T[TKey], TClientArgs>, never>
    : T[TKey] extends AppRouter
      ? RecursiveProxyObj<T[TKey], TClientArgs>
      : never;
};

type UseQueryArgs<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = {
  createQuery: TAppRoute extends AppRouteQuery
    ? DataReturnQuery<TAppRoute, TClientArgs>
    : never;
  createInfiniteQuery: TAppRoute extends AppRouteQuery
    ? DataReturnInfiniteQuery<TAppRoute, TClientArgs>
    : never;
  query: TAppRoute extends AppRouteQuery
    ? AppRouteFunction<TAppRoute, TClientArgs>
    : never;
  createMutation: TAppRoute extends AppRouteMutation
    ? DataReturnMutation<TAppRoute, TClientArgs>
    : never;
  mutation: TAppRoute extends AppRouteMutation
    ? AppRouteFunction<TAppRoute, TClientArgs>
    : never;
};

type DataResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  SuccessfulHttpStatusCode,
  'force'
>;

type ErrorResponse<TAppRoute extends AppRoute> = ClientInferResponses<
  TAppRoute,
  ErrorHttpStatusCode,
  'ignore'
>;

// Native lifecycle and reactivity remain owned by Solid Query.
type MaybeAccessor<T> = T | (() => T);
const resolve = <T extends object>(value: MaybeAccessor<T>): T =>
  typeof value === 'function' ? value() : value;

type NativeQueryOptions<TRoute extends AppRoute, TData> = ReturnType<
  Parameters<
    typeof createQuery<
      DataResponse<TRoute>,
      ErrorResponse<TRoute>,
      TData,
      QueryKey
    >
  >[0]
>;
type NativeInfiniteOptions<
  TRoute extends AppRoute,
  TData,
  TPageParam,
> = ReturnType<
  Parameters<
    typeof createInfiniteQuery<
      DataResponse<TRoute>,
      ErrorResponse<TRoute>,
      TData,
      QueryKey,
      TPageParam
    >
  >[0]
>;
type QueryOptions<TRoute extends AppRoute, TData> = Omit<
  NativeQueryOptions<TRoute, TData>,
  'queryKey' | 'queryFn' | 'initialData'
> &
  Partial<Pick<NativeQueryOptions<TRoute, TData>, 'initialData'>>;
type InfiniteOptions<TRoute extends AppRoute, TData, TPageParam> = Omit<
  NativeInfiniteOptions<TRoute, TData, TPageParam>,
  'queryKey' | 'queryFn' | 'initialData'
> &
  Partial<
    Pick<NativeInfiniteOptions<TRoute, TData, TPageParam>, 'initialData'>
  >;
type MutationOptions<
  TRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = Omit<
  ReturnType<
    Parameters<
      typeof createMutation<
        DataResponse<TRoute>,
        ErrorResponse<TRoute>,
        PartialClientInferRequest<TRoute, TClientArgs>,
        unknown
      >
    >[0]
  >,
  'mutationFn'
>;

type DataReturnQuery<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = <TData = DataResponse<TAppRoute>>(
  queryKey: () => QueryKey,
  args: MaybeAccessor<PartialClientInferRequest<TAppRoute, TClientArgs>>,
  options?:
    | QueryOptions<TAppRoute, TData>
    | (() => QueryOptions<TAppRoute, TData>),
) => CreateQueryResult<TData, ErrorResponse<TAppRoute>>;

type DataReturnInfiniteQuery<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = <
  TPageParam = unknown,
  TData = InfiniteData<DataResponse<TAppRoute>, TPageParam>,
>(
  queryKey: () => QueryKey,
  args: (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ) => PartialClientInferRequest<TAppRoute, TClientArgs>,
  options: MaybeAccessor<InfiniteOptions<TAppRoute, TData, TPageParam>>,
) => CreateInfiniteQueryResult<TData, ErrorResponse<TAppRoute>>;

type DataReturnMutation<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = (
  options?: MaybeAccessor<MutationOptions<TAppRoute, TClientArgs>>,
) => CreateMutationResult<
  DataResponse<TAppRoute>,
  ErrorResponse<TAppRoute>,
  PartialClientInferRequest<TAppRoute, TClientArgs>,
  unknown
>;

const getRouteUseQuery =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  <TData = DataResponse<TAppRoute>>(
    queryKey: () => QueryKey,
    args: MaybeAccessor<PartialClientInferRequest<TAppRoute, TClientArgs>>,
    options?:
      | QueryOptions<TAppRoute, TData>
      | (() => QueryOptions<TAppRoute, TData>),
  ) =>
    createQuery<
      DataResponse<TAppRoute>,
      ErrorResponse<TAppRoute>,
      TData,
      QueryKey
    >(() => {
      const request = resolve(args);
      const queryFn: QueryFunction<DataResponse<TAppRoute>, QueryKey> = ({
        signal,
      }) =>
        executeQueryRequest(
          { ...evaluateFetchApiArgs(route, clientArgs, request), route },
          signal,
        );
      return {
        ...(options && resolve(options)),
        queryKey: queryKey(),
        queryFn,
      };
    });

const getRouteUseInfiniteQuery =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  <
    TPageParam = unknown,
    TData = InfiniteData<DataResponse<TAppRoute>, TPageParam>,
  >(
    queryKey: () => QueryKey,
    args: (
      context: QueryFunctionContext<QueryKey, TPageParam>,
    ) => PartialClientInferRequest<TAppRoute, TClientArgs>,
    options: MaybeAccessor<InfiniteOptions<TAppRoute, TData, TPageParam>>,
  ) => {
    const queryFn: QueryFunction<
      DataResponse<TAppRoute>,
      QueryKey,
      TPageParam
    > = (context) =>
      executeQueryRequest(
        { ...evaluateFetchApiArgs(route, clientArgs, args(context)), route },
        context.signal,
      );
    return createInfiniteQuery<
      DataResponse<TAppRoute>,
      ErrorResponse<TAppRoute>,
      TData,
      QueryKey,
      TPageParam
    >(() => ({
      ...resolve(options),
      queryKey: queryKey(),
      queryFn,
    }));
  };

const getRouteUseMutation =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  (options?: MaybeAccessor<MutationOptions<TAppRoute, TClientArgs>>) => {
    const mutationFn = (
      args: PartialClientInferRequest<TAppRoute, TClientArgs>,
    ) =>
      executeQueryRequest({
        ...evaluateFetchApiArgs(route, clientArgs, args),
        route,
      });
    return createMutation(() => ({
      ...(options && resolve(options)),
      mutationFn,
    }));
  };

/** @deprecated Use `TsRestSolidQueryClient` instead */
export type InitClientReturn<
  T extends AppRouter,
  TClientArgs extends ClientArgs,
> = TsRestSolidQueryClient<T, TClientArgs>;

export type TsRestSolidQueryClient<
  T extends AppRouter,
  TClientArgs extends ClientArgs,
> = RecursiveProxyObj<T, TClientArgs>;

export const initQueryClient = <
  T extends AppRouter,
  TClientArgs extends ClientArgs,
>(
  router: T,
  args: TClientArgs,
): TsRestSolidQueryClient<T, TClientArgs> => {
  return Object.fromEntries(
    Object.entries(router).map(([key, subRouter]) => {
      if (isAppRoute(subRouter)) {
        return [
          key,
          {
            query: getRouteQuery(subRouter, args),
            mutation: getRouteQuery(subRouter, args),
            createQuery: getRouteUseQuery(subRouter, args),
            createInfiniteQuery: getRouteUseInfiniteQuery(subRouter, args),
            createMutation: getRouteUseMutation(subRouter, args),
          },
        ];
      } else {
        return [key, initQueryClient(subRouter, args)];
      }
    }),
  );
};
