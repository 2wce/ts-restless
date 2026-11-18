---
'@ts-restless/serverless': patch
---

Preserve Next.js redirect and not-found control-flow errors before serverless
error conversion or application error handlers, in both App Router and Pages
Router Edge handlers. Ordinary errors retain existing HTTP handling.
