# Upstream issue fixes: approved design

Status: approved by the maintainer on 2026-11-16. Baseline: `f0526e371de1d7884d59e3668cd6dd99a571d717`.
Branch: `feat/upstream-issue-fixes`.

Resolve [#52](https://github.com/2wce/ts-restless/issues/52),
[#53](https://github.com/2wce/ts-restless/issues/53),
[#54](https://github.com/2wce/ts-restless/issues/54),
[#55](https://github.com/2wce/ts-restless/issues/55),
[#56](https://github.com/2wce/ts-restless/issues/56) and
[#57](https://github.com/2wce/ts-restless/issues/57) as six independently
testable changes on one feature branch.

## Constraints

Core remains framework-independent. Native integrations own guards,
interceptors, routing, parsing, response writing, providers and reactivity.
Retain public API names, conditional ESM/CommonJS entries, current peer ranges,
strict installed-consumer checks and compiler-checked public examples.
Extend nearby tests and existing packaging fixtures. Record consequential
compatibility decisions in ADRs, update migration guidance and add appropriate
Changesets. This work does not merge, version packages or publish a release.

Use Node 26.12.0 and pnpm 12.14.0. Consumer compiler/runtime support remains
separate from the contributor toolchain.

## 1. Nest method metadata (#52)

Generated multi-route methods must see method-level metadata after all native
decorators have run. Replace early snapshots of method metadata with inheritance
from the original function; keep generated route identity on each generated
function. Apply the ts-rest handler interceptor to the original function so
generated methods can inherit its final native interceptor list alongside guards
and custom metadata. Preserve parameter metadata and native method discovery.

Prove both source decorator orders using the existing Nest metadata/lifecycle
test, including a rejecting guard, interceptor execution, request identity,
falsy metadata, single-route controls and multiple controllers. Exercise native
Express/Fastify and retained Nest consumers. Do not manually run guards in the
ts-rest interceptor or alter Nest's global reflection functions.

## 2. Portable contract identity (#53)

Keep a symbol at runtime for the no-body marker, but register its identity so
ESM and CommonJS loads of the same package recognize the same declaration.
Represent its declaration brand without a module-local unique-symbol dependency;
preserve distinction from arbitrary symbols and ordinary schemas.

Add genuine mixed-format packed consumers: a CommonJS shared contract imported by
an ESM application and the reverse direction. Cover no-body requests/responses,
plain typed bodies and typed null declarations so another local contract brand
cannot mask the no-body fix. If these neighboring brands prevent interoperability,
make those contract brands portable in the same compatibility change while
retaining their distinct tokens and inference behavior.

Verify strict Node16/NodeNext/Bundler declarations and actual response decoding,
including malformed JSON that must not be decoded for a declared no-body
response. Retain ESM/CommonJS packaging. A runtime-only `Symbol.for` change is
insufficient because declaration compatibility is also required. Do not promise
interoperation between arbitrary mismatched historical package versions.

## 3. Next native control flow (#54)

The Next adapter must ask Next's public `unstable_rethrow` helper to preserve
native control-flow errors before application error handlers and generic
serverless conversion. Keep the Next import confined to its optional entry.
Use a construction-only native escape callback if the shared router needs it;
do not add Next-specific detection to core or other hosts.

Cover real redirect/permanent-redirect/not-found signals, ordinary errors,
declared HTTP errors, custom handlers and request/response middleware. Verify
both supported Next lines and non-GET forwarding. Ordinary errors retain their
existing logging and HTTP handling; genuine signals leave the adapter for Next
to interpret. Avoid importing Next's private error-marker modules.

## 4. Vue optimistic mutation inference (#55)

Thread an inferred mutation-result generic through the Vue wrapper's options,
return type and native useMutation call, retaining the default unknown context
when no onMutate result is provided. Preserve native undefined handling,
MaybeRef/reactive options and native callback signatures.

Extend existing inference checks with synchronous and asynchronous onMutate,
success/error/settled callbacks and per-mutate callbacks. Verify old/current
admitted Query 5 consumers and retain native lifecycle and reactivity. This
issue does not authorize a wider query API redesign.

## 5. Multipart field compatibility (#56)

Follow-up 2026-11-17: the client/request encoding choice below is superseded by
[ADR0021](../adr/0021-route-multipart-encoding.md) and the
[route-level plan](2026-11-17-route-multipart-encoding.md). The original decision
and acceptance criteria remain recorded here.

Recommended default: ordinary FormData field encoding. Preserve strings as
written; stringify numeric/boolean primitives; omit undefined fields; encode
null as `null` and nested objects as JSON. Arrays retain repeated field names,
with each element following the same rules. Files retain their binary identity.
Explicit caller-created FormData remains untouched.

Add `multipartFieldEncoding: 'native' | 'json'` to overridable client options,
with `native` as the default. `json` preserves the current per-field JSON
encoding, including its existing handling of undefined, for consumers with
matching server decoders. The option flows through plain/query clients and
request overrides through the established client argument path.

Verify client output against actual native multipart parsing and schema
validation, plus files, arrays, empty strings, false, zero, null, undefined,
objects, caller FormData and the compatibility mode. Document the wire-format
change and explicit legacy option. Multipart parsing remains caller/integration
owned; this does not introduce automatic parsing in Next or generic serverless
hosts.

Alternative: keep JSON encoding as the default and make native encoding opt-in.
That avoids changing existing wire output but leaves ordinary string uploads
surprising by default. Removing the historical mode entirely would simplify the
API but require every JSON-decoding consumer to migrate at once. The recommended
default plus compatibility mode resolves the reported failure while retaining
an explicit upgrade path during alpha development.

## 6. Express modular composition types (#57)

Export existing RouterImplementation and AppRouteImplementationOrOptions from
the public entry. Add TsRestExpressServer as the named equivalent of
ReturnType<typeof initServer>. Demonstrate a separately defined modular router
factory in the canonical Express guide.

Verify installed ESM/CommonJS imports and a compiler-checked modular example.
Keep route coverage and request/response inference strict; do not add a new
router runtime or weaken generic factory requirements.

## Execution and acceptance

Execute one issue at a time, each with a failing regression, minimal fix,
focused verification, documentation and a scoped commit. Start with Nest,
then portable contract identity and Next control flow; follow with Vue,
multipart compatibility and Express exports. The identity fix supplies a
reliable package boundary for later installed-consumer tests.

After focused checks pass, run `pnpm check`, `pnpm test:packages`,
`pnpm docs:lint`, `pnpm --filter @ts-restless/docs test`, `pnpm build:examples`
and `pnpm test:hosts` as applicable to the changed integrations. Inspect
freshly packed artifacts and use the existing independent compatibility matrix
for supported dependency lines. Record exact local/CI evidence and distinguish
implemented source from merged or published work.

The maintainer approved this design, including the multipart default and
portable contract branding. [The implementation plan](2026-11-16-upstream-issues.md)
tracks task execution and verification.
