# Query v5 baseline implementation plan

> **For agentic workers:** Use executing-plans to implement and review these checkpoints. Record measured evidence below.

**Goal:** Support only TanStack Query v5 in React, Vue and Solid for the first stable fork v4 release.
**Architecture:** Retain native query lifecycle/reactivity and current binding ergonomics; compose native options with contract-aware request functions. Root React and `/v5` emit the same private v5 implementation. A11 supplies shared React/Vue execution policy without coupling core to frameworks.
**Tech stack:** Node 26.12.0, pnpm 12.14.0, TypeScript 7.0.2, Vite+ 1.3.0; TanStack Query/Core 5.107.1, React18.3.1, Vue3.5.44, Solid1.9.17.
**Spec:** ../specs/2026-11-09-query-v5-baseline-design.md

## Constraints

- User authorization: 2026-11-09, replace `/legacy` with v5-only support.
- F01/A11 remain separate review slices. No cache abstraction, native imports in core, new package, casts to hide inference or skipLibCheck.
- Default plain client behavior and signal/error identity stay unchanged. Preserve published historical records.
- Native peer ^5.0.0; React peer ^18.0.0. Other framework and validator decisions remain unchanged.
- No release activation, package versioning, merge or publication.

## Checkpoints

- [x] Reproduce old Vue/Solid sources against Query5; remove `react-query/src/v4`, change root/pack entry to v5, update manifests/catalog/lockfile and package-baseline snapshot. `rg '4\.'` on current TanStack dependencies must find none.
- [x] In Vue `use-query.ts`, derive caller options without queryFn/queryKey, resolve keys/options in computed native options. In `use-infinite-query.ts`, derive native infinite options via `Parameters<typeof useInfiniteQuery<D,E,S,QueryKey,Page>>[0]`, default S to InfiniteData<D,Page>, require initialPageParam and getNextPageParam and forward full native context. Mutation returns native v5 pending state and must serialize request body once without a synthetic query signal.
- [x] In Solid `solid-query.ts`, compose native createQuery/createInfiniteQuery/createMutation accessor options. Derive object options using ReturnType of native accessor Parameters. Resolve request and option accessors within native tracking. Default infinite result to InfiniteData and infer numeric page types; transport retains request signal precedence and envelope rejection.
- [x] Extend the nearby Vue suite and cover Solid through installed-package native journeys (no existing Solid suite): reactive key changes fetch updated input, selected-data result, native mutation body, two-page fetch and later-page error, request/native signal precedence and cancellation. Run source tests and strict production compilation; use installed native runtime journeys for Solid rather than duplicate source harnesses. Before production edits, v5 runtime/strict checks must expose v4 incompatibility.
- [x] Extend existing installed-tarball suite with root and `/v5` React equivalence, absent v4 helpers, strict Vue/Solid ESM/CJS selected/page/request assertions and native runtime paths. Compile with --strict and no skipLibCheck; tests must reject missing request/page options. Exercise exact older and current native Query5 sets.
- [x] Update example Vue infinite query with `initialPageParam`; use React root import in examples. Build all examples and document any external host/build limitations.
- [x] Replace v4 doc pages with migration notices linking current v5 guidance, add Vue5/Solid5 documentation and query-v5 migration guide, update navigation, support policy/inventory and roadmap. Add major Changeset for all three public adapters. Support commitments reduce 13 to 12; captured demand is historical, not changed.
- [x] Review diff, run pnpm check, pnpm test:packages, docs tests/build and examples build. Record actual versions/results; open draft PR after checks and attach it. No publication proof claimed.

## Execution evidence

Append actual commands, outcomes and limitations before delivery.

Verification adjustment: standalone native Solid key changes pass in a browser-conditioned Node control. Vite+5's source evaluator mixed server/client or evaluator-local runtime instances even with explicit aliases and native-only controls. The duplicate new source harness was removed; real installed ESM/CJS consumers exercise Solid query/mutation, reactive keys/requests, pagination, HTTP error identity and active cancellation in one native browser runtime. Production Solid is still compiled by `pnpm typecheck`. This consolidates verification without weakening the required journeys or public declarations.

## Delivered implementation and gate record

- Integration baseline: `30610fc4`; F01 `cfe0441d`, A11 extraction `6481b7a9` (original `767ddddc`), A11 wording reconciliation `c6b44d39` (original `71145e59`). These prerequisite slices have draft PRs #20 and #21.
- React root and `/v5` are thin entries sharing the emitted v5 implementation; v4 source/tests are removed and native peers are v5-only. Both public/private React peers are React18. Literal Query5.0.0 floors and React19 remain unverified.
- Vue preserves key/mapper ergonomics, native refs/computed and full typed infinite context. Use native's `vue-demi` bridge as a direct runtime dependency; bundling a separate Vue runtime initially broke reactive keys and was corrected before delivery.
- Solid composes native accessor options and uses core execution in all three sites. Older native query overload order differed; make the existing native initialData field optional without replacing its guard types. No casts or skipLibCheck were added.
- The request normalizer already defaults missing input sections at runtime; its internal argument now uses Partial so correctly typed requests need no fabricated params/body/query/headers. Public negative request assertions remain strict.
- `pnpm test:packages`:31 tests passed in four files. React native pins:5.51.11/Core5.51.9, 5.80.6,5.107.1. Vue/Solid pins:5.51.1 and5.107.1 (5.51.11 is not a published Vue version). All newly added consumers compile strict ESM/CJS with TypeScript7.0.2 and no skipLibCheck.
- Installed journeys verify root/alias identity and absent v4 helpers; selected/page/mutation inference and negative assertions; reactive keys/request accessors; two pages and same-object later HTTP error; mutation serialization/error identity; active native cancellation reaches the fetcher.
- `pnpm --filter @ts-restless/docs test`:build/typecheck and33 static-site tests passed. `pnpm build:examples`:13 tasks passed, including React/Next, Vue and Solid builds. The Vue pagination example now serializes correctly inferred numeric page offsets as the contract's string query inputs.
- Historical demand JSON remains byte unchanged; twelve native-major commitments remain. No release version, npm tag, publication control or stable activation was changed.

The draft integration PR includes F01/A11 prerequisites. After those are merged, rebase this branch onto main to leave the support migration as its review diff. CI and independent reviewer approval remain separate from these local checks.

Final local gates: `pnpm check` passed with728 source tests and two existing todos, zero lint/type errors (existing warnings retained), all production/inference tasks passed. The final emitted-declaration `pnpm test:packages` rerun again passed31 tests. Docs build/typecheck and33 static-page tests pass; all13 example build tasks pass. F01 #20 and A11 #21 have Build & Test, all ten compatibility fixtures and the aggregate fixture gate green on their current implementation heads. The integration draft still requires its own CI and human review.

2026-11-09 delivery refresh: draft PR #22 was opened and attached at `f764798f`; Build & Test, all ten compatibility fixtures and the aggregate gate passed on that head. F01 #20 is now merged on main `192636d2`. Human review and migration merge remain separate. The subsequent [migration documentation audit](../results/2026-11-09-migration-documentation.md) expands the user upgrade paths and adds rendered link/anchor checks; its docs gate passes46 tests. The initial v5 migration is not yet a released artifact.
