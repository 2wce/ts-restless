# Collision-free contract identity: local verification

Recorded 2026-11-18 on `feat/upstream-issue-fixes`, following `de8c5ab8` and
with fetched `origin/main` at `eb3990e8`. This is development-source
and locally packed-artifact evidence; it does not establish merge, publication
or passing branch CI.

[ADR0022](../adr/0022-collision-free-contract-identity.md) and the
[implementation plan](../plans/2026-11-18-collision-free-contract-identity.md)
replace the string-brand choice in ADR0019. The runtime no-body symbol remains
registered. `Opaque`, `UnwrapOpaque`, typed-null and no-body declarations share
one private symbol through the canonical CommonJS declaration graph; public ESM
wrappers re-export its public entries. Runtime ESM and CommonJS stay separate.
The native packer emits the shared graph without rewriting generated chunks.

## Regression evidence

The new source regression failed before the implementation with TS2344/TS2322:
a valid payload with `~ts-restless.opaque: 'user-value'` inferred as `never`, losing
request and response types. It passes after restoring private-symbol branding.
Payloads also contain `~ts-restless.no-body`, and index-signature unwrapping keeps
its value type. Invalid payload values, arbitrary no-body/null symbols and
incorrect opaque tokens remain compiler errors.

The existing root-free mixed-format fixture consumes a real core tarball and
exercises TypeScript 5.2.2 and 7.0.2 with strict Bundler, Node16 and NodeNext
resolution. Both compilers emit shared contract declarations with public
annotations. Opposite-format clients then consume the emitted declarations and
execute both directions, checking all payload fields and no-body decoding.
Legacy input/output helpers consume the root's branded plain declarations,
verifying the shared declaration identity. Separate no-Zod consumers retain
coverage of the validator-independent root boundary.

Older declaration emitters can need public schema annotations for exported
contracts; the permanent fixture and compiler-checked migration example retain
that support boundary. No compiler checking was disabled, and no private
package paths were imported.

## Recorded checks

Node 26.12.0 and pnpm 12.14.0:

| Command                                | Result                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Focused core source tests              | 337 tests / 16 files passed.                                                                                 |
| Focused packed mixed-format regression | Passed all six compiler/resolver profiles, both declaration emitters and both runtime directions.            |
| `pnpm check`                           | Exit 0; 960 tests / 56 files, all inference assertions, 0 errors / 366 existing warnings.                    |
| `pnpm test:packages`                   | Exit 0; 40 tests / 9 files using ten freshly built tarballs.                                                 |
| `pnpm --filter @ts-restless/docs test` | Exit 0; all five tasks including compiler-checked migration example, generated exports and checker fixtures. |
| Final `pnpm docs:lint`                 | Exit 0; 606 links/anchors across 140 documents.                                                              |
| `pnpm build:examples`                  | Exit 0; all 13 tasks, including Nest type/declaration checks and native Next production builds.              |

An independent read-only review found no actionable issues after inspecting the
source, emitted root/legacy graph and packed fixtures. Its separate core
inference check passed; it did not rerun the full packing/consumer suite.

Initial sandbox attempts failed because local HTTP listeners or registry access
were denied. Reruns with the required permissions passed. An initial config
revision exposed the preset's broad array-or-object pack type; the shared preset
now accurately returns its single pack configuration. Full format, type, source,
package and example checks passed after this correction.

The existing multipart route-policy and adapter fixes remain in draft
[PR58](https://github.com/2wce/ts-restless/pull/58). A containing coordinated release
and rebuilding shared contract packages/applications remain required for adoption.
