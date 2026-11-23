import { SchemaObject, MediaTypeObject } from './model';
import { mapSchemas } from './schema-conversion';

export const convertSchemaObjectToMediaTypeObject = (
  input: SchemaObject,
): MediaTypeObject => {
  const { mediaExamples: examples, ...schema } = input;

  return {
    schema,
    ...(examples && { examples }),
  };
};

export const extractReferenceSchemas = (
  schema: SchemaObject,
  referenceSchemas: { [id: string]: SchemaObject },
): SchemaObject =>
  mapSchemas(schema, (schema) => {
    if (schema.title) {
      const nullable = schema.nullable;
      schema.nullable = undefined;
      if (schema.title in referenceSchemas) {
        if (
          JSON.stringify(referenceSchemas[schema.title]) !==
          JSON.stringify(schema)
        ) {
          throw new Error(
            `Schema title '${schema.title}' already exists with a different schema`,
          );
        }
      } else {
        referenceSchemas[schema.title] = schema;
      }

      if (nullable) {
        schema = {
          nullable: true,
          allOf: [
            {
              $ref: `#/components/schemas/${schema.title}`,
            },
          ],
        };
      } else {
        schema = {
          $ref: `#/components/schemas/${schema.title}`,
        };
      }
    }
    return schema;
  });

/** Collapse slashes so `api`, `/api/` and `//api` all become `/api`; `''` and `/` add nothing. */
export const normalizePathPrefix = (prefix: string | undefined): string => {
  if (prefix === undefined) return '';
  if (/[:{}?#]/.test(prefix))
    throw new Error(
      `OpenAPI pathPrefix '${prefix}' must be a literal path. Use contract pathPrefix for path parameters and OpenAPI servers for URLs.`,
    );
  const segments = prefix.split('/').filter(Boolean);
  return segments.length ? `/${segments.join('/')}` : '';
};

/** Contract paths stay verbatim; only a missing separator is added. */
export const prefixPath = (prefix: string, path: string): string =>
  !prefix || !path || path.startsWith('/')
    ? `${prefix}${path}`
    : `${prefix}/${path}`;
