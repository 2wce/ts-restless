---
title: 'Next.js Edge Runtime & App Router'
description: How to use ts-restless with Next.js Edge Runtime & App Router
---

The Next handler can be used for the Pages Router Edge Runtime or for the App Router.

ts-restless v4 supports Next.js **15 and 16** for this integration, matching the current Maintenance and Active LTS lines in the [Next.js support policy](https://nextjs.org/support-policy) (checked 2026-11-06). Next 12–14 are unsupported; [upgrade Next.js](https://nextjs.org/docs/app/guides/upgrading) to a current patched supported release before adopting v4. Pages Router Edge and App Router remain supported integration modes.

The handler file needs to be a catch-all route file. Use `app/api/[...ts-rest]/route.ts` for App Router, or `pages/api/[...ts-rest].ts` for Pages Router Edge. The Pages Router catch-all parameter must be named `ts-rest` because the handler reads that query key.

```typescript
// App router: /app/[...ts-rest]/route.ts
// Pages router: /pages/api/[...ts-rest].ts

import { createNextHandler } from '@ts-restless/serverless/next';
import { contract } from './contract';
import { router } from './router';

export const handler = createNextHandler(contract, router, {
  handlerType: 'app-router',
  // handlerType: 'pages-router-edge',

  // rest of options
});
```

## HTTP methods

An App Router route file exports one function per HTTP method, so re-export the handler for every method your contract uses, for example `export { handler as GET, handler as POST, handler as PATCH }`. Next.js decides which methods reach ts-restless:

- A method that the route file does not export receives Next's own `405` response, without an `Allow` header. ts-restless does not see the request.
- Without a `HEAD` export, Next calls the `GET` export for `HEAD` requests. ts-restless does not serve `HEAD` from contract routes, so those requests receive `405` with `Allow: GET` (or whichever methods match the path).
- Without an `OPTIONS` export, Next answers `OPTIONS` itself with `204` and an `Allow` header listing the exported methods. Export `OPTIONS` as well when you use the `cors` option, so the adapter's preflight response is used.

For exported methods, the adapter returns `404` for unknown paths and `405` with an `Allow` header for known paths whose contract routes use other methods; see [unknown paths and unsupported methods](/server/serverless/options#unknown-paths-and-unsupported-methods). A Pages Router Edge handler is a single default export, so every method reaches ts-restless.

## Example Usage

- [App Router on Next 16](https://github.com/2wce/ts-restless/blob/main/apps/example-next/app/api/app-router/%5B...ts-rest%5D/route.ts)
- [Pages Router Edge on Next 16](https://github.com/2wce/ts-restless/blob/main/apps/example-next/pages/api/edge/%5B...ts-rest%5D.ts)

## Native Next.js control flow

The Next adapter preserves signals from `redirect()`, `permanentRedirect()` and
`notFound()` using Next's public `unstable_rethrow` helper. This applies to
handlers and request, route and response middleware. Let the signal propagate
so Next can produce its native response; it bypasses the adapter's `errorHandler`
and HTTP 500 conversion. Ordinary application errors and explicit HTTP errors
continue through the configured serverless error handling.

## Multipart and form bodies

The handler decodes JSON and `text/*` request bodies only. It does not parse `multipart/form-data` or `application/x-www-form-urlencoded`; your application owns that parsing, field decoding and file handling, as Multer does for Express and Nest. Contract validation runs after request middleware, so parse the body in route or global request middleware and assign the result to `request.content`. That value is validated against the route's body schema before the handler runs.

The native `request.formData()` parses both media types in App Router and Pages Router Edge handlers, so no extra package is needed:

```typescript
// contract.ts
export const contract = c.router({
  uploadImage: {
    method: 'POST',
    path: '/api/posts/:id/image',
    contentType: 'multipart/form-data',
    body: z.object({
      title: z.string(),
      tags: z.array(z.string()),
      width: z.coerce.number(),
      image: z.instanceof(File),
    }),
    responses: { 201: z.object({ url: z.string() }) },
  },
});

// app/api/[...ts-rest]/route.ts
const handler = createNextHandler(
  contract,
  {
    uploadImage: {
      middleware: [
        async (request) => {
          const form = await request.formData();
          request.content = {
            title: form.get('title') ?? undefined,
            tags: form.getAll('tags'),
            width: form.get('width') ?? undefined,
            image: form.get('image') ?? undefined,
          };
        },
      ],
      handler: async ({ params, body }, { request }) => {
        // Server body types omit File fields; read the validated parsed value.
        const image: File = request.content.image;
        const url = await storeImage(params.id, body.title, image);
        return { status: 201, body: { url } };
      },
    },
  },
  { handlerType: 'app-router' },
);
```

Keep the middleware's field decoding matched to the route's [multipart field encoding](/client/fetch#form-data-multipartform-data). With the default `form` encoding, strings arrive unchanged, numbers, booleans, `null` and nested objects arrive as JSON text, and arrays repeat the field name. Use `getAll()` for array fields, and coerce or `JSON.parse` other values in the middleware or schema. With `legacy-json`, `JSON.parse` every ordinary field.

Server-side body types omit `File` fields on multipart routes. Declare a required file in the schema to validate its presence and type, then read it from `request.content` in the handler. `request.formData()` buffers the whole body in memory; enforce your platform's size limits, or use a streaming parser for large uploads.

Without such middleware, a multipart request reaches validation with no body and receives the normal 400 validation response. A route whose schema is `c.type<T>()` skips validation, so its handler can call `request.formData()` itself. A required body sent without `Content-Type`, or with a media type that is neither decoded nor declared by the route, receives [415 Unsupported Media Type](/server/serverless/fetch-runtimes#request-media-types).

For Pages Router API routes on the Node.js runtime, see [multipart request bodies](/server/next#multipart-request-bodies) in the `@ts-restless/next` guide.

## Context Object

In addition to the regular context properties, the context object for Next handlers includes the following additional properties:

- `nextRequest: NextRequest`: The Next.js specific request object.

```typescript
import { createNextHandler } from '@ts-restless/serverless/next';
import { contract } from './contract';

export const handler = createNextHandler(contract, {
  getPost: async ({ params: { id } }, { nextRequest, responseHeaders }) => {
    // Geo headers depend on the deployment provider; NextRequest.geo was
    // removed in Next 15. Read the provider's request header when available.
    const country = nextRequest.headers.get('x-vercel-ip-country');
    if (country) responseHeaders.set('x-geo-country', country);

    return {
      status: 200,
      body: {
        id,
        title: 'Hello, World!',
      },
    };
  },
});
```
