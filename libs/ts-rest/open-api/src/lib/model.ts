import type * as Oas31 from 'openapi3-ts/oas31';
export type {
  ExamplesObject,
  InfoObject,
  ReferenceObject,
  SecurityRequirementObject,
} from 'openapi3-ts/oas31';

/** Conversion schemas can target OpenAPI 3.0 or JSON Schema 2020-12. */
export type SchemaObject = Omit<
  Oas31.SchemaObject,
  | `x-${string}`
  | 'exclusiveMinimum'
  | 'exclusiveMaximum'
  | 'allOf'
  | 'anyOf'
  | 'oneOf'
  | 'not'
  | 'items'
  | 'properties'
  | 'additionalProperties'
> & {
  nullable?: boolean;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  not?: SchemaObject;
  items?: SchemaObject;
  properties?: Record<string, SchemaObject>;
  additionalProperties?: SchemaObject | boolean;
  $schema?: string;
  $id?: string;
  $anchor?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $defs?: Record<string, SchemaObject>;
  definitions?: Record<string, SchemaObject>;
  mediaExamples?: Oas31.ExamplesObject;
  patternProperties?: Record<string, SchemaObject>;
  dependentSchemas?: Record<string, SchemaObject>;
  dependentRequired?: Record<string, string[]>;
  unevaluatedItems?: SchemaObject | boolean;
  unevaluatedProperties?: SchemaObject | boolean;
  contains?: SchemaObject;
  if?: SchemaObject;
  then?: SchemaObject;
  else?: SchemaObject;
  propertyNames?: SchemaObject;
  prefixItems?: SchemaObject[];
};
export type MediaTypeObject = Omit<Oas31.MediaTypeObject, 'schema'> & {
  schema?: SchemaObject;
};
type ContentObject = Record<string, MediaTypeObject>;
export type ParameterObject = Omit<
  Oas31.ParameterObject,
  'schema' | 'content'
> & { schema?: SchemaObject; content?: ContentObject };
type RequestBodyObject = Omit<Oas31.RequestBodyObject, 'content'> & {
  content: ContentObject;
};
export type ResponseObject = Omit<Oas31.ResponseObject, 'content'> & {
  content?: ContentObject;
};
export type OperationObject = Omit<
  Oas31.OperationObject,
  'parameters' | 'requestBody' | 'responses'
> & {
  parameters?: (ParameterObject | Oas31.ReferenceObject)[];
  requestBody?: RequestBodyObject | Oas31.ReferenceObject;
  responses?: Record<string, ResponseObject | Oas31.ReferenceObject>;
};
type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'head'
  | 'options'
  | 'trace';
type PathItemObject = Omit<Oas31.PathItemObject, HttpMethod | 'parameters'> &
  Partial<Record<HttpMethod, OperationObject>> & {
    parameters?: (ParameterObject | Oas31.ReferenceObject)[];
  };
export type PathsObject = Record<string, PathItemObject>;
/** Combined document model used during conversion; the returned type follows the selected dialect. */
export type OpenAPIObject = Omit<
  Oas31.OpenAPIObject,
  'paths' | 'components'
> & {
  paths: PathsObject;
  components?: Omit<Oas31.ComponentsObject, 'schemas'> & {
    schemas?: Record<string, SchemaObject>;
  };
};
export type OpenApiDocument<V extends '3.0.2' | '3.1.0' = '3.0.2'> =
  V extends '3.1.0'
    ? Oas31.OpenAPIObject & { paths: Oas31.PathsObject }
    : import('openapi3-ts/oas30').OpenAPIObject;
