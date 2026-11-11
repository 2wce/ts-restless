import type { ZodTypeAny } from 'zod';
import type { SchemaTransformerSync } from './types';
import { generateSchema } from '@anatine/zod-openapi';
import { visitSchemas } from './schema-conversion';
import type { SchemaObject } from './model';

const isZod3 = (value: unknown): value is ZodTypeAny =>
  !!value &&
  typeof value === 'object' &&
  '_def' in value &&
  typeof (value as ZodTypeAny)._def?.typeName === 'string';

// Zod3 stores both literal and function defaults as callbacks. Inspect wrappers,
// never parse a sentinel or call a default to discover schema metadata.
const accepts = (schema: ZodTypeAny, kind: 'undefined' | 'null'): boolean => {
  const def = schema._def;
  if (['ZodAny', 'ZodUnknown', 'ZodCatch'].includes(def.typeName)) return true;
  if (
    kind === 'undefined' &&
    ['ZodOptional', 'ZodDefault', 'ZodUndefined', 'ZodVoid'].includes(
      def.typeName,
    )
  )
    return true;
  if (kind === 'null' && ['ZodNullable', 'ZodNull'].includes(def.typeName))
    return true;
  if (def.typeName === 'ZodLiteral')
    return def.value === (kind === 'null' ? null : undefined);
  if (def.typeName === 'ZodUnion' || def.typeName === 'ZodDiscriminatedUnion')
    return [...def.options.values()].some((child: ZodTypeAny) =>
      accepts(child, kind),
    );
  if (def.typeName === 'ZodIntersection')
    return accepts(def.left, kind) && accepts(def.right, kind);
  if (def.innerType) return accepts(def.innerType, kind);
  if (def.schema) return accepts(def.schema, kind);
  if (def.typeName === 'ZodBranded') return accepts(def.type, kind);
  return false;
};

const withoutDefaultExecution = (
  schema: ZodTypeAny,
  seen = new WeakMap<object, ZodTypeAny>(),
): ZodTypeAny => {
  if (seen.has(schema)) return seen.get(schema)!;
  const copy = Object.create(
    Object.getPrototypeOf(schema),
    Object.getOwnPropertyDescriptors(schema),
  ) as ZodTypeAny;
  seen.set(schema, copy);
  const clone = (value: unknown): unknown => {
    if (isZod3(value)) return withoutDefaultExecution(value, seen);
    if (Array.isArray(value)) return value.map(clone);
    if (value instanceof Map)
      return new Map([...value].map(([key, child]) => [key, clone(child)]));
    return value;
  };
  Object.defineProperty(copy, '_def', {
    value: Object.fromEntries(
      Object.entries(schema._def).map(([key, value]) => [key, clone(value)]),
    ) as ZodTypeAny['_def'],
    configurable: true,
  });
  if (schema._def.shape)
    copy._def.shape = () =>
      Object.fromEntries(
        Object.entries(schema._def.shape()).map(([key, child]) => [
          key,
          withoutDefaultExecution(child as ZodTypeAny, seen),
        ]),
      );
  if (schema._def.typeName === 'ZodDefault')
    copy._def.defaultValue = () => undefined;
  copy.isOptional = () => accepts(schema, 'undefined');
  copy.isNullable = () => accepts(schema, 'null');
  return copy;
};

/** Zod3/OpenAPI 3.0 compatibility. Defaults require explicit constant OpenAPI metadata. */
export const ZOD_3_SCHEMA_TRANSFORMER: SchemaTransformerSync = ({
  schema,
  type,
  openApiVersion,
}) => {
  if (!isZod3(schema)) return null;
  if (openApiVersion === '3.1.0')
    throw new Error(
      'ZOD_3_SCHEMA_TRANSFORMER targets OpenAPI 3.0.2. Use a JSON Schema 2020-12 converter for OpenAPI 3.1.',
    );
  const converted = generateSchema(
    withoutDefaultExecution(schema),
    type === 'response',
  ) as SchemaObject;
  visitSchemas(converted, (node) => {
    if (typeof node.exclusiveMinimum === 'number') {
      node.minimum = node.exclusiveMinimum;
      node.exclusiveMinimum = true;
    }
    if (typeof node.exclusiveMaximum === 'number') {
      node.maximum = node.exclusiveMaximum;
      node.exclusiveMaximum = true;
    }
  });
  return { schema: converted, required: !accepts(schema, 'undefined') };
};
