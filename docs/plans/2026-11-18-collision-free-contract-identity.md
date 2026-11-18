# Collision-free contract identity implementation plan

> **For agentic workers:** Use the executing-plans skill to implement this approved plan task by task.

**Goal:** Preserve every user payload key while sharing contract type identity across ESM and CommonJS.

**Architecture:** Restore the private unique-symbol `Opaque` brand. Brand the registered no-body symbol through `Opaque<symbol, 'ContractNoBody'>`. Build one CommonJS declaration graph and expose it through public ESM declaration wrappers, using native pack configuration and lifecycle hooks.

**Tech stack:** TypeScript 5.2/current, Vite+ pack, strict root-free installed consumers.

**Spec:** [ADR0022](../adr/0022-collision-free-contract-identity.md), superseding the string-brand choice in ADR0019.

## Constraints

- Preserve public API names, ESM/CommonJS runtime exports and core `/legacy`.
- Keep library checking strict; public annotations support older declaration emitters.
- Preserve multipart policy and the other fixes in draft PR58.
- Do not version, merge or publish packages; shared contracts must be rebuilt against a containing coordinated release.

## Task 1: Reproduce collisions and preserve compiled shared contracts

Files: `libs/ts-rest/core/src/lib/dsl.spec.ts`, `tests/packaging/fixtures/mixed-contract.ts.fixture`, `tests/packaging/fixtures/mixed-client.ts.fixture`, `tests/packaging/package-check.test.mjs`.

- [x] Extend the existing inference suite and mixed-format fixtures with payloads containing both historical string marker keys, string index signatures, and distinct opaque tokens. Assert plain request/response inference and unwrapping preserve those payloads; wrong values must still fail.
- [x] Run core type checking and the existing packed mixed-format regression against unchanged implementation. Expect the valid colliding payload to collapse to `never`.
- [x] Compile shared contracts with declaration output using both TypeScript versions and public `ContractPlainType`, `ContractNullType`, and `ContractNoBodyType` annotations. Consume the emitted declarations with opposite-format clients and execute both directions.

## Task 2: Implement one collision-free declaration identity

Files: `libs/ts-rest/core/src/lib/type-utils.ts`, `libs/ts-rest/core/src/lib/dsl.ts`, `libs/ts-rest/core/vite.config.ts`, and the single-pack return type in `libs/build-config/src/index.ts`.

- [x] Replace string branding with `declare const opaqueBrand: unique symbol`, use `[opaqueBrand]` in `Tagged` and `UnwrapOpaque`, and represent no-body as `Opaque<symbol, 'ContractNoBody'>`.
- [x] Configure native per-format packing to emit declarations only for CommonJS. In the successful CommonJS build hook, write `index.esm.d.mts` and `legacy.esm.d.mts` re-exports of their corresponding public `.cjs.js` declaration entries. Do not rewrite generated chunk text or names.
- [x] Run core inference/source checks and freshly packed mixed-format consumers. Verify root/legacy type identity, strict Bundler/Node16/NodeNext checks, declaration emission, wrong-type rejection and no-body runtime behavior.

## Task 3: Document, verify and update the draft

Files: ADR0019/0022 and indexes, architecture/roadmap, migration guide, existing Changeset, dated evidence.

- [x] Supersede ADR0019 reciprocally, record the private-brand/common-graph rationale, and add shared-contract rebuilding to the migration checklist.
- [x] Run `pnpm check`, `pnpm test:packages`, docs tests and example declaration builds. Record actual results and compiler boundaries in dated evidence.
- [x] Obtain independent review and resolve actionable findings.
- Commit/push and update draft PR58; verify its remote head and draft state as the delivery step.

## Local completion record

All local acceptance gates and independent review passed. [Dated evidence](../evidence/2026-11-18-collision-free-contract-identity.md) records the commands, results and compatibility boundary; the draft PR tracks subsequent delivery.
