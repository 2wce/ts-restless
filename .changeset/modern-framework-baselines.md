---
'@ts-restless/nest': minor
'@ts-restless/next': minor
'@ts-restless/serverless': minor
'@ts-restless/open-api': patch
---

Support Nest 12 and Next 15/16. The initial stable Next 15/16-only baseline is
recorded separately in the Next supported-majors Changeset; Nest retains its
older framework peer ranges.
Register optional Nest contract paths as concrete route alternatives for Express
5 compatibility. Paths keep the selected framework's native route priority.
Update the Zod 3 OpenAPI converter to the compatible 1.14 release without
changing the OpenAPI public type major.
