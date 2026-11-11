# Side-effect metadata and bundle verification implementation plan

**Goal:** Let bundlers discard unused public package imports safely, with published-artifact evidence that used APIs retain required initialization.

**Architecture:** Audit emitted ESM/CommonJS entry graphs, then declare `sideEffects: false` only where module evaluation has no required external effects. Use a file allowlist for genuine initialization entries. Extend the existing installed-tarball suite with esbuild probes; keep runtime API ownership and build layout intact.

**Spec:** [F07 acceptance](release-readiness-backlog.md#f07--side-effect-metadata-and-bundle-verification), [package boundaries](../architecture.md#package-and-artifact-boundaries).

## Constraints

- Audit all ten public libraries and all executable export subpaths; private examples/tooling are outside the metadata promise.
- Import-time effects differ from operations invoked through exported APIs. Schema/symbol construction and decorators require inspection, not automatic exclusion.
- Preserve Nest legacy decorators/reflection metadata and React `use client` directives.
- Use Node 26.12.0, pnpm 12.14.0 and existing esbuild; no new bundler or release machinery.
- Do not version, merge or publish packages. Record local artifact evidence separately from availability.

## Task 1: Audit and verify the public metadata promise

**Files:** public `libs/ts-rest/*/package.json`, `tests/packaging/package-check.test.mjs`, `.changeset/*`, this plan. Shared build configuration changes require a demonstrated emitted-artifact defect.

**Interfaces:** Existing archive installation in `package-check.test.mjs` supplies actual published manifests and native peers. esbuild resolves imports from that isolated consumer using its package exports.

- [ ] Run `pnpm pack:packages`; enumerate built executable exports and inspect their transitive import-time initialization. Record each package/subpath's outcome below, including external registrations, globals, polyfills, decorators, schema construction and serverless factories.
- [ ] Extend the existing packed suite with a metadata assertion and a bundle importing all executable public subpaths whose values are unused. Build with `treeShaking: true`, `metafile: true`, external native peers, and the installed consumer as `absWorkingDir`; require zero retained bytes from public libraries and execute the resulting no-op bundle. Run the focused test and record the failure before metadata changes.
- [ ] Add used-export ESM/CJS bundle journeys: invoke core contract/client APIs, verify a retained Nest decorated class with `Reflect.getMetadata('design:paramtypes', TsRestInterceptor)[0] === Reflector`, and retain the existing compiled React directive assertions. Give used imports observable behavior so an empty bundle cannot pass.
- [ ] Add `"sideEffects": false` to audited public manifests, or exact emitted-file allowlists where required. Repack and prove the unused/used tests pass. Test a deliberately removed/incorrect metadata promise as a negative control if fixture structure allows it without complicating the suite.
- [ ] Add a patch Changeset for affected public libraries and concise audit evidence here. Update the plan index and roadmap; a new ADR is needed only if the audit reveals a consequential initialization policy decision.
- [ ] Run `pnpm check`, `pnpm test:packages`, `pnpm docs:lint` and the docs test task. Record results and limitations for the review commit, then create a draft PR.

## Audit and verification evidence

Execution starts from main `43b0a72d` after async headers merged. The manifests initially omit `sideEffects`. The task is planned before implementation; later entries record exact audited artifacts and verification, without claiming publication.
