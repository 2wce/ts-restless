# Share collision-free contract identity across module formats

**Status:** Accepted. **Decision recorded:** 2026-11-18.

This decision supersedes [ADR0019](0019-portable-contract-identity.md). `Opaque`
uses a private unique-symbol property, and no-body uses
`Opaque<symbol, 'ContractNoBody'>` with the existing registered runtime symbol.
Both ESM and CommonJS public declaration entries resolve to one CommonJS
declaration graph; ESM declaration wrappers retain the proper module surface.
Public names and both runtime formats remain available.

A string brand can collide with a valid payload property, making a plain body
infer as `never`. Private symbols avoid reserving user property names. Separate
unique-symbol declaration graphs would restore mixed-format incompatibility;
one shared graph preserves identity without removing token distinctions or
admitting arbitrary no-body symbols. Native per-format pack settings and a
successful-build hook generate the public wrappers without editing hashed chunks.

Shared contract packages and applications must be rebuilt against the same
containing coordinated release. Historical or arbitrary mismatched versions
remain outside this guarantee. Older TypeScript declaration emitters can require
public annotations for exported shared contracts; strict checking stays enabled
and consumers must not import private generated chunks. Branding does not add
runtime validation.

Sources: [approved implementation plan](../plans/2026-11-18-collision-free-contract-identity.md),
[installed-consumer regression](../../tests/packaging/package-check.test.mjs),
[verification evidence](../evidence/2026-11-18-collision-free-contract-identity.md)
and [modern resolution decision](0012-modern-module-resolution.md).
