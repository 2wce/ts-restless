---
'@ts-restless/serverless': patch
---

Return 415 Unsupported Media Type, naming the missing or received `Content-Type` and the route's expected media type, when a nonempty request body fails contract validation only because the adapter could not decode it. Previously the response was a 400 whose body errors compared the schema with `undefined`. The 415 is a `TsRestHttpError` and reaches any custom `errorHandler`.

The decoder still handles only JSON and `text/*` bodies and never guesses JSON. Media type matching is now case-insensitive, so `Application/JSON` is decoded. Malformed JSON keeps its existing parsing-error path, and empty bodies keep the normal validation response. Requests whose media type matches the route's declared `contentType`, such as `multipart/form-data`, keep the validation response because request middleware owns their parsing. Bodies already parsed by middleware, routes without a runtime body schema and bodies the schema accepts as absent are unchanged.
