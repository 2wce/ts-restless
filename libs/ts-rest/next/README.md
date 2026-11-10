# @ts-restless/next

Part of **ts-restless**, a maintained fork of [ts-rest](https://github.com/ts-rest/ts-rest) for contract-first, end-to-end typed REST in TypeScript.

The first stable release is planned as `4.0.0`, with interim `4.0.0-alpha.*` prereleases. Numbered alpha prereleases are available; development source may include changes absent from the published version. Check the migration guide and release notes for a containing release. npm's `0.0.0-stage` registration placeholders contain no library code and must not be installed.

Read the [package migration and prerelease guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/ts-restless-migration.mdx) and [Standard Schema migration](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/standard-schema-migration.mdx). Preserve existing public API names while replacing dependencies and imports with `@ts-restless/*`.

Report bugs and prerelease feedback in [the fork's issue tracker](https://github.com/2wce/ts-restless/issues). Upstream contributor credits and MIT licence notices are preserved.

## Workspace development

From the repository root, run `pnpm --filter @ts-restless/next build` to build this library and `pnpm test` for the source test suite. Use the repository's pinned Node and pnpm versions.

## Next.js support

The first stable ts-restless v4 supports Next.js **15 and 16**; Next 12–14 are excluded because they are unsupported by the [official Next.js support policy](https://nextjs.org/support-policy), checked on 2026-11-06. Use a current patched supported release and [upgrade older Next applications](https://nextjs.org/docs/app/guides/upgrading) before adopting v4. The maintained example uses Next 16. Pages Router API, App Router and Pages Router Edge entry points remain available through their respective integrations. See the [support policy and verification limits](https://github.com/2wce/ts-restless/blob/main/docs/support-policy.md).
