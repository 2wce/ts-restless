# Typed infinite-query cache helpers

Issue [#37](https://github.com/2wce/ts-restless/issues/37), based on main `3d4f1801`. Native infinite queries cache `InfiniteData` while ordinary route cache helpers describe one response. Under [ADR 0003](../adr/0003-query-ownership.md), native TanStack owns cache keys and values.

1. Extend the existing source and inference suite with missing-cache, two-page reads, page parameters, filtered updates, updater bailouts and query state; observe failure before production changes.
2. Add explicit `getInfiniteQueryData`, `getInfiniteQueriesData`, `setInfiniteQueryData`, `setInfiniteQueriesData` and `getInfiniteQueryState` with native delegation. Default pages to route response envelopes and page parameters to `unknown`, with an explicit page-parameter generic. Preserve ordinary helpers and fetch/prefetch signatures.
3. Extend existing strict packed React18/19 Query5 consumers at root and `/v5`, ESM/CommonJS, including invalid page and parameter assertions.
4. Document explicit helpers and separate ordinary/infinite keys; add a public React adapter minor Changeset.
5. Run source tests, inference checks, package consumers, formatting and docs validation; record observed results before review.

Implemented locally for review on 2026-11-11 using Node 26.12.0 and pnpm 12.14.0.

- Regression red: the existing suite failed because `getInfiniteQueryData` did not exist; the published-consumer issue records the original single-response declaration mismatch.
- `pnpm check`: exit 0; 785 unit tests passed, two existing todo cases, formatting and native inference checks passed. Existing lint warnings remain non-blocking.
- `pnpm test:packages`: exit 0; all 35 package tests passed. Both public entries retain strict ESM/CommonJS declarations and native execution across five admitted Query5/React18/19 checkpoints, including negative page and parameter assertions.
- `pnpm docs:lint`: exit 0; 448 links/anchors checked across 115 documents.

The five helpers delegate to native cache operations. Ordinary helpers and infinite fetch/prefetch signatures are unchanged. This record establishes local verification, not merging or npm availability. The additive minor Changeset belongs to the public React adapter.
