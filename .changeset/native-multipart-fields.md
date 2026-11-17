---
'@ts-restless/core': major
---

Encode multipart object string fields without JSON quotation marks by default,
and omit undefined fields and array items. Preserve numeric/boolean/null/object
JSON text, repeated field names, binary Files and caller-created FormData.

Declare `multipart: { fieldEncoding: 'legacy-json' }` on a route with
`contentType: 'multipart/form-data'` to preserve historical JSON-per-field output,
including quoted strings and literal undefined fields/items. The optional
`multipart: { fieldEncoding: 'form' }` declaration selects the default policy.
Plain and query clients consume the route declaration automatically; encoding
is not selected through client or request options. If using the earlier
unreleased `multipartFieldEncoding` option, move its choice to the route:
`native` becomes `form`, and `json` becomes `legacy-json`.

Keep server multipart parsing, field decoding and validation matched to the
route policy. No automatic server parser/decoder is added. Explicit FormData
passes through unchanged under either policy.
