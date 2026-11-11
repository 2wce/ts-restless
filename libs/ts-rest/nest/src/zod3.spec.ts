import { z } from 'zod';
import { RequestValidationError, RequestValidationErrorSchema } from './legacy';

it('retains historical ZodError payload schemas in the explicit compatibility entry', () => {
  const issue = {
    code: 'invalid_type',
    expected: 'string',
    received: 'undefined',
    path: ['title'],
    message: 'Required',
  };
  const error = { name: 'ZodError', issues: [issue] };
  const payload = {
    paramsResult: null,
    headersResult: null,
    queryResult: null,
    bodyResult: error,
  };
  expect(RequestValidationErrorSchema.parse(payload)).toEqual(payload);

  expect(
    RequestValidationErrorSchema.safeParse({
      ...payload,
      bodyResult: { ...error, name: 'ValidationError' },
    }).success,
  ).toBe(false);
});

it('serializes the explicitly constructed legacy error with historical Zod issues', () => {
  const result = z.object({ title: z.string() }).safeParse({});
  if (result.success) throw new Error('Expected invalid input');
  const validationError = new RequestValidationError(
    null,
    null,
    null,
    result.error,
  );
  expect(validationError.body).toBe(result.error);
  const payload = JSON.parse(JSON.stringify(validationError.getResponse()));
  expect(RequestValidationErrorSchema.safeParse(payload).success).toBe(true);
  expect(payload.bodyResult).toEqual({
    name: 'ZodError',
    issues: [
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'undefined',
        path: ['title'],
        message: 'Required',
      },
    ],
  });
});
