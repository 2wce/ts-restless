---
'@ts-restless/express': major
---

Correct native raw-request typing in handlers and middleware. Top-level `params`, `query`, `body` and `headers` remain validated outputs; `req` stays untouched with string URL parameters, native Express query/headers and an `unknown` parser-owned body. Migrate transformed `req` reads to the top-level arguments, or explicitly narrow raw middleware input. The former third `TsRestRequest` inference generic is removed; use the contract/route form instead.

Custom validation-error callbacks must also handle absent `req.params` values: Express can clear route parameters when entering the error middleware layer. Check those values before reading them; route handlers and middleware retain their matched parameter types.
