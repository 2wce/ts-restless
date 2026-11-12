import { StandardSchemaV1 } from './standard-schema';
import { StandardSchemaError } from './validation-error';
import { ContractAnyType } from './dsl';

const VENDOR_STANDARD_SCHEMA = 'ts-rest-combined';

/**
 * Type guard to check if the schema is a standard schema.
 *
 * @param schema - unknown
 * @returns boolean
 */
export const isStandardSchema = (
  schema: unknown,
): schema is StandardSchemaV1 => {
  if (!schema) {
    return false;
  }

  const standard = (schema as StandardSchemaV1)?.['~standard'];

  if (!standard) {
    return false;
  }

  return standard.version === 1 && typeof standard.validate === 'function';
};

const isContractTypeMarker = (
  schema: unknown,
): schema is symbol | null | undefined =>
  schema === null || schema === undefined || typeof schema === 'symbol';

function assertHeaderSchema(
  schema: unknown,
): asserts schema is
  | Record<string, ContractAnyType>
  | ContractAnyType
  | undefined {
  if (isContractTypeMarker(schema) || isStandardSchema(schema)) return;
  if (typeof schema === 'object' && schema !== null) {
    const prototype = Object.getPrototypeOf(schema);
    if (prototype === Object.prototype || prototype === null) return;
  }
  throw new Error(
    'Invalid header schema supplied; use a Standard Schema, a plain field record or a contract type marker',
  );
}

/** Return a supplied Standard Schema without adapting or mutating it. */
export const parseAsStandardSchema = (
  schema: unknown,
): StandardSchemaV1<unknown, unknown> | null =>
  isStandardSchema(schema) ? schema : null;

/**
 * Since 3.53.0 we've moved to headers using an object with schemas inside it, rather than a top level schema.
 *
 * This makes it easier to merge schemas together.
 *
 * @param data - Data to validate e.g. headers
 * @param schemaObject - Schema object to validate against e.g. { 'x-foo': v.string() }
 * @returns
 */
export const validateMultiSchemaObject = (
  data: unknown,
  schemaObject: Record<string, ContractAnyType> | ContractAnyType | undefined,
): {
  value?: unknown;
  error?: StandardSchemaError;
  schemasUsed: Array<StandardSchemaV1<unknown, unknown>>;
} => {
  assertHeaderSchema(schemaObject);
  const schema = parseAsStandardSchema(schemaObject);

  // If the top level is not null we know it's a valid schema we can validate against
  if (schema !== null) {
    const result = validateAgainstStandardSchema(data, schema, {
      passThroughExtraKeys: true,
    });

    return {
      value: result.value,
      error: result.error,
      schemasUsed: [schema],
    };
  }

  const headersMap = new Map<string, unknown>(
    Object.entries(data ?? {}).map(([key, value]) => [
      key.toLowerCase(),
      value,
    ]),
  );

  const subSchemas = new Map<string, StandardSchemaV1<unknown, unknown>>();

  for (const [key, schema] of Object.entries(schemaObject ?? {})) {
    const parsedSchema = parseAsStandardSchema(schema);

    if (schema === null) {
      continue;
    }

    if (typeof schema === 'symbol') {
      continue;
    }

    if (parsedSchema !== null) {
      subSchemas.set(key.toLowerCase(), parsedSchema);
    } else {
      throw new Error(
        `Invalid schema provided for header ${key}; use a Standard Schema or a contract type marker`,
      );
    }
  }

  if (subSchemas.size === 0) {
    return {
      value: data == null ? data : Object.fromEntries(headersMap),
      schemasUsed: [],
    };
  }

  const issues: StandardSchemaV1.Issue[] = [];

  for (const [key, schema] of subSchemas.entries()) {
    const value = headersMap.get(key);
    const result = validateAgainstStandardSchema(value, schema);

    if (result.error) {
      for (const issue of result.error.issues) {
        issues.push({
          ...issue,
          path: [key],
        });
      }
    } else {
      headersMap.set(key, result.value);
    }
  }

  if (issues.length > 0) {
    return {
      error: new StandardSchemaError(issues),
      schemasUsed: [...subSchemas.values()],
    };
  }

  return {
    value: Object.fromEntries(headersMap.entries()),
    schemasUsed: [...subSchemas.values()],
  };
};

/**
 * Combines two standard schemas into a single standard schema.
 *
 * The combined schema validates both schemas and merges their successful object outputs.
 *
 * If either schema fails, the combined schema will return the issues from both schemas.
 *
 * @param a - StandardSchemaV1<unknown, unknown>
 * @param b - StandardSchemaV1<unknown, unknown>
 * @returns StandardSchemaV1<unknown, unknown>
 */
export const combineStandardSchemas = (
  a: StandardSchemaV1<unknown, unknown>,
  b: StandardSchemaV1<unknown, unknown>,
): StandardSchemaV1<unknown, unknown> => {
  const standardSchema: StandardSchemaV1<unknown, unknown>['~standard'] = {
    vendor: VENDOR_STANDARD_SCHEMA,
    version: 1,
    validate: (input) => {
      const result = a['~standard'].validate(input);
      const result2 = b['~standard'].validate(input);

      if (result instanceof Promise || result2 instanceof Promise) {
        throw new Error('Schema validation must be synchronous');
      }

      if (result.issues || result2.issues) {
        return {
          issues: [...(result.issues || []), ...(result2.issues || [])],
        };
      }

      return {
        value: {
          ...(result.value || {}),
          ...(result2.value || {}),
        },
      };
    },
  };

  return {
    '~standard': standardSchema,
  };
};

/**
 * Merges two whole-object Standard Schemas or two records of field schemas.
 */
export const mergeHeaderSchemasForRoute = (
  baseSchema: unknown,
  routeSchema: unknown,
): unknown => {
  assertHeaderSchema(baseSchema);
  assertHeaderSchema(routeSchema);

  if (isContractTypeMarker(baseSchema)) {
    return routeSchema;
  }

  if (isContractTypeMarker(routeSchema)) {
    return baseSchema;
  }

  if (isStandardSchema(baseSchema) && isStandardSchema(routeSchema)) {
    return combineStandardSchemas(baseSchema, routeSchema);
  }

  if (isStandardSchema(baseSchema) || isStandardSchema(routeSchema)) {
    throw new Error(
      'Cannot mix whole-object Standard Schemas with field records for headers',
    );
  }

  const mergedObjects = {
    ...Object.fromEntries(
      Object.entries(baseSchema ?? {}).map(([key, schema]) => [
        key.toLowerCase(),
        schema,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(routeSchema ?? {}).map(([key, schema]) => [
        key.toLowerCase(),
        schema,
      ]),
    ),
  };

  return mergedObjects;
};

/**
 * Similar to validateAgainstStandardSchema, but it takes an unknown schema, it will not validate if no schema provided and will check the schema is
 * valid before validating the data.
 *
 * This is super handy for validating request bodies, headers, etc. as it passes through the data if no schema is provided.
 */
export const validateIfSchema = (
  data: unknown,
  schema: unknown,
  {
    passThroughExtraKeys = false,
  }: {
    passThroughExtraKeys?: boolean;
  } = {},
): {
  value?: unknown;
  error?: StandardSchemaError;
  schemasUsed: Array<StandardSchemaV1<unknown, unknown>>;
} => {
  const schemaStandard = parseAsStandardSchema(schema);

  if (!schemaStandard) {
    if (!isContractTypeMarker(schema)) {
      throw new Error(
        'Invalid schema supplied; use a Standard Schema or a contract type marker',
      );
    }
    return { value: data, schemasUsed: [] };
  }

  const result = validateAgainstStandardSchema(data, schemaStandard, {
    passThroughExtraKeys,
  });

  return {
    ...result,
    schemasUsed: [schemaStandard],
  };
};

export const validateAgainstStandardSchema = (
  data: unknown,
  schema: StandardSchemaV1<unknown, unknown>,
  {
    passThroughExtraKeys = false,
  }: {
    passThroughExtraKeys?: boolean;
  } = {},
): { value?: unknown; error?: StandardSchemaError } => {
  const result = schema['~standard'].validate(data);

  if (result instanceof Promise) {
    throw new Error('Schema validation must be synchronous');
  }

  if (result.issues) {
    return {
      error: new StandardSchemaError(result.issues),
    };
  }

  if (passThroughExtraKeys && typeof data === 'object' && result.value) {
    return {
      value: { ...data, ...result.value },
    };
  }

  return {
    value: result.value,
  };
};
