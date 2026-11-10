# Documentation map

Start with [architecture](architecture.md), then [current work and delivery status](roadmap.md). For setup and commands, read [CONTRIBUTING](../CONTRIBUTING.md); contributor agents start at [AGENTS](../AGENTS.md).

| Location                                                             | Owns                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [ADRs](adr/README.md)                                                | Accepted decisions, rationale and supersession.                              |
| [Plans](plans/README.md)                                             | Implementation steps, detailed designs and historical execution checkpoints. |
| [Evidence](evidence/README.md)                                       | Dated audits, measurements and source snapshots.                             |
| [Support policy](support-policy.md)                                  | Compatibility and retirement process.                                        |
| [Support inventory](support-inventory.md)                            | Declared dependency lines and actual verification coverage.                  |
| [Prerelease checklist](prerelease-checklist.md)                      | Release workflow and publication verification.                               |
| [Public guides](../apps/docs/content/docs/ts-restless-migration.mdx) | Installation, API usage and consumer migration.                              |

## Updating documentation

Record an ADR for a consequential choice with real alternatives whose rationale would otherwise be lost. Routine fixes and task steps belong in plans or PRs. Accepted decisions can precede implementation; implementation can precede publication.

Update the roadmap when work changes delivery state. Retain dated evidence unchanged apart from link repair or a clearly dated correction. Historical plans may describe older APIs or pending work that has since landed; use current source, ADRs and the roadmap to resume work.

Keep detailed designs next to their plans. There is no separate designs/archive directory. Mark old records in the indexes; introduce more structure only when navigation needs it. Root `plans/` and `docs/superpowers/` have been consolidated here.

The public site stays in `apps/docs`. It generates `/llms.txt` and `/markdown/<page>.md` from the same guides, including tab alternatives and installation commands. Its development documentation is not a versioned description of every published prerelease. See [the site README](../apps/docs/README.md) for build and static hosting details.

Run `pnpm docs:lint` for repository links/anchors, current package/command facts and ADR structure. The full docs test task validates public pages and exports; CI requires it before Build & Test. Automation checks these concrete facts, while rationale, migration completeness and publication claims need review. Dated historical records are excluded from current-metadata checks.
