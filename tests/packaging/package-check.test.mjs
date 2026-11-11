import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('../../', import.meta.url));
const baseline = JSON.parse(
  await readFile(new URL('./package-baseline.json', import.meta.url)),
);
test('packed packages preserve their public API and consumer compatibility', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'ts-restless-consumer-'));
  try {
    const dependencies = {};
    const external = new Set(['node:*', 'reflect-metadata']);
    const archives = resolve(root, 'dist/packages');
    for (const name of Object.keys(baseline)) {
      const archive = join(archives, `ts-restless-${name}.tgz`);
      const pkg = JSON.parse(
        execFileSync('tar', ['-xOf', archive, 'package/package.json'], {
          encoding: 'utf8',
        }),
      );
      assert.equal(pkg.name, `@ts-restless/${name}`, `${name}: fork identity`);
      assert.equal(
        pkg.typesVersions,
        undefined,
        `${name}: modern resolution uses conditional export declarations`,
      );
      assert.equal(
        pkg.sideEffects,
        false,
        `${name}: audited import-time effects`,
      );
      for (const dependency of Object.keys(pkg.peerDependencies ?? {})) {
        if (!dependency.startsWith('@ts-restless/')) external.add(dependency);
      }
      assert.equal(
        pkg.repository.url,
        'https://github.com/2wce/ts-restless.git',
        `${name}: actual fork repository`,
      );
      assert.equal(
        pkg.bugs.url,
        'https://github.com/2wce/ts-restless/issues',
        `${name}: actual fork issue reporting`,
      );
      for (const [subpath, target] of Object.entries(pkg.exports)) {
        if (subpath === './package.json') continue;
        assert.ok(
          target.import?.default?.startsWith('./dist/'),
          `${name}: ${subpath} compiled import target`,
        );
        assert.ok(
          target.require?.default?.startsWith('./dist/'),
          `${name}: ${subpath} compiled require target`,
        );
        assert.ok(
          target.import.types.endsWith('.d.mts'),
          `${name}: ESM declarations`,
        );
        assert.ok(
          target.require.types.endsWith('.d.ts'),
          `${name}: CJS declarations`,
        );
      }
      const files = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' })
        .trim()
        .split('\n');
      assert.ok(
        files.some((file) => /^package\/LICEN[CS]E$/i.test(file)),
        `${name}: license`,
      );
      assert.ok(files.includes('package/README.md'), `${name}: readme`);
      assert.ok(files.includes('package/CHANGELOG.md'), `${name}: changelog`);
      assert.ok(
        files.every(
          (file) =>
            file === 'package/package.json' ||
            file === 'package/README.md' ||
            file === 'package/CHANGELOG.md' ||
            /^package\/LICEN[CS]E$/i.test(file) ||
            file.startsWith('package/dist/'),
        ),
        `${name}: published file allowlist`,
      );
      assert.ok(
        !pkg.dependencies?.['@ts-restless/build-config'] &&
          !pkg.dependencies?.['@ts-restless/react-query-v5'],
        `${name}: no private runtime dependencies`,
      );
      dependencies[pkg.name] = `file:${archive}`;
    }
    // Install the artifacts through the package manager, including real external peers.
    // Pin those peers to the workspace's installed test versions; never symlink root deps.
    for (const name of [
      '@azure/functions',
      '@nestjs/common',
      '@nestjs/core',
      '@tanstack/react-query',
      '@tanstack/solid-query',
      '@tanstack/vue-query',
      '@types/aws-lambda',
      '@types/express',
      '@types/node',
      '@types/qs',
      '@types/react',
      '@types/react-dom',
      'express',
      'fastify',
      'next',
      'react',
      'react-dom',
      'reflect-metadata',
      'rxjs',
      'vue',
      'zod',
    ]) {
      const pkg = JSON.parse(
        await readFile(resolve(root, 'node_modules', name, 'package.json')),
      );
      dependencies[name] = pkg.version;
    }
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify({
        name: 'ts-restless-package-consumer',
        private: true,
        dependencies,
      }),
    );
    await writeFile(
      join(consumer, 'pnpm-workspace.yaml'),
      'packages: ["."]\nminimumReleaseAge: 0\n',
    );
    execFileSync(
      'pnpm',
      ['install', '--ignore-scripts', '--no-frozen-lockfile'],
      { cwd: consumer, stdio: 'inherit' },
    );
    const rootReact = await import(
      join(consumer, 'node_modules/@ts-restless/react-query/dist/index.esm.mjs')
    );
    const aliasReact = await import(
      join(consumer, 'node_modules/@ts-restless/react-query/dist/v5.esm.mjs')
    );
    assert.equal(rootReact.initTsrReactQuery, aliasReact.initTsrReactQuery);
    assert.equal('initQueryClient' in rootReact, false);
    assert.equal('useTsRestQueryClient' in rootReact, false);
    const imports = [];
    for (const [name, before] of Object.entries(baseline)) {
      const pkg = JSON.parse(
        await readFile(
          join(consumer, 'node_modules/@ts-restless', name, 'package.json'),
        ),
      );
      assert.deepEqual(
        Object.keys(pkg.exports).sort(),
        before.subpaths.toSorted(),
        `${name}: public subpaths`,
      );
      const source = JSON.parse(
        await readFile(resolve(root, 'libs/ts-rest', name, 'package.json')),
      );
      assert.equal(pkg.version, source.version, `${name}: release version`);
      const peers = { ...before.peerDependencies };
      if (name !== 'core') {
        peers['@ts-restless/core'] = `^${source.version}`;
      }
      assert.deepEqual(pkg.peerDependencies, peers, `${name}: peer ranges`);
      assert.deepEqual(
        pkg.peerDependenciesMeta,
        before.peerDependenciesMeta,
        `${name}: optional peers`,
      );
      assert.ok(
        !pkg.scripts?.prepublishOnly && !pkg.scripts?.prepare,
        `${name}: no publish lifecycle required by consumers`,
      );
      for (const subpath of Object.keys(pkg.exports)) {
        if (subpath === './package.json') continue;
        imports.push(before.name + (subpath === '.' ? '' : subpath.slice(1)));
      }
    }
    await writeFile(
      join(consumer, 'consumer.mjs'),
      `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
for (const name of ${JSON.stringify(imports)}) {
 const esm = await import(name); const cjs = require(name);
 assert.deepEqual(Object.keys(esm).filter(k => k !== 'default').sort(), Object.keys(cjs).sort(), name);
}
const { initContract } = await import('@ts-restless/core');
assert.equal(initContract().router({ get: { method: 'GET', path: '/test', responses: {} } }).get.path, '/test');
await import('reflect-metadata');
const { TsRestInterceptor } = await import('@ts-restless/nest');
const { Reflector } = await import('@nestjs/core');
assert.equal(Reflect.getMetadata('design:paramtypes', TsRestInterceptor)[0], Reflector);
`,
    );
    execFileSync(process.execPath, [join(consumer, 'consumer.mjs')], {
      stdio: 'inherit',
    });
    // Resolve the installed package exports, not workspace source aliases.
    // Metadata must let unused modules disappear even when their bodies contain
    // schema construction or decorators that a bundler cannot prove pure.
    for (const format of ['esm', 'cjs']) {
      const extension = format === 'esm' ? 'mjs' : 'cjs';
      const unusedOptions = {
        absWorkingDir: consumer,
        stdin: {
          contents:
            imports
              .map(
                (name, index) =>
                  `import * as entry${index} from ${JSON.stringify(name)};`,
              )
              .join('\n') + '\nconsole.log("unused imports removed");',
          resolveDir: consumer,
          sourcefile: `unused.${extension}`,
        },
        bundle: true,
        platform: 'node',
        format,
        external: [...external],
        treeShaking: true,
        metafile: true,
        write: false,
      };
      const unused = await build(unusedOptions);
      const retained = Object.values(unused.metafile.outputs).flatMap(
        (output) =>
          Object.entries(output.inputs).filter(
            ([path, input]) =>
              path.includes('@ts-restless/') && input.bytesInOutput > 0,
          ),
      );
      assert.deepEqual(
        retained,
        [],
        `${format}: unused public modules removed`,
      );
      if (format === 'esm') {
        // Negative control: conservative metadata retains Nest's decorators.
        // This proves the probe observes the package promise, not just ordinary
        // export-level elimination of already-pure functions.
        const nestManifest = join(
          consumer,
          'node_modules/@ts-restless/nest/package.json',
        );
        const original = await readFile(nestManifest, 'utf8');
        const replacement = `${nestManifest}.control`;
        try {
          // Replace the inode; installed files may be hard-linked to pnpm's store.
          await writeFile(
            replacement,
            JSON.stringify({ ...JSON.parse(original), sideEffects: true }),
          );
          await rename(replacement, nestManifest);
          const conservative = await build(unusedOptions);
          assert.ok(
            Object.values(conservative.metafile.outputs).some((output) =>
              Object.entries(output.inputs).some(
                ([path, input]) =>
                  path.includes('@ts-restless/nest/') &&
                  input.bytesInOutput > 0,
              ),
            ),
            'without the promise, unused Nest initialization is retained',
          );
        } finally {
          await writeFile(replacement, original);
          await rename(replacement, nestManifest);
        }
      }
      const unusedPath = join(consumer, `unused.${extension}`);
      await writeFile(unusedPath, unused.outputFiles[0].text);
      assert.equal(
        execFileSync(process.execPath, [unusedPath], {
          encoding: 'utf8',
        }).trim(),
        'unused imports removed',
      );

      const usedApis = {
        '@ts-restless/core': ['initContract', 'initClient'],
        '@ts-restless/nest': ['TsRestInterceptor', 'TsRestModule'],
        '@nestjs/core': ['Reflector'],
        '@ts-restless/serverless/fetch': ['createFetchHandler', 'tsr'],
      };
      const apiImports = Object.entries(usedApis)
        .map(([name, exports]) =>
          format === 'esm'
            ? `import { ${exports.join(', ')} } from ${JSON.stringify(name)};`
            : `const { ${exports.join(', ')} } = require(${JSON.stringify(name)});`,
        )
        .join('\n');
      const source = `
${format === 'esm' ? "import 'reflect-metadata';\nimport assert from 'node:assert/strict';" : "require('reflect-metadata');\nconst assert = require('node:assert/strict');"}
${apiImports}
const c = initContract();
const contract = c.router({ get: { method: 'GET', path: '/retained', responses: { 200: c.type() } } });
const client = initClient(contract, { baseUrl: 'https://example.test', api: async ({ path }) => ({ status: 200, body: { path }, headers: new Headers() }) });
assert.equal(Reflect.getMetadata('design:paramtypes', TsRestInterceptor)[0], Reflector);
assert.ok(Reflect.getMetadata('exports', TsRestModule).length > 0);
const implementation = tsr.router(contract, { get: async () => ({ status: 200, body: { value: 'serverless' } }) });
const handler = createFetchHandler(contract, implementation);
Promise.all([client.get(), handler(new Request('https://example.test/retained'))]).then(async ([clientResponse, serverResponse]) => {
  assert.equal(clientResponse.body.path, 'https://example.test/retained');
  assert.equal(serverResponse.status, 200);
  assert.deepEqual(await serverResponse.json(), { value: 'serverless' });
  console.log('retained APIs work');
}).catch(error => { console.error(error); process.exitCode = 1; });
`;
      const usedPath = join(consumer, `retained.${extension}`);
      await build({
        absWorkingDir: consumer,
        stdin: {
          contents: source,
          resolveDir: consumer,
          sourcefile: `retained-input.${extension}`,
        },
        outfile: usedPath,
        bundle: true,
        platform: 'node',
        format,
        external: [...external],
        treeShaking: true,
      });
      assert.equal(
        execFileSync(process.execPath, [usedPath], { encoding: 'utf8' }).trim(),
        'retained APIs work',
        `${format}: used API and Nest metadata behavior`,
      );
    }
    const files = await readdir(
      join(consumer, 'node_modules/@ts-restless/react-query'),
      { recursive: true },
    );
    for (const name of ['provider-inner', 'use-tsr-query-client']) {
      for (const extension of ['.esm.mjs', '.cjs.js']) {
        const file = files.find((f) => f.endsWith(name + extension));
        assert.ok(file, `${name}: preserved module`);
        assert.match(
          await readFile(
            join(consumer, 'node_modules/@ts-restless/react-query', file),
            'utf8',
          ),
          /["']use client["']/,
        );
      }
    }
    // Conditional export declarations must resolve with older/current compilers.
    // CommonJS consumers remain supported through modern Node resolution.
    const typeImports = imports
      .map(
        (name, index) =>
          `import * as entry${index} from ${JSON.stringify(name)}; void entry${index};`,
      )
      .join('\n');
    const typeConsumer = `${typeImports}\nimport { initContract, ClientInferResponseBody } from '@ts-restless/core';
import { initTsrReactQuery as initDefault } from '@ts-restless/react-query';
import { initTsrReactQuery } from '@ts-restless/react-query/v5';
import { createFetchHandler } from '@ts-restless/serverless/fetch';
const contract = initContract().router({ get: { method: 'GET', path: '/test', responses: { 200: initContract().type<{ value: string }>() } } });
const value: ClientInferResponseBody<typeof contract.get, 200> = { value: 'ok' };
// @ts-expect-error response inference must reject incompatible body values
const invalid: ClientInferResponseBody<typeof contract.get, 200> = { value: 1 };
void [initDefault, initTsrReactQuery, createFetchHandler, value, invalid];
`;
    for (const extension of ['ts', 'mts', 'cts']) {
      await writeFile(join(consumer, `consumer.${extension}`), typeConsumer);
    }
    for (const [compiler, mode, extension] of [
      ['typescript-legacy', 'bundler', 'ts'],
      ['typescript-legacy', 'node16', 'mts'],
      ['typescript-legacy', 'node16', 'cts'],
      ['typescript-legacy', 'nodenext', 'mts'],
      ['typescript-legacy', 'nodenext', 'cts'],
      ['typescript', 'bundler', 'ts'],
      ['typescript', 'node16', 'mts'],
      ['typescript', 'node16', 'cts'],
      ['typescript', 'nodenext', 'mts'],
      ['typescript', 'nodenext', 'cts'],
    ]) {
      execFileSync(
        process.execPath,
        [
          resolve(root, 'node_modules', compiler, 'bin/tsc'),
          '--noEmit',
          '--strict',
          '--skipLibCheck',
          '--target',
          'es2019',
          '--module',
          mode === 'bundler' ? 'esnext' : mode,
          '--moduleResolution',
          mode,
          join(consumer, `consumer.${extension}`),
        ],
        { stdio: 'inherit' },
      );
    }
    console.log(
      `Verified ${Object.keys(baseline).length} packed packages, ${imports.length} ESM/CJS entry points, types, Nest metadata and React directives.`,
    );
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});
