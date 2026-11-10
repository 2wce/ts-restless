# Documentation and agent guidance implementation plan

> Execute the checkpoints in order using executing-plans. Record actual validation before delivery.

**Goal:** Consolidate maintainer documentation under `docs/`, preserve decision history in short ADRs, and serve readable documentation to contributor and consumer agents.
**Architecture:** Root `AGENTS.md` points to `docs/README.md`, `architecture.md`, `roadmap.md`, `adr/`, `plans/` and `evidence/`. Public guides stay in `apps/docs/content/docs`; Fumadocs generates Markdown from those same guides.
**Tech stack:** Existing Node26.12.0/pnpm12.14.0, TanStack Start, Fumadocs MDX15.4.8/Core16.17.7 and node:test. No new dependencies.
**Design:** The user approved the compact structure on 2026-11-09, with AI guidance for both contributors and package consumers.
**Baseline:** main `bcf8bb24`; isolated branch `feat/documentation-adr`.
**Status:** Implemented locally; this plan's checkpoints track this change. Subsequent delivery status belongs in [the roadmap](../roadmap.md).

## Constraints

- Keep support policy, inventory and release checklist at `docs/`; do not add separate designs/archive directories.
- Preserve every existing plan/design and measured evidence, including JSON. Update relative links and distinguish historical checkpoints from current guidance.
- ADR acceptance records an actual approved decision, not implementation/publication. Link original evidence; future composition/versioning remain proposals.
- Published alpha.2 lacks the merged Query5 migration. Release PR #23 is pending at baseline; never infer npm availability from main.
- No package dependency, peer, library runtime, release guard or version changes. No merge or publication.

## Checkpoints

### 1. Consolidate documents and capture decisions

- [x] Move root plan files and `docs/superpowers/{plans,specs}` into `docs/plans`; move results into `docs/evidence`. Preserve the old plan index in dated evidence and create a compact plan index.
- [x] Rewrite repository Markdown links against an old-to-new path map. Remove the emptied legacy directories. Scan for obsolete paths and check every relative file link outside code fences.
- [x] Create `docs/README.md`, `architecture.md`, `roadmap.md`, root `AGENTS.md` and short ADRs for Standard Schema, shared response ownership, query execution/native ownership, support retirement, initial Next and Query5 baselines, and public-only coordinated releases. Each ADR links its source and distinguishes deferred alternatives.
- [x] Reconcile current A/F delivery status with merged PRs #7/#10/#13/#14/#17/#20/#21/#22. Keep detailed historical acceptance criteria in plans. Correct stale release wording in root/package READMEs, InstallTabs and the public migration guide.

### 2. Export readable consumer documentation

- [x] Extend `apps/docs/tests/static-site.test.mjs`: expect `/llms.txt` and `/markdown/<slug>.md` for every source page, working index links, native installation code, tab alternatives, warnings, generic TypeScript code and migration availability. Run against baseline output; expect missing export failures.
- [x] Enable `postprocess.includeProcessedMarkdown` with function output on the macro collection in `apps/docs/src/lib/source.ts`. Reuse the InstallTabs component with Fumadocs `asMarkdown()` so UI and Markdown share package/tag logic; render other presentation wrappers as readable text through Markdown component mappings.
- [x] Add TanStack server routes for `/llms.txt` and `/markdown/$`. Generate the index from the existing source; return Markdown with title/description and reject unknown pages. Add explicit static output paths to `apps/docs/vite.config.ts`; no backend is required after deployment.
- [x] Run docs build/typecheck and static-site tests, inspecting generated quickstart, contract, migration and native query exports. Fix any lost code or instructions rather than weakening assertions.

### 3. Verify and deliver

- [x] Document editing rules and export routes in the existing contributor/docs app guidance. Add a lightweight repository Markdown file-link checker to the existing docs test task; extend tests only for meaningful export behavior.
- [x] Run `pnpm check`, `pnpm --filter @ts-restless/docs test`, the Markdown link checker and `git diff --check`. Confirm library sources, manifests, lockfile and Changesets are unchanged.
- [ ] Review the final diff for preserved history, source/release separation and duplicated current statuses. Record counts and commands below, commit, push and open/attach a draft PR.

## Execution evidence

Baseline: 46 existing static-site tests passed against the previous build. GitHub confirms #22 merged into main as `bcf8bb24`; #23 is an open prerelease version PR. Registry/release history records alpha.2; stable release is not established by this change.

2026-11-09 implementation verification: preserved all43 original root/tool-specific documents plus the detailed adoption backlog. The demand JSON has the identical Git object hash before/after relocation. Seven short accepted ADRs extract existing decisions; deferred composition and independent-versioning proposals remain on the roadmap. The original plan index is retained as dated evidence.

Consumer exports use the existing Fumadocs function output and native server Markdown renderer. Vite macro collection settings override the unused named collection for these source pages; enabling processing on the actual macro fixes the missing export. InstallTabs opts into Markdown rendering with shared package/tag logic; presentation mappings opt in and retain their children. No new dependency or custom MDX parser is introduced.

Red proof: three added export tests failed on missing files against the baseline build. After implementation all49 tests passed. An additional availability regression failed on the inherited introduction wording; introduction/FAQ/quickstart and install notices were corrected, then all50 tests passed. The build/prerender/typecheck task completed successfully with27 Markdown guides and `llms.txt`.

`pnpm check` passed728 source tests with two existing todos, all production/inference tasks, zero lint/type errors and353 existing warnings. Its initial sandbox run could not bind native HTTP ports (`listen EPERM`); the complete rerun with local-port access passed. The docs task checks repository-relative Markdown file targets as well as rendered migration anchors and exported content. Library runtime sources, package manifests, lockfile, peers and Changesets are unchanged; their previously validated migration behavior is outside this documentation change.

Final review: repository-relative file links pass; the relocation anchor scan found the response plan's old index anchor, now linked to the preserved historical index. All43 historical Markdown records retain their original section headings, and the demand JSON remains byte-identical. Initial reviewer messages arrived unreadably encoded; the final plain-text documentation review confirmed no blocking documentation findings, preserved history, deferred proposals and source/publication separation. Direct export/diff review and executable checks remain the runtime verification evidence.

The final consumer-link review reproduced six inherited `/docs/...` targets that no longer exist at the root-based site. Corrected the canonical Fetch, Nest and contract guides to their actual pages/anchors and added an all-page Markdown link/anchor regression; it failed on the old Fetch destination before the correction.

Delivery refresh: the final docs build/prerender/typecheck passes51 tests, including every exported guide's local page/anchor links. The repository link check passes359 relative file links across102 documents. Main remains `bcf8bb24`; prerelease PR #23 remains open. Format and whitespace checks pass. The independent documentation review confirms no blocking findings and unchanged demand JSON; registry/PR availability was refreshed by the implementation agent.
