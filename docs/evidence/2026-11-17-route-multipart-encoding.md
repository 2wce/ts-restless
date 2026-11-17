# Route multipart encoding verification

Recorded 2026-11-17 for `feat/upstream-issue-fixes` at `2ecec788`, following
`dad96d9b`. [ADR0021](../adr/0021-route-multipart-encoding.md) and the
[plan](../plans/2026-11-17-route-multipart-encoding.md) define the accepted
route-level replacement for the earlier client/request encoding option.

## Observed behavior

Multipart route declarations select `form` (the omitted-policy default) or
`legacy-json`. Plain clients, shared query execution and native Vue/Solid
mutations consume the same route policy. Sibling/nested endpoints keep distinct
policies within one client. Literal policy and body inference are retained;
configuration on GET, bodyless DELETE and non-multipart mutations is rejected
by the type checks. Existing unconfigured broad contentType annotations remain
admitted.

Core tests cover strings/empty strings, zero/false/null, nested objects,
undefined omission versus historical literal fields, repeated arrays, binary
Files and caller FormData identity. The native Express test sends actual client
uploads through multer and a string/email schema. Its legacy endpoint supplies
caller-owned JSON decoding; declaring the policy alone does not add a decoder.

## Recorded checks

Runtime: Node 26.12.0 and pnpm 12.14.0. Logs are recorded locally under
`/private/tmp/ts-restless-route-multipart-RMaxct`.

| Command                                                                                          | Result                                                                                         |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Core/Vue route-policy runtime red before production edits                                        | Exit 1: four intended encoding failures; 349 other tests passed.                               |
| `pnpm exec vp test run --project core --project express --project vue-query`                     | Exit 0: 394 tests / 21 files.                                                                  |
| Strict core and Express spec compilation with `pnpm exec tsc --noEmit -p .../tsconfig.spec.json` | Exit 0; expected diagnostics and literal/body inference enforced.                              |
| `pnpm check`                                                                                     | Exit 0: 959 tests / 56 files; 0 errors / 366 nonfatal warnings; all 15 tasks.                  |
| `pnpm test:packages`                                                                             | Exit 0: 40 tests / 9 files using freshly built tarballs.                                       |
| `pnpm --filter @ts-restless/docs test`                                                           | Exit 0: all 5 tasks, including checked snippets, generated exports and 12 static-output tests. |
| Docs lint inside the docs test                                                                   | 584 links/anchors across 136 documents at that baseline.                                       |
| `git diff --check`                                                                               | Passed.                                                                                        |

The packed fixtures exercise ESM/CommonJS plain/query serialization and strict
route declarations across validator profiles. Installed Vue/Solid mutations
select their route policies with retained Query versions 5.51.1 and 5.107.1.
Library checking and exact reviewed upstream diagnostics remain enabled. Local
native listeners required sandbox escalation after loopback EPERM failures.

The full source/docs gates preceded the final extra core/packed invalid-router
type assertion and a prose typo correction. Strict core compilation passed again
after that assertion; the installed-package gate used the final fixtures.

Independent scoped review approved both spec compliance and code quality with
no actionable findings in the multipart revision.

## Limits

This evidence covers the multipart revision. The earlier architecture review's
portable-brand payload-key collision remains outstanding and is not repaired
by these passing suites. New-head GitHub CI, merge and package publication are
separate evidence states. No versions, peers or release guards were changed.
