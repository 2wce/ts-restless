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
