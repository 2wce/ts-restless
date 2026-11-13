import assert from 'node:assert/strict';
import { test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, access, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  root,
  archives,
  withTemporaryConsumer,
  installConsumer,
  compileConsumer,
  readFixture,
} from './consumer-harness.mjs';

// Follow emitted chunks as well as the root. Fastify's native4 legacy entry
// also stays independent; historical payload helpers live in core legacy.
async function checkDefaultGraph(path, seen = new Set()) {
  if (seen.has(path)) return;
  seen.add(path);
  const code = await readFile(path, 'utf8');
  const moduleEdges = [
    ...code.matchAll(
      /\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)["']([^"']+)["']/g,
    ),
  ].map((match) => match[1]);
  assert.ok(
    moduleEdges.every(
      (specifier) => specifier !== 'zod' && !specifier.startsWith('zod/'),
    ),
    `${path}: default graph must not load Zod`,
  );
  try {
    const map = JSON.parse(await readFile(`${path}.map`, 'utf8'));
    assert.ok(
      map.sources.every((source) => !/(?:^|\/)zod(?:@[^/]+)?\//.test(source)),
      `${path}: default graph must not bundle Zod`,
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // The packer omits maps for generated re-export-only entries. Every
    // implementation chunk must still have its own inspected sourcemap.
    const implementation = code
      .replace(/export\s*\{[^}]*\}\s*from\s*["'][^"']+["'];?/g, '')
      .replace(
        /import\s*\{[\w$\s,]+\}\s*from\s*["']\.{1,2}\/[^"']+\.[cm]?js["'];?/g,
        '',
      )
      .replace(/export\s*\{[\w$\s,]+\}\s*;?/g, '')
      .replace(
        /Object\.defineProperty\(exports, Symbol\.toStringTag, \{ value: "Module" \}\);/g,
        '',
      )
      .replace(/(?:const|let) \w+ = require\(["'][^"']+["']\);/g, '')
      .replace(/exports\.\w+ = \w+\.\w+;/g, '')
      .replace(
        /Object\.defineProperty\(exports, "\w+", \{\s*enumerable: true,\s*get: function\(\) \{\s*return \w+\.\w+;\s*\}\s*\}\);/g,
        '',
      );
    assert.equal(
      implementation.trim(),
      '',
      `${path}: implementation requires a sourcemap`,
    );
  }
  for (const relative of moduleEdges.filter(
    (specifier) => specifier.startsWith('.') && /\.[cm]?js$/.test(specifier),
  )) {
    await checkDefaultGraph(resolve(dirname(path), relative), seen);
  }
}

for (const name of [
  'core',
  'open-api',
  'express',
  'fastify',
  'nest',
  'next',
  'serverless',
]) {
  test(`packed ${name} ${name === 'fastify' ? 'root/legacy' : 'default'} ESM and CommonJS graphs do not load or bundle Zod`, async () => {
    await withTemporaryConsumer('ts-restless-graph-', async (unpacked) => {
      execFileSync('tar', [
        '-xzf',
        join(archives, `ts-restless-${name}.tgz`),
        '-C',
        unpacked,
      ]);
      const packageRoot = join(unpacked, 'package');
      const pkg = JSON.parse(
        await readFile(join(packageRoot, 'package.json'), 'utf8'),
      );
      for (const [subpath, target] of Object.entries(pkg.exports)) {
        if (
          subpath === './package.json' ||
          (subpath === './legacy' && name !== 'fastify')
        )
          continue;

        for (const format of ['import', 'require']) {
          await checkDefaultGraph(resolve(packageRoot, target[format].default));
        }
      }
    });
  });
}

const sources = {
  standard: `const schema: StandardSchemaV1<string, number> = {
    '~standard': { version: 1, vendor: 'consumer', validate: (value) =>
      typeof value === 'string' ? { value: Number(value) } : { issues: [{ message: 'Expected string' }] } }
  };`,
  valibot: `import * as v from 'valibot';
  const schema = v.pipe(v.string(), v.transform(Number));`,
  'zod-4': `import { z } from 'zod';
  const schema = z.string().transform(Number);`,
  'zod-3-legacy': `import { z } from 'zod';
  import { toStandardSchema } from '@ts-restless/core/legacy';
  const schema = toStandardSchema(z.string().transform(Number));`,
};

// Reviewed failures in the installed Next declarations, not adapter diagnostics.
// Keep library checking enabled and reject every other compiler error. Match
// exact files, codes and messages for these pinned versions; do not stub types.
const missingSatori =
  "Cannot find module 'next/dist/compiled/@vercel/og/satori' or its corresponding type declarations.";
const missingSharpConstructor =
  "Namespace 'sharp' has no exported member 'SharpConstructor'.";
const nextDeclarationDiagnostics = {
  '15.5.29': [
    ['dist/compiled/@vercel/og/types.d.ts', 'TS2307', missingSatori],
    [
      'dist/compiled/@vercel/og/types.d.ts',
      'TS2834',
      "Relative import paths need explicit file extensions in ECMAScript imports when '--moduleResolution' is 'node16' or 'nodenext'. Consider adding an extension to the import path.",
    ],
    ['dist/server/image-optimizer.d.ts', 'TS2694', missingSharpConstructor],
  ],
  '16.4.2': [
    ['dist/compiled/@vercel/og/types.d.ts', 'TS2307', missingSatori],
    [
      'dist/server/image-optimizer/transform.d.ts',
      'TS2694',
      missingSharpConstructor,
    ],
  ],
};

function checkConsumerDeclarations(consumer, file, nextVersion) {
  try {
    compileConsumer(consumer, file, { target: 'es2024', pretty: false });
  } catch (error) {
    assert.ok(
      [1, 2].includes(error.status),
      'compiler must finish with type diagnostics',
    );
    assert.equal(error.stderr.toString().trim(), '', 'compiler must not crash');
    const diagnostics = error.stdout.toString().trim().split('\n');
    assert.ok(diagnostics[0], 'compiler must report its failure');
    for (const diagnostic of diagnostics) {
      const match = diagnostic.match(
        /\/node_modules\/next\/(dist\/[^()]+)\(\d+,\d+\): error (TS\d+): (.*)$/,
      );
      assert.ok(
        match &&
          nextDeclarationDiagnostics[nextVersion]?.some(
            ([file, code, message]) =>
              file === match[1] && code === match[2] && message === match[3],
          ),
        `Unexpected declaration error on Next ${nextVersion}: ${diagnostic}`,
      );
    }
    console.warn(
      `Next ${nextVersion} upstream declaration diagnostics (${file}):\n${diagnostics.join('\n')}`,
    );
  }
}

const workspaceNextVersion = JSON.parse(
  await readFile(resolve(root, 'node_modules/next/package.json')),
).version;
const consumers = Object.entries(sources).flatMap(([profile, definition]) =>
  ['15.5.29', workspaceNextVersion].map((nextVersion) => ({
    profile,
    definition,
    nextVersion,
  })),
);
for (const { profile, definition, nextVersion } of consumers) {
  test(`packed core and adapters support ${profile} on Next ${nextVersion} with strict ESM/CommonJS declarations`, async () => {
    await withTemporaryConsumer(`ts-restless-${profile}-`, async (consumer) => {
      const dependencies = {
        '@ts-restless/core': `file:${join(archives, 'ts-restless-core.tgz')}`,
        '@ts-restless/express': `file:${join(archives, 'ts-restless-express.tgz')}`,
      };
      for (const name of [
        'fastify',
        'nest',
        'next',
        'serverless',
        'open-api',
      ]) {
        dependencies[`@ts-restless/${name}`] =
          `file:${join(archives, `ts-restless-${name}.tgz`)}`;
      }
      for (const name of [
        'express',
        'fastify',
        'next',
        '@nestjs/common',
        '@nestjs/core',
        'rxjs',
        'reflect-metadata',
        'react',
        'react-dom',
        '@types/express',
        '@types/node',
        '@types/react',
        '@types/react-dom',
        '@types/aws-lambda',
        '@azure/functions',
      ]) {
        dependencies[name] = JSON.parse(
          await readFile(resolve(root, 'node_modules', name, 'package.json')),
        ).version;
      }
      dependencies.fastify = profile === 'zod-3-legacy' ? '4.28.0' : '5.12.7';
      const fastifyEntry =
        '@ts-restless/fastify' + (profile === 'zod-3-legacy' ? '/legacy' : '');
      dependencies.next = nextVersion;
      dependencies.react = '19.3.1';
      dependencies['react-dom'] = '19.3.1';
      dependencies['@types/react'] = '19.3.0';
      dependencies['@types/react-dom'] = '19.3.0';
      if (profile === 'valibot') dependencies.valibot = '1.5.0';
      if (profile === 'zod-4') dependencies.zod = '4.6.7';
      if (profile === 'zod-3-legacy') {
        dependencies.zod = '3.22.3';
        dependencies['@anatine/zod-openapi'] = '1.14.2';
        dependencies.typescript = '5.7.3';
      }
      const consumerPackage = {
        name: `consumer-${profile}`,
        private: true,
        dependencies,
      };
      await installConsumer(consumer, consumerPackage, {
        strictPeers: false,
        allowNewPackages: true,
        frozenLockfile: false,
      });
      if (!dependencies.zod) {
        await assert.rejects(access(join(consumer, 'node_modules/zod')), {
          code: 'ENOENT',
        });
        const installed = await readdir(join(consumer, 'node_modules/.pnpm'));
        assert.ok(
          installed.every((name) => !name.startsWith('zod@')),
          'no-Zod consumer must not install Zod transitively',
        );
      }
      const source = await readFixture('validator-types.ts.fixture', {
        fastifyEntry,
        definition,
      });
      for (const extension of ['mts', 'cts']) {
        const file = join(consumer, `consumer.${extension}`);
        await writeFile(file, source);
        checkConsumerDeclarations(consumer, file, nextVersion);
      }
      if (profile === 'zod-3-legacy') {
        // Old-Zod compatibility uses the same conditional ESM/CJS declarations.
        // Keep strict checking on an older compiler and the actual old Zod peer.
        const bridgeSource = await readFixture('legacy-bridge.ts.fixture');
        for (const extension of ['mts', 'cts']) {
          const file = join(consumer, `legacy.${extension}`);
          await writeFile(file, bridgeSource);
          execFileSync(
            process.execPath,
            [
              join(consumer, 'node_modules/typescript/bin/tsc'),
              '--noEmit',
              '--strict',
              '--target',
              'es2022',
              '--module',
              'nodenext',
              '--moduleResolution',
              'nodenext',
              file,
            ],
            { cwd: consumer, stdio: 'inherit' },
          );
        }
      }
      const runtime = await readFixture('validator-runtime.mjs.fixture', {
        schemaDefinition: definition.replace(
          'schema: StandardSchemaV1<string, number>',
          'schema',
        ),
        fastifyEntry,
        legacyRuntime:
          profile === 'zod-3-legacy'
            ? await readFixture('legacy-runtime.mjs.fixture')
            : '',
      });
      const file = join(consumer, 'consumer.mjs');
      await writeFile(file, runtime);
      execFileSync(process.execPath, [file], {
        cwd: consumer,
        stdio: 'pipe',
      });
    });
  });
}
