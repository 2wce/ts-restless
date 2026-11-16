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
