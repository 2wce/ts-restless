---
title: 'Fetch Runtimes'
description: How to use ts-restless with Fetch Runtimes
---

The default `@ts-restless/serverless/fetch` handler is able to handle and route requests for any runtime that follows the [WinterCG](https://wintercg.org/) [Minimum Common Web Platform API](https://common-min-api.proposal.wintercg.org/).

This includes but is not limited to:

- Cloudflare Workers
- Netlify Functions
- Vercel Functions

## Empty request and response bodies

Zero-length JSON request bytes are treated as an absent body (`undefined`), then validated against the route contract. Use `c.noBody()` when no request payload is expected; an undefined-accepting Standard Schema is also supported. A missing required body produces the normal 400 validation response. Nonempty malformed JSON, including whitespace-only payloads, retains the parsing-error path and any custom `errorHandler`.

Declare empty responses with `c.noBody()`, returning `body: undefined` from the handler. Serverless also permits undefined-accepting JSON response schemas: their serialization produces an empty native body, and AWS gateway v1/v2 receive an empty string with `isBase64Encoded: false`. JSON has no undefined value, so a client expecting JSON should use an explicit no-body declaration for an empty response.

If an application depended on a 500 for an absent required body, update its error handling to the contract's normal 400 validation response. Malformed nonempty JSON handling is unchanged.

## Request media types

Every serverless handler, including Next, AWS Lambda and Azure Functions, decodes JSON request bodies (any media type containing `json`) and `text/*` bodies before validation. Media types are matched case-insensitively. Other bodies are not decoded, and JSON is never guessed from the bytes.

When a nonempty body was not decoded and the route's body schema then rejects the absent value, the handler responds `415 Unsupported Media Type` instead of a validation error. The JSON message names the missing or received `Content-Type` and the media type the route expects: the route's `contentType`, or `application/json`. The error is a `TsRestHttpError` with `statusCode` 415, so a custom `errorHandler` can reshape it. 415 identifies a problem the client can fix by changing the request's representation; the body itself was never evaluated.

These requests keep their existing behavior:

- An empty body without `Content-Type` produces the normal 400 validation response for a required body.
- A request whose media type matches the route's declared `contentType`, such as `multipart/form-data` or `application/x-www-form-urlencoded`, is left to request middleware. Without a parser it produces the normal 400 validation response. See [multipart and form bodies](/server/serverless/next-serverless#multipart-and-form-bodies); the same middleware approach applies to every serverless handler.
- A body assigned to `request.content` by middleware is validated as usual.
- Routes without a runtime body schema, such as `c.type<T>()`, and schemas accepting an absent body run their handler, which can still read the raw `request`.

## Platform Context

Some platforms provide additional context arguments that you may want to pass to your handler functions.
You need to first instantiate a router object with the correct context type, and then pass it with that type to the `fetchRequestHandler` function.

```typescript
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

export const router = tsr.platformContext<{ customContext: PlatformContext }>().router(contract, {
  getPost: async ({ params: { id } }, { customContext }) => {
    console.log(platformContext);
    return {
      status: 200,
      body: {
        id: id,
        title: 'Hello, World!',
      },
    };
  },
});
```

## Handler Examples

### Cloudflare Workers

```typescript
import type { Request as WorkerRequest, ExecutionContext, KVNamespace } from '@cloudflare/workers-types/experimental';
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

interface Env {
  MY_KV_NAMESPACE: KVNamespace;
}

const router = tsr
  .platformContext<{
    workerRequest: WorkerRequest;
    workerEnv: Env;
    workerContext: ExecutionContext;
  }>()
  .router(contract, {
    getPost: async ({ params: { id } }, { workerRequest, workerEnv, workerContext }) => {
      return {
        status: 200,
        body: {
          id: id,
          title: await workerEnv.MY_KV_NAMESPACE.get(`post_${id}`),
          country: workerRequest.cf?.country,
        },
      };
    },
  });

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return fetchRequestHandler({
      request,
      contract,
      router,
      platformContext: {
        workerRequest: request as unknown as WorkerRequest,
        workerEnv: env,
        workerContext: ctx,
      },
    });
  },
};
```

### Netlify Functions

```typescript
import type { Context } from '@netlify/functions';
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

const router = tsr.platformContext<{ netlifyContext: Context }>().router(contract, {
  getPost: async ({ params: { id } }, { netlifyContext }) => {
    return {
      status: 200,
      body: {
        id: id,
        title: 'Hello, World!',
        ip: netlifyContext.ip,
      },
    };
  },
});

export default async (request: Request, netlifyContext: Context) => {
  return fetchRequestHandler({
    request,
    contract,
    router,
    platformContext: {
      netlifyContext,
    },
  });
};
```

### Vercel Functions

```typescript
import type { RequestContext } from '@vercel/edge';
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

const router = tsr.platformContext<{ vercelContext: RequestContext }>().router(contract, {
  getPost: async ({ params: { id } }, { vercelContext }) => {
    return {
      status: 200,
      body: {
        id: id,
        title: 'Hello, World!',
      },
    };
  },
});

const handler = async (request: Request, vercelContext: RequestContext) => {
  return fetchRequestHandler({
    request,
    contract,
    router,
    platformContext: {
      vercelContext,
    },
  });
};

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
```
