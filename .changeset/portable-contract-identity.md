---
'@ts-restless/core': patch
---

Preserve no-body, plain typed and typed-null contracts when shared between ESM
and CommonJS consumers of the same coordinated release. The no-body marker now
has registered runtime identity and portable declaration branding; `Opaque` and
`UnwrapOpaque` keep distinct tokens and their existing inference.

Rebuild shared contract packages and applications together when upgrading from
historical module-local brands. Arbitrary symbols are still not valid no-body
declarations, and mixed historical package versions are not supported.
