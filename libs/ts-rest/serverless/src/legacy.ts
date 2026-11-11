/** Historical error constructors and payload schemas for Zod 3 only. */
import type { ZodError } from 'zod';
import { TsRestHttpError } from './lib/http-error';
export { RequestValidationErrorSchema } from '@ts-restless/core/legacy';

export class RequestValidationError extends TsRestHttpError {
  constructor(
    public pathParamsError: ZodError | null,
    public headersError: ZodError | null,
    public queryError: ZodError | null,
    public bodyError: ZodError | null,
  ) {
    super(400, {
      message: 'Request validation failed',
      pathParameterErrors: pathParamsError,
      headerErrors: headersError,
      queryParameterErrors: queryError,
      bodyErrors: bodyError,
    });
  }
}
