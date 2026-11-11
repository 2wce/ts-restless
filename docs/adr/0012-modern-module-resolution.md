# Require modern TypeScript module resolution while retaining CommonJS

**Status:** Accepted. **Decision:** 2026-11-11.

The initial stable ts-restless v4 baseline supports package-export-aware TypeScript resolution: Node16/NodeNext for direct Node applications and Bundler for bundled applications. Withdraw support for `node`/`node10` and TypeScript's separate `classic` resolver; remove `typesVersions` fallbacks and classic-resolution consumer probes. Retain conditional ESM/CommonJS code and declarations, public roots/subpaths, old-Zod compatibility and native framework support.

TypeScript6 deprecates node10 and7 removes it; the old resolver also ignores conditional package exports. Supporting it adds declaration mappings and verification that consumers adopting current TypeScript must eventually replace. Modern resolution can be used by older compilers and CommonJS applications: resolver, compiler version and runtime are distinct choices. Existing pinned older/current compiler checks remain; this decision does not impose contributor TypeScript7 or Node26 on consumers, establish a new global compiler/runtime floor, or remove CommonJS builds.

Keeping classic mappings indefinitely was rejected because it retains the obsolete compatibility surface. ESM-only packaging was considered separately: it can affect server/tooling consumers and requires its own runtime/host evidence, so it is not part of this adoption. Some root imports may incidentally resolve under an old resolver; that is not a supported configuration or a fallback guarantee.

This sets the first stable baseline rather than withdrawing a shipped stable fork promise under [ADR0004](0004-support-retirement.md). Published packages remain unchanged. New packages need a containing release; users unable to migrate can keep a matched pre-change release while updating compiler/tooling. Future stable retirements retain the notice/replacement policy.

Sources: [implementation plan and verification](../plans/2026-11-11-modern-module-resolution.md), [consumer migration](../../apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution), [TypeScript6 guidance](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).
