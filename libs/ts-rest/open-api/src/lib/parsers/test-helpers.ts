import type { SchemaObject } from '../model';
import { SchemaTransformerAsync } from '../types';
import { isStandardSchema } from '@ts-restless/core';
import { toJsonSchema } from '@valibot/to-json-schema';

import { ZOD_3_SCHEMA_TRANSFORMER } from '../transformers';

export const ZOD_SYNC = ZOD_3_SCHEMA_TRANSFORMER;
export const ZOD_ASYNC: SchemaTransformerAsync = async (args) => ZOD_SYNC(args);

export const VALIBOT_ASYNC: SchemaTransformerAsync = async ({ schema }) => {
  if (isStandardSchema(schema) && schema['~standard'].vendor === 'valibot') {
    return {
      schema: toJsonSchema(schema as any, {
        target: 'openapi-3.0',
        errorMode: 'ignore',
      }) as SchemaObject,
      required: !['optional', 'nullish', 'undefined'].includes(
        (schema as any).type,
      ),
    };
  }
  return null;
};
