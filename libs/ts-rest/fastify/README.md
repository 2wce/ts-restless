# @ts-restless/fastify

Part of **ts-restless**, a maintained fork of [ts-rest](https://github.com/ts-rest/ts-rest) for contract-first, end-to-end typed REST in TypeScript.

The first stable release is planned as `4.0.0`, with interim `4.0.0-alpha.*` prereleases. Numbered alpha prereleases are available; development source may include changes absent from the published version. Check the migration guide and release notes for a containing release. npm's `0.0.0-stage` registration placeholders contain no library code and must not be installed.

Read the [package migration and prerelease guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx) and [Standard Schema migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/standard-schema-migration.mdx). Preserve existing public API names while replacing dependencies and imports with `@ts-restless/*`.

Report bugs and prerelease feedback in [the fork's issue tracker](https://github.com/2wce/ts-restless/issues). Upstream contributor credits and MIT licence notices are preserved.

## Native Fastify support

Development source targets Fastify 5 at `@ts-restless/fastify` and retains Fastify 4 through `@ts-restless/fastify/legacy`. Registration rejects the wrong native major. Legacy support is deprecated through ts-restless v4, with removal targeted for v5 under the stable migration policy. Both entries share the existing registration API. The combined `/legacy` entry also exports the historical Zod error schema and requires Zod 3, even when the contract uses another validator. The root entry remains independent of Zod.

These entries require a containing release. Published alpha.5 supports Fastify 4 at root and does not export `/legacy`. See the [Fastify migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/server/fastify.mdx#fastify-4-to-5) before changing imports or native dependencies.

## Workspace development

From the repository root, run `pnpm --filter @ts-restless/fastify build` to build this library and `pnpm test` for the source test suite. Use the repository's pinned Node and pnpm versions.
