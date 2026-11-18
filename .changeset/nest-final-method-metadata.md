---
'@ts-restless/nest': patch
---

Retain native method guards, interceptors and custom metadata on generated
multi-route handlers regardless of decorator order. Native route metadata and
Nest's interceptor ordering are preserved.
