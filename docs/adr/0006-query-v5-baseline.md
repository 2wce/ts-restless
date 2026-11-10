# Support Query5 with retained React, Vue and Solid bindings

**Status:** Accepted. **Decision:** 2026-11-09. Supersedes the earlier, unshipped Query4 `/legacy` proposal.

The first stable ts-restless v4 baseline supports native TanStack Query5 only. React root exports the v5 implementation and retains `/v5` as an alias. Remove native4 support entirely; migrate Vue and Solid to native5 while preserving their convenience APIs, native reactivity and lifecycle. React19 verification remains separate from this decision.

The reviewed demand evidence strongly favored native5. Keeping a Query4 legacy implementation would retain the version-specific maintenance obligation. Dropping Vue/Solid entirely would remove useful framework integration before native replacements proved equivalent. Their migration retains framework support while reducing native-major commitments from13 to12.

Explicit infinite-query initial/next-page options, mutation state and changed React APIs need migration guidance and strict installed-consumer/runtime evidence. Alpha.2 and upstream v3 retain their historical behavior; acceptance and merge do not establish the first containing release.

Sources: [approved baseline](../plans/2026-11-09-query-v5-baseline-design.md), [implementation/evidence](../plans/2026-11-09-query-v5-baseline.md), [demand snapshot](../evidence/2026-11-06-support-demand.md), [migration guide](../../apps/docs/content/docs/query-v5-migration.mdx). [Roadmap](../roadmap.md) records delivery and release availability.
