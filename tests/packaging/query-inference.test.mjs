import { test } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  archives,
  withTemporaryConsumer,
  installConsumer,
  compileConsumer,
  readFixture,
} from './consumer-harness.mjs';

test('packed shared execution preserves strict public React and Vue inference', async () => {
  await withTemporaryConsumer(
    'ts-restless-query-execution-',
    async (consumer) => {
      await installConsumer(
        consumer,
        {
          name: 'packed-query-execution',
          private: true,
          type: 'module',
          dependencies: {
            '@ts-restless/core':
              'file:' + join(archives, 'ts-restless-core.tgz'),
            '@ts-restless/react-query':
              'file:' + join(archives, 'ts-restless-react-query.tgz'),
            '@ts-restless/vue-query':
              'file:' + join(archives, 'ts-restless-vue-query.tgz'),
            '@tanstack/react-query': '5.51.11',
            '@tanstack/query-core': '5.51.9',
            '@tanstack/vue-query': '5.107.1',
            vue: '3.5.44',
            react: '18.3.1',
            'react-dom': '18.3.1',
            '@types/react': '18.3.1',
            '@types/react-dom': '18.3.0',
            '@types/node': '26.6.5',
          },
        },
        { strictPeers: false, allowNewPackages: false },
      );
      const source = await readFixture('query-inference.ts.fixture');
      for (const extension of ['mts', 'cts']) {
        const file = 'consumer.' + extension;
        await writeFile(join(consumer, file), source);
        compileConsumer(consumer, file, { target: 'es2024' });
      }
    },
  );
});
