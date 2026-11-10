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

The zero-length JSON request correction and undefined AWS serialization fix require a release after alpha.4. If an application depended on a 500 for an absent required body, update its error handling to the contract's normal 400 validation response. Malformed nonempty JSON handling is unchanged.

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
