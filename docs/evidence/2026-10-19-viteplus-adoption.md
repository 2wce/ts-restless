# Vite+ adoption verification

Date: 2026-10-19. Branch: `chore/dx-improvements`. Base: `933cbfd4`.
The migration is recorded in the commit containing this verification record.
No release was published and no branch was pushed.

## Result

The workspace uses local Vite+ 1.3.0 for packaging, task scheduling/cache,
Vitest 5.0.5, Oxlint and Oxfmt. Node 26.12.0 and pnpm 12.14.0 are pinned.
Direct Nx, Jest, ESLint, Prettier and patched Rollup tooling was removed.
SWC is retained for legacy Nest decorators and injection metadata.

Ten published packages keep their dist paths, 16 public entry points,
ESM/CommonJS exports, declarations, public peer ranges, es2019 target,
React client directives and Nest metadata. A supported package build hook
replaces the Rollup patch/log interception. Changesets discovers the built
release workspace using the root CLI, avoiding an automatic pnpm install in dist.

The 46 root documentation application files moved to `apps/docs`; destination
presence and source absence were verified. Only its package identity, matching
Bun lock identity and changelog generator paths changed. Root `docs` contains
AI planning and verification notes.

Azure Functions Core Tools remains part of the default install. Node 26
exposed a yauzl 2 ZIP extraction failure in extract-zip; the workspace overrides
that dependency to yauzl 3.4.0. Both direct extraction and the ordinary Azure
rebuild lifecycle were verified before the host tests.

## Final checks

Run from the repository with Node 26.12.0 and pnpm 12.14.0.
Temporary evidence logs live under `/tmp/ts-rest-viteplus-`.

| Command                                   | Result                                                                                                      | Evidence log suffix              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `pnpm install --frozen-lockfile`          | Exit 0; all 27 workspace projects                                                                           | `final-install.log`              |
| `pnpm format`                             | Exit 0                                                                                                      | `final-format.log`               |
| `pnpm build`                              | All 10 library tasks pass                                                                                   | `final-build.log`                |
| `pnpm check`                              | Oxlint/format pass; 564 tests pass, 9 skipped, 2 todo; all seven assertion projects compile                 | `final-check.log`                |
| `pnpm test:packages`                      | 10 packages, 16 ESM/CJS entry points, types, Nest metadata, React directives                                | `final-packages.log`             |
| `pnpm build:examples`                     | All 11 example tasks pass                                                                                   | `final-examples.log`             |
| `pnpm test:hosts`                         | 14 Azure/Cloudflare host tests pass                                                                         | `final-hosts.log`                |
| `make e2e`                                | All 9 consumer fixtures pass tests/builds/type checks: Express 4/5, Nest 9/10/11, Zod 3/4, Valibot, ArkType | `final-e2e.log`                  |
| `pnpm ts-rest:build-watch`                | All 10 watchers announce entries and emit artifacts; stopped intentionally with SIGINT                      | `final-watchers.log`             |
| `pnpm build` after stopping watchers      | 10/10 cache hits, 10/10 successful; restores complete outputs                                               | `final-after-watch-build.log`    |
| `pnpm test:packages` after restored build | All package checks pass again                                                                               | `final-after-watch-packages.log` |

Earlier focused verification proved byte-identical cached artifact restoration
and README input invalidation (`cache-restore.log`, `cache-invalidate.log`).
Express starts and restarts after source edits (`watch.log`); source was restored.
All five microservice dev listeners start at ports 5002–5006
(`example-microservice-serve.log`). Changesets status discovery succeeded
without publication (`release-status.json`).

## Review resolutions

A whole migration review raised three actionable findings. A scoped re-review
confirmed all three addressed and found no new actionable breakage in the fixes.

1. Persistent tasks now use `--parallel` so dependency completion barriers and
   the default four-task concurrency cap do not block watchers or dev servers.
2. Package regressions derive the internal core peer from current source
   versions while comparing third-party peers with the captured baseline.
   Builds and consumer checks passed with temporary versions 3.53.0 and
   3.53.0-alpha.1, then all source versions were restored to 3.52.1.
3. Typecheck includes isolated Express, Next, Nest and React Query v4/v5 specs.
   Isolation avoids Next global RequestInit augmentation and incompatible
   TanStack peer types in a shared program. The DOM matcher library is 7.0.1
   with its Vitest augmentation; it supplies assertions rather than a Jest runner.

## Limits and observations

- The moved docs application was not installed or built. It retains a separate
  Bun dependency graph and is excluded from the pnpm workspace.
- Lint retains warnings for existing any/unused-variable and React patterns;
  the correctness checks have no blocking errors.
- One earlier Nest unit run returned 401 where 204 was expected. The isolated
  test, two subsequent full runs and final full verification passed. No fix is
  claimed for that transient observation.
- Azure/Cloudflare host subprocesses emit Node's existing shell-argument
  deprecation warning. Their integration tests pass.
- GitHub-hosted CI and actual publication have not run as part of this local
  verification. Existing Bun consumer fixtures still use Bun's runner.
