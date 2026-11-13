import { getHttpVerbDecorator } from './route-decoration';
import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { AppRoute } from '@ts-restless/core';
import { TsRestInterceptor } from './ts-rest.interceptor';
import {
  TsRestAppRouteMetadataKey,
  TsRestOptionsMetadataKey,
} from './constants';
import { TsRestOptions } from './ts-rest-options';

type TsRestType = {
  (appRoute: AppRoute, options?: TsRestOptions): MethodDecorator;
  (options: TsRestOptions): ClassDecorator;
};

/**
 * As a class decorator, you can configure ts-rest options. As a method decorator, you can assign the route and also configure options
 * @param appRouteOrOptions For a method decorator, this is the route. For a class decorator, this is the options
 * @param options For a method decorator, this is the options
 *
 * @deprecated Please use `TsRestHandler` instead - will be removed in v4
 */
export const TsRest: TsRestType = (
  appRouteOrOptions: AppRoute | TsRestOptions,
  options?: TsRestOptions,
) => {
  const decorators = [];

  const isMethodDecorator = 'path' in appRouteOrOptions;
  const optionsToUse = isMethodDecorator ? options : appRouteOrOptions;

  if (isMethodDecorator) {
    decorators.push(
      ...[
        SetMetadata(TsRestAppRouteMetadataKey, appRouteOrOptions),
        getHttpVerbDecorator(appRouteOrOptions),
        UseInterceptors(TsRestInterceptor),
      ],
    );
  }

  if (optionsToUse) {
    decorators.push(SetMetadata(TsRestOptionsMetadataKey, optionsToUse));
  }

  return applyDecorators(...decorators);
};

/**
 * @deprecated Please use `TsRestHandler` instead - will be removed in v4
 */
export const Api = (appRoute: AppRoute): MethodDecorator => {
  return TsRest(appRoute) as MethodDecorator;
};
