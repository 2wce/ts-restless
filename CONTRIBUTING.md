# Contributing

Start with [the documentation map](docs/README.md), [architecture](docs/architecture.md)
and [roadmap](docs/roadmap.md). Contributor agents should also read [AGENTS.md](AGENTS.md).
Accepted rationale lives in [ADRs](docs/adr/README.md); detailed designs and execution
steps live together in [plans](docs/plans/README.md). Update current delivery status
in the roadmap and preserve dated verification in plans or [evidence](docs/evidence/README.md).

Use Node 26.12.0 (see `.nvmrc`) and pnpm 12.14.0. Run `nvm use` and
`pnpm install --frozen-lockfile`. Vite+ is pinned locally; no global CLI is needed.

## Command roles

Use `pnpm install` to manage dependencies and `pnpm <script>` as the user and CI
entry point. Workspace scripts use `vp` for builds, tests, checks and task
orchestration. When a workspace workflow calls another script, use `vp run`
so Vite+ can expand its task graph and preserve prerequisites and caching.
Use `pnpm exec` for one-off tools and `pnpm --filter <package> <script>` for
individual packages.

The docs app is part of the same pnpm workspace; root docs scripts select its
Vite+ tasks. Compatibility fixtures also use Node, pnpm and Vitest; their
independent dependency installations preserve consumer compatibility coverage.

## Commands

- `pnpm build`: build published libraries with Vite+.
- `pnpm test` / `pnpm test:watch`: library and example unit tests.
- `pnpm check`: format, type-aware lint and native TypeScript checks, then
  unit tests and inference assertions.
- `pnpm typecheck`: run package production and isolated strict/non-strict inference projects
  with the native TypeScript 7 compiler; these checks always run uncached.
- `pnpm test:packages`: verify built ESM/CommonJS exports, declarations,
  Nest injection metadata, React client boundaries and Changesets versioning.
  This command builds and packs the libraries before running the dedicated Vitest suite.
- `pnpm lint`: Oxlint with native type checking. Existing lint debt remains
  warnings; compiler errors fail the command.
- `pnpm format` / `pnpm format:check`: Oxfmt.
- `pnpm build:examples`: build framework examples with native commands.
- `pnpm docs:lint`: check documentation links/anchors, current repository facts and ADR structure.
- `pnpm nest`: generate the example database client, build, run and restart Nest.
- `pnpm --filter example-next dev`: generate the client and start Next.
- `pnpm --filter example-nest build` / `pnpm --filter example-next build`:
  build one database example.
- `pnpm example-microservice:serve`: run microservice development tasks.

Vite+ caches build scripts through `vp run`. Inference checks use `--no-cache`: a
negative probe showed native compiler file reads were not fully captured on this
host, so automatic caching could replay success after a new failing assertion. Workspace dependencies determine
ordering. Public libraries emit into their own `dist` directories. Native pnpm
packing creates consumer tarballs under root `dist/packages`.

## Example commands

All eleven example apps expose `build` and `dev` package scripts. From the
repository root, use `pnpm --filter <package-name> build` or
`pnpm --filter <package-name> dev`. Server examples also expose `start` where
there is a built application to run; build them first.

Nest and Next use thin script aliases to Vite+ `build-app` and `dev-app` tasks.
Those tasks generate the shared database client before invoking the framework
command. Vite+ expands nested task calls and preserves prerequisite ordering.
Use `pnpm exec vp run <package-name>#build` or `#dev` for the same task graph.

Microservice package names share the `example-microservice-` prefix, so
`pnpm example-microservice:serve` selects both services and all three frontends.
The users/posts services use ports 5002/5003; React, Solid and Vue use
5004/5005/5006 respectively. React and Solid call the posts service. Vue calls
the Nest blog API on port 3334; configure its database and run `pnpm nest`
separately when using Vue. See the
[database setup](libs/example-database/README.md#run-a-database-example).

Users accepts `PORT` (default `5002`). Posts accepts `PORT`, then lowercase
`port` (default `5003`), and calls `USERS_API_BASE_URL` (default
`http://localhost:5002`). React and Solid read `VITE_POSTS_API_BASE_URL`
(default `http://localhost:5003`) when Vite starts or builds. The
[React](apps/example-microservice/web-app/README.md#service-endpoints) and
[Solid](apps/example-microservice/web-app-solid/README.md#service-endpoints)
guides show alternate-port commands.

## Shared configuration

`tsconfig.base.json` contains common compiler settings. Root presets specialize
it for libraries, tests, declaration packing, Node examples and browser examples:
`tsconfig.library.json`, `tsconfig.test.json`, `tsconfig.pack.json`,
`tsconfig.node.json` and `tsconfig.web.json`. `tsconfig.assertions.json` supplies
the inference-check settings; owning packages select their assertion files. The
non-strict package maps core to its built declarations in its own config. Its
`typecheck` script runs the owning `check-inference` task, which depends on
`@ts-restless/core#pack`; fresh checks build those declarations first.

The presets use TypeScript's `${configDir}` variable for standard source/test
globs, so inherited patterns select files in the consuming package. Package
configs only declare exceptions, such as Node types, JSX behavior and the
non-strict fixture. Public libraries retain source/test solution references to
keep Node and Vitest globals out of their portable declaration projects. Vite+
owns build ordering; these references are for editor/checker project selection,
and are not a `tsc --build` pipeline. Source-only private libraries and Node
examples need one config. Next retains its framework-specific config.

The private `@ts-restless/build-config` workspace package shares the library pack
task, cache inputs/outputs, ESM/CJS builds, Node example pack preset
and Nest decorator transform. Consumers declare it in `devDependencies` as
`workspace:*` and import presets by package name. It owns its Vite+/SWC tooling
and exports TypeScript source directly, so it needs no build task. Its source,
manifest and compiler config are explicit library build cache inputs.

Public consumers use Node16/NodeNext or Bundler resolution through conditional exports. Both ESM and CommonJS remain supported; classic `node`/`node10` declaration fallbacks are removed. Installed consumers retain older/current compiler probes and strict old-Zod checks with modern resolution. See [ADR0012](docs/adr/0012-modern-module-resolution.md) and the [consumer migration](apps/docs/content/docs/ts-restless-migration.mdx#typescript-module-resolution).

Package Vite configs call `libraryConfig(entry, options?)` with their entry points
and artifact requirements. React Query declares unbundling, its combined
declaration config and v5 cache inputs; Nest declares its SWC decorator plugin.
Pack overrides use Vite's `mergeConfig`.
Root `vite.config.ts` owns workspace orchestration, and library Vitest projects
inherit its settings with `extends: true`. The [build-config README](libs/build-config/README.md)
describes the presets. Package consumer tests live under `tests/packaging` and
versioning tests under `tests/releases`. `tests/vite.config.ts` runs these integration
tests separately from unit tests; shared unit setup lives in `tests/setup.ts`.
There is no release staging workspace.

## Workspace packages and dependencies

Workspace packages export their TypeScript source files. Unit tests and examples
consume those exports directly, so normal development does not require a library
build or TypeScript path aliases. The React Query v5 subpath re-exports the
isolated v5 workspace; its release build uses `tsconfig.react-query-pack.json`
to include both source trees in native declaration generation.

Declare example dependencies in the package that uses them. Runtime imports go
in `dependencies`, tooling/tests/types in `devDependencies`, and local packages
use `workspace:*`. Use `catalog:` for versions shared through
`pnpm-workspace.yaml`. Published library dependencies and peer ranges keep their
consumer-facing version specs. Shared test tooling stays at the root.
The current workspace framework baselines are Next 16.4.2 and Nest 12.2.0
(with Swagger 12.0.2). Nest tests use the matching platform adapters and their
local Fastify 5.12.7 dependency. The standalone Fastify source suites and example retain their 4.x
baseline through `/legacy`; installed consumers verify Fastify 5 at root and
Fastify 4 through `/legacy`. Both adapter entries remain validator independent;
the native4/native5 packed consumers run with Valibot and no Zod installed.
Historical payload users import `RequestValidationErrorSchemaWithoutMessage`
from `@ts-restless/core/legacy`, optionally aliasing it to
`RequestValidationErrorSchema`; only that helper requires Zod3.
Nest 9/10/11 compatibility fixtures keep their separate installations.
The docs' workspace SDK examples use local Nest 11 dependencies.

Contracts keep `:param?` optional path syntax. The Nest adapter registers
concrete path alternatives through Nest's built-in path arrays so the same
contract works with older Express versions, Express 5 and Fastify. Native
framework route priority still applies: Express follows registration order,
while Fastify prioritizes static segments. Avoid ambiguous optional paths such
as `/:region?/users/:id?`: `/users/users` binds `region` on Express and `id` on
Fastify. This middle-optional path was previously unsupported on Fastify.

OpenAPI generation uses `openapi3-ts` 4.5.0 with explicit OpenAPI 3.0.2/3.1.0 targets. The deprecated `/legacy` converter uses the optional `@anatine/zod-openapi` 1.14.2 peer. Source and installed-consumer tests cover the converter boundary and generated client body requirements. Path inference tests use exact `Equal`/`Expect`
assertions from the core test helpers. Runtime builds inline helpers; no direct
`tslib` or SWC helpers dependency is needed.

The root also declares esbuild 0.28.2 as a catalog toolchain peer so Vite+ and
TanStack plugins resolve the same Vite runtime across root and docs. Without
that shared peer, pnpm can create separate runtime copies whose development
environment classes are incompatible.

The workspace compiler is TypeScript 7.0.2, with Node types 26.6.5. The
`typescript-legacy` alias pins 5.2.2 solely to check published declarations with
older consumers. The Vue example also selects 5.2.2 locally for its classic
compiler API. Next 16 and the Nest Swagger example select TypeScript 5.9.3
through the `classic-tooling` catalog because their integrations still need the
JavaScript compiler API. Library builds and workspace checks use TypeScript 7.
The pnpm `packageExtensions` entry declares the Vue SFC compiler's missing
TypeScript peer. Each app resolves its local compiler and React types
automatically.
No custom compiler registration or native bridge is needed. The ts-rest Vue
adapter itself builds and checks with TypeScript 7. The Vue example's `.ts`
files are checked by the native workspace checker; this does not add `.vue`
template type checking.

Standalone `test-projects` keep their own compiler versions and run in the
CI compatibility matrix; they are excluded from the root native lint checker.
The non-strict fixture retains its own compiler settings. New type-aware lint rules start as
warnings; the unbound-method rule is disabled in specs because assertions on
mock methods do not invoke those methods. There is no blanket compiler-error
suppression.

TypeScript 7 uses its native language server. The old VS Code `typescript.tsdk`
setting has been removed because this package no longer contains the classic
JavaScript editor SDK.

## Example database

`libs/example-database` owns the shared PostgreSQL schema, Prisma CLI and client
for Nest and Next. Those applications depend on `@ts-restless/example-database`;
published ts-rest libraries do not. Workspace installation does not generate a
Prisma client. `pnpm examples:generate` generates it explicitly. Vite+ task
dependencies also generate it before Nest/Next build and development tasks and
before the full `pnpm test`, `pnpm lint` and `pnpm check` workflows. Generated
client files and engines stay inside the private package and are ignored by Git,
lint and formatting.

`pnpm build` and `pnpm exec vp test run --project core` do not run generation.
To install only core and its dependencies, use
`pnpm --filter @ts-restless/core... install --frozen-lockfile` in a fresh checkout.
The [database README](libs/example-database/README.md) describes PostgreSQL setup.

## Example build outputs

All example build outputs stay in their application directory. Vite and Vite+
packing use their built-in `dist` default; Wrangler's dry-run build writes to
local `dist`, and Next keeps its local `.next` output. Node example start/watch
commands and Azure's function entry point resolve those local files. This lets
Node resolve dependencies from the owning application's `node_modules`.

Workspace discovery excludes `dist`, `.next` and generated-client directories,
so artifact manifests never become additional workspace packages.

Public libraries build into `libs/ts-rest/<package>/dist`. `pnpm pack:packages`
builds them and runs native recursive pnpm packing for the ten public packages,
excluding the private React Query v5 package.

## Consumer compatibility

The full ten-scenario matrix runs only in CI. The build job verifies and uploads
its native tarballs; each consumer job downloads them into a fresh checkout and
installs only its fixture dependencies. It never installs root dependencies, so
Node cannot fall back to the development workspace's packages. There is no
fixture copying step or Make runner.

External dependency versions stay locked. pnpm refreshes build archive checksums
only in the disposable checkout. Every installed ts-rest file is compared with
its archive before tests run. Every fixture uses Node, pnpm and Vitest. Nest
consumers run their own Nest build; Express and validator consumers use Vite+
packing and their own TypeScript 5 checker. Their shared consumer config contains
only data, so tooling always resolves from each independent installation.
The stable `Compatibility Fixtures` check fails if any matrix scenario fails or
is skipped, and is required before merging to `main`.

Locally, run `pnpm test`, `pnpm typecheck` and `pnpm test:packages`. The full matrix
is not part of these commands. To debug one scenario, use an independent checkout
without root `node_modules`, download the CI `compatibility-packages` artifact to
its `dist/packages` directory, and follow that scenario's commands in
`.github/workflows/build-test.yml`. For example, from the consumer checkout:

```sh
cd test-projects/nest-9
pnpm install --no-frozen-lockfile
pnpm test
pnpm build
```

The same install, test and build commands apply to every scenario. Treat
consumer checkouts as disposable; do not commit archive checksum updates from
these runs.

## Release automation

Prereleases use Changesets release PRs after successful `main` CI and all
compatibility fixtures in `.github/workflows/build-test.yml`. Pending Changesets
open/update the coordinated numbered prerelease PR. Merging it and passing CI
publishes its versions under the tag in committed Changesets prerelease state.
The dedicated release PR credential ensures those PRs trigger normal CI.

The job defaults off until the GitHub `RELEASE_PR_TOKEN` credential and each package's npm trusted publisher
are configured and the identity branch passes review/CI. Publishing uses OIDC
with provenance and no npm write-token secret. Activation uses repository
variable `PRERELEASE_ENABLED=true`. See the [prerelease checklist](docs/prerelease-checklist.md)
for credentials, artifacts, release notes and registry verification. Stable
publishing remains paused in `.github/workflows/release.yml` and needs its own
release decision.

## Host integration examples

Azure and Cloudflare host smoke tests are explicit: `pnpm test:hosts`. Vite+
builds the Azure example before running the tests, including on a fresh checkout.
The tests launch the hosts through the Azure `start` and Cloudflare `dev` package
scripts. Azure Functions Core Tools remains installed by the root workspace as
before. Serverless adapter unit tests run directly against the SDK request and
context objects.

## Documentation

The documentation in `apps/docs` uses TanStack Start and Fumadocs on Vite+.
The root workspace installation and lockfile own its dependencies. Twoslash 4
uses the native TypeScript 7 integration, so docs shares the catalog compiler.
SDK snippets compile against the local workspace packages for the fork's
unreleased major version. They resolve modern Zod 3 through an alias; Fumadocs
tooling uses Zod 4. Keep snippet diagnostics enabled. The hidden nested-router
setup in the fetch example uses literal path annotations to preserve inference
on newer compilers.

```sh
pnpm install --frozen-lockfile
pnpm docs:dev
pnpm docs:build
pnpm --filter @ts-restless/docs test
pnpm docs:start
```

`docs:build` prerenders every content URL, `/api/search.json`, `/llms.txt` and
`/markdown/<page>.md` into
`apps/docs/dist/client`, then runs native type checking. The docs build/typecheck task is uncached, so
new source type errors cannot be hidden by an incomplete native compiler cache. `docs:start` previews
that static production output. Dev and preview tasks are uncached. Docs remains
outside the main library lint/format scope and has its own build/type checks and
static output regression tests, also run in CI.

The **Documentation validation** CI job runs on every PR and main push; Build & Test
depends on it, preserving the existing release gate. `pnpm docs:lint` checks repository
Markdown links and anchors (including reference links/images), the support inventory's
public peers/optionality against manifests, documented public package imports/installs
against source and configured publish export maps, contributor commands/tool versions, and ADR
IDs/status/date/evidence/supersession links. Historical plans/evidence retain dated
facts; only their links are checked against the current tree.

The docs test task runs that lint, checker fixtures and the site build/typecheck,
including public guide/navigation links and generated Markdown links/anchors.
Vue/Solid/Nest snippets must retain Twoslash; blanket `@noErrors` is rejected.
Intentionally invalid completion/before examples need exact expected diagnostics and
an explanation. Not every illustrative fragment is compiled. These checks do not
prove factual prose, complete migrations, external website availability or npm
publication; review those against their actual evidence.

Consumer exports come from the same MDX collection and
retain installation commands, tab alternatives, warnings and code examples.
They describe development source; check a containing release before recommending
an installation for a newly merged feature.

Deploy the client output on a static host with directory index support; no
search or application server is required. Set `VITE_POSTHOG_KEY` and optionally
`VITE_POSTHOG_HOST` at build time to enable analytics. The old Next environment
names and `/ingest` rewrites no longer apply. See [the docs app README](apps/docs/README.md)
for content structure and hosting details.

## Validator-independent boundary

The default core and adapter entries use Standard Schema types and validation.
They must not import or bundle Zod, including through shared build chunks.
Zod-specific helpers live in explicit `/legacy` entries. Their compatibility code
must remain separate from the default runtime and declaration graph.

`pnpm test:packages` installs the real tarballs into isolated consumers for minimal
Standard Schema, Valibot, stable Zod 4 and explicitly bridged legacy Zod 3. It
checks ESM and CommonJS imports and strict declarations without `skipLibCheck`.
The no-Zod profiles also reject Zod in the installed dependency graph. The full
`test-projects` compatibility matrix remains CI-only.

Next consumers cover supported majors 15 and 16 with pinned Next 15.5.29 and
workspace Next 16.4.2. Each installed major is used for both NodeNext ESM/CommonJS
declaration checks and native Pages API / serverless NextRequest execution,
across all four validator profiles. These disposable consumers use React
19.3.1, React types 19.3.0 and ES2024 libraries; workspace examples retain their
existing React baseline.

Library checking remains enabled. Current upstream Next declarations produce
three reviewed diagnostics on 15.5.29 and two on 16.4.2: NodeNext Satori module
resolution, a relative import in Next 15's image-generation types, and a missing
SharpConstructor export. The fixture reports those diagnostics and matches
exact version, file, error code and message; every other compiler error fails.
This is checked adapter inference with explicit upstream limitations, not a
claim that all Next declarations compile without errors. When updating pinned
Next versions, re-evaluate the diagnostic list rather than widening it.

Next 12–14 are outside the first stable v4 peer ranges and are not used for
compatibility fixtures or current examples. See the
[Next support baseline](docs/support-policy.md#nextjs-baseline-for-ts-restless-v4)
and [official Next.js support policy](https://nextjs.org/support-policy).
See the [unreleased major migration guide](apps/docs/content/docs/standard-schema-migration.mdx)
for error identity, moved exports, old-schema bridging and header merge behavior.

## Releases

Changesets versions the original workspace manifests. Each public package keeps
source exports for development and declares `publishConfig` overrides for the
compiled `main`, `module`, `types`, conditional exports.

Its `files` allowlist includes `dist` and the changelog. pnpm also includes package
readmes and the workspace license. Packing uses normal pnpm metadata handling;
development dependency metadata may remain in the manifest, but consumers do not
install those dependencies.

The fixed Changesets group lists exactly the ten public libraries. Private
packages have versioning and tagging disabled: examples, docs, build tooling,
helpers and the bundled React Query v5 implementation keep their existing
versions and stay out of future release lists. Their workspace dependency links
remain usable. Existing versions and prerelease history are retained; private
packages were never eligible for npm publication.

`pnpm pack:packages` creates `dist/packages/ts-restless-<package>.tgz` without publishing.
`pnpm test:packages` runs real Changesets versioning probes and installs these
tarballs into a temporary consumer. It checks ESM/CJS exports, declaration
resolution, public peer ranges, Nest metadata and React directives.

Core peers use native `workspace:^`, which pnpm converts to `^<core-version>` in
the packed manifest. Compared with the old generated `~<major>.<minor>.0` rule,
this raises the minimum to the current core patch and allows later compatible
minor releases. Changesets updates peer dependents only when the core version
leaves their range, avoiding a major adapter bump for a compatible core minor.
This is configured through Changesets' built-in experimental
`onlyUpdatePeerDependentsWhenOutOfRange` option and covered by release probes.

Numbered prereleases use committed Changesets prerelease state. Automation runs
`pnpm prerelease:version`, which enters alpha mode only when no state exists,
versions the original manifests and refreshes the lockfile. The version PR
contains that state and its changelogs for review. `pnpm prerelease:verify` checks
the coordinated new-scope versions and tag; `pnpm prerelease:publish` repeats
validation, builds and invokes `changeset publish --tag <committed-tag>`.
Snapshot commands remain available for disposable versioning probes and are
separate from the numbered publication flow.

There is no generated release workspace or custom peer normalizer. Changesets
owns pending-change detection and registry checks. The stable `pnpm release`
script remains available, but its workflow stays disabled; the prerelease
coordinator rejects stable or exited state.
