import type { z } from 'zod';
import type { StandardSchemaV1 } from './lib/standard-schema';
import type { SchemaInputOrType, SchemaOutputOrType } from './lib/type-utils';

export * from './lib/zod-utils';
export * from './lib/zod3-validation-error';
export * from './lib/zod3-response-validation-error';

type LegacyZod3Schema = Pick<z.ZodTypeAny, '_input' | '_output'> & {
  safeParse(
    input: unknown,
  ):
    | { success: true; data: unknown }
    | { success: false; error: { issues: readonly StandardSchemaV1.Issue[] } };
};

/** Explicitly adapt a Zod 3 schema without changing the supplied schema. */
export function toStandardSchema<T extends z.ZodTypeAny>(
  schema: T,
): T & StandardSchemaV1<z.input<T>, z.output<T>>;
// Later Zod 3 declarations added Standard Schema properties. Accept the
// earlier safeParse/input/output surface as well, so the bridge works with
// pre-Standard-Schema Zod 3 when both versions are present in a workspace.
export function toStandardSchema<T extends LegacyZod3Schema>(
  schema: T,
): T & StandardSchemaV1<T['_input'], T['_output']>;
export function toStandardSchema<T extends LegacyZod3Schema>(
  schema: T,
): T & StandardSchemaV1<T['_input'], T['_output']> {
  const descriptors: PropertyDescriptorMap =
    Object.getOwnPropertyDescriptors(schema);
  delete descriptors['~standard'];
  const adapted = Object.create(Object.getPrototypeOf(schema), descriptors);
  Object.defineProperty(adapted, '~standard', {
    enumerable: true,
    configurable: true,
    value: {
      version: 1,
      vendor: 'zod3',
      validate: (input: unknown) => {
        const result = schema.safeParse(input);
        return result.success
          ? { value: result.data }
          : { issues: result.error.issues };
      },
    } satisfies StandardSchemaV1<T['_input'], T['_output']>['~standard'],
  });
  return adapted;
}

/** @deprecated Use SchemaOutputOrType with a Standard Schema. */
export type ZodInferOrType<T> = T extends LegacyZod3Schema
  ? T['_output']
  : SchemaOutputOrType<T>;

/** @deprecated Use SchemaInputOrType with a Standard Schema. */
export type ZodInputOrType<T> = T extends LegacyZod3Schema
  ? T['_input']
  : SchemaInputOrType<T>;
