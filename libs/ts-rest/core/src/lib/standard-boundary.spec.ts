import { describe, expect, it } from 'vitest';
import { StandardSchemaV1 } from './standard-schema';
import { StandardSchemaError } from './validation-error';
import {
  mergeHeaderSchemasForRoute,
  validateIfSchema,
  validateMultiSchemaObject,
} from './standard-schema-utils';
import { z } from 'zod-legacy';

describe('validator-independent validation', () => {
  it('validates and transforms a minimal Standard Schema without a validator library', () => {
    const schema: StandardSchemaV1<string, number> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: (input) =>
          typeof input === 'string'
            ? { value: Number(input) }
            : { issues: [{ message: 'Expected a string', path: ['value'] }] },
      },
    };
    expect(validateIfSchema('12', schema).value).toBe(12);
    const failure = validateIfSchema(12, schema).error;
    expect(failure).toBeInstanceOf(StandardSchemaError);
    expect(failure?.issues).toEqual([
      { message: 'Expected a string', path: ['value'] },
    ]);
  });
});

describe('explicit Standard Schema boundary', () => {
  it.each([null, undefined, Symbol('contract-type')])(
    'passes raw values through a top-level contract marker: %s',
    (schema) => {
      const input = { value: 'unchanged' };
      const result = validateIfSchema(input, schema);
      expect(result.value).toBe(input);
      expect(result.schemasUsed).toEqual([]);
      expect(result.error).toBeUndefined();
    },
  );

  it.each([{}, Object.create(null), false, 0, 'schema'])(
    'rejects a non-schema top-level value instead of treating it as a marker: %s',
    (schema) => {
      expect(() => validateIfSchema({ value: 'unchanged' }, schema)).toThrow(
        'Invalid schema supplied; use a Standard Schema or a contract type marker',
      );
    },
  );

  it('rejects a supplied safeParse-only schema rather than mutating it or skipping validation', () => {
    const schema = z.string();
    expect(() => validateIfSchema('hello', schema)).toThrow(/Standard Schema/);
    expect('~standard' in schema).toBe(false);
  });

  it('combines opaque header schemas by validating both and merging their outputs', () => {
    const left: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'left',
        validate: () => ({ value: { left: 1 } }),
      },
    };
    const right: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'right',
        validate: () => ({ value: { right: 2 } }),
      },
    };
    expect(
      validateMultiSchemaObject(
        {},
        mergeHeaderSchemasForRoute(left, right) as StandardSchemaV1,
      ).value,
    ).toEqual({ left: 1, right: 2 });
  });

  it('preserves failures from both combined header schemas', () => {
    const left: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'left',
        validate: () => ({
          issues: [{ message: 'Missing left', path: ['left'] }],
        }),
      },
    };
    const right: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'right',
        validate: () => ({
          issues: [{ message: 'Missing right', path: ['right'] }],
        }),
      },
    };
    expect(
      validateMultiSchemaObject(
        {},
        mergeHeaderSchemasForRoute(left, right) as StandardSchemaV1,
      ).error?.issues,
    ).toEqual([
      { message: 'Missing left', path: ['left'] },
      { message: 'Missing right', path: ['right'] },
    ]);
  });
});

describe('whole-header schema categories', () => {
  class UnsupportedValidator {
    safeParse() {
      return { success: false };
    }
  }

  it.each([
    { name: 'class instance', schema: new UnsupportedValidator() },
    { name: 'number', schema: 42 },
    { name: 'true', schema: true },
    { name: 'false', schema: false },
    { name: 'array', schema: [] },
  ])(
    'rejects an unsupported supplied whole-header schema: $name',
    ({ schema }) => {
      expect(() =>
        validateMultiSchemaObject({ token: 'hello' }, schema as never),
      ).toThrow(/Standard Schema/);
    },
  );

  it.each([{}, Object.create(null), null, undefined, Symbol('contract-type')])(
    'passes through markers and valid empty field records: %s',
    (schema) => {
      expect(validateMultiSchemaObject({ token: 'hello' }, schema)).toEqual({
        value: { token: 'hello' },
        schemasUsed: [],
      });
    },
  );

  it('retains an unsupported whole-header schema signal when merging with a field map', () => {
    expect(() =>
      mergeHeaderSchemasForRoute({}, new UnsupportedValidator()),
    ).toThrow(/Standard Schema/);
  });

  it('rejects a false whole-header schema instead of treating it as absent during merge', () => {
    expect(() => mergeHeaderSchemasForRoute(false, {})).toThrow(
      /Standard Schema/,
    );
  });
});
