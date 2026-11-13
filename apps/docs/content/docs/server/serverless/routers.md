---
title: 'Defining Routers'
description: How to use ts-restless with Defining Routers
---

For all the serverless handlers we export a helper object that can help you define your router implementation separate from the main handler function.
You can also use it to split up the implementation for different parts of your application. This can be useful for organizing your code and keeping it maintainable.

```typescript
import { tsr } from '@ts-restless/serverless/aws';
import { contract } from './contract';

export const postsRouter = tsr.router(contract.posts, {
  getPosts: async () => {
    return {
      status: 200,
      body: {
        posts: [...],
      },
    };
  },
  createPost: async ({ body }) => {
    return {
      status: 201,
      body: {
        post: { ... },
      },
    };
  },
});
```

Doing this however, you will lose any type-inference for the request object if you modify it in a global middleware.
To get around this, you can manually add back the extended part in the generics of `tsr.router` function.

```typescript
import { tsr } from '@ts-restless/serverless/aws';
import { contract } from './contract';

export const postsRouter = tsr.routerWithMiddleware(contract)<
  { userId: string } // <-- Add the extended part here. This will be visible in request.userId
>({ ... });
```

## Context Object

The second argument for all route handlers is an object that contains the following context properties:

- `appRoute`: A reference to the contract route that the handler is being called for.
- `request`: The incoming request object.
- `responseHeaders`: An object, where you can set and append any headers that will be sent with the response.

It may also include runtime or platform-specific properties, like `rawEvent` and `lambdaContext` for AWS Lambda.

This object is also passed as the last argument to all middleware and response handler functions.


## Response headers

A serverless handler can return optional `headers` alongside `status` and `body`. Use any Fetch `HeadersInit`: a record of string values, an array of `[name, value]` pairs, or a `Headers` object. This API is supported in development source; verify a containing release before using it in an installed package.

```typescript
const router = tsr.router(contract.posts, {
  getPosts: async (_, { responseHeaders }) => {
    responseHeaders.set('cache-control', 'no-store');
    return {
      status: 200,
      body: { posts: [] },
      headers: { 'x-request-source': 'posts' },
    };
  },
  // Other contract routes go here.
});
```

Returned headers form the base. Headers set through `context.responseHeaders` override ordinary returned headers with the same name, ignoring case. `Set-Cookie` is additive: returned cookies come first, followed by context cookies. Use repeated tuple entries or `Headers.append()` for multiple cookies. The adapter copies returned headers, so it does not change your record, tuple array or `Headers` object. Returning the context’s own `responseHeaders` object copies it once and preserves each cookie once. `Vary` combines field names from both sources, removes duplicates regardless of case, and treats `*` as authoritative. CORS uses the same `Vary` rules when adding request-header or origin dependencies.

Response serialization retains its existing content-type policy: JSON sets `application/json`; a declared media response sets its declared type, with a Blob's nonempty type taking precedence. A no-body response preserves the supplied headers. These serialization rules apply after header merging. Response middleware and CORS processing still run afterward.

`context.responseHeaders.set(name, value)` and `.append(name, value)` remain available, including for consumers whose installed release does not accept returned headers. This is native serverless response customization; it does not declare portable response headers in core contracts or change other adapters' native response APIs.

A header present in the HTTP response may still be hidden from browser JavaScript on a cross-origin request. Set `Access-Control-Expose-Headers` for the custom headers the browser needs to read, and configure the allowed origin separately. Returning a header does not by itself grant CORS access.
