import { AppRoute, ClientArgs } from '@ts-restless/core';
import {
  EnsureQueryDataOptions,
  FetchInfiniteQueryOptions,
  FetchQueryOptions,
  InfiniteData,
  QueryFilters,
  QueryKey,
  QueryState,
  SetDataOptions,
} from '@tanstack/react-query';
import { DataResponse, ErrorResponse } from './common';
import { TsRestQueryOptions } from './hooks-options';

type Updater<TInput, TOutput> = TOutput | ((input: TInput) => TOutput);

export interface TsRestQueryClientFunctions<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TQueryFnData = DataResponse<TAppRoute>,
  TError = ErrorResponse<TAppRoute>,
> {
  getQueryData(queryKey: QueryKey): TQueryFnData | undefined;

  ensureQueryData<TData = TQueryFnData>(
    options: EnsureQueryDataOptions<TQueryFnData, TError, TData> &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<TData>;

  getQueriesData(
    filters: QueryFilters,
  ): Array<[QueryKey, TQueryFnData | undefined]>;

  setQueryData(
    queryKey: QueryKey,
    updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>,
    options?: SetDataOptions,
  ): TQueryFnData | undefined;

  setQueriesData(
    filters: QueryFilters,
    updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>,
    options?: SetDataOptions,
  ): Array<[QueryKey, TQueryFnData | undefined]>;

  getQueryState(
    queryKey: QueryKey,
  ): QueryState<TQueryFnData, TError> | undefined;

  getInfiniteQueryData<TPageParam = unknown>(
    queryKey: QueryKey,
  ): InfiniteData<TQueryFnData, TPageParam> | undefined;

  getInfiniteQueriesData<TPageParam = unknown>(
    filters: QueryFilters,
  ): Array<[QueryKey, InfiniteData<TQueryFnData, TPageParam> | undefined]>;

  setInfiniteQueryData<TPageParam = unknown>(
    queryKey: QueryKey,
    updater: Updater<
      InfiniteData<TQueryFnData, TPageParam> | undefined,
      InfiniteData<TQueryFnData, TPageParam> | undefined
    >,
    options?: SetDataOptions,
  ): InfiniteData<TQueryFnData, TPageParam> | undefined;

  setInfiniteQueriesData<TPageParam = unknown>(
    filters: QueryFilters,
    updater: Updater<
      InfiniteData<TQueryFnData, TPageParam> | undefined,
      InfiniteData<TQueryFnData, TPageParam> | undefined
    >,
    options?: SetDataOptions,
  ): Array<[QueryKey, InfiniteData<TQueryFnData, TPageParam> | undefined]>;

  getInfiniteQueryState<TPageParam = unknown>(
    queryKey: QueryKey,
  ): QueryState<InfiniteData<TQueryFnData, TPageParam>, TError> | undefined;

  fetchQuery<TData = TQueryFnData>(
    options: FetchQueryOptions<TQueryFnData, TError, TData> &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<TData>;

  prefetchQuery<TData = TQueryFnData>(
    options: FetchQueryOptions<TQueryFnData, TError, TData, QueryKey> &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<void>;

  fetchInfiniteQuery<TData = TQueryFnData, TPageParam = unknown>(
    options: FetchInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      QueryKey,
      TPageParam
    > &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<InfiniteData<TData, TPageParam>>;

  prefetchInfiniteQuery<TData = TQueryFnData, TPageParam = unknown>(
    options: FetchInfiniteQueryOptions<
      TQueryFnData,
      TError,
      TData,
      QueryKey,
      TPageParam
    > &
      TsRestQueryOptions<TAppRoute, TClientArgs>,
  ): Promise<void>;
}
