---
'@ts-restless/serverless': minor
---

Accept optional Fetch `HeadersInit` on serverless handler responses. Context headers override ordinary returned headers, cookies from both sources are preserved, and existing content-type serialization rules remain in effect.

Merge `Vary` field names case-insensitively, retaining wildcard cache protection during CORS processing. Returning the context header object copies it once and avoids duplicate cookies.

Preserve native body data for AWS serialization when CORS middleware creates a plain Fetch response.
