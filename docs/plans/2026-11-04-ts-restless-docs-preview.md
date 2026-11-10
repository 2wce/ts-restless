# ts-restless documentation preview implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Publish accurate development-preview documentation for the adopted ts-restless identity and interim prerelease strategy.

**Architecture:** Update the existing README and Fumadocs/TanStack Start documentation surfaces. Add one migration/status page and preserve typechecked source-scope examples until the package rename can update them together with their dependencies.

**Tech Stack:** Markdown/MDX, React, Fumadocs, TanStack Start, Vite+, Node 26.12.0 and pnpm 12.14.0.

**Spec:** [ts-restless identity design](2026-11-04-ts-restless-identity-design.md). The user approved the name, initial stable version, npm ownership model and interim prereleases, and requested public documentation updates.

## Global Constraints

- Project name: `ts-restless`; intended public scope: `@ts-restless/*`; first stable release: `4.0.0`.
- Public prereleases can precede stable-launch fixes once identity/ownership/artifact gates pass; first numbered alpha: `4.0.0-alpha.0`; stable releases alone use `latest`.
- Current repository remains `https://github.com/2wce/ts-rest`. Preserve upstream licensing and contributor credits as attribution.
- State new-scope packages are not published yet and compiled examples currently use this fork's development checkout under `@ts-rest/*`.
- Preserve current package names/imports in executable examples and build dependencies; do not introduce aliases or change package metadata in this docs slice.
- Keep release workflow guards disabled. Do not create organizations, configure credentials, publish, push or merge.

### Task 1: README and migration guidance

**Files:** Modify `README.md`, `apps/docs/content/docs/index.mdx`, `apps/docs/content/docs/quickstart.mdx`, `apps/docs/content/docs/standard-schema-migration.mdx` and `apps/docs/content/docs/meta.json`; create `apps/docs/content/docs/ts-restless-migration.mdx`.

**Interfaces:** Produces the public `/ts-restless-migration` page and repository-local documentation links consumed by the docs shell.

- [x] Replace README branding with `# ts-restless` and the agreed description. Link repository badges/issues/quickstart to actual fork resources; remove upstream npm metrics, Discord and hosting claims presented as this fork's own. Preserve contributor attribution and label upstream star history as historical.
- [x] Add the migration page with an explicit unpublished status, the ten-package scope mapping, intended `4.0.0-alpha.0` to `4.0.0` progression, numbered-version/explicit-tag installation guidance after availability, retained API names/subpaths and a link to the Standard Schema major migration. State recorded support limits and route reports to the fork's issues.
- [x] Update intro/quickstart/Standard Schema copy to identify ts-restless v4 and explain current development-scope examples. Add `ts-restless-migration` to docs navigation before `standard-schema-migration`. Replace the intro's inherited maintainer list with the actual fork owner plus explicit upstream attribution.

### Task 2: Documentation shell and verification

**Files:** Modify `apps/docs/src/lib/layout.shared.tsx`, `apps/docs/src/lib/InstallTabs.tsx`, `apps/docs/src/routes/__root.tsx` and `apps/docs/src/components/DocsContent.tsx`. Use existing `apps/docs/tests/static-site.test.mjs` without adding tests that merely mirror copy.

**Interfaces:** Consumes `/ts-restless-migration`; produces correctly branded rendered pages, metadata and repository links.

- [x] Set navigation and root metadata to ts-restless and the agreed description. Update the global preview banner to link `/ts-restless-migration` and state new-scope packages are being prepared.
- [x] Replace the home page's upstream wordmark with a plain accessible ts-restless heading. Retain actual fork repository/licence badges and remove upstream package/Discord metrics. Replace generated upstream install commands with development-checkout context and the migration link until new-scope packages exist.
- [x] Run targeted `pnpm exec vp fmt --check` on README/spec/backlog/plan and `git diff --check`. Respect the existing root formatter exclusion of `apps/docs/**`; its MDX/TSX is verified through the actual docs build/typecheck. Correct only relevant formatting.
- [x] Run `pnpm --filter @ts-rest/docs test` to build/typecheck MDX and prerender every page, static search and 404. If the build's local listeners are sandbox-blocked, rerun with approval for this command.
- [x] Inspect generated home/migration HTML for the new title, namespace, release status, active fork links and preserved compiled-example context. Record actual test counts and command output below.
- [x] Commit only identity spec/backlog/plan and requested public docs changes on `feat/ts-restless-identity`; leave publication and package renaming for the identity implementation slice.

## Execution evidence

- `pnpm --filter @ts-rest/docs test`: initial sandboxed build compiled MDX/client/server but prerendering failed with `listen EPERM ::1`. The approved rerun passed build, `tsc --noEmit` and all 26 existing static-site tests; 26 routes were prerendered, including the new migration page, search and 404.
- The docs build emitted Fumadocs browser externalization, CSS `::highlight` and bundle-size warnings; these did not fail verification. No library/runtime compatibility claim follows from the docs-only checks.
- A one-off generated-HTML inspection verified branding, migration links, unpublished status and active fork links on home, quickstart and both migration pages; upstream npm/Discord links are absent from those rendered surfaces. Quickstart contains development-checkout install context rather than an upstream npm install command. The migration page contains the intended scope and exact alpha example.
- Local Markdown links in README/spec/plan/backlog resolve. Root formatting is limited to its configured scope; `apps/docs/**` is deliberately excluded by the existing formatter configuration.
- Package metadata/import renaming, npm organization acquisition and publishing remain future identity work. Release guards remain disabled.
