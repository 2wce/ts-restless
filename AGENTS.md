# Working on ts-restless

Contract-first typed REST in TypeScript, maintained as a fork of ts-rest. Keep upstream credits and public API names unless the requested change requires a migration.

## Read first

1. [Documentation map](docs/README.md) and [architecture](docs/architecture.md).
2. [Roadmap](docs/roadmap.md) for current delivery status; [ADRs](docs/adr/README.md) for accepted decisions.
3. The relevant [plan](docs/plans/README.md), package source and nearby tests. Dated plans/evidence describe their recorded baseline, not necessarily current support or npm availability.
4. [CONTRIBUTING.md](CONTRIBUTING.md) for setup and detailed command behavior.

## Package and test map

- `libs/ts-rest/core`: contracts, inference, validation and transport.
- Other `libs/ts-rest/*` packages: native server/query/OpenAPI integrations. `react-query-v5` is private and bundled into the public React adapter.
- `libs/build-config`: shared build tooling; `apps/example-*`: private examples.
- `tests/packaging`, `tests/releases`: installed ESM/CommonJS consumers and release probes.
- `test-projects`: isolated compatibility consumers; the complete matrix runs in CI.
- `apps/docs/content/docs`: canonical user guides; `apps/docs`: site and generated Markdown exports.

## Commands

Use Node26.12.0 and pnpm12.14.0 (`.nvmrc`, root manifest). Install with `pnpm install --frozen-lockfile`.

- `pnpm check`: format/lint/type checks, source tests and inference assertions.
- `pnpm test:packages`: builds tarballs and checks real installed consumers; may access the registry.
- `pnpm --filter @ts-restless/docs test`: builds/typechecks docs, checks exports and repository Markdown links.
- `pnpm build:examples` and `pnpm test:hosts`: example/native host verification when those integrations change.
- `pnpm exec vp test run --project core`: focused core tests; see CONTRIBUTING for other projects and prerequisites.

## Boundaries

Preserve native routing, middleware, serialization, providers, cache and reactivity in their owning integrations. Core must stay framework-independent. Extend existing helpers and nearby tests; keep strict installed-consumer checks and snippet diagnostics enabled.

Consult the support inventory before changing peers. A version range is a promise, not proof that every allowed version was tested. Breaking changes need migration guidance and an appropriate Changeset. Do not change release guards, version packages, merge or publish as incidental task work.

## Documentation changes

Keep accepted rationale in short ADRs, current delivery status in the roadmap, steps in plans and dated measurements in evidence. Link between them instead of copying statuses. New decisions supersede old ADRs explicitly. Plans belong in `docs/plans`, including work prepared with external planning tools.

The docs site describes development source. Verify a containing release before advising users to install a feature; merged code and passing checks do not prove publication. Generate consumer Markdown and `llms.txt` from the public guides rather than maintaining a second copy.
