# Delivery documentation refresh implementation plan

> **For agentic workers:** Use `executing-plans` to apply this documentation-only refresh inline. Steps use checkboxes for execution tracking.

**Goal:** Make current documentation remain accurate across numbered alpha publications by removing stale branch and moving-tag snapshots.

**Architecture:** The roadmap records delivered capabilities with merged PR links and separates future work. Public guides describe the source baseline and use release notes, registry reads and exact version pinning to select installed artifacts. Dated evidence retains the verification snapshot.

**Tech Stack:** Markdown, MDX, repository documentation lint and the docs build/typecheck suite.

**Spec:** The user requested updated documentation and roadmap without references to already-merged work as unmerged or a pending numbered alpha release. Follow the documentation ownership rules in [AGENTS.md](../../AGENTS.md) and [the documentation map](../README.md).

## Global constraints

- Preserve native support promises, migration guidance and historical fallback versions.
- Keep accepted decisions in ADRs, current delivery in the roadmap and dated measurements in evidence.
- Describe publication verification as a repeatable release step; a merge is not registry evidence.
- Do not change runtime behavior, release guards, package versions or live npm tags.

## Task 1: Refresh current documentation

**Files:** `docs/roadmap.md`, `docs/prerelease-checklist.md`, `docs/support-inventory.md`, `docs/support-policy.md`, `docs/architecture.md`, `README.md`, `SECURITY.md`, applicable public guides and the Fastify package README. Add the dated evidence record and link this plan from `docs/plans/README.md`.

- [x] Verify merged PRs and the source baseline against fetched `origin/main`; record evidence in `docs/evidence/2026-11-16-delivery-refresh.md`.
- [x] Replace roadmap branch/local checkpoints with merged PR links, retain its existing section anchors and separate the remaining stable/architecture work.
- [x] Replace moving registry snapshots and obsolete publication caveats in current guides with release selection, exact pinning and live registry verification. Retain immutable migration history and explicit support limits.
- [x] Update trusted-publisher requirements, actual configured permissions and the npm runtime requirement in the release checklist; retain the repeatable verification process.
- [x] Run `pnpm docs:lint`, `pnpm --filter @ts-restless/docs test`, applicable Markdown formatting and `git diff --check`.
- [x] Review the diff against the requested scope and scan current docs for stale branch/pending-release claims before delivery.

## Verification record

- Verified the merged source baseline `f0526e37` and documented publisher/registry evidence separately from current guides.
- `pnpm docs:lint` passed with 559 repository links/anchors across 131 documents.
- `pnpm --filter @ts-restless/docs test` passed under Node 26.12.0 and pnpm 12.14.0: production build/prerender, native typecheck, 80 public-site/checker tests and 12 docs tests.
- Updated the existing generated-Markdown test that required a stale alpha.5 publication snapshot; it now checks exported release selection, exact pinning, historical fallback and placeholder guidance. Its first run reproduced the stale assertion, and the revised static suite passed before the complete docs suite passed.
- The sandbox initially blocked the prerender preview port with `EPERM`; the complete suite passed with approved execution outside that restriction.
- Applicable repository Markdown formatting and `git diff --check` passed. The docs app is outside the root formatter scope; its existing test style was retained.
- A read-only review found no actionable issues in the maintainer delivery documentation; public guide and test diffs were also reviewed for migration/compatibility preservation.
- Current roadmap/guides contain no pending numbered-release or already-merged branch status claims. Historical plans/evidence retain their recorded baselines.
