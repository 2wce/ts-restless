# Fork migration documentation audit

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use executing-plans to follow these checkpoints and record actual validation.

**Goal:** Give users a replacement and verification path for every removed support line, export and changed behavior between upstream v3 and the proposed stable ts-restless v4 baseline.

**Architecture:** Keep `/ts-restless-migration` as the migration hub. Put framework-specific examples in `/query-v5-migration` and schema/error examples in `/standard-schema-migration`; link the existing Next integration guides and official framework upgrade guides.

**Tech stack:** Fumadocs MDX, Twoslash, the existing static-site Node test suite.

## Constraints

- Compare source and public manifests from upstream snapshot `dd7239bc` to this branch, including the pending v5 migration. Distinguish development source from released artifacts.
- Do not change implementation, support peers, dependencies, versions or publication controls.
- Separate removed APIs from retained deprecated APIs and unsupported future additions. There is no Query4 `/legacy` adapter.
- Document exact replacements, input/output and error implications, upgrade order, and application verification. Check internal links against real routes and anchors.

## Checkpoints

- [x] Audit public entry points, removed source exports, peer-range changes, Changesets and existing guides. Record each change and its replacement in the hub.
- [x] Expand the Query guide with React setup, positional-to-object hooks, mutation/cache/SSR/pagination migration, removed options/types, and distinct Vue/Solid examples. Expand the schema guide with exact moved imports, removed legacy detection/types, portable error handling and payload schemas.
- [x] Reconcile stale release/support wording, OpenAPI converter claims, and migration links. Keep archived v4 routes as migration notices.
- [x] Extend `apps/docs/tests/static-site.test.mjs` to check rendered migration-guide links and anchors. Run `PATH=/Users/kudakwashe.mupeni/.nvm/versions/node/v26.12.0/bin:$PATH pnpm --filter @ts-restless/docs test` to build, typecheck/Twoslash and test the generated site. Run `git diff --check`.
- [x] Record coverage/evidence in `docs/evidence/2026-11-09-migration-documentation.md`, commit documentation and test changes on the existing migration branch, and push the draft PR update. Merge/publication remain separate.

Verification: final docs build, TypeScript/Twoslash and all46 static-site tests passed. Public npm manifests confirm the documented alpha.2 Query4 and alpha.1 Next12-14 fallback ranges. Documentation is delivered as a follow-up on draft PR #22; migration merge and publication remain separate.

Current main was merged without changing the documentation or implementation tree; the fixture resolution preserves the v5 root and retained A11/Vue/Solid checks. A final installed-package rerun passed31 tests.
