---
'@ts-restless/react-query': major
'@ts-restless/vue-query': major
'@ts-restless/solid-query': major
---

Target TanStack Query v5 only in the initial stable ts-restless v4 baseline. React v5 becomes the default (`/v5` remains an alias); remove the v4 React wrapper and React16/17 peers. Migrate Vue and Solid to native v5 options, typed pagination and native reactivity. Infinite queries require initialPageParam and getNextPageParam; mutation status follows v5 isPending. Follow the [Query v5 migration guide](https://github.com/2wce/ts-restless/blob/main/apps/docs/content/docs/query-v5-migration.mdx) before upgrading from previous prereleases or upstream v3. It covers React provider/hook/cache/SSR replacements, removed options/types, Vue/Solid reactivity and application verification; there is no Query4 legacy adapter.
