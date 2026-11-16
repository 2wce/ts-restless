import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'vitest';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(root, 'node_modules/@changesets/cli/bin.js');
const archive = 'nest.tgz';
const publicLibraries = [
  'core',
  'express',
  'fastify',
  'nest',
  'next',
  'serverless',
  'react-query',
  'open-api',
  'solid-query',
  'vue-query',
];

async function workspace() {
  const cwd = await mkdtemp(join(tmpdir(), 'ts-restless-version-'));
  await mkdir(join(cwd, '.changeset'));
  await cp(
    join(root, '.changeset/config.json'),
    join(cwd, '.changeset/config.json'),
  );
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      name: 'version-test',
      private: true,
      workspaces: ['libs/ts-rest/*'],
    }),
  );
  await writeFile(
    join(cwd, 'pnpm-workspace.yaml'),
    "packages:\n  - 'libs/ts-rest/*'\n",
  );
  for (const name of [...publicLibraries, 'react-query-v5']) {
    await mkdir(join(cwd, 'libs/ts-rest', name), { recursive: true });
    await writeFile(
      join(cwd, 'libs/ts-rest', name, 'package.json'),
      JSON.stringify({
        name: `@ts-restless/${name}`,
        version: '3.52.1',
        private: name === 'react-query-v5',
        ...(name === 'react-query-v5'
          ? { dependencies: { '@ts-restless/core': 'workspace:*' } }
          : {}),
        ...(name === 'nest'
          ? {
              peerDependencies: {
                '@ts-restless/core': 'workspace:^',
                '@nestjs/core': '^9 || ^10 || ^11 || ^12',
              },
            }
          : {}),
      }),
    );
  }
  return cwd;
}

function changeset(cwd, ...args) {
  execFileSync(process.execPath, [cli, ...args], { cwd, stdio: 'pipe' });
}

async function bump(cwd, type, ...args) {
  await writeFile(
    join(cwd, '.changeset/test-bump.md'),
    `---\n"@ts-restless/core": ${type}\n---\nTest release.\n`,
  );
  changeset(cwd, 'version', ...args);
}

async function assertVersion(cwd, version, peer) {
  const pkg = JSON.parse(
    await readFile(join(cwd, 'libs/ts-rest/nest/package.json')),
  );
  assert.equal(pkg.version, version);
  assert.equal(pkg.peerDependencies['@ts-restless/core'], 'workspace:^');
  execFileSync(
    'pnpm',
    [
      '--dir',
      join(cwd, 'libs/ts-rest/nest'),
      'pack',
      '--out',
      join(cwd, archive),
      '--silent',
    ],
    { stdio: 'pipe' },
  );
  const published = JSON.parse(
    execFileSync('tar', ['-xOf', join(cwd, archive), 'package/package.json'], {
      encoding: 'utf8',
    }),
  );
  assert.equal(published.peerDependencies['@ts-restless/core'], peer);
  assert.equal(pkg.peerDependencies['@nestjs/core'], '^9 || ^10 || ^11 || ^12');
  const privatePkg = JSON.parse(
    await readFile(join(cwd, 'libs/ts-rest/react-query-v5/package.json')),
  );
  assert.equal(privatePkg.private, true);
  assert.equal(privatePkg.version, '3.52.1');
  assert.equal(privatePkg.peerDependencies, undefined);
}

test('patch and minor releases pack native caret peers without an unintended major bump', async () => {
  const cwd = await workspace();
  try {
    await bump(cwd, 'patch');
    await assertVersion(cwd, '3.52.2', '^3.52.2');
    await bump(cwd, 'minor');
    await assertVersion(cwd, '3.53.0', '^3.53.0');
    await bump(cwd, 'major');
    await assertVersion(cwd, '4.0.0', '^4.0.0');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('snapshot prereleases pack native caret peers using the calculated release version', async () => {
  const cwd = await workspace();
  try {
    await bump(cwd, 'minor', '--snapshot', 'rc');
    const core = JSON.parse(
      await readFile(join(cwd, 'libs/ts-rest/core/package.json')),
    );
    assert.match(core.version, /^3\.53\.0-rc\.\d+$/);
    await assertVersion(cwd, core.version, `^${core.version}`);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('numbered alpha releases progress together and exit to the intended stable major', async () => {
  const cwd = await workspace();
  try {
    changeset(cwd, 'pre', 'enter', 'alpha');
    await bump(cwd, 'major');
    await assertVersion(cwd, '4.0.0-alpha.0', '^4.0.0-alpha.0');
    await writeFile(
      join(cwd, '.changeset/next-alpha.md'),
      '---\n"@ts-restless/core": patch\n---\nNext alpha fix.\n',
    );
    changeset(cwd, 'version');
    await assertVersion(cwd, '4.0.0-alpha.1', '^4.0.0-alpha.1');
    changeset(cwd, 'pre', 'exit');
    changeset(cwd, 'version');
    await assertVersion(cwd, '4.0.0', '^4.0.0');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

function workspaceManifests() {
  return execFileSync('git', ['ls-files', '*package.json'], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .filter((path) => path.startsWith('apps/') || path.startsWith('libs/'));
}

async function forkWorkspace(
  sourceRoot = root,
  { initialRelease = true } = {},
) {
  const cwd = await mkdtemp(join(tmpdir(), 'ts-restless-fork-version-'));
  const manifests = workspaceManifests();
  for (const path of ['package.json', 'pnpm-workspace.yaml', ...manifests]) {
    await mkdir(dirname(join(cwd, path)), { recursive: true });
    await cp(join(sourceRoot, path), join(cwd, path));
  }
  // These characterize the initial major using today's real manifests. The
  // fixture must stay independent of alpha/stable state created by release PRs.
  for (const path of manifests) {
    const pkgPath = join(cwd, path);
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
    if (initialRelease && pkg.name.startsWith('@ts-restless/')) {
      pkg.version = '3.52.1';
      await writeFile(pkgPath, JSON.stringify(pkg));
    }
  }
  if (initialRelease) {
    await mkdir(join(cwd, '.changeset'));
    await cp(
      join(sourceRoot, '.changeset/config.json'),
      join(cwd, '.changeset/config.json'),
    );
    await writeFile(
      join(cwd, '.changeset/initial-major.md'),
      '---\n"@ts-restless/core": major\n---\nInitial fork major.\n',
    );
  } else {
    // The live release command validates retained changesets before filtering
    // consumed IDs from prestate, so preserve the entire committed directory.
    await cp(join(sourceRoot, '.changeset'), join(cwd, '.changeset'), {
      recursive: true,
    });
  }
  return cwd;
}

async function privateVersions(cwd) {
  const manifests = workspaceManifests();
  const versions = {};
  for (const path of manifests) {
    const pkg = JSON.parse(await readFile(join(cwd, path), 'utf8'));
    if (pkg.private) versions[path] = pkg.version;
  }
  return versions;
}

async function assertPrivateVersions(cwd, versions) {
  assert.ok(Object.keys(versions).length > 0);
  for (const [path, version] of Object.entries(versions)) {
    const pkg = JSON.parse(await readFile(join(cwd, path), 'utf8'));
    assert.equal(pkg.private, true, `${pkg.name}: remains private`);
    assert.equal(
      pkg.version,
      version,
      `${pkg.name}: private version unchanged`,
    );
    await assert.rejects(access(join(cwd, dirname(path), 'CHANGELOG.md')), {
      code: 'ENOENT',
    });
  }
}

function initReleaseRepository(cwd) {
  for (const args of [
    ['init', '--quiet', '--initial-branch=main'],
    ['config', 'user.name', 'Release Probe'],
    ['config', 'user.email', 'release-probe@example.test'],
    ['config', 'commit.gpgsign', 'false'],
    ['config', 'tag.gpgsign', 'false'],
    ['config', 'core.hooksPath', '/dev/null'],
    ['add', '.'],
    ['commit', '--quiet', '-m', 'Release fixture'],
  ]) {
    execFileSync('git', args, { cwd, stdio: 'pipe' });
  }
}

function prerelease(cwd, command) {
  return execFileSync(
    process.execPath,
    [join(root, 'scripts/prerelease.mjs'), command],
    { cwd, encoding: 'utf8', stdio: 'pipe' },
  );
}

function rejectPrerelease(cwd, pattern) {
  assert.throws(
    () => prerelease(cwd, 'verify'),
    (error) => {
      assert.match(error.stderr, pattern);
      return true;
    },
  );
}

test('actual fork manifests with an initial major produce ten v4 packages and correctly packed first-alpha peers', async () => {
  for (const tag of [undefined, 'alpha']) {
    const cwd = await forkWorkspace();
    try {
      const privateBefore = await privateVersions(cwd);
      if (tag) changeset(cwd, 'pre', 'enter', tag);
      initReleaseRepository(cwd);
      const statusFile = join(cwd, 'release-plan.json');
      changeset(cwd, 'status', '--output', statusFile);
      const plan = JSON.parse(await readFile(statusFile, 'utf8'));
      assert.deepEqual(
        plan.releases
          .filter((release) => release.type !== 'none')
          .map((release) => release.name)
          .sort(),
        publicLibraries.map((name) => `@ts-restless/${name}`).sort(),
      );
      changeset(cwd, 'version');
      await assertPrivateVersions(cwd, privateBefore);
      const version = tag ? '4.0.0-alpha.0' : '4.0.0';
      if (tag) {
        assert.match(prerelease(cwd, 'verify'), /4\.0\.0-alpha\.0 under alpha/);
        const prePath = join(cwd, '.changeset/pre.json');
        const pre = JSON.parse(await readFile(prePath));
        for (const invalidTag of ['beta', 'latest']) {
          await writeFile(prePath, JSON.stringify({ ...pre, tag: invalidTag }));
          rejectPrerelease(cwd, /tag|version/);
        }
        await writeFile(prePath, JSON.stringify({ ...pre, mode: 'exit' }));
        rejectPrerelease(cwd, /active prerelease/);
        await writeFile(prePath, JSON.stringify(pre));
        const corePath = join(cwd, 'libs/ts-rest/core/package.json');
        const core = JSON.parse(await readFile(corePath));
        await writeFile(
          corePath,
          JSON.stringify({ ...core, version: '4.0.0-alpha.1' }),
        );
        rejectPrerelease(cwd, /share one release version/);
        await writeFile(
          corePath,
          JSON.stringify({ ...core, version: '4.0.0' }),
        );
        rejectPrerelease(cwd, /numbered prerelease version/);
        await writeFile(corePath, JSON.stringify(core));
      } else {
        rejectPrerelease(cwd, /active prerelease/);
      }
      for (const name of publicLibraries) {
        const pkg = JSON.parse(
          await readFile(join(cwd, 'libs/ts-rest', name, 'package.json')),
        );
        assert.equal(pkg.name, `@ts-restless/${name}`);
        assert.equal(pkg.version, version, `${name}: first release version`);
        assert.notEqual(pkg.private, true);
      }
      const bundled = JSON.parse(
        await readFile(join(cwd, 'libs/ts-rest/react-query-v5/package.json')),
      );
      assert.equal(bundled.private, true);
      execFileSync(
        'pnpm',
        [
          '--dir',
          join(cwd, 'libs/ts-rest/nest'),
          'pack',
          '--out',
          join(cwd, archive),
          '--silent',
        ],
        { stdio: 'pipe' },
      );
      const packed = JSON.parse(
        execFileSync(
          'tar',
          ['-xOf', join(cwd, archive), 'package/package.json'],
          { encoding: 'utf8' },
        ),
      );
      assert.equal(packed.version, version);
      assert.equal(packed.peerDependencies['@ts-restless/core'], `^${version}`);
      assert.equal(packed.peerDependencies['@ts-rest/core'], undefined);
      console.log(
        `Verified actual fork: ten public ${version} packages and native core peer ranges.`,
      );
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
});

test('release PR version command bootstraps alpha once and advances the actual fork', async () => {
  const cwd = await forkWorkspace();
  try {
    const privateBefore = await privateVersions(cwd);
    rejectPrerelease(cwd, /active prerelease/);
    prerelease(cwd, 'version');
    await assertPrivateVersions(cwd, privateBefore);
    assert.match(prerelease(cwd, 'verify'), /4\.0\.0-alpha\.0 under alpha/);
    const initial = JSON.parse(
      await readFile(join(cwd, '.changeset/pre.json')),
    );
    await writeFile(
      join(cwd, '.changeset/followup-alpha.md'),
      '---\n"@ts-restless/core": patch\n---\nFollowup alpha fix.\n',
    );
    prerelease(cwd, 'version');
    await assertPrivateVersions(cwd, privateBefore);
    assert.match(prerelease(cwd, 'verify'), /4\.0\.0-alpha\.1 under alpha/);
    const next = JSON.parse(await readFile(join(cwd, '.changeset/pre.json')));
    assert.deepEqual(next.initialVersions, initial.initialVersions);
    assert.ok(next.changesets.includes('followup-alpha'));
    changeset(cwd, 'pre', 'exit');
    assert.throws(
      () => prerelease(cwd, 'version'),
      (error) => {
        assert.match(error.stderr, /active prerelease/);
        return true;
      },
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('current prerelease state and retained changesets advance only public libraries', async () => {
  const cwd = await forkWorkspace(root, { initialRelease: false });
  try {
    const privateBefore = await privateVersions(cwd);
    const core = JSON.parse(
      await readFile(join(cwd, 'libs/ts-rest/core/package.json'), 'utf8'),
    );
    const current = /^(\d+\.\d+\.\d+-(?:alpha|beta|rc)\.)(\d+)$/.exec(
      core.version,
    );
    assert.ok(current, 'fixture starts at an existing numbered prerelease');
    const expectedVersion = `${current[1]}${Number(current[2]) + 1}`;
    await writeFile(
      join(cwd, '.changeset/current-state-probe.md'),
      '---\n"@ts-restless/core": patch\n---\nCurrent state probe.\n',
    );
    prerelease(cwd, 'version');
    for (const name of publicLibraries) {
      const pkg = JSON.parse(
        await readFile(join(cwd, 'libs/ts-rest', name, 'package.json'), 'utf8'),
      );
      assert.equal(pkg.version, expectedVersion);
    }
    await assertPrivateVersions(cwd, privateBefore);
    assert.match(
      prerelease(cwd, 'verify'),
      new RegExp(expectedVersion.replaceAll('.', '\\.')),
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('publication uses the committed prerelease tag and rejects stable state before building', async () => {
  const { publishPrerelease } = await import('../../scripts/prerelease.mjs');
  for (const tag of ['alpha', 'beta', 'rc']) {
    const cwd = await forkWorkspace();
    try {
      const commands = [];
      const run = (command, args) => commands.push({ command, args });
      await assert.rejects(publishPrerelease(cwd, run), /active prerelease/);
      assert.deepEqual(commands, []);
      changeset(cwd, 'pre', 'enter', tag);
      changeset(cwd, 'version');
      await publishPrerelease(cwd, run);
      assert.deepEqual(commands[0], { command: 'pnpm', args: ['build'] });
      assert.equal(commands.length, tag === 'alpha' ? 12 : 2);
      assert.equal(commands[1].command, process.execPath);
      assert.deepEqual(commands[1].args, [cli, 'publish', '--tag', tag]);
      if (tag === 'alpha') {
        assert.deepEqual(
          commands.slice(2),
          [...publicLibraries].sort().map((name) => ({
            command: 'npm',
            args: [
              'dist-tag',
              'add',
              `@ts-restless/${name}@4.0.0-alpha.0`,
              'latest',
            ],
          })),
        );
      }
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  }
});

test('initial-release probes also run from a generated release PR and later alpha', async () => {
  const release = await forkWorkspace();
  try {
    prerelease(release, 'version');
    for (const expected of ['4.0.0-alpha.0', '4.0.0-alpha.1']) {
      assert.match(
        prerelease(release, 'verify'),
        new RegExp(expected.replaceAll('.', '\\.')),
      );
      for (const tag of [undefined, 'alpha']) {
        const probe = await forkWorkspace(release);
        try {
          if (tag) changeset(probe, 'pre', 'enter', tag);
          changeset(probe, 'version');
          const core = JSON.parse(
            await readFile(join(probe, 'libs/ts-rest/core/package.json')),
          );
          assert.equal(core.version, tag ? '4.0.0-alpha.0' : '4.0.0');
        } finally {
          await rm(probe, { recursive: true, force: true });
        }
      }
      await writeFile(
        join(release, '.changeset/next-probe.md'),
        '---\n"@ts-restless/core": patch\n---\nNext alpha.\n',
      );
      prerelease(release, 'version');
    }
  } finally {
    await rm(release, { recursive: true, force: true });
  }
});

test('real Changesets publication mirrors alpha to latest and repairs partial tag failures without republishing', async () => {
  const { publishPrerelease } = await import('../../scripts/prerelease.mjs');
  const cwd = await forkWorkspace();
  try {
    prerelease(cwd, 'version');
    await writeFile(
      join(cwd, '.changeset/new-alpha.md'),
      '---\n"@ts-restless/core": patch\n---\nNext alpha.\n',
    );
    prerelease(cwd, 'version');
    const prePath = join(cwd, '.changeset/pre.json');
    const original = await readFile(prePath, 'utf8');
    initReleaseRepository(cwd);
    const bin = join(cwd, 'bin');
    const log = join(cwd, 'publish-commands.jsonl');
    const registryDir = join(cwd, 'registry');
    await mkdir(registryDir);
    const registryPath = (name) =>
      join(registryDir, `${encodeURIComponent(name)}.json`);
    for (const name of publicLibraries) {
      await writeFile(
        registryPath(`@ts-restless/${name}`),
        JSON.stringify({
          versions: ['4.0.0-alpha.0'],
          'dist-tags': { alpha: '4.0.0-alpha.0', latest: '4.0.0-alpha.0' },
        }),
      );
    }
    await mkdir(bin);
    // Only the external npm/pnpm boundary is replaced. The real Changesets CLI
    // reads manifests/prestate and decides all tags and publication eligibility.
    for (const tool of ['npm', 'pnpm']) {
      await writeFile(
        join(bin, tool),
        `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const registryPath = (name) => path.join(${JSON.stringify(registryDir)}, encodeURIComponent(name) + '.json');
const readPackage = (name) => JSON.parse(fs.readFileSync(registryPath(name), 'utf8'));
if (args[0] === 'info') console.log(JSON.stringify(readPackage(args[1])));
else if (args[0] === '--version') console.log('12.14.0');
else if (args[0] === 'publish') {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const entry = readPackage(pkg.name);
  if (entry.versions.includes(pkg.version)) throw new Error('Already published');
  entry.versions.push(pkg.version);
  entry['dist-tags'][args[args.indexOf('--tag') + 1]] = pkg.version;
  fs.writeFileSync(registryPath(pkg.name), JSON.stringify(entry));
  fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({ name: pkg.name, args }) + '\\n');
  console.log('{}');
} else if (args[0] === 'dist-tag' && args[1] === 'add') {
  const split = args[2].lastIndexOf('@');
  const name = args[2].slice(0, split);
  const version = args[2].slice(split + 1);
  const entry = readPackage(name);
  if (!entry.versions.includes(version)) throw new Error('Version not published');
  entry['dist-tags'][args[3]] = version;
  fs.writeFileSync(registryPath(name), JSON.stringify(entry));
} else { console.error('Unexpected registry command', args); process.exit(1); }
`,
        { mode: 0o755 },
      );
    }
    const readRegistry = async () =>
      Object.fromEntries(
        await Promise.all(
          publicLibraries.map(async (name) => [
            `@ts-restless/${name}`,
            JSON.parse(
              await readFile(registryPath(`@ts-restless/${name}`), 'utf8'),
            ),
          ]),
        ),
      );
    const run = (command, args) => {
      if (command === 'pnpm' && args[0] === 'build') return;
      execFileSync(command, args, {
        cwd,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        stdio: 'pipe',
      });
    };
    await publishPrerelease(cwd, run);
    for (const pkg of Object.values(await readRegistry())) {
      assert.deepEqual(pkg['dist-tags'], {
        alpha: '4.0.0-alpha.1',
        latest: '4.0.0-alpha.1',
      });
    }
    const publications = (await readFile(log, 'utf8'))
      .trim()
      .split('\n')
      .map(JSON.parse);
    assert.equal(publications.length, 10);
    assert.deepEqual(
      publications
        .map((publication) => publication.name)
        .sort((left, right) => left.localeCompare(right)),
      publicLibraries.map((name) => `@ts-restless/${name}`).sort(),
    );
    for (const publication of publications) {
      assert.ok(publication.name.startsWith('@ts-restless/'));
      assert.equal(
        publication.args[publication.args.indexOf('--tag') + 1],
        'alpha',
      );
    }
    const tags = execFileSync('git', ['tag', '--list'], {
      cwd,
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .sort();
    assert.deepEqual(
      tags,
      publicLibraries
        .map((name) => `@ts-restless/${name}@4.0.0-alpha.1`)
        .sort(),
    );
    assert.equal(await readFile(prePath, 'utf8'), original);
    const stale = await readRegistry();
    for (const [name, pkg] of Object.entries(stale)) {
      pkg['dist-tags'].latest = '4.0.0-alpha.0';
      await writeFile(registryPath(name), JSON.stringify(pkg));
    }
    await assert.rejects(
      publishPrerelease(cwd, (command, args) => {
        if (
          command === 'npm' &&
          args[2] === '@ts-restless/express@4.0.0-alpha.1'
        ) {
          throw new Error('tag update failed');
        }
        run(command, args);
      }),
      /tag update failed/,
    );
    const partial = await readRegistry();
    assert.equal(
      partial['@ts-restless/core']['dist-tags'].latest,
      '4.0.0-alpha.1',
    );
    assert.equal(
      partial['@ts-restless/express']['dist-tags'].latest,
      '4.0.0-alpha.0',
    );
    assert.equal(await readFile(prePath, 'utf8'), original);
    await publishPrerelease(cwd, run);
    for (const pkg of Object.values(await readRegistry())) {
      assert.deepEqual(pkg['dist-tags'], {
        alpha: '4.0.0-alpha.1',
        latest: '4.0.0-alpha.1',
      });
    }
    assert.equal((await readFile(log, 'utf8')).trim().split('\n').length, 10);
    assert.equal(await readFile(prePath, 'utf8'), original);
    await assert.rejects(
      publishPrerelease(cwd, (command) => {
        if (command !== 'pnpm') throw new Error('publish failed');
      }),
      /publish failed/,
    );
    assert.equal(await readFile(prePath, 'utf8'), original);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
