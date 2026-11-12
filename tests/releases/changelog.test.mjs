import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { generateMDX } = require('../../apps/docs/generate-changelog.cjs');

test('generated changelog routes fork releases to this repository while retaining upstream history', () => {
  const content = generateMDX(
    new Map([
      [
        '4.0.0-alpha.0',
        [
          {
            package: 'core',
            hasContent: true,
            changes: [{ hash: '8d63911c', description: 'Fork release.' }],
          },
        ],
      ],
      [
        '3.52.1',
        [
          {
            package: 'core',
            hasContent: true,
            changes: [{ hash: '1234abcd', description: 'Upstream release.' }],
          },
        ],
      ],
    ]),
  );
  assert.ok(
    content.includes(
      '[8d63911c](https://github.com/2wce/ts-restless/commit/8d63911c)',
    ),
  );
  assert.ok(
    content.includes(
      '[1234abcd](https://github.com/ts-rest/ts-rest/commit/1234abcd)',
    ),
  );
});

test('changelog CLI detects stale output without writing, generates from input and accepts fresh output', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'ts-restless-changelog-'));
  try {
    const source = join(fixture, 'core');
    const output = join(fixture, 'changelog.mdx');
    await mkdir(source);
    await writeFile(
      join(source, 'CHANGELOG.md'),
      '# @ts-restless/core\n\n## 4.0.0-alpha.6\n\n### Patch Changes\n\n- deadbeef: Added example.\n',
    );
    await writeFile(output, 'stale output');
    const cli = (...args) =>
      spawnSync(
        process.execPath,
        [
          fileURLToPath(
            new URL('../../apps/docs/generate-changelog.cjs', import.meta.url),
          ),
          '--libs-dir',
          fixture,
          '--output',
          output,
          ...args,
        ],
        { encoding: 'utf8' },
      );
    const stale = cli('--check');
    assert.equal(stale.status, 1, stale.stdout + stale.stderr);
    assert.equal(await readFile(output, 'utf8'), 'stale output');
    const generated = cli();
    assert.equal(generated.status, 0, generated.stdout + generated.stderr);
    assert.equal(
      await readFile(output, 'utf8'),
      `---
title: Changelog
description: Combined ts-restless changelog, including historical upstream ts-rest releases.

---

## 4.0.0-alpha.6

- ([deadbeef](https://github.com/2wce/ts-restless/commit/deadbeef)) **core**: Added example.

`,
    );
    const fresh = cli('--check');
    assert.equal(fresh.status, 0, fresh.stdout + fresh.stderr);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
