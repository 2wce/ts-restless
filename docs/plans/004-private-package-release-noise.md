# Private Package Release Noise Implementation Plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use superpowers:executing-plans with one executor. The user supplied the exact policy and requested delivery in PR #14.

**Goal:** Keep Changesets versioning and tags limited to the ten public libraries, so examples and private tooling no longer appear as releases.

**Architecture:** Set `privatePackages.version` and `privatePackages.tag` to `false` and replace the fixed-group wildcard with the ten explicit public package names. Keep those libraries coordinated and retain private React Query v5 bundling. Use real Changesets commands in disposable workspaces; replace only the external registry boundary when proving publication/tag behavior.

**Tech Stack:** Changesets CLI, pnpm, Vitest and existing real-manifest release probes.

**Spec:** User-approved policy on 2026-11-06: `"privatePackages": { "version": false, "tag": false }`, one fixed group containing the ten public libraries, delivered in [PR #14](https://github.com/2wce/ts-restless/pull/14).

## Constraints

- Preserve public coordinated versions, native core peers, prerelease progression and the private bundled v5 implementation.
- Keep all current `private` flags and existing manifest versions. This affects future version PRs; do not rewrite past releases or the committed prerelease history.
- Do not change publishing workflows, release credentials, npm tags or package support ranges.
- Run real versioning and tagging only inside temporary fixtures. No live publication or release merge.

## Task: Scope library release tracking

- [x] Extend `tests/releases/versioning.test.mjs` before changing configuration. Share the existing ten-public-library fixture list with the smaller workspace fixture so the explicit group is valid there.
- [x] Extend the initial stable/alpha probe to assert that the release plan contains exactly the ten public libraries, every private package retains its version and flag, and no private changelog is generated. Extend the numbered-alpha probe with the same private version preservation.
- [x] Add a current-prestate migration probe using actual manifests and the committed `.changeset/pre.json`, plus one new core patch Changeset. Assert public alpha advancement and unchanged private versions.
- [x] Extend the existing registry-stubbed real publish probe to initialize a disposable Git repository, permit real local tags, and assert exactly ten public alpha tags. No external registry mutation occurs.
- [x] Run `pnpm exec vp test run --config tests/vite.config.ts tests/releases/versioning.test.mjs` and observe private release/version failures against the old configuration.
- [x] Set `.changeset/config.json` to this policy:

```json
{
  "fixed": [
    [
      "@ts-restless/core",
      "@ts-restless/express",
      "@ts-restless/fastify",
      "@ts-restless/nest",
      "@ts-restless/next",
      "@ts-restless/open-api",
      "@ts-restless/react-query",
      "@ts-restless/serverless",
      "@ts-restless/solid-query",
      "@ts-restless/vue-query"
    ]
  ],
  "privatePackages": { "version": false, "tag": false }
}
```

- [x] Run the release suite and `pnpm test:packages`; all real versioning, native peers, strict packed consumers and publication-preflight checks must pass. Prove the tag assertion catches temporarily enabling both private versioning and tagging (Changesets rejects tag-only enablement), then restore both to false.
- [x] Document the public-only policy in `CONTRIBUTING.md` and `docs/prerelease-checklist.md`. Run changed-file formatting, lint and whitespace checks.
- [x] Commit and push to `feat/fastify-response-evaluation`, then update PR #14's title and description around both final changes. Keep it draft.

## Execution evidence

Verified on 2026-11-06:

- Before the configuration change, private versions changed and the real release plan contained private packages; the added assertions failed for those observed behaviors.
- With both private options disabled and the explicit public group, all nine release tests passed. Initial stable and alpha probes retain private versions and generate no private changelogs; continued alpha and actual current-prestate probes advance the ten public libraries together.
- The real Changesets publish preflight uses a stubbed external registry boundary and a disposable Git repository. It produces exactly ten public publication candidates and ten public alpha tags. Enabling private versioning/tagging temporarily caused the exact tag-set assertion to fail with private examples/tooling tags; restoring both options produced a passing release suite.
- `pnpm test:packages`: 21 tests across four files passed, including native public peers, strict ESM/CommonJS consumers and Fastify response adoption. The release suite passed again after the final fixture adjustment for future numbered prereleases.
- Targeted release-test lint, changed-file formatting and whitespace passed. No tracked manifest version, private flag, lockfile, prestate or workflow changed.

Changesets retains dependency-only release-plan entries with `type: "none"`; assertions distinguish these from actual version bumps. The installed planner's prerelease-exit fallback can patch an unrelated skipped package without such an entry. Stable publishing remains disabled and the coordinator rejects exited state; the prerelease checklist records the required real-manifest exit rehearsal before a separate stable activation. The bundled v5 fixture retains its real core dependency and remains private with a frozen version through its existing stable-exit probe.

No package-release Changeset is needed for a repository-only release configuration change. Deliver in the existing draft PR #14; its updated head must pass CI before merge.
