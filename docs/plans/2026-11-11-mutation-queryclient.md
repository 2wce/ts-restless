# Explicit mutation QueryClient

Issue [#36](https://github.com/2wce/ts-restless/issues/36), based on main `3d4f1801`. The public mutation hook accepts an optional QueryClient, but its runtime wrapper drops it. Native TanStack owns providers, defaults, mutation cache and error identity under [ADR 0003](../adr/0003-query-ownership.md).

1. Extend the existing React Query suite with provider-free execution, explicit-client precedence and native defaults/cache/error assertions; observe failure before production changes.
2. Forward the second argument to native `useMutation` without changing the public signature.
3. Extend the existing strict packed React18/19 Query5 consumers at root and `/v5`, ESM/CommonJS.
4. Document explicit-client behavior and add a patch Changeset to the public React adapter.
5. Run source tests, inference checks, package consumers, formatting and docs validation; record observed results before review.

Implemented locally for review on 2026-11-11 using Node 26.12.0 and pnpm 12.14.0.

- Regression red: provider-free execution threw `No QueryClient set`; execution inside a different provider left the explicit client's mutation cache empty.
- `pnpm check`: exit 0; 786 unit tests passed, two existing todo cases, formatting and native inference checks passed. Existing lint warnings remain non-blocking.
- `pnpm test:packages`: exit 0; all 35 package tests passed, including explicit mutation clients at both public entries in ESM/CommonJS for all five admitted Query5/React18/19 checkpoints.
- `pnpm docs:lint`: exit 0; 448 links/anchors checked across 115 documents.

This record establishes local verification, not merging or npm availability. The patch Changeset belongs to the public React adapter.
