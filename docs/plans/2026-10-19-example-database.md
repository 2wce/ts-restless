# Example database isolation implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use Superpowers executing-plans to implement this change inline. The user approved the shared example-only database package on 2026-10-19.

**Goal:** Remove Prisma generation from workspace installation while retaining the Nest and Next database examples.

**Architecture:** A private `@ts-rest/example-database` workspace owns the existing PostgreSQL schema, Prisma CLI and client runtime. It exports a package-local generated client. Vite+ task dependencies generate that client before example builds, development, full unit tests and lint/check commands. Core library builds and direct core tests do not depend on generation.

**Tech stack:** Existing Prisma 6.3.1, pnpm 12.14.0, Node 26.12.0 and Vite+ 1.3.0.

**Design:** The user-approved proposal in this conversation; this is a bounded move of the existing example database flow.

## Constraints

- Keep the existing PostgreSQL Post model and Prisma version.
- No workspace install hook generates a client. Disable the third-party Prisma client install hook.
- Own generated files in the private database package and ignore them in Git/lint/format.
- Retain ts-rest published manifests and artifacts unchanged.
- Nest output lives inside its application so external private dependencies resolve normally and Prisma engine paths remain intact.

## Task 1: Isolate the generated client and consumers

- [x] Verify the new consumer import currently fails with module not found.
- [x] Move `prisma/schema.prisma` to `libs/example-database/prisma/schema.prisma`, with generator `output = "../generated/client"`.
- [x] Create a private CommonJS package exporting `./generated/client/index.js` and its declarations. Its dependencies contain `@prisma/client: catalog:` and devDependencies contain `prisma: catalog:` and `vite-plus: catalog:`.
- [x] Configure a `generate` Vite+ task invoking `prisma generate`, with explicit schema/package/lock inputs and generated-client outputs.
- [x] Replace four Nest/Next imports of `@prisma/client` with `@ts-rest/example-database`; change their manifest dependencies to `workspace:*`.
- [x] Remove root Prisma dependencies and root postinstall. Set `allowBuilds.@prisma/client` to false; retain CLI engine installation support.
- [x] Use Vite+ task dependencies before full workspace tests/checks and Nest/Next build/dev commands. Core builds remain independent.
- [x] Keep the database package external in the Nest pack, emit to `apps/example-nest/dist`, and update start/dev commands.
- [x] Document generation, PostgreSQL setup and core-only commands in CONTRIBUTING and the database README. Update prior design records with the superseding decision.

## Task 2: Keep all example build output local

The user expanded this follow-up on 2026-10-19 to apply the same fix to other
example builds. The public library release staging layout remains intact.

- [x] Audit output configuration and runtime paths across all applications.
- [x] Use the package-local `dist` default in the shared Node pack preset and all six Node examples; retain Azure's custom entry point.
- [x] Update Express, Fastify and both microservice start/watch scripts and Azure's `main` glob to local output.
- [x] Remove the three frontend Vite output overrides and set Wrangler dry-run output to local `dist`.
- [x] Remove obsolete root-output type include paths from Next and the docs app.
- [x] Document example outputs and the separate published-library release staging layout.
- [x] Move old root `dist/apps` aside; rebuild every example and confirm the root directory stays absent.
- [x] Run Azure/Cloudflare host integration tests and repeat checks affected by the shared pack change.
- [x] Exclude build/generated directories from workspace discovery; the generated Prisma manifest was otherwise mistaken for a publishable workspace package.

## Task 3: Verify and deliver

- [x] Install dependencies, refresh the lockfile, then confirm a frozen install does not generate a client when the output is absent.
- [x] Build Nest and Next starting without generated output; verify Vite+ orders generation first and restores outputs on cache hits.
- [x] Verify CJS and ESM consumer imports and PrismaClient construction/disconnection without a database connection.
- [x] Run unit tests, native checks, package compatibility checks and formatting. Confirm no published manifest gains a Prisma dependency.
- [x] Run a clean filtered core install and core test without a generated database client.
- [x] Review the diff and verification results.
- [x] Prepare the verified follow-up for the existing user-authorized draft PR; discard task scratch files after delivery.

## Verification evidence

- A frozen workspace install completed without creating the generated client. Ten library pack tasks also completed without it.
- Nest built from absent output; Next built after moving generated output aside. Vite+ restored the generation task output from cache before building Next.
- Both application consumers imported the real client and constructed/disconnected it without opening a database connection. CommonJS resolution used the emitted Nest application path.
- The Next API route build trace includes the package-local schema and native Prisma engine.
- A clean checkout installed only core and its dependencies, with neither a root Prisma CLI nor a database-package CLI/client installed. All 208 core tests passed (one existing todo), with generated database output still absent.
- Full workspace checks passed: 565 tests (two existing todos), seven uncached inference projects, zero compiler/lint errors and 388 existing lint warnings.
- Published package verification passed for ten packages and sixteen ESM/CommonJS entries. All eleven example builds plus the generation prerequisite passed.
- Standalone compatibility fixture sources are unchanged; the earlier fixture run remains applicable. Host tests are rerun after the user-requested output changes.

## Expanded output verification

All eleven example outputs exist inside their packages, and root `dist/apps`
remains absent after rebuilding. The full pipeline passed again: ten library
builds, 565 unit tests, seven inference projects, package compatibility checks
and eleven example builds plus their generation prerequisite. Fourteen Azure
and Cloudflare host tests passed. Formatting, frozen-lockfile installation and
whitespace checks passed. A separate reviewer found no actionable issues in
Prisma ownership, package-local output or Node dependency resolution.

Release discovery identified the generated Prisma client manifest as an extra
workspace package. Explicit build/generated workspace exclusions fix that
boundary. Native `publishConfig.directory` support was confirmed in the installed
Changesets CLI; migration of public library artifacts and fixture/cache paths is
a separate release-layout change from this example-output follow-up.

Final discovery verification found 27 source packages and exactly ten public
libraries, with no generated or build packages. The frozen lockfile and explicit
example-generation task still pass after those exclusions.
