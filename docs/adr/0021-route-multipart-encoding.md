# Declare multipart field encoding on the route contract

**Status:** Accepted. **Decision recorded:** 2026-11-17.

Supersedes [ADR0020](0020-multipart-field-encoding.md). Multipart field encoding
is an endpoint wire agreement, so declare it beside the route's
`contentType: 'multipart/form-data'` as
`multipart: { fieldEncoding: 'form' | 'legacy-json' }`. An omitted declaration
uses `form`. Plain and query clients read the same route policy through core's
existing object-to-FormData conversion; there is no client-wide or per-request
encoding option.

`form` preserves strings, encodes numbers/booleans/null and nested objects as
JSON text, omits undefined fields/items, repeats array field names and retains
binary Files. `legacy-json` preserves the historical per-field JSON.stringify
path, including quoted strings and literal undefined fields/items. Caller
FormData passes through unchanged and remains the explicit custom-wire escape
hatch. The declaration is only valid on multipart mutation routes.

A client-wide setting lets the same shared contract produce different wire
values depending on client setup. Removing compatibility would require every
existing JSON-decoding endpoint to migrate immediately. A route declaration
retains that compatibility while making the endpoint agreement visible and
consistent across clients. The historical policy is named explicitly rather
than presented as a general-purpose JSON-part protocol.

Native server integrations continue to own multipart parsing, field decoding,
files and validation. This declaration does not install a decoder, infer one
from Standard Schema, emit OpenAPI per-part encoding metadata, or introduce
per-field codecs. Those require separate design if needed. The default wire
change retains major-version migration guidance and a core Changeset.

Sources: [approved route-level implementation plan](../plans/2026-11-17-route-multipart-encoding.md),
[client guide](../../apps/docs/content/docs/client/fetch.mdx#form-data-multipartform-data)
and [migration](../../apps/docs/content/docs/standard-schema-migration.mdx#multipart-object-bodies).
