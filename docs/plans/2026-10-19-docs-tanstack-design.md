# Docs on TanStack Start and native TypeScript

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

The user approved replacing the Next docs app with TanStack Start on Vite+ and upgrading Twoslash to native TypeScript 7.

Keep content, root-based URLs, navigation, page metadata, code popups, install tabs, themes, cookie consent and analytics. Use supported Fumadocs Vite integration and static prerendering. Generate a browser search index instead of requiring a search server. A configurable public PostHog host replaces Next rewrites; document deployment environment changes. Preserve the SDK examples' Zod 3 resolution separately from Fumadocs' Zod 4 dependency.

Use the root pnpm workspace/lockfile, catalog TypeScript 7.0.2 and Vite+ 1.3.0. Keep published SDKs, consumer peer ranges and root framework baselines unchanged. Current docs-only versions: Fumadocs Core/UI 16.17.7, MDX 15.4.8, Twoslash 4.0.2, Shiki 4.5.0, React 19.3.1 and TanStack Start 1.169.3. No Next migration or dependency audit cleanups in other apps.

Verify that all existing doc paths render meaningful static HTML, metadata and code; unknown paths show 404; search finds content; checked examples fail builds on real diagnostics; native type checking passes; dev/preview work; root checks stay passing. Update contributor/app docs and CI.
