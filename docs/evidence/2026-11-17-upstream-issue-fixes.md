# Six upstream issue fixes: local verification

Recorded 2026-11-17 for `feat/upstream-issue-fixes`, based on
`f0526e371de1d7884d59e3668cd6dd99a571d717`.
The [approved design](../plans/2026-11-16-upstream-issues-design.md) and
[implementation plan](../plans/2026-11-16-upstream-issues.md) define the acceptance
criteria for fork issues #52–#57. This is development-source evidence;
it does not establish merge, publication or passing branch CI.

## Implemented behavior

| Issue                                                | Result                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [#52](https://github.com/2wce/ts-restless/issues/52) | Nest multi-route methods inherit final native lifecycle metadata for either decorator order; routing identity stays local.            |
| [#53](https://github.com/2wce/ts-restless/issues/53) | Mixed ESM/CommonJS contracts share portable no-body and plain/null identity, retaining strict inference and decoding.                 |
| [#54](https://github.com/2wce/ts-restless/issues/54) | Next native control-flow signals escape generic/custom response conversion through the public framework helper.                       |
| [#55](https://github.com/2wce/ts-restless/issues/55) | Vue optimistic mutation result inference reaches native lifecycle and per-call callbacks, retaining reactivity and optionality.       |
| [#56](https://github.com/2wce/ts-restless/issues/56) | Multipart object fields use native encoding by default; explicit JSON compatibility and request overrides preserve existing decoders. |
| [#57](https://github.com/2wce/ts-restless/issues/57) | Express exposes existing modular router/route types and the exact server factory type.                                                |

Portable identity and multipart compatibility rationale live in
[ADR0019](../adr/0019-portable-contract-identity.md) and
[ADR0020](../adr/0020-multipart-field-encoding.md). The default multipart wire
change has a major core Changeset and migration guidance; package versioning
has not been performed.

## Recorded checks at `20d20929`

Contributor runtime: Node 26.12.0, pnpm 12.14.0.

| Command / consumer                                  | Recorded result                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                        | Exit 0; 959 tests / 56 files; checker 0 errors / 365 warnings.                                            |
| `pnpm test:packages`                                | Exit 0; 40 tests / 9 files using ten freshly built tarballs.                                              |
| `pnpm --filter @ts-restless/docs test`              | Exit 0; all 5 tasks, including build, native types, checked snippets and generated exports.               |
| Docs lint within full docs test                     | 559 links/anchors across 133 documents.                                                                   |
| `pnpm test:hosts`                                   | Exit 0; 14 tests / 2 files covering Azure/Cloudflare.                                                     |
| Fresh-tarball root-free Nest 9.4.0/10.0.0/11.0.9    | Each 3 tests / 2 files and native build passed; all installed archive bytes compared.                     |
| Packed Next 15.5.29/16.4.2, four validator profiles | 15 tests, strict ESM/CommonJS declarations with exact reviewed upstream diagnostics, real native signals. |
| Packed Query 5.51.1/5.107.1 Vue/Solid               | 2 tests; strict ESM/CommonJS and native reactive lifecycle passed.                                        |

The full example gate initially passed 12/13 tasks: the Next App Router build
failed because `next/navigation.js` bypassed Turbopack's server navigation
alias. A minimal extensionless public import built successfully, while the
fully specified import reproduced the same missing vendored context.
The correction uses a local CommonJS bridge to the extensionless public helper,
preserving direct Node ESM/CommonJS loading without private imports or consumer
configuration. The native Next15/16 regression builds App Router and Pages edge
routes in installed consumers, alongside their strict declaration/runtime checks.

Each task received an independent spec/quality review. A complete branch
review found no additional correctness issues beyond the Next production
build gate. The full independent GitHub compatibility matrix remains a
separate integration gate; local checks do not substitute for it.

## Final correction acceptance

Production correction `c4eccdf5` passes `pnpm check`: 959 tests / 56 files,
zero errors and 365 nonfatal warnings. All 13 `pnpm build:examples` tasks pass,
including Next App Router and Pages edge routes. The final docs test passes all
five tasks, with 567 links/anchors across 134 documents.
After the final status records were updated, explicit `pnpm docs:lint` passes
with 568 links/anchors across the same 134 documents; the final checker reports
zero errors and 365 warnings.

Harness follow-up `9a807ec9` retains the same production code. The permanent
installed regression reproduces the exact missing-context failure
against the earlier tarballs. Fresh corrected tarballs pass all 40 tests / 9 files,
including production builds on both retained Next versions, strict ESM/CommonJS
imports and genuine native signals.

Next16's CLI emitted a one-time `SecurityFatalError` advisory during the first
installed build. The harness logs that interruption and retries the same build
exactly once, only when no compilation/module/page error accompanies it. The
second build and both route manifests must pass; other failures remain fatal.
No dependency upgrade or security-feature disablement was performed. This
record does not independently audit the advisory's vulnerability details.

The whole-branch review and scoped correction review approve the final source
and compatibility behavior with no remaining actionable findings. Local
implementation and verification are complete. The independent GitHub
compatibility matrix, merge and publication remain separate unverified states.
