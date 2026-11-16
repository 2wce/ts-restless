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

type Options<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
  TOnMutateResult,
> = Omit<
  MutationOptions<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    PartialClientInferRequest<TAppRoute, TClientArgs>,
    TOnMutateResult
  >,
  'mutationFn'
>;
export type DataReturnMutation<
  TAppRoute extends AppRoute,
  TClientArgs extends ClientArgs,
> = <TOnMutateResult = unknown>(
  options?: MaybeRef<Options<TAppRoute, TClientArgs, TOnMutateResult>>,
) => UseMutationReturnType<
  DataResponse<TAppRoute>,
  ErrorResponse<TAppRoute>,
  PartialClientInferRequest<TAppRoute, TClientArgs>,
  TOnMutateResult
>;

export const getRouteUseMutation =
  <TAppRoute extends AppRoute, TClientArgs extends ClientArgs>(
    route: TAppRoute,
    clientArgs: TClientArgs,
  ) =>
  <TOnMutateResult = unknown>(
    options?: MaybeRef<Options<TAppRoute, TClientArgs, TOnMutateResult>>,
  ): UseMutationReturnType<
    DataResponse<TAppRoute>,
    ErrorResponse<TAppRoute>,
    PartialClientInferRequest<TAppRoute, TClientArgs>,
    TOnMutateResult
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
