# @ts-restless/react-query

Part of **ts-restless**, a maintained fork of [ts-rest](https://github.com/ts-rest/ts-rest) for contract-first, end-to-end typed REST in TypeScript.

The first stable release is planned as `4.0.0`, with interim `4.0.0-alpha.*` prereleases. Numbered alpha prereleases are available; development source may include changes absent from the published version. Check the migration guide and release notes for a containing release. npm's `0.0.0-stage` registration placeholders contain no library code and must not be installed.

Read the [package migration and prerelease guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx) and [Standard Schema migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/standard-schema-migration.mdx). Preserve existing public API names while replacing dependencies and imports with `@ts-restless/*`.

Report bugs and prerelease feedback in [the fork's issue tracker](https://github.com/2wce/ts-restless/issues). Upstream contributor credits and MIT licence notices are preserved.

## Workspace development

From the repository root, run `pnpm --filter @ts-restless/react-query build` to build this library and `pnpm test` for the source test suite. Use the repository's pinned Node and pnpm versions.
