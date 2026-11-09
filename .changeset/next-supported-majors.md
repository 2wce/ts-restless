---
'@ts-restless/next': major
'@ts-restless/serverless': major
---

Set the first stable ts-restless v4 Next.js baseline to majors 15 and 16, matching Next.js's Maintenance and Active LTS lines. Remove unsupported Next.js 12, 13 and 14 from both integrations' peer ranges and packed consumers.

Before migrating an application on Next.js 12–14 to ts-restless v4, upgrade Next.js using its official migration guides. Pages Router, App Router and Pages Router Edge integration entry points remain available on supported majors. Use a current patched release of Next.js 15 or 16; the maintained workspace example targets Next.js 16. This initial v4 baseline does not change already published upstream ts-rest v3 packages.

Follow the [fork migration checklist](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx) for upgrade order, each router integration, removed NextRequest properties and combined Next/React Query peer limits.
