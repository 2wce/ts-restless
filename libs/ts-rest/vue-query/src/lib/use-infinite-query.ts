import {
  useInfiniteQuery,
  type QueryFunctionContext,
  type QueryKey,
  type UseInfiniteQueryReturnType,
  type InfiniteData,
} from '@tanstack/vue-query';
import { computed, unref, type Ref } from 'vue-demi';
import {
  AppRoute,
  ClientArgs,
  PartialClientInferRequest,
} from '@ts-restless/core';
import { DataResponse, ErrorResponse, queryFn } from './common';
type MaybeRef<T> = T | Ref<T>;

type ObjectOptions<T> =
  T extends Ref<infer U>
    ? ObjectOptions<U>
    : T extends () => infer U
      ? ObjectOptions<U>
      : T;
type Options<TAppRoute extends AppRoute, TData, TPageParam> = Omit<
  ObjectOptions<
    Parameters<
      typeof useInfiniteQuery<
        DataResponse<TAppRoute>,
        ErrorResponse<TAppRoute>,
        TData,
        QueryKey,
        TPageParam
      >
    >[0]
  >,
  'queryKey' | 'queryFn'
>;

export type DataReturnInfiniteQuery<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = <
  TPageParam = unknown,
  TData = InfiniteData<DataResponse<TAppRoute>, TPageParam>,
>(
  queryKey: MaybeRef<QueryKey>,
  args: (
    context: QueryFunctionContext<QueryKey, TPageParam>,
  ) => PartialClientInferRequest<TAppRoute, TClientArgs>,
  options: MaybeRef<Options<TAppRoute, TData, TPageParam>>,
) => UseInfiniteQueryReturnType<TData, ErrorResponse<TAppRoute>>;

export const getRouteUseInfiniteQuery =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  <
    TPageParam = unknown,
    TData = InfiniteData<DataResponse<TAppRoute>, TPageParam>,
  >(
    queryKey: MaybeRef<QueryKey>,
    argsMapper: (
      context: QueryFunctionContext<QueryKey, TPageParam>,
    ) => PartialClientInferRequest<TAppRoute, TClientArgs>,
    options: MaybeRef<Options<TAppRoute, TData, TPageParam>>,
  ) => {
    const dataFn = queryFn<TAppRoute, TClientArgs, TPageParam>(
      route,
      clientArgs,
      argsMapper,
    );
    return useInfiniteQuery<
      DataResponse<TAppRoute>,
      ErrorResponse<TAppRoute>,
      TData,
      QueryKey,
      TPageParam
    >(
      computed(() => ({
        ...unref(options),
        queryKey: unref(queryKey),
        queryFn: dataFn,
      })),
    );
  };
