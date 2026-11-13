import assert from 'node:assert/strict';
import { test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFile, access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  archives,
  withTemporaryConsumer,
  installConsumer,
  compileConsumer,
  readFixture,
} from './consumer-harness.mjs';

// A standalone adapter promise needs its own installed native majors. Nest's
// platform-fastify dependency does not exercise this integration's declarations.
test.each(['4.28.0', '5.12.7'])(
  'packed Fastify %s preserves strict native inference and HTTP lifecycle without Zod',
  async (fastifyVersion) => {
    const entry =
      '@ts-restless/fastify' +
      (fastifyVersion.startsWith('4.') ? '/legacy' : '');
    const wrongEntry =
      '@ts-restless/fastify' +
      (fastifyVersion.startsWith('4.') ? '' : '/legacy');
    await withTemporaryConsumer('ts-restless-fastify-', async (consumer) => {
      await installConsumer(
        consumer,
        {
          name: 'packed-fastify-consumer',
          private: true,
          type: 'module',
          dependencies: {
            '@ts-restless/core':
              'file:' + join(archives, 'ts-restless-core.tgz'),
            '@ts-restless/fastify':
              'file:' + join(archives, 'ts-restless-fastify.tgz'),
            fastify: fastifyVersion,
            valibot: '1.5.0',
            '@types/node': '26.6.5',
          },
        },
        { strictPeers: true, allowNewPackages: true },
      );
      await assert.rejects(access(join(consumer, 'node_modules/zod')), {
        code: 'ENOENT',
      });
      const installed = await readdir(join(consumer, 'node_modules/.pnpm'));
      assert.ok(
        installed.every((name) => !name.startsWith('zod@')),
        'native Fastify consumers must not install Zod transitively',
      );
      const source = await readFixture('fastify-types.ts.fixture', { entry });
      for (const ext of ['mts', 'cts']) {
        const file = join(consumer, 'consumer.' + ext);
        await writeFile(file, source);
        compileConsumer(consumer, file, { target: 'es2024' });
      }
      const runtime = await readFixture('fastify-runtime.mjs.fixture', {
        entry,
        wrongEntry,
        expectedMajor: fastifyVersion.startsWith('4.') ? '5' : '4',
      });
      const file = join(consumer, 'runtime.mjs');
      await writeFile(file, runtime);
      execFileSync(process.execPath, [file], {
        cwd: consumer,
        stdio: 'pipe',
        timeout: 30000,
      });
    });
  },
);
