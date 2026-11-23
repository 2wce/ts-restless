---
'@ts-restless/core': minor
---

Accept structured JSON request media types on mutation routes. `contentType`
now admits `application/json` and any `application/<subtype>+json` type, such
as `application/merge-patch+json`, `application/json-patch+json` or
`application/vnd.api+json`, exported as `JsonMediaType`. Existing JSON,
multipart and URL-encoded declarations are unchanged.

The plain and query clients serialize these bodies with `JSON.stringify`, send
the declared type as the `content-type` header and report it as `contentType`
to custom APIs; an explicit request `content-type` header still takes
precedence. OpenAPI generation lists the request body under the declared type.
Serverless handlers already parse any JSON content type. The native Express,
Fastify and Nest body parsers only parse `application/json` by default, and the
Next Pages Router parser adds only `application/ld+json`; configure the host
parser for the structured types an application accepts, as the server guides
describe.
