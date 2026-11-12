import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  PipeTransform,
} from '@nestjs/common';
import {
  AppRoute,
  AppRouteMutation,
  evaluateRequestPart,
  parseJsonQueryObject,
  ServerInferRequest,
  validationErrorResponse,
} from '@ts-restless/core';
import type { Request } from 'express';
import type { FastifyRequest } from 'fastify';
import { TsRestAppRouteMetadataKey } from './constants';
import {
  evaluateTsRestOptions,
  type MaybeTsRestOptions,
} from './ts-rest-options';
import { TS_REST_MODULE_OPTIONS_TOKEN } from './ts-rest.module';

export type TsRestRequestShape<TRoute extends AppRoute> = ServerInferRequest<
  TRoute,
  Request['headers']
>;

@Injectable()
class TsRestValidatorPipe implements PipeTransform {
  constructor(
    @Optional()
    @Inject(TS_REST_MODULE_OPTIONS_TOKEN)
    private globalOptions: MaybeTsRestOptions,
  ) {}

  transform(ctx: ExecutionContext): TsRestRequestShape<AppRouteMutation> {
    const appRoute: AppRouteMutation | undefined = Reflect.getMetadata(
      TsRestAppRouteMetadataKey,
      ctx.getHandler(),
    );

    if (!appRoute) {
      // this will respond with a 500 error without revealing this error message in the response body
      throw new Error('Make sure your route is decorated with @TsRest()');
    }

    const req: Request | FastifyRequest = ctx.switchToHttp().getRequest();
    const options = evaluateTsRestOptions(this.globalOptions, ctx);

    const pathParamsResult = evaluateRequestPart(
      appRoute,
      'params',
      req.params,
    );

    if (pathParamsResult.error) {
      throw new BadRequestException(
        validationErrorResponse(pathParamsResult.error),
      );
    }

    const headersResult = evaluateRequestPart(appRoute, 'headers', req.headers);

    if (headersResult.error && options.validateRequestHeaders) {
      throw new BadRequestException(
        validationErrorResponse(headersResult.error),
      );
    }

    const query = options.jsonQuery
      ? parseJsonQueryObject(req.query as Record<string, string>)
      : req.query;

    const queryResult = evaluateRequestPart(appRoute, 'query', query);
    if (queryResult.error && options.validateRequestQuery) {
      throw new BadRequestException(validationErrorResponse(queryResult.error));
    }

    const bodyResult = evaluateRequestPart(appRoute, 'body', req.body);

    if (bodyResult.error && options.validateRequestBody) {
      throw new BadRequestException(validationErrorResponse(bodyResult.error));
    }

    return {
      query: queryResult.error ? req.query : queryResult.value,
      params: pathParamsResult.value as any,
      body: bodyResult.error ? req.body : bodyResult.value,
      headers: (headersResult.error
        ? req.headers
        : headersResult.value) as TsRestRequestShape<
        typeof appRoute
      >['headers'],
    };
  }
}

/**
 * Parameter decorator used to parse, validate and return the typed request object
 *
 * @deprecated Please use `TsRestHandler` instead - will be removed in v4
 */
export const TsRestRequest = () =>
  createParamDecorator((_: unknown, ctx: ExecutionContext) => {
    return ctx;
  })(TsRestValidatorPipe);

/**
 * @deprecated Use `TsRestRequest` instead
 */
export const ApiDecorator = TsRestRequest;
