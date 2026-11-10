---
'@ts-restless/serverless': patch
---

Treat zero-length JSON request bytes as an absent body before contract validation, so undefined-accepting and explicit no-body contracts work and missing required bodies return normal validation errors. Nonempty malformed JSON keeps its existing parsing-error path.

Normalize undefined JSON response serialization to an empty native body before AWS gateway v1/v2 mapping, preventing accidental binary conversion failures. Declare empty responses with `c.noBody()` for interoperable clients. Applications relying on a 500 for absent required JSON should expect the normal 400 validation response; see the serverless Fetch runtimes guide.
