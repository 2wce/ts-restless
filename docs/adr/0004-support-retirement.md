# Verify compatibility and retire support explicitly

**Status:** Accepted. **Policy adopted:** 2026-11-04.

Target one actively maintained verified dependency major and a previous supported major during a dated migration window. Existing broader promises require explicit retirement decisions; an upstream release or end-of-support notice triggers review rather than silently changing our peers. Pinned consumer success does not certify every version in a broad range.

For a shipped stable promise, announce the replacement, verify and release it with migration guidance, and allow at least six calendar months from both notice and replacement availability before removal in a major release. Keep promised checks and critical fixes through that window. Unreleased plans, prereleases and examples do not start the clock.

This bounds future upkeep while preserving a usable consumer migration. Initial stable baselines can differ from upstream v3 and earlier prereleases, with explicit replacements and fallback guidance. [ADRs 0005](0005-next-baseline.md) and [0006](0006-query-v5-baseline.md) record those scoped choices; they do not authorize other removals.

Sources: [maintained support policy](../support-policy.md), [original A01/A19 evidence](../plans/2026-11-04-adapter-maintenance-epic.md). Exact peers and checks live in [the inventory](../support-inventory.md).
