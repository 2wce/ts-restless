import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import {
  AppRoute,
  evaluateResponse,
  TsRestResponseValidationError,
  isAppRouteResponse,
  TsRestResponseError,
} from '@ts-restless/core';
import { Reflector } from '@nestjs/core';
import { TsRestAppRouteMetadataKey } from './constants';
import type { Response } from 'express';
import {
  evaluateTsRestOptions,
  type MaybeTsRestOptions,
} from './ts-rest-options';
import { TS_REST_MODULE_OPTIONS_TOKEN } from './ts-rest.module';
import { FastifyReply } from 'fastify';

@Injectable()
export class TsRestInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    @Optional()
    @Inject(TS_REST_MODULE_OPTIONS_TOKEN)
    private globalOptions: MaybeTsRestOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res: Response | FastifyReply = context.switchToHttp().getResponse();

    const appRoute = this.reflector.get<AppRoute | undefined>(
      TsRestAppRouteMetadataKey,
      context.getHandler(),
    );

    if (!appRoute) {
      // this will respond with a 500 error without revealing this error message in the response body
      throw new Error('Make sure your route is decorated with @TsRest()');
    }

    const options = evaluateTsRestOptions(this.globalOptions, context);

    return next.handle().pipe(
      catchError((err) => {
        if (err instanceof TsRestResponseError) {
          return of({
            status: err.statusCode,
            body: err.body,
          });
        }

        return throwError(() => err);
      }),
      map((value) => {
        if (isAppRouteResponse(value)) {
          const evaluated = evaluateResponse({
            appRoute,
            response: value,
            validateBody: options.validateResponses,
          });
          if (!evaluated.success) {
            throw new TsRestResponseValidationError(appRoute, evaluated.error);
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
        }

        return value;
      }),
    );
  }
}
