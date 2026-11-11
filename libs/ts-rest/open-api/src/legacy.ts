import {
  generateOpenApi as generate,
  generateOpenApiAsync as generateAsync,
} from './lib/ts-rest-open-api';
import { ZOD_3_SCHEMA_TRANSFORMER } from './lib/transformers';

export { ZOD_3_SCHEMA_TRANSFORMER } from './lib/transformers';
export type {
  SchemaTransformer,
  SchemaTransformerAsync,
  SchemaTransformerSync,
} from './lib/types';

/** @deprecated Use explicit conversion at the package root. Legacy Zod3/OpenAPI 3.0 support remains available during migration; install zod@3 and @anatine/zod-openapi. */
export const generateOpenApi = (
  router: Parameters<typeof generate>[0],
  apiDoc: Parameters<typeof generate>[1],
  options?: Omit<Partial<Parameters<typeof generate>[2]>, 'openApiVersion'> & {
    openApiVersion?: '3.0.2';
  },
) =>
  generate(router, apiDoc, {
    ...options,
    schemaTransformer: options?.schemaTransformer ?? ZOD_3_SCHEMA_TRANSFORMER,
  });

/** @deprecated Use generateOpenApiAsync at the package root with an explicit converter. */
export const generateOpenApiAsync = (
  router: Parameters<typeof generateAsync>[0],
  apiDoc: Parameters<typeof generateAsync>[1],
  options?: Omit<
    Partial<Parameters<typeof generateAsync>[2]>,
    'openApiVersion'
  > & { openApiVersion?: '3.0.2' },
) =>
  generateAsync(router, apiDoc, {
    ...options,
    schemaTransformer: options?.schemaTransformer ?? ZOD_3_SCHEMA_TRANSFORMER,
  });
