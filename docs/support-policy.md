# Compatibility support and retirement policy

**Recorded:** 2026-11-04; Next baseline updated 2026-11-06. **Status:** Adopted policy. The user approved excluding upstream-unsupported Next majors from the first stable v4 baseline on 2026-11-06. The [A01 inventory](support-inventory.md) records version floors, working lines, evidence gaps and package ownership. The initial Query5-only baseline is approved below; other compatibility reductions remain subject to A19 of the [adapter maintenance epic](superpowers/plans/2026-11-04-adapter-maintenance-epic.md).

Support the newest verified dependency major actively, retain a previous supported major for a dated migration window, and remove compatibility in a ts-rest major release. This bounds maintenance work while giving consumers a predictable upgrade path.

## Framework versions and legacy APIs

Older dependency majors and legacy ts-rest APIs have different retirement conditions.

| Surface                                          | Replacement required before retirement                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Older Express, Nest, Fastify or Next major       | A newer supported framework line with verified runtime behavior, native lifecycle integration and public types. |
| Older query-library major                        | A supported integration for the newer major with verified query, mutation and cache behavior.                   |
| Legacy ts-rest helper, wrapper or import path    | An API that covers the supported capabilities, with buildable migration examples.                               |
| Older Zod 3 bridge or historical `/zod3` helpers | A tested migration to Standard Schema or a supported equivalent for each helper being removed.                  |

An upstream major release does not automatically establish ts-rest support. Upstream end-of-support triggers a review of the affected line; it does not silently remove compatibility.

### Next.js baseline for ts-restless v4

The first stable v4 supports Next.js **15 and 16** in both `@ts-restless/next` and `@ts-restless/serverless/next`, with peers `^15.0.0 || ^16.0.0`. Next.js **12–14 are excluded**. The [official Next.js support policy](https://nextjs.org/support-policy), checked on 2026-11-06, lists 16 as Active LTS, 15 as Maintenance LTS and 14 and earlier as unsupported. Next 15's security maintenance is extended through 2027-01-31.

This establishes the fork's initial stable major baseline rather than withdrawing a shipped stable v4 promise. Before adopting v4 on Next 12–14, upgrade Next using its [official upgrade guides](https://nextjs.org/docs/app/guides/upgrading) and use a current patched release of 15 or 16. Existing published upstream ts-rest v3 packages are unchanged.

Examples and current documentation target supported Next majors. The maintained example uses Next 16; Pages Router, App Router and Pages Router Edge integrations remain available. Router style is separate from framework-major lifecycle status. Packed consumers use Next 15.5.29 and 16.4.2 for native behavior and checked public types; exact upstream declaration diagnostics and untested floors are recorded in the inventory.

Review the official policy when updating this baseline. Changes to Next's LTS status do not edit our peer ranges automatically. After stable v4 publication, future removals follow the notice and major-release process below.

### Query baseline for ts-restless v4

On 2026-11-09 the user approved TanStack Query **v5 only** across React, Vue and Solid for the first stable fork v4. Query4 is removed entirely rather than moved to `/legacy`. Native peers are `^5.0.0`; React's public peer is `^18.0.0`, excluding React16/17. React root exports v5; `/v5` remains an alias. Vue/Solid retain their framework bindings and adopt native5. See the [migration guide](../apps/docs/content/docs/query-v5-migration.mdx) and inventory for measured verification and remaining floor/React19 gaps.

This is an initial stable-baseline decision, separate from removing a shipped stable fork promise. Existing upstream v3 and published fork prereleases remain unchanged. A six-month retirement clock has not started for other surfaces; future stable support changes retain the policy below.

## Support states

| State       | Maintenance commitment                                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Active      | The newest verified supported major receives features, compatibility fixes and critical fixes.                                                                                                   |
| Maintenance | The previous supported major receives critical security and correctness fixes during its migration window. New features target the active line.                                                  |
| Deprecated  | A retirement notice identifies the replacement, migration steps, earliest removal date and last compatible ts-rest release line. Critical fixes and compatibility checks continue until removal. |
| Retired     | New ts-rest releases no longer promise compatibility. Existing published versions remain available; any support for their release line must be stated separately.                                |

The target is one active dependency major plus one previous major during migration. Existing broader ranges need explicit retirement decisions before they can reach that target. Record exceptions when a replacement is unavailable or maintaining an additional line has a justified benefit.

Deprecation adds a dated notice to a supported line. It does not authorize dropping its tests or stopping promised critical fixes early. For every state, record the owning package, exact supported range and applicable checks.

## Migration window and removal timing

Give consumers at least six calendar months of notice. The window starts when both the public retirement notice and a released, verified replacement with migration guidance are available. Internal plans, prereleases and unreleased examples do not start the clock.

Remove support in the next scheduled ts-rest major release on or after the earliest removal date. Until that release, retain the promised compatibility and checks. If the release moves, update the notice; passing the date alone does not authorize a breaking minor or patch release.

When adding a new supported dependency major, decide the maintenance status and retirement schedule of the older lines in the same review. When maintaining an old line is no longer viable, make an explicit release decision and communicate its consequences rather than silently reducing support.

The fork's initial major can establish a narrower support baseline before its first stable publication. Document differences from upstream published v3 and provide migration guidance. This initial baseline decision is separate from retiring a compatibility promise already shipped by the fork. The [Standard Schema migration guide](../apps/docs/content/docs/standard-schema-migration.mdx) describes the v4 prerelease migration; stable v4 remains unreleased.

## Retirement requirements

Retire one selected surface per reviewable change. Before removal:

1. Record its owning package, current support promise, replacement, notice date, earliest removal date and planned major release. Identify the last compatible release line and any continued maintenance commitment.
2. Verify the replacement against installed package tarballs, strict declarations and the relevant runtime or native lifecycle checks. Test the migration examples as consumers would use them.
3. Publish migration guidance covering affected imports, types and observable behavior. API replacements must preserve the supported capabilities or explicitly document the approved breaking differences.
4. Keep the old compatibility checks through the migration window. In the removal change, update peer ranges, exports, implementation, docs, fixtures and a major Changeset together. Retain replacement and shared behavior coverage.
5. Verify removed imports fail clearly, unsupported peer combinations are identified, and supported consumers still pass. Record the remaining compatibility surfaces for later reviews.

Follow the [consumer compatibility workflow](../CONTRIBUTING.md#consumer-compatibility): the full isolated fixture matrix runs in CI. A passing pinned fixture establishes evidence for that installation, not every version allowed by a broad peer range. The A01 inventory reconciles declared floors and supported lines with the checks needed to justify them; unverified floors remain explicit gaps.

## Initial review priorities

The following observations are a checkout snapshot from 2026-11-04, not an adopted support reduction.

| Surface             | Current declaration or boundary                                                            | Next decision                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Express             | Peer range permits majors 4 and 5; isolated fixtures cover both.                           | Focus new work on 5; retain 4 until an explicit retirement decision. Verify isolated v5 types as well as runtime.                              |
| Nest                | Peer ranges permit majors 9 through 12; isolated fixtures cover 9, 10 and 11.              | Focus workspace work on 12; retain broader promises and add isolated 12 coverage before claiming equivalent evidence across lines.             |
| Next                | First stable v4 peers permit majors 15 and 16, per the 2026-11-06 decision above.          | Maintain verified LTS lines and current examples; review future lifecycle changes before updating published support.                           |
| Fastify             | Peer range permits major 4 only.                                                           | Deliver and verify support for a newer major before proposing a migration away from 4.                                                         |
| React Query         | Initial stable baseline permits Query5 only; root and `/v5` share one implementation.      | Verify the initial migration; future support reductions follow the stable retirement policy.                                                   |
| Vue and Solid Query | Initial stable baseline permits native Query5 only.                                        | Retain native reactivity/lifecycle and verified v5 migration coverage.                                                                         |
| Zod 3               | Standard Schema is the default boundary; older schemas and historical helpers use `/zod3`. | Keep the bridge through the initial migration. Review bridge and helper retirements separately; modern Zod 3 can use Standard Schema directly. |

Sources: library [package manifests](../libs/ts-rest/), the [isolated CI matrix](../.github/workflows/build-test.yml) and the [Standard Schema migration guide](../apps/docs/content/docs/standard-schema-migration.mdx).

A01's [support inventory](support-inventory.md) records the manifest, lockfile, fixture, compiler, runtime and ownership snapshot, including the approved initial Next baseline. Other broad-range exceptions and missing evidence remain explicit. No retirement clock for a published stable fork promise has started.

## Release handling

The current [Changesets configuration](../.changeset/config.json) places the ten explicit public `@ts-restless` libraries in a fixed group, so compatibility removal currently requires a coordinated major release. Independent adapter versioning can later reduce the release impact through A17; it is not a prerequisite for documenting the policy.

Use support documentation, migration guides and release notes to communicate retirement. Avoid blanket npm deprecation of releases that still contain supported integrations or entry points. Any npm deprecation must identify a specific obsolete or unusable release and explain the replacement accurately.

The retirement change must carry the appropriate Changeset. Publication remains a separate release action under the repository's existing release controls.
