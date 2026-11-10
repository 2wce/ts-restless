# Docs TanStack migration implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use executing-plans for inline implementation, and request an independent final review.

**Goal:** Replace Next docs with a static TanStack Start app and native TypeScript 7 code examples.

**Architecture:** Fumadocs MDX's supported Vite plugin compiles the existing content. TanStack routes preserve the root-based URLs and prerender all content. Search exports a static index; analytics use browser PostHog with a configurable host.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, Vite+ 1.3.0, TypeScript 7.0.2, TanStack Start 1.169.3, Fumadocs Core/UI 16.17.7, MDX 15.4.8, Twoslash 4.0.2.

**Spec:** ../specs/2026-10-19-docs-tanstack-design.md; user approved in chat.

## Constraints

- Work on the existing chore/dx-improvements branch; preserve its pending command-consistency edits.
- Keep the root pnpm lockfile and catalog toolchain; no separate docs compiler or lockfile.
- Preserve all content and URLs, checked examples, theme/navigation/metadata, consent and analytics.
- Published SDK dependencies, API peer ranges and compatibility fixtures are out of scope.
- Keep Zod 3 available for existing SDK examples while satisfying Fumadocs' Zod 4 tooling needs.
- Use framework prerendering and static search rather than custom build/hosting scripts.

## Tasks

### 1. Establish output regression coverage

Files: apps/docs/tests/static-site.test.mjs.

- [x] Add Node test-runner assertions that existing MDX/Markdown URLs have HTML under dist/client, include their page titles and content, contain Twoslash popups, and expose a valid search index.
- [x] Run `node --test apps/docs/tests/static-site.test.mjs`; expected failure because the current Next app does not produce the Vite static output.

### 2. Migrate the docs app

Files: apps/docs/package.json, vite.config.ts, tsconfig.json, source.config.ts, src/router.tsx, src/routes, src/components, src/lib, src/styles, .gitignore; remove Next configuration/app files.

- [x] Update docs-only dependencies to the approved modern stack, keeping TypeScript and Vite+ on catalog versions. Remove Next, classic Twoslash, unused framework integrations, PostCSS and unused server analytics client. Regenerate the root lockfile.
- [x] Adapt official Fumadocs Vite/TanStack integration to root-based URLs and existing content; reuse current navigation, homepage and MDX components.
- [x] Use native Twoslash transformer with diagnostic checking enabled. Resolve existing examples against Zod 3 without rewriting their displayed source.
- [x] Configure prerendering for every content path, static search, an accessible 404, dev port 3000 and production preview. Replace Next analytics hooks, font loading and rewrites with browser-compatible behavior.
- [x] Run `pnpm docs:build`, `pnpm --filter @ts-rest/docs typecheck` and `pnpm --filter @ts-rest/docs test`; fix underlying failures rather than suppressing them.

### 3. Integrate and verify

Files: CONTRIBUTING.md, apps/docs/README.md, .github/workflows/build-test.yml and existing command-consistency plan.

- [x] Document root installation, native compiler, static deployment, preview semantics and public analytics variables. Add CI docs build/output checks.
- [x] Run a frozen root install, docs output tests, a negative Twoslash diagnostic probe, dev/preview route/search smoke checks, and browser navigation/search/consent checks.
- [x] Run `pnpm build-test-all` and `git diff --check`; compare source content hashes against the migration baseline.
- [x] Request independent review of the final diff, fix significant findings, update plan outcomes and commit authorized changes.

## Verified outcome

- Frozen root install succeeds. No standalone docs lockfile or Next docs dependency remains.
- Docs production build, uncached native typecheck and all 24 output tests pass: 22 documentation URLs, static search and 404.html.
- Native Twoslash rejects an intentional TS2322 diagnostic using the actual source configuration. No new diagnostic suppression was added.
- A warmed ordinary docs build rejects a temporary source TS2322; the probe was removed and the normal docs test workflow passed afterward.
- Browser checks pass on a plain static file server: direct content loading, hydrated tabs, search results and result navigation, page title, type popup expansion, and decline consent. Unknown routes show the accessible 404 view.
- Normal pnpm docs:dev renders correctly. Root esbuild catalog 0.28.2 unifies the root/docs Vite peer context, fixing a duplicate-runtime class identity failure in development SSR. No custom development middleware or bundler workaround remains.
- Root build-test-all passes: 565 tests, native inference/declaration checks, SDK package checks and example builds. Existing lint debt remains 388 warnings and zero errors.
- Of 24 baseline content/navigation files, only client/fetch.mdx changed: three literal annotations in its hidden nested-router setup. Displayed examples and runtime behavior are preserved.
- Independent final review found no outstanding material issues. Contributor docs, app README and CI cover the final stack and deployment settings.

Known upstream build warnings: Fumadocs macro exposes an unused raw-text method
that dynamically imports node:fs/promises; the browser bundler externalizes it.
The UI does not call this method, and static browser tests have no runtime
errors. Tailwind reports two warnings for Fumadocs' valid ::highlight CSS.
