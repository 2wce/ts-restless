import { test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  archives,
  withTemporaryConsumer,
  installConsumer,
  compileConsumer,
  readFixture,
} from './consumer-harness.mjs';

// Native option interfaces changed arity in Query 5.80; exercise both sides
// through installed public archives rather than the private workspace helper.
const queryV5Consumers = [
  ['5.51.11', '5.51.9', '18.3.1', '18.3.1', '18.3.0'],
  ['5.80.6', '5.80.6', '18.3.1', '18.3.1', '18.3.0'],
  ['5.107.1', '5.107.1', '18.3.1', '18.3.1', '18.3.0'],
  // 5.51.11's native peer allows React18 only. Keep that checkpoint without
  // pretending every version in the Query5 range admits React19.
  ['5.80.6', '5.80.6', '19.3.1', '19.3.0', '19.3.0'],
  ['5.107.1', '5.107.1', '19.3.1', '19.3.0', '19.3.0'],
];
test.each(queryV5Consumers)(
  'packed React Query %s/Core %s on React %s preserves strict inference and native execution',
  async (queryVersion, coreVersion, reactVersion, reactTypes, domTypes) => {
    await withTemporaryConsumer('ts-restless-query-v5-', async (consumer) => {
      await installConsumer(
        consumer,
        {
          name: 'packed-query-v5-consumer',
          private: true,
          type: 'module',
          dependencies: {
            '@ts-restless/core':
              'file:' + join(archives, 'ts-restless-core.tgz'),
            '@ts-restless/react-query':
              'file:' + join(archives, 'ts-restless-react-query.tgz'),
            '@tanstack/react-query': queryVersion,
            '@tanstack/query-core': coreVersion,
            react: reactVersion,
            'react-dom': reactVersion,
            '@types/react': reactTypes,
            '@types/react-dom': domTypes,
            '@types/node': '26.6.5',
            jsdom: '22.1.0',
          },
        },
        { strictPeers: true, allowNewPackages: false },
      );
      const source = await readFixture('react-query-types.ts.fixture');
      for (const entry of ['', '/v5']) {
        for (const extension of ['mts', 'cts']) {
          const file = 'consumer' + (entry ? '-v5' : '') + '.' + extension;
          await writeFile(
            join(consumer, file),
            source.replace(
              "from '@ts-restless/react-query'",
              "from '@ts-restless/react-query" + entry + "'",
            ),
          );
          compileConsumer(consumer, file, { target: 'es2024', pretty: false });
        }
      }
      await writeFile(
        join(consumer, 'runtime.mjs'),
        await readFixture('react-query-runtime.mjs.fixture'),
      );
      execFileSync(process.execPath, ['runtime.mjs'], {
        cwd: consumer,
        stdio: 'pipe',
      });
    });
  },
);
