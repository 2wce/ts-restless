import { test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  root,
  archives,
  withTemporaryConsumer,
  installConsumer,
  compileConsumer,
  readFixture,
} from './consumer-harness.mjs';

// Native v5 consumer checks for the two migrated bindings, with no workspace-source imports.
test.each(['5.51.1', '5.107.1'])(
  'packed Vue and Solid Query %s preserve strict inference and native lifecycle',
  async (version) => {
    await withTemporaryConsumer('ts-restless-native-v5-', async (consumer) => {
      const jsdomVersion = JSON.parse(
        await readFile(
          resolve(root, 'node_modules/jsdom/package.json'),
          'utf8',
        ),
      ).version;
      await installConsumer(
        consumer,
        {
          name: 'packed-native-v5-consumer',
          private: true,
          type: 'module',
          dependencies: {
            '@ts-restless/core':
              'file:' + join(archives, 'ts-restless-core.tgz'),
            '@ts-restless/vue-query':
              'file:' + join(archives, 'ts-restless-vue-query.tgz'),
            '@ts-restless/solid-query':
              'file:' + join(archives, 'ts-restless-solid-query.tgz'),
            '@tanstack/vue-query': version,
            '@tanstack/solid-query': version,
            vue: '3.5.44',
            'solid-js': '1.9.17',
            '@types/node': '26.6.5',
            jsdom: jsdomVersion,
          },
        },
        { strictPeers: false, allowNewPackages: false },
      );
      const source = await readFixture('reactivity-types.ts.fixture');
      for (const ext of ['mts', 'cts']) {
        const file = join(consumer, 'consumer.' + ext);
        await writeFile(file, source);
        compileConsumer(consumer, file, { target: 'es2022' });
      }
      const runtime = await readFixture('reactivity-runtime.mjs.fixture');
      const file = join(consumer, 'runtime.mjs');
      await writeFile(file, runtime);
      execFileSync(process.execPath, ['--conditions=browser', file], {
        timeout: 30000,
        cwd: consumer,
        stdio: 'pipe',
      });
    });
  },
);
