---
'@ts-restless/open-api': major
---

Require explicit schema conversion at the default entry and support OpenAPI 3.0.2 and 3.1.0 dialects. Move the historical Zod 3 generator/converter to the opt-in `@ts-restless/open-api/legacy` entry with optional Zod 3 and Anatine peers. Upgrade OpenAPI model types to `openapi3-ts` 4.x, map local definitions into components and reject incompatible dialects or unresolved references.

Emit accurate whole-body requiredness in synchronous and asynchronous generation. Converters can return `{ schema, required }`; plain schemas represent required values. Omit inferred Zod 3 defaults without evaluating callbacks; explicitly supplied constant OpenAPI metadata defaults remain supported. Diagnose root query unions/intersections instead of silently dropping parameters. Header conversion uses the same presence policy in both paths. Normalize caller component schemas against the selected dialect, check references inside arbitrarily named properties, and reject conditional query/header/path relationships that cannot be represented as separate parameters.

For Zod 3, change the generator import to `/legacy`, install its optional peers, and supply constant defaults as OpenAPI metadata where needed. For other validators, supply a matching converter and document dialect. Compare generated clients for body presence changes; consult the OpenAPI and Standard Schema migration guides before deploying.
