---
'@ts-restless/fastify': patch
---

Respect native responses already sent or hijacked by Fastify handlers. Skip response-envelope validation and a second send once Fastify owns the response, preserving the native status, body and headers without second-send warnings.
