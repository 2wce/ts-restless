---
'@ts-restless/core': major
---

Launch the maintained fork as **ts-restless**, with the ten public packages under
`@ts-restless/*` and the first stable target `4.0.0`. Interim numbered alpha
releases are available before the remaining compatibility work is complete.
Replace upstream dependencies and imports as a matched package set; public API
identifiers and supported subpaths, including `/zod3` and React Query `/v5`, remain.
Report bugs and prerelease feedback at https://github.com/2wce/ts-restless/issues.

This major includes the Standard Schema default API and the separately documented
legacy Zod bridge. The initial stable baseline uses Query5 only and public React18
peers; React19 remains pending. Fastify support remains on major4. OpenAPI keeps
its existing Zod3 default converter and explicit transformer hooks. Follow the
[fork migration checklist](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx)
before moving from upstream v3; it links every changed support line, import and
behavior to its replacement. Select a containing prerelease from release notes
rather than assuming the moving alpha tag contains the development baseline.
