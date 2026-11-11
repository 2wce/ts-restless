/** Historical error constructors and payload schemas for Zod 3 only. */
import type { ZodError } from 'zod';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { AppRoute } from '@ts-restless/core';
export { RequestValidationErrorSchemaForNest as RequestValidationErrorSchema } from '@ts-restless/core/legacy';

export class RequestValidationError extends BadRequestException {
  constructor(
    public pathParams: ZodError | null,
    public headers: ZodError | null,
    public query: ZodError | null,
    public body: ZodError | null,
  ) {
    super({
      paramsResult: pathParams,
      headersResult: headers,
      queryResult: query,
      bodyResult: body,
    });
  }
}

export class ResponseValidationError extends InternalServerErrorException {
  constructor(
    public appRoute: AppRoute,
    public error: ZodError,
  ) {
    super(
      `[ts-rest] Response validation failed for ${appRoute.method} ${appRoute.path}: ${error.message}`,
    );
  }
}
