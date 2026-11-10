---
'@ts-restless/express': major
---

Correct native raw-request typing in handlers and middleware. Top-level `params`, `query`, `body` and `headers` remain validated outputs; `req` stays untouched with string URL parameters, native Express query/headers and an `unknown` parser-owned body. Migrate transformed `req` reads to the top-level arguments, or explicitly narrow raw middleware input. The former third `TsRestRequest` inference generic is removed; use the contract/route form instead.
