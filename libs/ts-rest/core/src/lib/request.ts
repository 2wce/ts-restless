import type { AppRoute } from './dsl';
import {
  validateIfSchema,
  validateMultiSchemaObject,
} from './standard-schema-utils';

export type ParsedRequest = {
  params: unknown;
  headers: unknown;
  query: unknown;
  body: unknown;
};

export type RequestValidationResult = ReturnType<typeof validateIfSchema>;

export type RequestEvaluation = {
  paramsResult: RequestValidationResult;
  headersResult: RequestValidationResult;
  queryResult: RequestValidationResult;
  bodyResult: RequestValidationResult;
};

/** Native callers retain parsing, validation policy and error construction. */
export function evaluateRequestPart(
  appRoute: AppRoute,
  part: keyof ParsedRequest,
  value: unknown,
): RequestValidationResult {
  switch (part) {
    case 'params':
      return validateIfSchema(value, appRoute.pathParams, {
        passThroughExtraKeys: true,
      });
    case 'headers':
      return validateMultiSchemaObject(value, appRoute.headers);
    case 'query':
      return validateIfSchema(value, appRoute.query);
    case 'body':
      return validateIfSchema(value, 'body' in appRoute ? appRoute.body : null);
  }
}

/** Evaluate all locations; first-error callers use evaluateRequestPart instead. */
export function evaluateRequest(
  appRoute: AppRoute,
  request: ParsedRequest,
): RequestEvaluation {
  return {
    paramsResult: evaluateRequestPart(appRoute, 'params', request.params),
    headersResult: evaluateRequestPart(appRoute, 'headers', request.headers),
    queryResult: evaluateRequestPart(appRoute, 'query', request.query),
    bodyResult: evaluateRequestPart(appRoute, 'body', request.body),
  };
}
