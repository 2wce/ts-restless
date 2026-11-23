---
'@ts-restless/core': patch
---

Keep numeric zero path parameters when `insertParamsIntoPath` builds a URL, so `params: { id: 0 }` for `/entity/:id` produces `/entity/0` instead of `/entity`. Undefined, null and empty optional parameters are still omitted, and trailing slashes are unchanged.
