# Preserve contract identity across module formats

**Status:** Accepted. **Decision recorded:** 2026-11-16.

The no-body runtime marker uses a namespaced registered symbol. Its declaration
uses a namespaced structural brand, as do the existing `Opaque` plain/null
contract types. Loading the same coordinated package release through ESM and
CommonJS must preserve both inference and no-body response detection. Arbitrary
symbols and different opaque tokens remain distinct; these brands are contract
declarations, not runtime validation.

A registered runtime symbol alone fixes equality but leaves conditional-entry
declarations incompatible. Keeping module-local unique-symbol brands therefore
rejects valid shared contracts. Removing brands entirely would admit arbitrary
symbols and erase the distinction between plain, null and no-body declarations.
The namespaced brands retain those distinctions while making declaration
identity portable; `Opaque` and `UnwrapOpaque` retain their public semantics.

Rebuild shared contract packages and applications against a containing,
coordinated ts-restless release. This decision does not promise compatibility
with historical module-local markers or arbitrary mismatched package versions.
ESM and CommonJS entries remain available under the
[modern resolution decision](0012-modern-module-resolution.md).

Sources: [approved design](../plans/2026-11-16-upstream-issues-design.md#2-portable-contract-identity-53),
[implementation plan](../plans/2026-11-16-upstream-issues.md#task-2-make-mixed-format-contracts-portable-53)
and [strict installed-consumer regression](../../tests/packaging/package-check.test.mjs).
