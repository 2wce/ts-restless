# Example script consistency implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use executing-plans to implement these tasks inline.

**Goal:** Apply all five example script audit recommendations and commit the verified change.

**Architecture:** Package scripts expose build/dev consistently. Vite+ tasks own prerequisites through distinct internal task names. Host tests invoke the owning package script; no custom orchestration or new dependency is added.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, Vite+ 1.3.0, Vitest, Azure Functions Core Tools, Wrangler.

**Spec:** The five findings in the script audit, approved by the user with “lets fix all and commit”. Baseline commit: 0db100ef6a0e0256757dbdfd013edbf0067be2ad.

## Constraints

- Keep existing local dist/.next outputs and database-generation dependencies.
- Change only example command entry points, task wiring, names, host launch commands and associated docs.
- Preserve framework-native build/dev commands and current ports.
- No dependency upgrades, release staging changes or public API changes.
- Verify actual commands rather than adding tests that mirror configuration.

## Task 1: Uniform commands and names

Files: root package.json; Nest/Next package.json and vite.config.ts; Vue/Solid package.json.

- [x] Reproduce missing Next build script using `pnpm --filter example-next run build`.
- [x] Rename Nest/Next config tasks to build-app/dev-app and add manifest aliases `build: vp run build-app`, `dev: vp run dev-app`. Keep generation prerequisites on internal tasks and dev caching disabled.
- [x] Rename Vue/Solid private packages to example-microservice-web-app-vue and example-microservice-web-app-solid.
- [x] Simplify root build and microservice selectors to example-* and example-microservice-* respectively.
- [x] Verify frozen install, all eleven example builds and direct Nest/Next pnpm builds.

## Task 2: Self-contained host verification

Files: root package.json/vite.config.ts; Azure/Cloudflare host specs; CONTRIBUTING.md.

- [x] Set test:hosts to `vp run host-tests`. Define host-tests with command `vp test run --config vite.hosts.config.ts`, dependsOn example-azure-function#build and cache false.
- [x] Launch Azure using `pnpm --filter example-azure-function run start` and Cloudflare using `pnpm --filter example-cloudflare-worker run dev`. Remove shell mode and Azure's unused path import.
- [x] Move ignored Azure dist aside temporarily, then run pnpm test:hosts to prove the prerequisite rebuilds it and all fourteen tests pass. Remove the temporary backup afterward.

## Task 3: Documentation and delivery

Files: three microservice frontend READMEs and CONTRIBUTING.md.

- [x] Document root installation, individual build/dev scripts, coordinated microservice dev command and ports 5004/5005/5006. React/Solid use the posts service; Vue needs the separately running Nest API on port 3334 and its database setup.
- [x] Document consistent example command contract and automatic Azure build for test:hosts.
- [x] Run format/check; inspect the diff and confirm removed Nx commands and old selector names have no active references.
- [x] Review all five acceptance points and prepare only task changes for the requested commit `chore: standardize example app scripts`.

## Verification results

- Missing Next build entry point reproduced before editing: ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT.
- Frozen install passed without a lockfile change.
- All eleven example builds passed (13 Vite+ tasks including prerequisites).
- Direct pnpm Nest and Next builds passed with database-generation prerequisites.
- Host tests rebuilt missing Azure dist output and passed all fourteen tests.
- Full pnpm check passed: 565 tests, seven uncached inference projects, zero lint errors and 388 existing warnings.
- Coordinated microservice dev command opened all five ports (5002–5006); direct Next dev opened port 3000 after generation. All smoke-test processes stopped and ports closed afterward. Nest startup requires PostgreSQL and was not exercised; its build was verified.
- Development readiness probes cover IPv4 and IPv6 localhost because Vite binds to IPv6 on this host.
- Independent read-only review found no actionable script/configuration issues. Final documentation also records Vue's distinct Nest backend requirement.
- Final format and diff checks are the pre-commit gate after these documentation updates.
