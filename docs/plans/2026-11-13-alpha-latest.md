# Alpha latest tag implementation plan

**Goal:** Make ordinary npm installs receive the maintained alpha release while preserving the explicit alpha channel.

**Architecture:** Keep Changesets responsible for publication under the committed channel. After successful alpha publication, update `latest` for the existing ten public libraries using npm trusted publishing. Repeat those idempotent tag writes when Changesets finds the versions already published.

**Tech stack:** Node 26.12.0, pnpm 12.14.0, Changesets CLI 2.x, npm 11.21.0, Vitest.

**Spec:** [ADR0018](../adr/0018-alpha-latest-tag.md), authorized by the user's request on 2026-11-13. Baseline main is `1c2c0cf2`; the only existing open PR is the coordinated alpha release PR47.

## Constraints

- Preserve the public package set, package versions, stable release guard, review/CI gates and provenance.
- Mirror only alpha; beta and RC continue to publish under their committed explicit channel.
- Enable **Allow npm dist-tag** for the existing trusted publisher on all ten npm packages before rollout. The npm CLI bundled with Node 26.12.0 is 11.20.0; npm documents dist-tag OIDC support starting at 11.21.0 or 12.2.0.
- No local publishing, registry tag writes, merging or versioning is part of implementation verification.

## Implementation

- [x] Extend `tests/releases/versioning.test.mjs` first. Keep the real Changesets CLI and replace only the external npm/pnpm boundary. Persist registry versions and tags in the disposable fixture. Assert all ten `alpha` and `latest` tags converge, published versions are not republished on retry, publication failure prevents tag changes, tag failure is reported, and prerelease state is restored exactly. Run the focused tests and observe the missing tag updates fail.
- [x] After the existing publication `try/finally` in `scripts/prerelease.mjs`, apply:

  ```js
  if (release.tag === 'alpha') {
    for (const name of publicLibraries) {
      run('npm', [
        'dist-tag',
        'add',
        `@ts-restless/${name}@${release.version}`,
        'latest',
      ]);
    }
  }
  ```

  Errors propagate to the release job; retries rerun Changesets registry detection and repair tags without republishing.

- [x] In `.github/workflows/build-test.yml`, install `npm@11.21.0` in the prerelease job before the existing runtime check. Require npm 11.21+ or 12.2+ and document the additional trusted-publisher permission.
- [x] Update current release/consumer guidance and indexes, preserving historical registry observations and linking their superseding policy.
- [x] Run the release probes, formatting, lint and documentation checks; review the scoped diff. Record evidence below and prepare the branch for review.

## Verification

Baseline: `pnpm exec vp test run --config tests/vite.config.ts tests/releases/versioning.test.mjs` passes all nine existing release probes under Node 26.12.0. npm's official documentation confirms the CLI floors and opt-in trusted-publisher dist-tag permission; npm 11.21.0 exists in the registry.

Red: the two updated publication probes failed against the original script, showing missing tag writes and `alpha.1` published while `latest` remained `alpha.0`. Green: all nine release probes pass after the tag updates, including beta/RC isolation, exact prestate restoration and repair of partial tag failure without republishing.

Verification: Node 26.12.0 / pnpm 12.14.0; `pnpm lint` passes with zero errors and 365 existing warnings; scoped formatting and `git diff --check` pass; `pnpm docs:lint` checks 543 links/anchors across 129 documents. `pnpm --filter @ts-restless/docs test` passes all five tasks: production build/prerender, TypeScript, docs lint, 80 public-site checks and 12 checker fixtures. The docs task needed execution outside the sandbox because prerendering binds a local port. A direct path-only lint invocation separately reported the pre-existing `names.sort()` comparison-rule diagnostic; the configured repository lint task passes.

The independent read-only review found no actionable issues. Live npm trusted-publisher permissions and OIDC tag writes are unverified; rollout requires the documented opt-in permission on all ten package trusts. Implementation verification did not change live npm tags.
