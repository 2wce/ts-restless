import { RequestValidationErrorSchema } from './legacy';

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
    pathParameterErrors: null,
    headerErrors: null,
    queryParameterErrors: null,
    bodyErrors: error,
  };
  expect(RequestValidationErrorSchema.parse(payload)).toEqual(payload);

  expect(
    RequestValidationErrorSchema.safeParse({
      ...payload,
      bodyErrors: { ...error, name: 'ValidationError' },
    }).success,
  ).toBe(false);
});
