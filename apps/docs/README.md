# Documentation

The docs use TanStack Start, Fumadocs MDX and Vite+. All documentation pages
are prerendered into static HTML, with a browser search index. Deployment does
not require a Node server.

Maintainer architecture, plans and decisions live in the root [documentation map](../../docs/README.md).
Public consumer guides remain in this app's `content/docs` collection.

Use the repository's Node version and pnpm 12.14.0. Install from the repository
root; docs belongs to the pnpm workspace and shares the root lockfile.

```sh
nvm use
pnpm install --frozen-lockfile
pnpm docs:dev
```

Open http://localhost:3000. Build and preview production from the root:

```sh
pnpm docs:build
pnpm docs:lint
pnpm --filter @ts-restless/docs test
pnpm docs:start
```

`docs:start` previews the built site. Development and preview tasks are never
cached. Package scripts also support `pnpm --filter @ts-restless/docs dev`, `build`,
`start` and `typecheck`. The build includes uncached native TypeScript checking. The root esbuild catalog
peer keeps docs and the root Vite+ CLI on the same Vite runtime.

## Content and code examples

- `content/docs`: Markdown/MDX and navigation metadata. URLs remain rooted at `/`.
- `src/lib/source.ts`: Fumadocs macro collection and navigation source.
- `src/routes/$.tsx`: Page loading, metadata and documentation layout.
- `src/routes/api/search[.]json.ts`: Search index generated during prerendering.
- `src/routes/llms[.]txt.ts` and `src/routes/markdown/$.ts`: Generated agent index
  and readable Markdown for each guide.
- `src/lib/markdown.tsx`: Text forms of presentation wrappers; retains every tab
  alternative and warning. InstallTabs shares its package/tag logic with the HTML guide.
- `source.config.ts`: Frontmatter validation, syntax highlighting and Twoslash.
- `vite.config.ts`: Vite+ tasks, plugins and static prerendering.

Fumadocs Twoslash 4 uses the workspace's native TypeScript 7 compiler integration.
Checked snippets retain diagnostics, hover types and completion popups. Examples
compile against the local workspace SDKs for the fork's unreleased major version.
They resolve `zod` to the modern Zod 3 `zod3` alias, while Fumadocs itself uses Zod 4.
The migration guide explains the validator-independent defaults and explicit
`/zod3` compatibility imports. The hidden nested-router setup in `client/fetch.mdx` preserves literal
paths with `as const` to avoid the SDK's inference regression on newer compilers.
Do not disable diagnostics to accommodate SDK or compiler upgrades.

All Vue/Solid/Nest TypeScript blocks must retain `twoslash`. Blanket `@noErrors`
is rejected; intentionally invalid examples use specific `@errors` diagnostics
with an explanation (the Fetch completion popup deliberately leaves a property
unfinished). Other guides include fragments/before examples that are not all
compiled. Add hidden setup before `// ---cut---` to make runnable snippets checkable,
without inventing permissive mocks for the SDK or hiding type errors.

`pnpm docs:lint` checks current metadata, ADR structure and repository links/anchors.
The full test command also checks all rendered public guide/navigation links,
agent exports and the checker fixtures. CI exposes this as **Documentation validation**,
and Build & Test depends on it. Checks use local source; release availability and
prose correctness still need evidence review. Historical plans/evidence retain their
recorded versions and statuses.

## Consumer agent exports

The build writes `/llms.txt` and `/markdown/<page>.md` beside the HTML output.
The introduction exports as `/markdown/index.md`. Fumadocs processes the canonical
MDX source, preserving code and generating text forms for tabs, callouts, file
trees and installation commands. No Markdown copy is committed or maintained separately.

The index covers all guides, including old-URL migration notices. These are
development-source docs, not versioned descriptions of every npm release. Keep
availability and fallback guidance in the public migration pages. The docs task
checks exported files, representative content, rendered migration journeys and
repository-relative file links. Unknown Markdown routes return 404 during development;
a static deployment needs its usual 404 fallback for missing files.

## Static deployment and analytics

Upload `apps/docs/dist/client` to a static host that serves directory `index.html`
files, for example `/client/fetch/index.html` at `/client/fetch`. Search reads the
prerendered `/api/search.json`; client navigation does not call a backend. Unknown
client routes show the app's 404 view. Configure your host to serve the generated
`404.html` with status 404 for unknown direct URLs. Vite preview's SPA fallback
is for local testing; restart preview after rebuilding. Serve the generated `.md`
files and `llms.txt` as plain text, without an HTML rewrite or application shell.
Their links to HTML guides remain rooted at `/`.

Analytics settings are public Vite variables, embedded during the build:

- `VITE_POSTHOG_KEY`: enables browser analytics. Without a key, analytics stays off.
- `VITE_POSTHOG_HOST`: ingestion URL, default `https://eu.i.posthog.com`.

Replace the previous `NEXT_PUBLIC_POSTHOG_*` environment variables. The Next
`/ingest` proxy is gone; supply a full proxy URL as the host if your deployment
uses one. Cookie consent still controls persistent storage.

References: [TanStack prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering),
[Fumadocs Vite integration](https://www.fumadocs.dev/docs/mdx/vite), and
[Fumadocs static deployment](https://www.fumadocs.dev/docs/deploying/static).
