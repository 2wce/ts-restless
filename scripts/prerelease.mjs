import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = join(root, 'node_modules/@changesets/cli/bin.js');
const tags = ['alpha', 'beta', 'rc'];
const publicLibraries = [
  'core',
  'express',
  'fastify',
  'nest',
  'next',
  'open-api',
  'react-query',
  'serverless',
  'solid-query',
  'vue-query',
];

async function readPreState(cwd) {
  try {
    return JSON.parse(await readFile(join(cwd, '.changeset/pre.json'), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw error;
  }
}

function validatePreState(pre) {
  assert.equal(
    pre?.mode,
    'pre',
    'An active prerelease state is required; stable publishing is paused',
  );
  assert.ok(
    tags.includes(pre.tag),
    'Unsupported prerelease tag; expected alpha, beta or rc',
  );
}

export async function verifyPrerelease(cwd) {
  const pre = await readPreState(cwd);
  validatePreState(pre);
  const names = [];
  const versions = new Set();
  for (const name of await readdir(join(cwd, 'libs/ts-rest'))) {
    const pkg = JSON.parse(
      await readFile(join(cwd, 'libs/ts-rest', name, 'package.json'), 'utf8'),
    );
    if (pkg.private) continue;
    assert.equal(
      pkg.name,
      `@ts-restless/${name}`,
      'Public packages must use the fork namespace',
    );
    assert.match(
      pkg.version,
      new RegExp(`^\\d+\\.\\d+\\.\\d+-${pre.tag}\\.\\d+$`),
      'Expected a numbered prerelease version matching the committed tag',
    );
    names.push(name);
    versions.add(pkg.version);
  }
  assert.deepEqual(
    names.sort(),
    publicLibraries,
    'Expected the reviewed set of ten public libraries',
  );
  assert.equal(
    versions.size,
    1,
    'Public libraries must share one release version',
  );
  return { tag: pre.tag, version: [...versions][0] };
}

function runner(cwd) {
  return (command, args) =>
    execFileSync(command, args, { cwd, stdio: 'inherit' });
}

async function versionPrerelease(cwd) {
  const run = runner(cwd);
  const pre = await readPreState(cwd);
  if (pre) validatePreState(pre);
  else run(process.execPath, [cli, 'pre', 'enter', 'alpha']);
  run(process.execPath, [cli, 'version']);
  return verifyPrerelease(cwd);
}

export async function publishPrerelease(cwd, run = runner(cwd)) {
  const release = await verifyPrerelease(cwd);
  run('pnpm', ['build']);
  const prePath = join(cwd, '.changeset/pre.json');
  const original = await readFile(prePath, 'utf8');
  // CLI 2.x forbids an explicit tag in active pre mode and may otherwise use
  // latest for prerelease-only packages. Exit only for this publish invocation;
  // keep numbered versions and restore the committed state even on failure.
  try {
    await writeFile(
      prePath,
      JSON.stringify({ ...JSON.parse(original), mode: 'exit' }),
    );
    run(process.execPath, [cli, 'publish', '--tag', release.tag]);
  } finally {
    await writeFile(prePath, original);
  }
  // Also repair latest on retries when Changesets skips already-published versions.
  if (release.tag === 'alpha') {
    for (const name of publicLibraries) {
      run('npm', [
        'dist-tag',
        'add',
        `@ts-restless/${name}@${release.version}`,
        'latest',
      ]);
    }
  }
  return release;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const command = process.argv[2];
    assert.ok(
      ['version', 'verify', 'publish'].includes(command),
      'Usage: prerelease.mjs version|verify|publish',
    );
    const release =
      command === 'version'
        ? await versionPrerelease(process.cwd())
        : command === 'publish'
          ? await publishPrerelease(process.cwd())
          : await verifyPrerelease(process.cwd());
    console.log(
      `Verified ten public libraries at ${release.version} under ${release.tag}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
