---
title: 'Common Options'
description: How to use ts-restless with Common Options
---

All of the serverless handlers support a common set of options to configure the behavior of the handlers.

- `jsonQuery` - If set to `true`, the handler will automatically parse all query parameters as JSON values. Default is `false`.
- `responseValidation` - If set to `true`, the handler will validate the response body against the contract. Default is `false`.
- `basePath` - The base path for the handler. Default is `/`. See [Base Path](#base-path) for more information.
- `cors` - Default `false` - See [CORS](#cors) for more information.
- `errorHandler` - See [Custom Error Handler](#custom-error-handler) for more information.
- `requestMiddleware` and `responseHandlers` - See [Middleware](#middleware) for more information.

## Base Path

Set the `basePath` option if your handler's URL path does not start at the root of the domain.

For example, for a Vercel Function that lives inside `api/posts.ts`, you would set the `basePath` to `/api/posts`.

## CORS

The `cors` option allows you to configure CORS for your handler. The `cors` option can be a boolean (setting it to `false` disables CORS) or an options object.
We use `itty-router` under the hood for routing and CORS handling, so the options are the same as the `itty-router` CORS options. You can find the full list of options [here](https://itty.dev/itty-router/cors#corsoptions).

When CORS is enabled, the preflight handler answers every `OPTIONS` request before route matching, including requests for unknown paths.

## Unknown paths and unsupported methods

A request whose path matches no contract route receives `404` with `{ "message": "Not Found" }`.

A request whose path matches one or more contract routes, but none for its method, receives `405` with `{ "message": "Method Not Allowed" }` and an `Allow` header. `Allow` lists the methods of every route matching that path, sorted and comma-separated, for example `Allow: DELETE, GET, PATCH`. The base path is included in matching. No route handler or route middleware runs for these requests; global request middleware, response handlers and CORS headers still apply as they do for `404`.

Contracts cannot declare `HEAD` or `OPTIONS`, and the handler does not derive them from other routes:

- `HEAD` is not served from a `GET` route. A `HEAD` request for a `GET` path receives `405` with `Allow: GET`.
- Without the `cors` option, an `OPTIONS` request for a known path receives `405`. With `cors`, the preflight response answers `OPTIONS`, so `Allow` on `405` responses also lists `OPTIONS`.

Both responses are thrown as a `TsRestHttpError` and pass through a [custom error handler](#custom-error-handler) first. For `405`, `error.headers` contains the `Allow` header. If your error handler returns its own response, that response replaces the default one, so copy `error.headers` onto it to keep `Allow`.

Hosts that route by method can reject a request before it reaches ts-restless. See the [Next.js](/server/serverless/next-serverless#http-methods) and [Azure Functions](/server/serverless/azure-functions#http-methods) guides. AWS Lambda behind an API Gateway `ANY` or proxy route, and Fetch runtimes, pass every method to the handler.

### Custom Error Handler

The `errorHandler` option allows you to define a custom error handler to handle any uncaught exceptions. The error handler is a function that takes an error and request and optionally returns a response object.
If you do not return a response object, ts-restless will return a default 500 server error.

Note that this will catch

```typescript
import { TsRestRequest, TsRestResponse } from '@ts-restless/serverless';

const errorHandler = (error: unknown, request: TsRestRequest) => {
  console.error('Server Error', error);

  return TsRestResponse.fromJson({ message: 'Custom Server Error Message' }, { status: 500 });
};
```

## Middleware

### Global Request Middleware

You can set global request middleware by using the `requestMiddleware` option.
These are functions that will be called sequentially before any router handler. This is useful for doing authentication, logging, etc.

You can optionally return a response object from the middleware to short-circuit the request.

You can also extend the request object with additional properties that can be accessed in the router handlers in a type-safe manner.

```typescript
import { TsRestResponse } from '@ts-restless/serverless';
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

export default async (request: Request) => {
  return fetchRequestHandler({
    request,
    contract,
    router: {
      getPost: async ({ params: { id } }, { request }) => {
        const post = prisma.post.findUniqueOrThrow({
          where: { id, ownerId: request.userId },
        });

        return {
          status: 200,
          body: post,
        };
      },
    },
    options: {
      requestMiddleware: [
        tsr.middleware<{ userId: string }>((request) => {
          if (request.headers.get('Authorization')) {
            const userId = authenticate(request.headers.get('Authorization'));
            if (!userId) {
              return TsRestResponse.fromJson({ message: 'Unauthorized' }, { status: 401 });
            }
            request.userId = userId;
          }
        }),
      ],
    },
  });
};
```

### Global Response Handlers

You can set global response handlers by using the `responseHandlers` option. This can be useful to intercept all responses, including error responses, before they are sent.
This can be useful for logging, adding headers, etc.

```typescript
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';
import { router } from './router';

export default async (request: Request) => {
  return fetchRequestHandler({
    request,
    contract,
    router,
    options: {
      requestMiddleware: [
        tsr.middleware<{ time: Date }>((request) => {
          request.time = new Date();
        }),
      ],
      responseHandlers: [
        (response, request) => {
          console.log('Request took', new Date().getTime() - request.time.getTime(), 'ms');
        },
      ],
    },
  });
};
```

### Per Route Middleware

You can also set middleware for individual routes by passing an object in the form of `{ middleware: RequestHandler[], handler: (...) => ... }` to the route definition.

```typescript
import { fetchRequestHandler } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

export default async (request: Request) => {
  return fetchRequestHandler({
    request,
    contract,
    router: {
      getPost: {
        middleware: [authenticationMiddleware],
        handler: async ({ params: { id } }, { request }) => {
          const post = prisma.post.findUniqueOrThrow({ where: { id, ownerId: request.userId } });

          return {
            status: 200,
            body: post,
          };
        },
      },
    },
  });
};
```

If you would like to have different request contexts defined in your global middleware and route-specific middleware,
you can use the `tsr.routeWithMiddleware()` helper function.
Please note, that you will need to manually pass the global request middleware context type,
so it would be a good idea to define it outside your router definition and use that everywhere.

```typescript
import { fetchRequestHandler, tsr } from '@ts-restless/serverless/fetch';
import { contract } from './contract';

type GlobalRequestContext = {
  time: Date;
};

export default async (request: Request) => {
  return fetchRequestHandler({
    request,
    contract,
    router: {
      getPost: tsr.routeWithMiddleware(contract.getPost)<
        GlobalRequestContext, // <--- this is the global context
        { userId: string } // <--- this is the route-level context
      >({
        middleware: [
          (request) => {
            // do authentication
            request.userId = '123';
          },
        ],
        handler: async ({ params: { id } }, { request }) => {
          const post = prisma.post.findUniqueOrThrow({
            where: { id, ownerId: request.userId },
          });

          return {
            status: 200,
            body: post,
          };
        },
      }),
    },
    options: {
      requestMiddleware: [
        tsr.middleware<GlobalRequestContext>((request) => {
          request.time = new Date();
        }),
      ],
    },
  });
};
```
