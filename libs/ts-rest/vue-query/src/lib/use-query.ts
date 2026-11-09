import {
  useQuery,
  QueryKey,
  UseQueryReturnType,
  UseQueryOptions,
  QueryFunctionContext,
} from '@tanstack/vue-query';
import { computed, unref, type Ref } from 'vue-demi';
import {
  AppRoute,
  AreAllPropertiesOptional,
  ClientArgs,
  PartialClientInferRequest,
} from '@ts-restless/core';
import { DataResponse, ErrorResponse, queryFn } from './common';
type MaybeRef<T> = T | Ref<T>;

type UnrefOptions<T> = T extends Ref<infer U> ? U : T;
type Options<TAppRoute extends AppRoute, TData> = Omit<
  UnrefOptions<
    UseQueryOptions<DataResponse<TAppRoute>, ErrorResponse<TAppRoute>, TData>
  >,
  'queryKey' | 'queryFn'
>;

export type DataReturnQuery<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TArgs = PartialClientInferRequest<TAppRoute, TClientArgs>,
> =
  AreAllPropertiesOptional<TArgs> extends true
    ? <TData = DataResponse<TAppRoute>>(
        queryKey: MaybeRef<QueryKey>,
        args?: (context: QueryFunctionContext<QueryKey>) => TArgs,
        options?: MaybeRef<Options<TAppRoute, TData>>,
      ) => UseQueryReturnType<TData, ErrorResponse<TAppRoute>>
    : <TData = DataResponse<TAppRoute>>(
        queryKey: MaybeRef<QueryKey>,
        args: (context: QueryFunctionContext<QueryKey>) => TArgs,
        options?: MaybeRef<Options<TAppRoute, TData>>,
      ) => UseQueryReturnType<TData, ErrorResponse<TAppRoute>>;

export const getRouteUseQuery =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  <TData = DataResponse<TAppRoute>>(
    queryKey: MaybeRef<QueryKey>,
    args?: (
      context: QueryFunctionContext<QueryKey>,
    ) => PartialClientInferRequest<TAppRoute, TClientArgs>,
    options?: MaybeRef<Options<TAppRoute, TData>>,
  ) => {
    const dataFn = queryFn(route, clientArgs, args);
    return useQuery(
      computed(() => ({
        ...unref(options),
        queryKey: unref(queryKey),
        queryFn: dataFn,
      })),
    );
  };
