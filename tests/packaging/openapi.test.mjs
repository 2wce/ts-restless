import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'vitest';

test('packed OpenAPI generates required and optional client bodies without a validator dependency', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'ts-restless-openapi-client-'));
  const archives = fileURLToPath(
    new URL('../../dist/packages/', import.meta.url),
  );
  try {
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify({
        private: true,
        type: 'module',
        dependencies: {
          '@ts-restless/core': `file:${join(archives, 'ts-restless-core.tgz')}`,
          '@ts-restless/open-api': `file:${join(archives, 'ts-restless-open-api.tgz')}`,
          // The client generator uses the classic compiler API, separately from the workspace compiler.
          typescript: '5.9.3',
          'openapi-typescript': '7.10.1',
          '@apidevtools/swagger-parser': '12.1.0',
        },
      }),
    );
    await writeFile(
      join(consumer, 'pnpm-workspace.yaml'),
      'packages: ["."]\nminimumReleaseAge: 0\n',
    );
    execFileSync(
      'pnpm',
      ['install', '--ignore-scripts', '--no-frozen-lockfile'],
      { cwd: consumer, stdio: 'pipe' },
    );
    assert.ok(
      (await readdir(join(consumer, 'node_modules/.pnpm'))).every(
        (name) => !name.startsWith('zod@'),
      ),
    );
    await writeFile(
      join(consumer, 'generate.mjs'),
      `
import { writeFile } from 'node:fs/promises';
import { initContract } from '@ts-restless/core';
import { generateOpenApi } from '@ts-restless/open-api';
import openapiTS, { astToString } from 'openapi-typescript';
import SwaggerParser from '@apidevtools/swagger-parser';
const c = initContract();
const required = { '~standard': { version: 1, vendor: 'fixture', validate: () => { throw new Error('Do not execute validation'); } } };
const optional = { ...required };
const contract = c.router({
  required: { method: 'POST', path: '/required', body: required, responses: { 204: c.noBody() } },
  optional: { method: 'POST', path: '/optional', body: optional, responses: { 204: c.noBody() } },
});
for (const openApiVersion of ['3.0.2', '3.1.0']) {
  const doc = generateOpenApi(contract, { info: { title: 'Client requirements', version: '1' } }, {
    openApiVersion,
    schemaTransformer: ({ schema }) => schema === required || schema === optional ? {
      schema: { type: 'object', properties: { field: { type: 'string' } }, required: ['field'] }, required: schema === required,
    } : null,
  });
  await SwaggerParser.validate(structuredClone(doc));
  await writeFile('generated-' + openApiVersion + '.ts', astToString(await openapiTS(doc)));
}
`,
    );
    execFileSync(process.execPath, ['generate.mjs'], {
      cwd: consumer,
      stdio: 'pipe',
    });
    for (const version of ['3.0.2', '3.1.0']) {
      await writeFile(
        join(consumer, 'assertions.mts'),
        `
import type { paths } from './generated-${version}.js';
type Expect<T extends true> = T;
type Required = paths['/required']['post'];
type Optional = paths['/optional']['post'];
type RequiredBody = Expect<{} extends Pick<Required, 'requestBody'> ? false : true>;
type OptionalBody = Expect<{} extends Pick<Optional, 'requestBody'> ? true : false>;
type RequiredField = Expect<{} extends Pick<Required['requestBody']['content']['application/json'], 'field'> ? false : true>;
`,
      );
      execFileSync(
        process.execPath,
        [
          join(consumer, 'node_modules/typescript/bin/tsc'),
          '--strict',
          '--noEmit',
          '--module',
          'nodenext',
          '--target',
          'es2022',
          'assertions.mts',
        ],
        { cwd: consumer, stdio: 'pipe' },
      );
    }
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});
