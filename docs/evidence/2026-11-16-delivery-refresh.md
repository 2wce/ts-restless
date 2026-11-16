# Delivery and npm permission refresh

**Recorded:** 2026-11-16. **Source baseline:** fetched main `f0526e371de1d7884d59e3668cd6dd99a571d717`. This is a dated snapshot supporting the [documentation refresh](../plans/2026-11-16-delivery-documentation.md); use [the roadmap](../roadmap.md) for delivered capabilities and [the release checklist](../prerelease-checklist.md) for publication verification.

## Merged source

`git fetch origin`, `git log origin/main` and GitHub PR API reads verified these merge records:

| PR                                                 | Change                                                           | Main commit                                |
| -------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------ |
| [#46](https://github.com/2wce/ts-restless/pull/46) | OpenAPI conversion and canonical legacy helper imports           | `2ff1faeebe6dab0a751c3e047d98eb1595337b3b` |
| [#48](https://github.com/2wce/ts-restless/pull/48) | Core/adapter/tooling ownership untangling                        | `6f2cbb7b30b42042e1734826d5642d613b7adc2b` |
| [#49](https://github.com/2wce/ts-restless/pull/49) | Native Fastify replies and serverless headers/CORS serialization | `1c2c0cf233caa227809fa942b041056e70483f9b` |
| [#50](https://github.com/2wce/ts-restless/pull/50) | Align `latest` after successful alpha publication                | `f0526e371de1d7884d59e3668cd6dd99a571d717` |

[Main CI run 43847669249](https://github.com/2wce/ts-restless/actions/runs/43847669249) passed documentation validation, build/source/installed-consumer/example/host checks, all ten isolated compatibility fixtures and the prerelease job. This establishes source integration and release-PR processing at this commit, not publication of every source change.

## Trusted-publisher configuration

By this refresh, authenticated npm settings showed the existing connection for each of core, express, fastify, nest, next, open-api, react-query, serverless, solid-query and vue-query with:

- Repository `2wce/ts-restless` and workflow `build-test.yml`.
- Permissions `npm publish`, `npm stage publish` and `npm dist-tag`.
- Publisher status `Valid`.

Only **Allow npm dist-tag** was enabled; the existing connection and publish permission were retained. The maintainer completed npm's two-factor prompts, and saved package settings were checked after each save. This verifies the configured permissions; each actual release still needs registry/provenance/tag verification.

## Registry snapshot

Public metadata reads from `https://registry.npmjs.org/@ts-restless%2f<package>` found the same tags on all ten packages: `alpha` at `4.0.0-alpha.6` and `latest` at `4.0.0-alpha.0`. The numbered alpha.6 artifacts were published on 2026-11-11. These observations predate the next publication using the merged alpha-mirroring logic and must not be treated as current installation guidance. No live tag mutation or publication was part of this documentation refresh.

## Documentation ownership

The roadmap now records durable implementation links and future work; guides select releases through changelogs, exports, peers and live registry queries. Historical plans retain their original execution checkpoints. The [refresh plan](../plans/2026-11-16-delivery-documentation.md) records documentation checks.
