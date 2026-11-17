# Encode multipart fields natively with JSON compatibility

**Status:** Superseded by ADR-0021. **Decision recorded:** 2026-11-16.

[ADR0021](0021-route-multipart-encoding.md) moves this wire policy to the route
contract and replaces the client/request option. The following records the
original decision and rationale.

Object multipart uploads default to ordinary field encoding so a native parser
and string schema receive `Alice` rather than the JSON string `"Alice"`. Keep
strings unchanged, encode numbers/booleans/null and nested objects as JSON text,
omit undefined fields, repeat array field names using the same rules and retain
binary File values. Caller-provided FormData is never rewritten.

`multipartFieldEncoding: 'json'` preserves the historical JSON.stringify path,
including quoted strings and its existing undefined handling. The overridable
client option follows the established resolved-argument path for plain/query
clients and per-request overrides. Native server integrations still own
multipart parsing, field decoding, files and schema validation.

Keeping JSON as the default would avoid a wire change but retain surprising
failures with native email/string schemas. Removing it would require existing
JSON-decoding endpoints to migrate immediately. Native default plus explicit
JSON compatibility fixes the ordinary upload path and lets those endpoints
retain their existing decoder while upgrading. This changes the default wire
format; consumers must choose a mode matching each server's field policy.

Sources: [approved design](../plans/2026-11-16-upstream-issues-design.md#5-multipart-field-compatibility-56),
[implementation plan](../plans/2026-11-16-upstream-issues.md#task-5-native-multipart-encoding-with-json-compatibility-56),
[client migration](../../apps/docs/content/docs/standard-schema-migration.mdx#multipart-object-bodies)
and [native parser regression](../../libs/ts-rest/express/src/lib/ts-rest-express.spec.ts).
