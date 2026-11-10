# Standard Schema separation implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use Superpowers test-driven development and focused independent review. Execute the approved scope without asking again for its major-release boundary.

**Goal:** Make default core and adapter APIs validator independent while providing explicit Zod 3 compatibility helpers.

**Architecture:** Default modules use structural Standard Schema types and errors. Separate zod3 entries contain historical helpers and an explicit old-schema bridge. Packed consumers prove the separation.

**Tech stack:** Node 26.12.0, pnpm 12.14.0, Vite+ 1.3.0, Vitest 5.0.5, TypeScript 7.0.2; existing classic consumer compilers.

**Spec:** ../specs/2026-10-20-standard-schema-separation-design.md

## Global constraints

- Major API boundary is approved; retain familiar general API names.
- No global compatibility registration, duplicated core implementation or internal validator framework.
- Full compatibility matrix runs in CI only; local unit/type/package checks remain allowed.
- Preserve validator/framework baselines in compatibility fixtures, except upgrade the Zod 4 fixture to actual stable Zod 4 as required by issue #2.
- No package version command, merge or publishing. Both release workflows stay disabled.
- OpenAPI generation and unrelated header fixes remain separate issues.

## Task 1: Establish failing separation tests

Files: core/src/lib/standard-boundary.spec.ts and tests/packaging/validator-independence.test.mjs.

- [ ] Prove packed defaults do not load or bundle Zod, following shared chunks.
- [ ] Prove minimal Standard Schema and Valibot consumers compile/run with no installed Zod, and stable Zod 4 consumers compile strictly; verify input/output transforms. Keep the minimal core validation regression.
- [ ] Inspect reachable packed ESM/CJS modules and declarations for Zod imports/bundled sources; run against current artifacts and record failures before implementation.
- [ ] Keep full matrix execution in CI.

## Task 2: Separate core and explicit legacy helpers

Files: core src/index.ts, src/zod3.ts, src/lib/dsl.ts, type-utils.ts, standard-schema-utils.ts, validation-error.ts, response-validation-error.ts, server.ts, package.json, vite.config.ts and relevant core unit/inference tests.

Interface produced:

```ts
// Default core retains these general interfaces.
type ContractAnyType =
  | StandardSchemaV1<any>
  | ContractPlainType<unknown>
  | ContractNullType
  | null;
// Compatibility path only.
function toStandardSchema<T extends z.ZodTypeAny>(
  schema: T,
): T & StandardSchemaV1<z.input<T>, z.output<T>>;
```

- [ ] Add bridge tests first using legacy Zod 3; cover success/transform, failure issues and no mutation.
- [ ] Remove Zod-specific public inference and runtime branches from defaults. Keep synchronous validation and structural errors.
- [ ] Isolate deprecated helpers/error schema constants/classes/aliases under zod3; add source/published exports and packing entry.
- [ ] Replace whole-header class branches structurally, preserving field-record behavior. Cover opaque merge semantics and explicit legacy merge migration.
- [ ] Update core assertions/tests for the documented major boundary; run focused core tests and native inference checks.

## Task 3: Separate adapters and relocate OpenAPI imports

Files: Express, Fastify, Nest, Next and serverless runtime/types/errors/entry configs/manifests and their regression tests; OpenAPI header/query parsers.

Consumes Task 2's default StandardSchemaError-only validation result and explicit core/zod3 compatibility helpers.

- [ ] Add/revise meaningful validation tests first to require modern error classes and preserved request locations/issue fields.
- [ ] Remove Zod imports and vendor branching from default adapters; retain familiar modern aliases where useful.
- [ ] Move existing exported deprecated schemas/Zod classes into explicit zod3 entries; do not have defaults re-export those entries.
- [ ] Point OpenAPI's existing legacy guards to core/zod3; retain its existing transformer behavior.
- [ ] Run focused adapter tests, inference checks and builds.

## Task 4: Verify real consumer installations and migrate workspace examples

Files: tests/packaging, test-projects, workspace catalogs/lockfile, source examples/tests and package baseline.

- [ ] Add isolated packed-artifact Standard Schema, Valibot, stable Zod 4 and legacy bridge profiles. Do not install Zod in no-Zod profiles; assert its absence.
- [ ] Check ESM/CJS runtime imports and strict declarations without skipLibCheck. Test input/output transforms using existing Equal/Expect helpers.
- [ ] Modernize ordinary workspace Zod 3 development baseline and stable Zod 4 alias; keep old-Zod bridge tests isolated by alias.
- [ ] Explicitly bridge old schemas in relevant fixtures, preserving their validator/framework baselines and documented response fields.
- [ ] Verify package exports, sourcemaps and optional peer baseline for intentional additions only.
- [ ] Run frozen installation, builds, unit/type/package checks and examples; full fixture runtime validation belongs to CI.

## Task 5: Document, review and deliver

Files: migration documentation, contributor docs and coordinated major Changeset.

- [ ] Document moved imports, old-schema bridging, StandardSchemaError identity/name, deprecated payload schemas and header override migration.
- [ ] Add coordinated major Changeset without changing package versions.
- [ ] Review against every issue #2 acceptance criterion and source/artifact evidence; resolve actionable findings.
- [ ] Commit/push the issue #2 branch and draft PR, inspect CI, resolve regressions until required checks pass.
- [ ] Record actual validation and any limitations; verify clean status and disabled releases.
