# TanStack Query v5-only baseline

Status: implementation authorized by the user on 2026-11-09, superseding the earlier `/legacy` proposal.

The first stable ts-restless v4 release supports TanStack Query v5 across React, Vue and Solid. Remove the React v4 wrapper and old native peers entirely; retain React `/v5` as an alias of the default v5 implementation. This changes the initial unreleased stable baseline; existing upstream v3 packages and published prerelease artifacts remain available.

Vue keeps its query-key/request-mapper convenience API and reactive keys/options. Solid keeps its key accessor and adds request/options accessors so native reactivity remains intact. Both require v5 infinite-query options (`initialPageParam`, `getNextPageParam`) and infer page parameters and selected results. Cache, providers, lifecycle and notifications belong to TanStack and each framework. Core contains no native dependencies. A11 remains the separately reviewed React/Vue execution extraction; F01 supplies React's declaration compatibility fix.

Use one exact development set: native Query/Core 5.107.1, React/DOM 18.3.1, Vue 3.5.44 and Solid 1.9.17. Public native peers are ^5.0.0; React peer is ^18.0.0. React19 support remains a separate F03a gate. Verify older Query5 installations with strict packed consumers; do not widen framework support based on transitive dependencies.

Success requires real package ESM/CJS imports, strict selected/page/request inference, native query/mutation and pagination behavior, reactive key changes, error identity and active-fetch cancellation. Remove current v4 docs navigation, migrate examples, update support inventory and add a major Changeset. Historical demand snapshots remain unchanged. Do not merge, version, publish or enable stable automation.
