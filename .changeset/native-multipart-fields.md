---
'@ts-restless/core': major
---

Encode multipart object string fields without JSON quotation marks by default,
and omit undefined fields and array items. Preserve numeric/boolean/null/object
JSON text, repeated field names, binary Files and caller-created FormData.

Set `multipartFieldEncoding: 'json'` on plain or query clients to preserve the
historical per-field JSON encoding, including quoted strings and literal
undefined fields. Requests can override either mode through
`overrideClientOptions`. Match the chosen mode to your server's existing native
parser and field decoder; no automatic server parsing is added.
