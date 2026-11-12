import { describe, expect, it } from 'vitest';
import { z } from 'zod-legacy';
import {
  toStandardSchema,
  extractZodObjectShape,
  isZodObject,
  zodMerge,
  RequestValidationErrorSchemaWithoutMessage,
  type ZodInferOrType,
  type ZodInputOrType,
} from '../legacy';
import {
  validateIfSchema,
  validateMultiSchemaObject,
} from './standard-schema-utils';
import { StandardSchemaError } from './validation-error';
import type { StandardSchemaV1 } from './standard-schema';
import type { Equal, Expect } from './test-helpers';

describe('explicit Zod 3 compatibility', () => {
  it('retains the historical Fastify ZodError payload schema through core legacy', () => {
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
    expect(RequestValidationErrorSchemaWithoutMessage.parse(payload)).toEqual(
      payload,
    );
    expect(
      RequestValidationErrorSchemaWithoutMessage.safeParse({
        ...payload,
        bodyErrors: { ...error, name: 'ValidationError' },
      }).success,
    ).toBe(false);
  });

  it('preserves transform inference and validation without mutating the original schema', () => {
    const schema = z.string().transform(Number);
    const bridged = toStandardSchema(schema);
    type LegacyInput = Expect<Equal<ZodInputOrType<typeof schema>, string>>;
    type LegacyOutput = Expect<Equal<ZodInferOrType<typeof schema>, number>>;
    type Input = Expect<
      Equal<StandardSchemaV1.InferInput<typeof bridged>, string>
    >;
    type Output = Expect<
      Equal<StandardSchemaV1.InferOutput<typeof bridged>, number>
    >;
    expect(validateIfSchema('42', bridged).value).toBe(42);
    expect('~standard' in schema).toBe(false);
    expect(bridged).not.toBe(schema);
    expect(bridged.parse('13')).toBe(13);
  });

  it('preserves validator issue details while using the default structural error', () => {
    const result = validateIfSchema(
      { value: 1 },
      toStandardSchema(z.object({ value: z.string() })),
    );
    expect(result.error).toBeInstanceOf(StandardSchemaError);
    expect(result.error?.name).toBe('ValidationError');
    expect(result.error?.issues).toEqual([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['value'],
        message: 'Expected string, received number',
      },
    ]);
  });

  it('retains Zod object introspection and historical merge override before bridging', () => {
    const schema = zodMerge(
      z.object({ value: z.string() }),
      z.object({ value: z.number() }),
    );
    expect(isZodObject(schema)).toBe(true);
    if (!isZodObject(schema)) throw new Error('Expected a merged Zod object');
    const bridged = toStandardSchema(schema);
    expect(isZodObject(bridged)).toBe(true);
    expect(extractZodObjectShape(bridged).value).toBeInstanceOf(z.ZodNumber);
    expect(bridged).toBeInstanceOf(z.ZodObject);
    expect(
      validateMultiSchemaObject({ value: 2, extra: true }, bridged).value,
    ).toEqual({ value: 2, extra: true });
  });
});
