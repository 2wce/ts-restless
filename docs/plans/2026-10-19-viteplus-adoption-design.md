# Vite+ adoption

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

The user approved adopting Vite+ for a lean ts-rest toolchain, removing Nx and overlapping formatter/linter/test/build integrations. Work stays on `chore/dx-improvements`; Node 26.12.0 remains pinned.

## Required behavior

Preserve every public package API and import subpath, ESM/CommonJS consumers, type inference, existing peer ranges, browser syntax target es2019, React Query v4/v5 client directives, Nest legacy decorators and runtime metadata. Keep supported Nest/Express/validator compatibility fixtures. Keep Changesets as the release system.

## Target

pnpm workspaces with declared package relationships; Vite+ 1.3.0 installed locally; `vp pack` for libraries, `vp test` for tests, `vp lint` and `vp fmt`, and `vp run` for dependency ordering/caching. Examples use framework-native commands. No global CLI is required. Avoid adding a second task runner or a homegrown compiler. A small maintained transformer plugin is acceptable if it preserves decorators.

## Validation

Run all library tests and compile-time assertions; build all published packages; exercise packed root/subpath exports and type declarations; verify metadata and React client boundaries. Run lint/format checks, compatibility fixture tests, and supported example builds. Prove cache reuse and invalidation. Update CI, editor recommendations and contributor commands. Remove obsolete Nx/Rollup patch, Jest, ESLint and Prettier direct dependencies/configuration when their replacements work. Transitive packages from framework dependencies may remain.

## Delivery

Keep changes reviewable on the existing branch. Do not publish releases or push changes. Report remaining validation limitations precisely.

## Accepted clarifications

- Upgrade pnpm to 12.14.0 with the retained Node 26.12.0 runtime.
- Keep Azure Functions Core Tools in the default install and host integration checks in CI.
- Move the documentation application to `apps/docs`. Keep root `docs` for AI planning and verification notes. The application retains its independent Bun lock and Next/React dependencies.
- Vitest 5.0.5 through Vite+ replaces Jest in the main suite and Nest compatibility fixtures. Existing Bun consumer fixtures continue testing Bun compatibility.
