# Dependency ownership and native TypeScript

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

The user approved audit items 2, 3 and 6: remove unused root tools, modernize
TypeScript/native checking, and remove obsolete docs tooling while declaring
example dependencies in their owning packages. They also requested source
package exports instead of main paths escaping into dist, and Babel removal.

Work stays on chore/dx-improvements after ce1dfbe5. Node 26.12.0, pnpm 12.14.0
and Vite+ 1.3.0 remain pinned. No framework/validator major upgrades, publishing,
pushing or automatic commits are included.

## Design

Use pnpm's default catalog for shared development/example dependency versions.
Private examples declare runtime dependencies; published libraries keep public
dependencies and peer ranges unchanged. Root retains test/tool dependencies and
the existing shared Prisma generator. Delete unused root packages, TypeDoc
configs, the unused redirects script and all remaining unused Babel configs.
No replacement docs/dependency maintenance script is added.

Source workspace packages export their TypeScript sources. Generated release
manifests still export built ESM/CommonJS files with types. React Query v5 stays
in its isolated workspace to preserve its distinct TanStack version; a small
source re-export in the parent package makes the public v5 subpath resolvable
without an invalid outside-package export target. Source exports replace root
TypeScript/Vite aliases. No framework adapter or compatibility fixture is removed.

Upgrade the workspace compiler to TypeScript 7.0.2 and Node types to 26.6.5.
Use bundler resolution for bundled workspace source and remove baseUrl. The
supported Vite+ declaration generator selects its TypeScript 7 native path.
Enable Vite+ type-aware/type-check static checks. Keep isolated inference
projects as native compiler workspace tasks until checker parity is proven.
The packed consumer checker continues testing the old TypeScript 5.2.2 floor
and classic Node resolution with a development-only legacy compiler alias.
Standalone consumer fixtures keep their explicit older compiler/framework
versions. Babel may remain transitively where framework plugins require it.

## Verification

Frozen install; native/static checks; all seven inference projects; all library
and example builds; 16 packed entry points with legacy and current compilers;
unit and host tests; existing nine consumer fixtures. Test negative compiler
diagnostics by temporary incompatible source/unused expect-error changes and
restore those probes. Confirm source exports resolve before a library build.
Inspect peer metadata and runtime exports against the existing baseline.

## Final compatibility choices

Native declaration generation uses source-only library includes. React Query's
v4/v5 declaration build needs a config at their common workspace root because
the native generator uses its config directory as the emission root. Its cache
inputs include that config and both source trees.

Keep the existing TypeScript 5.2.2 package for declaration compatibility and the
Next 13/Vue example compilers. Vue 3.5.44's SFC prop resolver needs the classic
compiler API. pnpm packageExtensions declares its omitted TypeScript peer and
selects the example-local version; no manual registration is needed. A native
bridge would add a compiler fork for no benefit to prop resolution. Vue v4's
stock-TypeScript content-mapper migration remains draft and targets 7.1
nightlies: https://github.com/vuejs/language-tools/pull/6170.

Native diagnostics exposed obsolete skipped Vue stubs for unsupported React
APIs; those stubs and their React-only helper type were removed. Active Vue tests
remain. A targeted expect-error documents the existing mismatch between runtime
undefined-header removal and string-only extra-header types. Binary request bodies
now satisfy their declared ArrayBuffer boundary with owned bytes; the focused
regression test first failed on the old Buffer return and then passed.

Keep lint debt as warnings while compiler diagnostics fail checks. Old consumer
fixture checks remain independent. Remove the obsolete classic-editor SDK path.

The non-strict test workspace is explicitly private and no longer has an unused
barrel pointing at a nonexistent module. The Nest example declares its default
HTTP driver explicitly rather than relying on the root's test dependency.

Native inference tasks run with vp run --no-cache. The negative cache probe
showed a cached success after adding a failing assertion; direct compilation
detected it. Disabling caching for these fast checks avoids a maintained input
glob list and ensures the current assertion files are compiled each time.

## Example database follow-up

The user approved moving shared Prisma generation out of the root on 2026-10-19.
The example-only package and task prerequisites described in
`../plans/2026-10-19-example-database.md` supersede the earlier root Prisma
placement. Root installation no longer generates the example client.
