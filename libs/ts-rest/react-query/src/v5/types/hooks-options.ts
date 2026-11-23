import {
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery as tanstackUseInfiniteQuery,
  UseMutationOptions as TanStackUseMutationOptions,
  UseQueryOptions as TanStackUseQueryOptions,
  useSuspenseInfiniteQuery as tanstackUseSuspenseInfiniteQuery,
  UseSuspenseQueryOptions as TanStackUseSuspenseQueryOptions,
  SkipToken,
} from '@tanstack/react-query';
import {
  AppRoute,
  ClientArgs,
  IfAllPropertiesOptional,
} from '@ts-restless/core';
import { QueriesOptions, QueriesResults } from '../internal/queries-options';
import {
  SuspenseQueriesOptions,
  SuspenseQueriesResults,
} from '../internal/suspense-queries-options';
import { DataResponse, ErrorResponse, RequestData } from './common';

export type TsRestQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryData = RequestData<TAppRoute, TClientArgs>,
> = IfAllPropertiesOptional<
  TQueryData,
  { queryData?: TQueryData | SkipToken },
  { queryData: TQueryData | SkipToken }
>;

export type TsRestSuspenseQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryData = RequestData<TAppRoute, TClientArgs>,
> = IfAllPropertiesOptional<
  TQueryData,
  { queryData?: TQueryData },
  { queryData: TQueryData }
>;

export type TsRestInfiniteQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TPageParam = unknown,
> = {
  queryData:
    | ((
        context: QueryFunctionContext<QueryKey, TPageParam>,
      ) => RequestData<TAppRoute, TClientArgs>)
    | SkipToken;
};

export type TsRestSuspenseInfiniteQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TPageParam = unknown,
> = {
  queryData: (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ) => RequestData<TAppRoute, TClientArgs>;
};

export type UseQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
> = Omit<
  TanStackUseQueryOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    TData
  >,
  'queryFn'
> &
  TsRestQueryOptions<TAppRoute, TClientArgs>;

export type UseQueryOptionsWithInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
> = UseQueryOptions<TAppRoute, TClientArgs, TData> & {
  initialData: DataResponse<TAppRoute> | (() => DataResponse<TAppRoute>);
};

export type UseQueryOptionsWithoutInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
> = UseQueryOptions<TAppRoute, TClientArgs, TData> & {
  initialData?: undefined;
};

export type UseQueriesOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  T extends Array<any>,
  TCombinedResult = QueriesResults<TAppRoute, T>,
> = {
  queries: readonly [...QueriesOptions<TAppRoute, TClientArgs, T>];
  combine?: (result: QueriesResults<TAppRoute, T>) => TCombinedResult;
};

export type UseSuspenseQueriesOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  T extends Array<any>,
  TCombinedResult = SuspenseQueriesResults<TAppRoute, T>,
> = {
  queries: readonly [...SuspenseQueriesOptions<TAppRoute, TClientArgs, T>];
  combine?: (result: SuspenseQueriesResults<TAppRoute, T>) => TCombinedResult;
};

export type UseSuspenseQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = DataResponse<TAppRoute>,
> = Omit<
  TanStackUseSuspenseQueryOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    TData
  >,
  'queryFn'
> &
  TsRestSuspenseQueryOptions<TAppRoute, TClientArgs>;

export type UseInfiniteQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TPageParam = unknown,
> = Omit<
  Parameters<
    typeof tanstackUseInfiniteQuery<
      DataResponse<TAppRoute>,
      ErrorResponse<TAppRoute>,
      TData,
      QueryKey,
      TPageParam
    >
  >[0],
  'queryFn'
> &
  TsRestInfiniteQueryOptions<TAppRoute, TClientArgs, TPageParam>;

export type UseInfiniteQueryOptionsWithInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TPageParam = unknown,
> = UseInfiniteQueryOptions<TAppRoute, TClientArgs, TData, TPageParam> & {
  initialData:
    | InfiniteData<DataResponse<TAppRoute>, TPageParam>
    | (() => InfiniteData<DataResponse<TAppRoute>, TPageParam>);
};

export type UseInfiniteQueryOptionsWithoutInitialData<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TPageParam = unknown,
> = UseInfiniteQueryOptions<TAppRoute, TClientArgs, TData, TPageParam> & {
  initialData?: undefined;
};

export type UseSuspenseInfiniteQueryOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TData = InfiniteData<DataResponse<TAppRoute>>,
  TPageParam = unknown,
> = Omit<
  Parameters<
    typeof tanstackUseSuspenseInfiniteQuery<
      DataResponse<TAppRoute>,
      ErrorResponse<TAppRoute>,
      TData,
      QueryKey,
      TPageParam
    >
  >[0],
  'queryFn'
> &
  TsRestSuspenseInfiniteQueryOptions<TAppRoute, TClientArgs, TPageParam>;

export type UseMutationOptions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TContext = unknown,
> = TanStackUseMutationOptions<
  DataResponse<TAppRoute>,
  ErrorResponse<TAppRoute>,
  RequestData<TAppRoute, TClientArgs>,
  TContext
>;
