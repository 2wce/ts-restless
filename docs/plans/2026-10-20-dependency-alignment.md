# Dependency alignment implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use executing-plans to implement these tasks inline.

**Goal:** Address the eight dependency audit recommendations with current supported tooling and preserve existing consumer compatibility.

**Architecture:** Keep shared test tools in the root catalog; keep application-only tools in their owning manifests. Next 16 is the modern example/test baseline. Nest uses the latest stable framework and its matching platform adapters. OpenAPI remains on its current consumer type surface.

**Spec:** User-approved audit table, with steering to Next 16 and latest Nest packages.

## Constraints

- Continue on the clean chore/dx-improvements branch and preserve the running docs servers.
- Next baseline 16.4.2; retain Next 12/13/14 peer ranges and add verified newer versions.
- Nest baseline 12.2.0; Swagger 12.0.2. Preserve Nest 9/10/11 peer ranges and isolated test-projects.
- Multer 2.4.0 and matching 2.x types must resolve through Nest too.
- Keep standalone Fastify adapter on its existing 4.x baseline; Nest tests own Fastify 5.12.7 and explicit catalog Nest dependencies to prevent peer auto-resolution drift.
- Keep TypeScript 7 for native workspace checks; framework integrations requiring the classic compiler select it locally.
- Keep Zod/TanStack consumer upgrades out of this task.
- Preserve OpenAPI dependencies @anatine/zod-openapi 1.14.2 and openapi3-ts 2.x; align root tests with published behavior. Docs published SDK examples own compatible Nest 11 packages.
- No publication, release workflow changes, push or commit requested.

## Task 1: Verify baseline and package ownership

- [x] Read root catalog, package manifests, compiler/build configs, and existing adapter tests.
- [x] Run existing Next/OpenAPI/Express/Nest unit tests: 159 tests passed.
- [x] Read live registry metadata for target versions and Nest adapter transitive dependencies.
- [x] Add direct real NextRequest regression coverage for App Router and Pages Edge Router behavior; verify before and after the upgrade.

## Task 2: Align framework and test dependencies

Files: pnpm-workspace.yaml; package.json; libs/ts-rest/nest/package.json; apps/example-next/package.json; apps/example-nest/package.json; libs/ts-rest/next/package.json; libs/ts-rest/serverless/package.json; tools/vite/package-baseline.json.

- [x] Upgrade Next to 16.4.2, latest Nest family to 12.2.0/Swagger 12.0.2, Multer to 2.4.0/types 2.3.0, Valibot 1.5.0/converter 1.8.0 and Supertest 7.3.1/types 7.2.1.
- [x] Move Nest development platform versions into catalog references and Fastify 5 into its owning test package.
- [x] Keep Next on supported workspace React 18; choose a supported local classic compiler for Next and Swagger.
- [x] Align root OpenAPI test dependency with 1.14.2; remove the now-redundant override; 1.14.2 is the latest compatible 1.x patch.
- [x] Reinstall and inspect all peer warnings; fix errors within scope.
- [x] Run unit tests/typechecks/example builds and make only demonstrated framework migration adjustments.
- [x] Extend Next/Nest consumer peer ranges only after behavior checks; update the release metadata compatibility baseline without weakening checks.

## Task 3: Remove redundant tooling

Files: package.json; pnpm-workspace.yaml; tsconfig.base.json; libs/ts-rest/core/src/lib/paths.spec.ts.

- [x] Remove root arktype, wrangler, @types/wait-on and @types/body-parser; keep owning apps/fixtures unchanged.
- [x] Replace the nine tsd assertions with Expect<Equal<...>>; verify exact assertions with native typecheck and an intentional temporary mismatch.
- [x] Remove root tsd, @swc/helpers and tslib; remove unused catalog entries and importHelpers.
- [x] Verify built runtime files do not import tslib or SWC external helpers; retain SWC metadata transformer.

## Task 4: Verification and documentation

Files: CONTRIBUTING.md; this plan.

- [x] Document modern framework test baselines and intentional local classic compilers/version compatibility fixtures.
- [x] Run frozen install, pnpm build-test-all, docs build/typecheck/output tests, and host tests where dependencies changed.
- [x] Smoke-test Next production App Router and Pages Edge Router on a temporary port without requiring PostgreSQL.
- [x] Inspect dependency graph for old Next/Multer paths and validate isolated Nest fixtures as applicable.
- [x] Run format check and git diff --check; report verified changes and any remaining limitations.

## Verification results

- Frozen root install passed. Next 16.4.2, Nest 12.2.0/Swagger 12.0.2, Multer 2.4.0/types 2.3.0, Valibot 1.5.0/converter 1.8.0, Supertest 7.3.1/types 7.2.1 are installed.
- `pnpm build-test-all` passed: library builds, native checks, 575 tests, ten SDK package checks, 16 ESM/CJS exports, and all eleven example builds. After adding the route-priority regression cases, `pnpm check` passed with 579 tests, two skipped files/two todo tests, zero lint errors and 388 existing warnings. The assertion tuple is a test-only type export, so this change adds no unused declaration warning.
- Docs native typecheck/build and all 24 static output tests passed; Azure/Cloudflare host tests passed all 14 cases.
- Fresh copies of the built Nest SDK passed declaration checks and ten optional-route requests per version with Nest 9.4.0, 10.0.0 and 11.0.9. Both current and deprecated decorators were covered without mutating fixture installations or manifests.
- Real Next production requests passed through App Router, Pages Edge Router and Pages API handlers, including validation and path coercion. The temporary server on port 3108 was stopped; the existing docs servers remain running.
- All nine replacement exact type assertions pass native checking; a temporary incompatible ID type produced TS2344, then the original file was restored and passed.
- No SDK or Node example runtime build imports `tslib` or external SWC helpers. Nest decorator metadata verification passed.
- Root lockfile contains no Next 13, Multer 1, tsd, SWC helpers 0.5.3 or anatine 2 paths. Transitive helper dependencies required by frameworks remain.
- Cold native lint/type/format check passed with Next's generated output temporarily moved out and restored. Generated next-env.d.ts is exempt from formatting because Next owns its output.
- Review compared Express 4/5 optional-route behavior across 40,898 generated path/URL combinations and found matching/binding unchanged. Fastify static-route priority differs for overlapping optional paths newly accepted by the adapter; this native framework distinction is documented and locked by four integration tests. It is not a regression from a previously working Fastify route. No custom request router or framework version detection was added.
- Existing Vite alias/version warnings and older published SDK React peer warnings remain outside this dependency update. Docs' published Nest SDK examples now resolve compatible local Nest 11 packages; native source Nest tests own catalog versions explicitly.
- A changeset records Nest 12/Next 15-16 support and the compatible OpenAPI converter update. No versions were incremented, publication enabled, commit created or push performed.
