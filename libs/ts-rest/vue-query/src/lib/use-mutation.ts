import {
  useMutation,
  type MutationOptions,
  type UseMutationReturnType,
} from '@tanstack/vue-query';
import { computed, unref, type Ref } from 'vue-demi';
import {
  AppRoute,
  ClientArgs,
  PartialClientInferRequest,
  evaluateFetchApiArgs,
  executeQueryRequest,
} from '@ts-restless/core';
import { DataResponse, ErrorResponse } from './common';
type MaybeRef<T> = T | Ref<T>;

type Options<TAppRoute extends AppRoute, TClientArgs extends ClientArgs> = Omit<
  MutationOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    PartialClientInferRequest<TAppRoute, TClientArgs>,
    unknown
  >,
  'mutationFn'
>;
export type DataReturnMutation<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = (
  options?: MaybeRef<Options<TAppRoute, TClientArgs>>,
) => UseMutationReturnType<
  DataResponse<TAppRoute>,
  ErrorResponse<TAppRoute>,
  PartialClientInferRequest<TAppRoute, TClientArgs>,
  unknown
>;

export const getRouteUseMutation =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  (
    options?: MaybeRef<Options<TAppRoute, TClientArgs>>,
  ): UseMutationReturnType<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    PartialClientInferRequest<TAppRoute, TClientArgs>,
    unknown
  > => {
    const mutationFn = (
      args: PartialClientInferRequest<TAppRoute, TClientArgs>,
    ) =>
      executeQueryRequest({
        ...evaluateFetchApiArgs(route, clientArgs, args),
        route,
      });
    return useMutation(computed(() => ({ ...unref(options), mutationFn })));
  };
