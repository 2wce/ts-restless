# Serverless empty-body reproduction and correction

**Recorded:** 2026-11-10. **Baseline:** main `1fcd7a61`, alpha.4. **Scope:** reproduce upstream [#696](https://github.com/ts-rest/ts-rest/issues/696) and [#772](https://github.com/ts-rest/ts-rest/issues/772), then correct bounded serverless failures. Client response behavior belongs to F04 separately.

The JSON request decoder runs before contract validation. Hypothesis: zero-length bytes currently raise a parsing error rather than reaching an undefined-accepting schema. The JSON response constructor stores `JSON.stringify(undefined)` as an undefined raw body, although the native Response accepts it; the AWS mapper then assumes a binary body. Explicit no-body responses use null and are a working comparison.

## Steps and acceptance

1. Extend existing Fetch and AWS v1/v2 suites: missing/empty JSON with undefined and no-body schemas, required-body rejection, malformed/whitespace JSON, ordinary JSON, undefined and explicit no-body responses. Confirm expected failures before changing source.
2. Consume JSON bytes once as an ArrayBuffer: zero byte length maps to undefined; nonempty bytes use native-compatible UTF-8 decoding and JSON.parse, retaining parse failures including a BOM-only body. Do not trust Content-Length to identify an absent body.
3. Normalize absent JSON serialization to null in TsRestResponse.fromJson, preserving raw-body types and native status/headers/clone behavior. Do not duplicate normalization in each host mapper.
4. Extend existing packed ESM/CommonJS Fetch/AWS journeys and strict declarations. Document empty-body behavior in the guide and a serverless patch Changeset.
5. Run focused source/inference, pnpm check, pnpm test:packages, docs lint, full docs test and whitespace checks. Record red/green evidence. Independent review and draft PR; no release actions.

## Verification

All final commands ran with native HTTP/cache/registry access where required:

- `pnpm exec vp test run --project serverless`: 98 passed after the review correction; pre-fix run had 10 expected failures and 86 passes.
- `pnpm check`: 14/14 tasks successful, 748 source tests passed, 2 existing todos; strict inference/typechecks retained.
- `pnpm test:packages`: 33 passed across 4 files. Real ESM/CommonJS Fetch and AWS v1/v2 consumers run across four validator profiles and Next 15/16, with strict declarations.
- `pnpm --filter @ts-restless/docs test`: build/prerender, typecheck, lint and 80 docs checks passed.
- `git diff --check`: passed.

Logs: `/private/tmp/ts-restless-empty-red.log`, `ts-restless-empty-green.log`, `ts-restless-empty-bom-check.log`, `ts-restless-empty-bom-packages.log`, `ts-restless-empty-docs-final.log`. Initial full checks caught test fixture typing mistakes and a pending evidence link; both corrected before these final runs. Package release files/guards remain untouched. Independent review caught a BOM-only payload incorrectly classified as absent by decoded string length. The new regression failed once; byte-length decoding now passes 98 focused tests and re-review. Draft delivery is recorded in the PR, with publication still separate.

[Dated reproduction evidence](../evidence/2026-11-10-empty-body-reproduction.md) records results and limits.
