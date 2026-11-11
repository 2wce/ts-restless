import type { OpenAPIObject, SchemaObject } from './model';
import type { OpenApiVersion } from './types';

/** Walk schema positions only: defaults, examples and extension data are values. */
export const visitSchemas = (
  schema: SchemaObject,
  visit: (schema: SchemaObject) => void,
) => {
  for (const key of [
    'properties',
    'patternProperties',
    '$defs',
    'definitions',
    'dependentSchemas',
  ] as const) {
    for (const child of Object.values(schema[key] ?? {}))
      visitSchemas(child as SchemaObject, visit);
  }
  for (const key of [
    'items',
    'additionalProperties',
    'unevaluatedProperties',
    'unevaluatedItems',
    'contains',
    'not',
    'if',
    'then',
    'else',
    'propertyNames',
  ] as const) {
    const child = schema[key];
    if (child && typeof child === 'object' && !Array.isArray(child))
      visitSchemas(child, visit);
  }
  for (const key of ['allOf', 'anyOf', 'oneOf', 'prefixItems'] as const) {
    for (const child of schema[key] ?? []) visitSchemas(child, visit);
  }
  visit(schema);
};

export const normalizeSchema = (
  input: SchemaObject,
  references: Record<string, SchemaObject>,
  version: OpenApiVersion,
): SchemaObject => {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('schemaTransformer must return a schema object or null.');
  const schema = structuredClone(input);
  visitSchemas(schema, (node) => {
    if (node.$schema) {
      const supported =
        version === '3.1.0'
          ? [
              'https://json-schema.org/draft/2020-12/schema',
              'https://spec.openapis.org/oas/3.1/dialect/base',
            ]
          : [];
      if (!supported.includes(node.$schema))
        throw new Error(
          `JSON Schema dialect '${node.$schema}' is incompatible with OpenAPI ${version}. Convert to the selected dialect first.`,
        );
      delete node.$schema;
    }
    if (node.$id || node.$anchor || node.$dynamicRef || node.$dynamicAnchor)
      throw new Error(
        'Schema resource IDs and anchor references require explicit conversion to component references.',
      );
    if (version === '3.0.2') {
      const incompatible = [
        'const',
        'prefixItems',
        'unevaluatedProperties',
        'unevaluatedItems',
        'dependentRequired',
        'minContains',
        'maxContains',
        'contentEncoding',
        'contentMediaType',
        'contentSchema',
        'if',
        'then',
        'else',
        'contains',
        'patternProperties',
        'dependentSchemas',
        'propertyNames',
      ].find((key) => key in node);
      if (
        incompatible ||
        Array.isArray(node.type) ||
        node.type === 'null' ||
        typeof node.exclusiveMinimum === 'number' ||
        typeof node.exclusiveMaximum === 'number'
      ) {
        throw new Error(
          `Schema uses JSON Schema keywords incompatible with OpenAPI 3.0.2${incompatible ? ` (${incompatible})` : ''}. Convert to OpenAPI 3.0 or select openApiVersion: '3.1.0'.`,
        );
      }
    } else {
      if ('nullable' in node)
        throw new Error(
          'OpenAPI 3.1 uses a null type or union instead of nullable. Use a converter targeting JSON Schema 2020-12.',
        );
      if (
        typeof node.exclusiveMinimum === 'boolean' ||
        typeof node.exclusiveMaximum === 'boolean'
      )
        throw new Error(
          'Boolean exclusive bounds are incompatible with OpenAPI 3.1. Use numeric bounds from a converter targeting JSON Schema 2020-12.',
        );
    }
    if (
      node.$ref?.startsWith('#/$defs/') ||
      node.$ref?.startsWith('#/definitions/')
    ) {
      node.$ref = node.$ref.replace(
        /^#\/(\$defs|definitions)\//,
        '#/components/schemas/',
      );
    }
  });
  // Definitions can contain further definitions; harvest after rewriting all refs.
  const definitions: Array<[string, SchemaObject]> = [];
  visitSchemas(schema, (node) => {
    for (const key of ['$defs', 'definitions'] as const) {
      for (const [name, child] of Object.entries(node[key] ?? {}))
        definitions.push([name, child as SchemaObject]);
    }
  });
  visitSchemas(schema, (node) => {
    delete node.$defs;
    delete node.definitions;
  });
  for (const [name, child] of definitions) {
    if (!/^[a-zA-Z0-9._-]+$/.test(name))
      throw new Error(
        `Invalid component name '${name}'. Use letters, digits, dot, hyphen or underscore.`,
      );
    if (
      references[name] &&
      JSON.stringify(references[name]) !== JSON.stringify(child)
    )
      throw new Error(
        `Schema definition '${name}' already exists with a different schema.`,
      );
    references[name] = child;
  }
  return schema;
};

export const validateReferences = (document: OpenAPIObject) => {
  const walk = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if ('$ref' in value && typeof value.$ref === 'string') {
      if (!value.$ref.startsWith('#/'))
        throw new Error(
          `External or anchor reference '${value.$ref}' is unsupported; use document-local component references.`,
        );
      let target: unknown = document;
      for (const token of value.$ref.slice(2).split('/')) {
        const key = decodeURIComponent(token)
          .replace(/~1/g, '/')
          .replace(/~0/g, '~');
        target =
          target && typeof target === 'object'
            ? (target as Record<string, unknown>)[key]
            : undefined;
      }
      if (target === undefined)
        throw new Error(`Unresolved OpenAPI reference '${value.$ref}'.`);
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        key === 'default' ||
        key === 'example' ||
        key === 'examples' ||
        key.startsWith('x-')
      )
        continue;
      walk(child);
    }
  };
  walk(document);
};
