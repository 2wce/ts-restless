import { getHttpVerbDecorator } from './route-decoration';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { Reflector } from '@nestjs/core';
import { mergeMap, Observable } from 'rxjs';
import type { Request, Response } from 'express';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  applyDecorators,
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpExceptionOptions,
  Inject,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
  Optional,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import {
  AppRoute,
  AppRouter,
  isAppRoute,
  isAppRouteOtherResponse,
  parseJsonQueryObject,
  ServerInferResponses,
  StandardSchemaError,
  TsRestResponseError,
  evaluateRequest,
  evaluateResponse,
} from '@ts-restless/core';
import {
  TsRestAppRouteMetadataKey,
  TsRestOptionsMetadataKey,
} from './constants';
import { TsRestRequestShape } from './ts-rest-request.decorator';
import { TS_REST_MODULE_OPTIONS_TOKEN } from './ts-rest.module';
import {
  evaluateTsRestOptions,
  type MaybeTsRestOptions,
  type TsRestOptions,
} from './ts-rest-options';

type TsRestAppRouteMetadata = {
  appRoute: AppRoute;
  /**
   * if we're in a multi handler, this is the key of the route e.g. `getHello`
   * inside a contract with multiple handlers
   *
   * Otherwise, it's null, i.e. single handler
   */
  routeKey: string | null;
};

export class TsRestRequestValidationError extends BadRequestException {
  constructor(
    public pathParams: StandardSchemaError | null,
    public headers: StandardSchemaError | null,
    public query: StandardSchemaError | null,
    public body: StandardSchemaError | null,
  ) {
    super({
      paramsResult: pathParams,
      headersResult: headers,
      queryResult: query,
      bodyResult: body,
    });
  }
}

export { TsRestRequestValidationError as RequestValidationError };

/**
 * Error emitted when response validation fails (when using a standard schema validator)
 *
 * This is the new standard
 */
export class TsRestResponseValidationError extends InternalServerErrorException {
  constructor(
    public appRoute: AppRoute,
    public error: StandardSchemaError,
  ) {
    super(
      `[ts-rest] Response validation failed for ${appRoute.method} ${appRoute.path}: ${error.message}`,
    );
  }
}

export { TsRestResponseValidationError as ResponseValidationError };

const applyHandlerMetadata = (
  route: AppRoute,
  routeKey: string | null,
  options: TsRestOptions | undefined,
): MethodDecorator =>
  applyDecorators(
    ...(options ? [SetMetadata(TsRestOptionsMetadataKey, options)] : []),
    SetMetadata(TsRestAppRouteMetadataKey, {
      appRoute: route,
      routeKey,
    } satisfies TsRestAppRouteMetadata),
    UseInterceptors(TsRestHandlerInterceptor),
  );

export const TsRestHandler = (
  appRouterOrRoute: AppRouter | AppRoute,
  options?: TsRestOptions,
): MethodDecorator => {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const isMultiHandler = !isAppRoute(appRouterOrRoute);

    // A single @All handler let different controllers conflict in Nest.
    if (isMultiHandler) {
      const originalMethod = descriptor.value;

      const originalParamMetadata = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        propertyKey,
      );

      Object.entries(appRouterOrRoute).forEach(([routeKey, route]) => {
        if (isAppRoute(route)) {
          const methodName = `${String(propertyKey)}_${routeKey}`;

          target[methodName] = async function (...args: any[]) {
            return originalMethod.apply(this, args);
          };

          if (originalParamMetadata) {
            Reflect.defineMetadata(
              ROUTE_ARGS_METADATA,
              originalParamMetadata,
              target.constructor,
              methodName,
            );
          }

          const paramTypes = Reflect.getMetadata(
            'design:paramtypes',
            target,
            propertyKey,
          );
          if (paramTypes) {
            Reflect.defineMetadata(
              'design:paramtypes',
              paramTypes,
              target,
              methodName,
            );
          }

          getHttpVerbDecorator(route)(
            target,
            methodName,
            Object.getOwnPropertyDescriptor(target, methodName)!,
          );

          const reflector = new Reflector();
          const metadataKeys = Reflect.getMetadataKeys(descriptor.value);

          metadataKeys.forEach((key) => {
            const metadata = reflector.get(key, descriptor.value);
            SetMetadata(key, metadata)(
              target,
              methodName,
              Object.getOwnPropertyDescriptor(target, methodName)!,
            );
          });

          applyHandlerMetadata(route, routeKey, options)(
            target,
            methodName,
            Object.getOwnPropertyDescriptor(target, methodName)!,
          );
        }
      });

      return descriptor;
    } else {
      if (!isAppRoute(appRouterOrRoute)) {
        throw new Error('Expected app route but received app router');
      }

      getHttpVerbDecorator(appRouterOrRoute)(target, propertyKey, descriptor);
      applyHandlerMetadata(appRouterOrRoute, null, options)(
        target,
        propertyKey,
        descriptor,
      );

      return descriptor;
    }
  };
};

type NestHandlerImplementation<T extends AppRouter | AppRoute> =
  T extends AppRoute
    ? (args: TsRestRequestShape<T>) => Promise<ServerInferResponses<T>>
    : {
        [K in keyof T]: T[K] extends AppRoute
          ? (
              args: TsRestRequestShape<T[K]>,
            ) => Promise<ServerInferResponses<T[K]>>
          : never;
      };

/**
 *
 * @param contract - The contract or route to implement
 * @param implementation - Implementation of the route or entire contract as an object
 * @returns
 */
export const tsRestHandler = <T extends AppRouter | AppRoute>(
  contract: T,
  implementation: NestHandlerImplementation<T>,
) => implementation;

/**
 * Error you can throw to return a response from a handler
 */
export class TsRestException<T extends AppRoute> extends HttpException {
  constructor(
    route: T,
    response: ServerInferResponses<T>,
    options?: HttpExceptionOptions,
  ) {
    super(response.body as Record<string, any>, response.status, options);
  }
}

@Injectable()
export class TsRestHandlerInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Optional()
    @Inject(TS_REST_MODULE_OPTIONS_TOKEN)
    private globalOptions: MaybeTsRestOptions,
  ) {}

  private getAppRouteFromContext(
    ctx: ExecutionContext,
  ): TsRestAppRouteMetadata {
    const appRouteMetadata = this.reflector.get<
      TsRestAppRouteMetadata | undefined
    >(TsRestAppRouteMetadataKey, ctx.getHandler());

    if (!appRouteMetadata) {
      throw new Error(
        'Could not find app router or app route, ensure you are using the @TsRestHandler decorator on your method',
      );
    }

    if (!isAppRoute(appRouteMetadata.appRoute)) {
      throw new Error('Expected app route but received app router');
    }

    return appRouteMetadata;
  }

  intercept(ctx: ExecutionContext, next: CallHandler<any>): Observable<any> {
    const res: Response | FastifyReply = ctx.switchToHttp().getResponse();
    const req: Request | FastifyRequest = ctx.switchToHttp().getRequest();

    const { appRoute, routeKey } = this.getAppRouteFromContext(ctx);

    const options = evaluateTsRestOptions(this.globalOptions, ctx);

    const query = options.jsonQuery
      ? parseJsonQueryObject(req.query as Record<string, string>)
      : req.query;
    const { paramsResult, headersResult, queryResult, bodyResult } =
      evaluateRequest(appRoute, {
        params: req.params,
        headers: req.headers,
        query,
        body: req.body,
      });

    const isHeadersInvalid =
      headersResult.error && options.validateRequestHeaders;

    const isQueryInvalid = queryResult.error && options.validateRequestQuery;

    const isBodyInvalid = bodyResult.error && options.validateRequestBody;

    if (
      paramsResult.error ||
      isHeadersInvalid ||
      isQueryInvalid ||
      isBodyInvalid
    ) {
      throw new TsRestRequestValidationError(
        paramsResult.error || null,
        headersResult.error || null,
        queryResult.error || null,
        bodyResult.error || null,
      );
    }

    return next.handle().pipe(
      mergeMap(async (impl) => {
        let result = null;
        try {
          const res = {
            params: paramsResult.value,
            query: queryResult.error ? req.query : queryResult.value,
            body: bodyResult.error ? req.body : bodyResult.value,
            headers: headersResult.error ? req.headers : headersResult.value,
          };

          result = routeKey ? await impl[routeKey](res) : await impl(res);
        } catch (e) {
          if (e instanceof TsRestException) {
            result = {
              status: e.getStatus(),
              body: e.getResponse(),
              error: e,
            };
          } else if (e instanceof TsRestResponseError) {
            result = {
              status: e.statusCode,
              body: e.body,
            };
          } else {
            throw e;
          }
        }

        const responseType = appRoute.responses[result.status];
        const responseSchema = isAppRouteOtherResponse(responseType)
          ? responseType.body
          : responseType;
        // Modern Nest treats a missing or null declaration as a configuration error.
        if (options.validateResponses && !responseSchema) {
          throw new InternalServerErrorException(
            `[ts-rest] Couldn't find a response schema for ${result.status} on route ${appRoute.path}`,
          );
        }
        const evaluated = evaluateResponse({
          appRoute,
          response: result,
          validateBody: options.validateResponses,
        });
        if (!evaluated.success) {
          throw new TsRestResponseValidationError(appRoute, evaluated.error);
        }

        if (result.error) {
          throw new HttpException(
            evaluated.body as string | Record<string, unknown>,
            evaluated.metadata.status,
            { cause: result.error },
          );
        }

        if (evaluated.metadata.contentType !== undefined) {
          if ('setHeader' in res) {
            res.setHeader('content-type', evaluated.metadata.contentType);
          } else {
            res.header('content-type', evaluated.metadata.contentType);
          }
        }

        res.status(evaluated.metadata.status);
        return evaluated.body;
      }),
    );
  }
}
