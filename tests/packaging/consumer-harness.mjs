import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const archives = resolve(root, 'dist/packages');

export async function withTemporaryConsumer(prefix, operation) {
  const consumer = await mkdtemp(join(tmpdir(), prefix));
  try {
    return await operation(consumer);
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
}

export async function installConsumer(
  consumer,
  manifest,
  { strictPeers = false, allowNewPackages = false, frozenLockfile } = {},
) {
  await writeFile(join(consumer, 'package.json'), JSON.stringify(manifest));
  if (allowNewPackages) {
    await writeFile(
      join(consumer, 'pnpm-workspace.yaml'),
      'packages: ["."]\nminimumReleaseAge: 0\n',
    );
  }
  execFileSync(
    'pnpm',
    [
      'install',
      '--ignore-scripts',
      ...(frozenLockfile === false ? ['--no-frozen-lockfile'] : []),
      ...(strictPeers ? ['--strict-peer-dependencies'] : []),
    ],
    { cwd: consumer, stdio: 'pipe' },
  );
}

export function compileConsumer(
  consumer,
  file,
  { target = 'es2024', pretty } = {},
) {
  execFileSync(
    process.execPath,
    [
      resolve(root, 'node_modules/typescript/bin/tsc'),
      '--noEmit',
      '--strict',
      ...(pretty === undefined ? [] : ['--pretty', String(pretty)]),
      '--target',
      target,
      '--module',
      'nodenext',
      '--moduleResolution',
      'nodenext',
      '--esModuleInterop',
      file,
    ],
    { cwd: consumer, stdio: 'pipe' },
  );
}

export async function readFixture(name, replacements = {}) {
  let source = await readFile(
    new URL(`./fixtures/${name}`, import.meta.url),
    'utf8',
  );
  for (const [key, value] of Object.entries(replacements)) {
    source = source.replaceAll(`{{${key}}}`, () => value);
  }
  return source;
}
