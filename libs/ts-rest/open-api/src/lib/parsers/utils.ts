import { ExamplesObject, ParameterObject, SchemaObject } from '../model';

export const schemaToParameter = (
  input: SchemaObject,
  where: 'query' | 'header' | 'path',
  required: boolean,
  key: string,
  jsonQuery: boolean,
): ParameterObject => {
  const schema = { ...input };
  let description: string | undefined = undefined;

  if ('description' in schema) {
    description = schema['description'];
    delete schema['description'];
  }

  let examples: ExamplesObject | undefined = undefined;
  if ('mediaExamples' in schema) {
    examples = schema['mediaExamples'];
    delete schema['mediaExamples'];
  }

  const isDeepObject = 'properties' in schema;

  if (jsonQuery) {
    return {
      name: key,
      in: where,
      ...(description && { description }),
      ...(required && { required }),
      content: {
        'application/json': {
          schema,
          ...(examples && { examples }),
        },
      },
    };
  } else {
    return {
      name: key,
      in: where,
      ...(examples && { examples }),
      ...(description && { description }),
      ...(required && { required }),
      ...(isDeepObject && !jsonQuery && { style: 'deepObject' }),
      schema,
    };
  }
};

/**
 * Convert a @type {SchemaObject} to an array of @type {ParameterObject}
 *
 * @param schema - Legacy Zod3 or any Standard Schema
 * @param where - The location of the parameters
 * @param jsonQuery - Whether the schema is a JSON query
 * @returns The parameters for the schema
 */
export const schemaObjectToParameters = (
  schema: SchemaObject,
  where: 'query' | 'header' | 'path',
  jsonQuery = false,
  route = '',
): ParameterObject[] => {
  if (
    schema.type !== 'object' ||
    schema.oneOf ||
    schema.anyOf ||
    schema.allOf ||
    schema.$ref ||
    schema.not
  ) {
    throw new Error(
      `Cannot convert ${where} schema${route ? ` for '${route}'` : ''}: expected a plain object; root unions, intersections and references cannot preserve parameter relationships.`,
    );
  }
  const conditional = [
    'dependentRequired',
    'dependentSchemas',
    'if',
    'then',
    'else',
  ].find((key) => key in schema);
  if (conditional)
    throw new Error(
      `Cannot convert ${where} schema${route ? ` for '${route}'` : ''}: conditional constraints (${conditional}) cannot preserve parameter relationships.`,
    );
  const parameters: ParameterObject[] = [];

  if (schema.type === 'object') {
    const requiredSet = new Set(schema.required ?? []);
    const properties = schema.properties;

    if (!properties) {
      return [];
    }

    for (const [key, value] of Object.entries(properties)) {
      parameters.push(
        schemaToParameter(
          value,
          where,
          where === 'path' || requiredSet.has(key),
          key,
          jsonQuery,
        ),
      );
    }
  }

  return parameters;
};
