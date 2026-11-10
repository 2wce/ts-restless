import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { checkLinks } from '../../../scripts/check-doc-links.mjs';
import { checkFacts } from '../../../scripts/check-docs.mjs';

async function workspace(t, files) {
  const root = await mkdtemp(join(tmpdir(), 'docs-check-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, value] of Object.entries(files)) {
    await mkdir(dirname(join(root, file)), { recursive: true });
    await writeFile(join(root, file), value);
  }
  return root;
}

test('checks reference links, duplicate headings, encoded paths and explicit anchors', async (t) => {
  const root = await workspace(t, {
    'README.md': '[second][ref]\n\n[ref]: docs/My%20Guide.md#hello-world-1\n\n[explicit](docs/My%20Guide.md#details)\n![image](image.svg)',
    'docs/My Guide.md': '# Hello *world*\n\n# Hello world\n\n<a id="details"></a>',
    'image.svg': '<svg/>',
  });
  const result = await checkLinks(root, ['README.md']);
  assert.equal(result.checked, 3);
  assert.deepEqual(result.failures, []);
});

test('rejects missing fragments, same-page fragments, reference targets and images', async (t) => {
  const root = await workspace(t, {
    'README.md': '# Home\n[bad](docs/guide.md#missing)\n[local](#absent)\n![image](missing.png)\n[ref][broken]\n\n[broken]: missing.md',
    'docs/guide.md': '# Present',
  });
  const result = await checkLinks(root, ['README.md']);
  assert.equal(result.failures.length, 4);
  assert.ok(result.failures.some((failure) => failure.includes('#missing')));
  assert.ok(result.failures.some((failure) => failure.includes('#absent')));
});

test('does not treat fenced links or code headings as documentation targets', async (t) => {
  const root = await workspace(t, {
    'README.md': '# Real\n\n```md\n# Pretend\n[example](missing.md)\n```\n\n[bad](#pretend)',
  });
  assert.equal((await checkLinks(root, ['README.md'])).failures.length, 1);
});

test('checks root-relative repository targets while leaving public URLs to the site build', async (t) => {
  const root = await workspace(t, {
    'README.md': '[valid](/docs/guide.md#present)\n[bad](/docs/guide.md#absent)\n[external](//example.com/docs)',
    'docs/guide.md': '# Present',
    'apps/docs/content/docs/page.mdx': '[site](/client/fetch)',
  });
  const result = await checkLinks(root, ['README.md', 'apps/docs/content/docs/page.mdx']);
  assert.equal(result.checked, 2);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /#absent/);
});

function facts() {
  return {
    files: new Map([
      ['docs/support-inventory.md', '| Owning package | Current peers | Boundary |\n| --- | --- | --- |\n| `@ts-restless/core` | `zod: ^3.0.0` (optional) | portable |'],
      ['AGENTS.md', 'Use Node 26.12.0 and pnpm 12.14.0. Run `pnpm check`.'],
      ['apps/docs/content/docs/guide.mdx', '```typescript twoslash\nimport { initContract } from "@ts-restless/core/zod3";\n```'],
      ['docs/adr/0001-portable.md', '# Portable\n\n**Status:** Accepted. **Decision:** 2026-11-10.\n\nChoose a portable contract.\n\nVendor coupling expands maintenance.\n\nSources: [evidence](../evidence/a.md).'],
    ]),
    packages: new Map([
      ['package.json', { name: 'repo', private: true, scripts: { check: 'vp check' }, engines: { node: '26.12.0', pnpm: '12.14.0' }, packageManager: 'pnpm@12.14.0' }],
      ['libs/ts-rest/core/package.json', { name: '@ts-restless/core', private: false, peerDependencies: { zod: '^3.0.0' }, peerDependenciesMeta: { zod: { optional: true } }, exports: { '.': './src/index.ts', './zod3': './src/zod3.ts' }, publishConfig: { exports: { '.': './dist/index.js', './zod3': './dist/zod3.js' } } }],
    ]),
    nodeVersion: '26.12.0',
  };
}

test('accepts current facts and leaves dated historical code unchanged', () => {
  const input = facts();
  input.files.set('docs/plans/old.md', 'Use Node 18. Run `pnpm obsolete`.\n```ts\nimport { oldApi } from "@ts-restless/core/old";\n```');
  assert.deepEqual(checkFacts(input), []);
});

test('rejects peer range, optionality and public-package inventory drift', () => {
  const input = facts();
  input.files.set('docs/support-inventory.md', '| Owning package | Current peers | Boundary |\n| --- | --- | --- |\n| `@ts-restless/core` | `zod: ^4.0.0` | portable |\n| `@ts-restless/ghost` | none | gone |');
  const errors = checkFacts(input);
  assert.ok(errors.some((error) => /peer/i.test(error)));
  assert.ok(errors.some((error) => /ghost/.test(error)));
});

test('rejects missing public packages and imports of private packages or removed subpaths', () => {
  const input = facts();
  input.files.set('docs/support-inventory.md', '# Empty inventory');
  input.packages.set('libs/ts-rest/internal/package.json', { name: '@ts-restless/internal', private: true });
  input.files.set('apps/docs/content/docs/guide.mdx', '```ts\nimport { x } from "@ts-restless/core/removed";\nimport { y } from "@ts-restless/internal";\n```');
  const errors = checkFacts(input);
  assert.ok(errors.some((error) => /inventory/i.test(error)));
  assert.ok(errors.some((error) => /removed/.test(error)));
  assert.ok(errors.some((error) => /internal/.test(error)));
});

test('rejects stale contributor commands and tool versions', () => {
  const input = facts();
  input.files.set('AGENTS.md', 'Use Node 20.0.0 and pnpm 9.0.0. Run `pnpm obsolete`.');
  const errors = checkFacts(input);
  for (const keyword of ['Node', 'pnpm', 'obsolete']) {
    assert.ok(errors.some((error) => error.includes(keyword)), keyword);
  }
});

test('validates filtered workspace scripts without treating native pnpm verbs as scripts', () => {
  const input = facts();
  input.packages.set('apps/docs/package.json', { name: '@ts-restless/docs', private: true, scripts: { test: 'vp test' } });
  input.files.set('CONTRIBUTING.md', '`pnpm install --frozen-lockfile`\n`pnpm --filter @ts-restless/docs test`\n`pnpm exec vp test`\n`pnpm --filter @ts-restless/docs missing`\n\n```sh\npnpm --filter @ts-restless/docs test\n```');
  assert.equal(checkFacts(input).length, 1);
  assert.match(checkFacts(input)[0], /missing/);
});

test('rejects invalid ADR status/date, duplicate IDs and missing evidence', () => {
  const input = facts();
  input.files.set('docs/adr/0001-other.md', '# Other\n\n**Status:** Shipped. **Decision:** 2026-02-30.\n\nChoose something.\n\nBecause maintenance matters.');
  const errors = checkFacts(input);
  for (const keyword of ['duplicate', 'status', 'date', 'evidence']) {
    assert.ok(errors.some((error) => error.includes(keyword)), keyword);
  }
});

test('requires reciprocal links for superseded decisions', () => {
  const input = facts();
  input.files.set('docs/adr/0001-portable.md', '# Old\n\n**Status:** Superseded by ADR-0002. **Decision:** 2026-11-10.\n\nChoose old behavior.\n\nRationale for old behavior.\n\nSources: [evidence](../evidence/a.md).');
  input.files.set('docs/adr/0002-new.md', '# New\n\n**Status:** Accepted. **Decision:** 2026-11-10.\n\nChoose new behavior.\n\nRationale for new behavior.\n\nSources: [evidence](../evidence/a.md).');
  assert.ok(checkFacts(input).some((error) => /reciprocal/.test(error)));
  input.files.set('docs/adr/0001-portable.md', input.files.get('docs/adr/0001-portable.md') + '\n[replacement](0002-new.md)');
  input.files.set('docs/adr/0002-new.md', input.files.get('docs/adr/0002-new.md') + '\n[previous](0001-portable.md)');
  assert.deepEqual(checkFacts(input), []);
});

test('checks supersession independently of metadata formatting and accepts resolved relative links', () => {
  const input = facts();
  input.files.set('docs/adr/0001-portable.md', '# Old\n\nStatus: superseded by ADR-0002\nDecision: 2026-11-10\n\nChoose old behavior.\n\nReason for old behavior.\n\n[evidence](../evidence/a.md)');
  input.files.set('docs/adr/0002-new.md', '# New\n\nStatus: accepted\nDecision: 2026-11-10\n\nChoose new behavior.\n\nReason for new behavior.\n\n[evidence](../evidence/a.md)');
  assert.ok(checkFacts(input).some((error) => /reciprocal/.test(error)));
  input.files.set('docs/adr/0001-portable.md', input.files.get('docs/adr/0001-portable.md') + '\n[replacement](./0002-new.md)');
  input.files.set('docs/adr/0002-new.md', input.files.get('docs/adr/0002-new.md') + '\n[previous](../adr/0001-portable.md)');
  assert.deepEqual(checkFacts(input), []);
});

test('keeps executable Vue, Solid and Nest examples under compiler checking', () => {
  const input = facts();
  input.files.set('apps/docs/content/docs/client/vue-query-v5.mdx', '```ts\nconst broken: string = 1;\n```');
  assert.ok(checkFacts(input).some((error) => /twoslash/.test(error)));
});

test('rejects blanket snippet diagnostic suppression', () => {
  const input = facts();
  input.files.set('apps/docs/content/docs/guide.mdx', '```typescript twoslash\n// @noErrors\nconst invalid: string = 42;\n```');
  assert.ok(checkFacts(input).some((error) => /noErrors/.test(error)));
});

test('checks package installation commands and treats an omitted private flag as public', () => {
  const input = facts();
  delete input.packages.get('libs/ts-rest/core/package.json').private;
  input.files.set('apps/docs/content/docs/guide.mdx', '```bash\npnpm add @ts-restless/core@alpha @ts-restless/missing@alpha\n```');
  const errors = checkFacts(input);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing/);
});
