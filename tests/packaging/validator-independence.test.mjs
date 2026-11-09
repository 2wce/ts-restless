import assert from 'node:assert/strict';
import { test } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  access,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const archives = resolve(root, 'dist/packages');

// Follow emitted chunks as well as the root; a separate legacy entry must not
// accidentally pull Zod back into the default import/require graph.
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
  'express',
  'fastify',
  'nest',
  'next',
  'serverless',
]) {
  test(`packed default ${name} ESM and CommonJS graphs do not load or bundle Zod`, async () => {
    const unpacked = await mkdtemp(join(tmpdir(), 'ts-restless-graph-'));
    try {
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
        if (subpath === './package.json' || subpath === './zod3') continue;
        for (const format of ['import', 'require']) {
          await checkDefaultGraph(resolve(packageRoot, target[format].default));
        }
      }
    } finally {
      await rm(unpacked, { recursive: true, force: true });
    }
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
  import { toStandardSchema } from '@ts-restless/core/zod3';
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
    execFileSync(
      process.execPath,
      [
        resolve(root, 'node_modules/typescript/bin/tsc'),
        '--noEmit',
        '--strict',
        '--pretty',
        'false',
        '--target',
        'es2024',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--esModuleInterop',
        file,
      ],
      { cwd: consumer, stdio: 'pipe' },
    );
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
    const consumer = await mkdtemp(join(tmpdir(), `ts-restless-${profile}-`));
    try {
      const dependencies = {
        '@ts-restless/core': `file:${join(archives, 'ts-restless-core.tgz')}`,
        '@ts-restless/express': `file:${join(archives, 'ts-restless-express.tgz')}`,
      };
      for (const name of ['fastify', 'nest', 'next', 'serverless']) {
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
      dependencies.next = nextVersion;
      dependencies.react = '19.3.1';
      dependencies['react-dom'] = '19.3.1';
      dependencies['@types/react'] = '19.3.0';
      dependencies['@types/react-dom'] = '19.3.0';
      if (profile === 'valibot') dependencies.valibot = '1.5.0';
      if (profile === 'zod-4') dependencies.zod = '4.6.7';
      if (profile === 'zod-3-legacy') {
        dependencies.zod = '3.22.3';
        dependencies.typescript = '5.7.3';
      }
      const consumerPackage = {
        name: `consumer-${profile}`,
        private: true,
        dependencies,
      };
      await writeFile(
        join(consumer, 'package.json'),
        JSON.stringify(consumerPackage),
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
      const source = `import { initContract, executeQueryRequest, evaluateFetchApiArgs, evaluateResponse, ResponseMetadata, ResponseEvaluation, StandardSchemaV1, SchemaInputOrType, SchemaOutputOrType, ServerInferRequest, ClientInferRequest, ClientInferResponseBody } from '@ts-restless/core';
import { createExpressEndpoints, initServer } from '@ts-restless/express';
import * as fastify from '@ts-restless/fastify';
import * as nest from '@ts-restless/nest';
import * as next from '@ts-restless/next';
import * as serverless from '@ts-restless/serverless';
import * as fetch from '@ts-restless/serverless/fetch';
import * as aws from '@ts-restless/serverless/aws';
import * as azure from '@ts-restless/serverless/azure';
import * as serverlessNext from '@ts-restless/serverless/next';
${definition}
const optionalHeader: StandardSchemaV1<string | undefined> = {
  '~standard': { version: 1, vendor: 'consumer', validate: (value) =>
    value === undefined || typeof value === 'string' ? { value } : { issues: [{ message: 'Expected optional string' }] } }
};
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type Input = Expect<Equal<SchemaInputOrType<typeof schema>, string>>;
type Output = Expect<Equal<SchemaOutputOrType<typeof schema>, number>>;
const contract = initContract().router({ convert: { method: 'POST', path: '/convert', body: schema, headers: { 'X-Count': schema, 'X-Note': optionalHeader }, responses: { 200: schema } } });
const evaluated: ResponseEvaluation = evaluateResponse({
  appRoute: contract.convert,
  response: { status: 200, body: '12' },
  validateBody: true,
});
const responseMetadata: ResponseMetadata = evaluated.metadata;
if (evaluated.success) {
  const evaluatedBody: unknown = evaluated.body;
  void evaluatedBody;
} else {
  const issueMessage: string = evaluated.error.issues[0].message;
  void issueMessage;
}
// @ts-expect-error callers must explicitly choose validation enablement
evaluateResponse({ appRoute: contract.convert, response: { status: 200, body: '12' } });
void responseMetadata;
type ServerBody = Expect<Equal<ServerInferRequest<typeof contract.convert>['body'], number>>;
type ClientBody = Expect<Equal<ClientInferRequest<typeof contract.convert>['body'], string>>;
type ResponseBody = Expect<Equal<ClientInferResponseBody<typeof contract.convert, 200>, number>>;
type ClientHeaders = Expect<Equal<ClientInferRequest<typeof contract.convert>['headers'], { 'x-count': string; 'x-note'?: string }>>;
type ServerHeaders = Expect<Equal<ServerInferRequest<typeof contract.convert>['headers'], { 'x-count': number; 'x-note'?: string }>>;
const c = initContract();
const plain = c.router({ get: { method: 'GET', path: '/plain', headers: c.type<{ 'x-key': 'route' }>(), responses: { 200: null } } }, { baseHeaders: c.type<{ 'X-Key': string; 'X-Note'?: string }>() });
type PlainInput = Expect<Equal<ClientInferRequest<typeof plain.get>['headers'], { 'x-key': 'route'; 'x-note'?: string }>>;
type PlainOutput = Expect<Equal<ServerInferRequest<typeof plain.get>['headers'], { 'x-key': 'route'; 'x-note'?: string }>>;
const valid: ClientInferRequest<typeof contract.convert> = { body: '12', headers: { 'x-count': '12' } };
// @ts-expect-error required transformed header cannot be omitted
const missing: ClientInferRequest<typeof contract.convert> = { body: '12', headers: {} };
// @ts-expect-error client must supply the schema input type
const wrong: ClientInferRequest<typeof contract.convert> = { body: '12', headers: { 'x-count': 12 } };
void [valid, missing, wrong];
const implementation = initServer().router(contract, { convert: async ({ body, headers }) => {
  type HandlerBody = Expect<Equal<typeof body, number>>;
  type HandlerHeaders = Expect<Equal<typeof headers['x-count'], number>>;
  return { status: 200, body: body.toString() };
} });
void implementation;
const fastifyImplementation = fastify.initServer().router(contract, {
  convert: async ({ body, headers, request, reply, appRoute }) => {
    type HandlerBody = Expect<Equal<typeof body, number>>;
    type HandlerHeaders = Expect<Equal<typeof headers['x-count'], number>>;
    const nativeBody: unknown = request.body;
    const nativeReplyRequest: import('fastify').FastifyRequest = reply.request;
    type NativeMethod = Expect<Equal<typeof request.method, string>>;
    type NativeStatus = Expect<Equal<typeof reply.statusCode, number>>;
    const route: typeof contract.convert = appRoute;
    const nativeRoute: typeof contract.convert = request.routeOptions.config.tsRestRoute;
    void [nativeBody, nativeReplyRequest, route, nativeRoute];
    return { status: 200, body: body.toString() };
  },
});
void fastifyImplementation;
const nextImplementation = next.createNextRoute(contract, {
  convert: async ({ body, headers, req, res }) => {
    type HandlerBody = Expect<Equal<typeof body, number>>;
    type HandlerHeaders = Expect<Equal<typeof headers['x-count'], number>>;
    const nativeRequest: import('next').NextApiRequest = req;
    const nativeResponse: import('next').NextApiResponse = res;
    void [nativeRequest, nativeResponse];
    return { status: 200, body: body.toString() };
  },
});
const nextRouter = next.createNextRouter(contract, nextImplementation, { responseValidation: true });
const nextSingle = next.createSingleRouteHandler(contract.convert, async ({ body, headers, req, res }) => {
  type HandlerBody = Expect<Equal<typeof body, number>>;
  type HandlerHeaders = Expect<Equal<typeof headers['x-count'], number>>;
  const nativeRequest: import('next').NextApiRequest = req;
  const nativeResponse: import('next').NextApiResponse = res;
  void [nativeRequest, nativeResponse];
  return { status: 200, body: body.toString() };
}, { responseValidation: true });
void [nextRouter, nextSingle];
const serverlessNextHandler = serverlessNext.createNextHandler(contract, {
  convert: async ({ body, headers }, { nextRequest }) => {
    type HandlerBody = Expect<Equal<typeof body, number>>;
    type HandlerHeaders = Expect<Equal<typeof headers['x-count'], number>>;
    const nativeRequest: import('next/server.js').NextRequest = nextRequest;
    void nativeRequest;
    return { status: 200, body: body.toString() };
  },
}, { handlerType: 'app-router', responseValidation: true });
void serverlessNextHandler;
const executionRoute = initContract().router({
  read: {
    method: 'GET',
    path: '/a11',
    responses: { 200: initContract().type<{ value: string }>() },
  },
}).read;
const execution = executeQueryRequest({
  ...evaluateFetchApiArgs(executionRoute, { baseUrl: 'https://a11.example' }),
  route: executionRoute,
});
type ExecutionBody = Expect<
  Equal<Awaited<typeof execution>['body'], { value: string }>
>;
type ExecutionStatus = Expect<Equal<Awaited<typeof execution>['status'], 200>>;
// @ts-expect-error successful body value is a string
const incorrect: Promise<{ body: { value: number } }> = execution;
void [createExpressEndpoints, initServer, fastify, nest, next, serverless, fetch, aws, azure, serverlessNext];
`;
      for (const extension of ['mts', 'cts']) {
        const file = join(consumer, `consumer.${extension}`);
        await writeFile(file, source);
        checkConsumerDeclarations(consumer, file, nextVersion);
      }
      if (profile === 'zod-3-legacy') {
        // Classic Node resolution predates conditional package exports. The
        // compatibility entry must still resolve, and its types must compile
        // against actual pre-Standard-Schema Zod rather than workspace aliases.
        const file = join(consumer, 'legacy.ts');
        await writeFile(
          file,
          `import { toStandardSchema, ZodInputOrType, ZodInferOrType } from '@ts-restless/core/zod3';
import { SchemaInputOrType, SchemaOutputOrType } from '@ts-restless/core';
import { z } from 'zod';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
const original = z.string().transform(Number);
const schema = toStandardSchema(original);
type Input = Expect<Equal<SchemaInputOrType<typeof schema>, string>>;
type Output = Expect<Equal<SchemaOutputOrType<typeof schema>, number>>;
type LegacyInput = Expect<Equal<ZodInputOrType<typeof original>, string>>;
type LegacyOutput = Expect<Equal<ZodInferOrType<typeof original>, number>>;
`,
        );
        execFileSync(
          process.execPath,
          [
            join(consumer, 'node_modules/typescript/bin/tsc'),
            '--noEmit',
            '--strict',
            '--target',
            'es2022',
            '--module',
            'commonjs',
            '--moduleResolution',
            'node',
            file,
          ],
          { cwd: consumer, stdio: 'inherit' },
        );
      }
      const runtime = `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
const require = createRequire(import.meta.url);
for (const name of ['@ts-restless/core', '@ts-restless/express', '@ts-restless/fastify', '@ts-restless/nest', '@ts-restless/next', '@ts-restless/serverless', '@ts-restless/serverless/fetch', '@ts-restless/serverless/aws', '@ts-restless/serverless/azure', '@ts-restless/serverless/next']) {
  const esm = await import(name); const cjs = require(name);
  assert.deepEqual(Object.keys(esm).filter((key) => key !== 'default').sort(), Object.keys(cjs).sort());
}
${definition.replace('schema: StandardSchemaV1<string, number>', 'schema')}
for (const { validateIfSchema, validateMultiSchemaObject, initContract, StandardSchemaError, evaluateResponse, executeQueryRequest, evaluateFetchApiArgs } of [await import('@ts-restless/core'), require('@ts-restless/core')]) {
{
const queryRoute = initContract().router({
  read: {
    method: 'GET',
    path: '/a11',
    responses: { 200: initContract().type() },
  },
}).read;
const success = { status: 200, body: { value: 'ok' }, headers: new Headers() };
const options = {
  ...evaluateFetchApiArgs(queryRoute, {
    baseUrl: 'https://a11.example',
    api: async () => success,
  }),
  route: queryRoute,
};
const response = await executeQueryRequest(options);
assert.equal(response, success);
assert.equal(response.headers, success.headers);
const failure = {
  status: 404,
  body: { missing: true },
  headers: new Headers(),
};
const failureOptions = {
  ...evaluateFetchApiArgs(queryRoute, {
    baseUrl: 'https://a11.example',
    api: async () => failure,
  }),
  route: queryRoute,
};
await assert.rejects(
  executeQueryRequest(failureOptions),
  (error) => error === failure,
);
}
  assert.equal(validateIfSchema('42', schema).value, 42);
  const failure = validateIfSchema({}, schema).error;
  assert.ok(failure instanceof StandardSchemaError);
  assert.ok(failure.issues.length > 0);
  const responseRoute = initContract().router({ get: {
    method: 'GET', path: '/response', responses: { 200: schema },
  } }).get;
  const accepted = evaluateResponse({
    appRoute: responseRoute, response: { status: 200, body: '42' }, validateBody: true,
  });
  assert.deepEqual(accepted, {
    success: true,
    metadata: { status: 200, bodyKind: 'value', contentType: undefined }, body: 42,
  });
  const rejected = evaluateResponse({
    appRoute: responseRoute, response: { status: 200, body: {} }, validateBody: true,
  });
  assert.equal(rejected.success, false);
  assert.ok(rejected.error instanceof StandardSchemaError);
  assert.ok(rejected.error.issues.length > 0);
  const original = {};
  const disabled = evaluateResponse({
    appRoute: responseRoute, response: { status: 200, body: original }, validateBody: false,
  });
  assert.equal(disabled.success, true);
  assert.equal(disabled.body, original);
  const headers = initContract().router({ get: { method: 'GET', path: '/headers', headers: { 'X-Count': schema }, responses: { 200: null } } }).get.headers;
  assert.equal(validateMultiSchemaObject({ 'X-COUNT': '42' }, headers).value['x-count'], 42);
  const missing = validateMultiSchemaObject({}, headers).error;
  assert.ok(missing instanceof StandardSchemaError);
  assert.deepEqual(missing.issues[0].path, ['x-count']);
}
const nativeFastify = (await import('fastify')).default;
for (const { initServer } of [await import('@ts-restless/fastify'), require('@ts-restless/fastify')]) {
  for (const responseValidation of [true, false]) {
    let calls = 0;
    const countedSchema = { '~standard': {
      ...schema['~standard'],
      validate(value) {
        calls += 1;
        return schema['~standard'].validate(value);
      },
    } };
    const { initContract } = await import('@ts-restless/core');
    const contract = initContract().router({ get: {
      method: 'GET', path: '/packed-response', responses: { 200: countedSchema },
    } });
    const app = nativeFastify({ logger: false });
    const server = initServer();
    server.registerRouter(contract, server.router(contract, {
      get: async () => ({ status: 200, body: '42' }),
    }), app, { responseValidation, logInitialization: false });
    try {
      const response = await app.inject({ method: 'GET', url: '/packed-response' });
      assert.equal(response.statusCode, 200);
      if (responseValidation) {
        assert.equal(response.json(), 42);
        assert.match(response.headers['content-type'], /^application\\/json/);
      } else {
        assert.equal(response.body, '42');
        assert.match(response.headers['content-type'], /^text\\/plain/);
      }
      assert.equal(calls, responseValidation ? 1 : 0);
    } finally {
      await app.close();
    }
  }
}
// Exercise the same installed Next major's real API response
// augmentation and serialization, rather than replacing json/send/end methods.
const { apiResolver } = require('next/dist/server/api-utils/node/api-resolver.js');
for (const adapter of [await import('@ts-restless/next'), require('@ts-restless/next')]) {
  for (const mode of ['router', 'single']) {
    for (const responseValidation of [true, false]) {
      let calls = 0;
      const countedSchema = { '~standard': {
        ...schema['~standard'],
        validate(value) {
          calls += 1;
          return schema['~standard'].validate(value);
        },
      } };
      const { initContract } = await import('@ts-restless/core');
      const contract = initContract().router({ get: {
        method: 'GET', path: '/packed-next-response', responses: { 200: countedSchema },
      } });
      const implementation = async ({ req, res }) => {
        assert.equal(req.method, 'GET');
        assert.equal(typeof res.json, 'function');
        return { status: 200, body: '42' };
      };
      const handler = mode === 'router'
        ? adapter.createNextRouter(contract, { get: implementation }, { responseValidation })
        : adapter.createSingleRouteHandler(contract.get, implementation, { responseValidation });
      const app = createServer((req, res) => {
        const query = mode === 'router' ? { 'ts-rest': ['packed-next-response'] } : {};
        void apiResolver(req, res, query, handler, {
          dev: false,
          previewModeId: '00000000000000000000000000000000',
          previewModeEncryptionKey: '00000000000000000000000000000000',
          previewModeSigningKey: '00000000000000000000000000000000',
        }, true).catch((error) => {
          res.statusCode = 500;
          res.end(String(error));
        });
      });
      try {
        await new Promise((resolve, reject) => {
          app.once('error', reject);
          app.listen(0, '127.0.0.1', resolve);
        });
        const response = await fetch('http://127.0.0.1:' + app.address().port + '/packed-next-response');
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /^application\\/json/);
        assert.equal(await response.json(), responseValidation ? 42 : '42');
        assert.equal(calls, responseValidation ? 1 : 0);
      } finally {
        await new Promise((resolve, reject) => app.close((error) => error ? reject(error) : resolve()));
      }
    }
  }
}
const { NextRequest } = require('next/server.js');
for (const adapter of [await import('@ts-restless/serverless/next'), require('@ts-restless/serverless/next')]) {
  for (const handlerType of ['app-router', 'pages-router-edge']) {
    for (const responseValidation of [true, false]) {
      let calls = 0;
      const countedSchema = { '~standard': {
        ...schema['~standard'],
        validate(value) {
          calls += 1;
          return schema['~standard'].validate(value);
        },
      } };
      const { initContract } = await import('@ts-restless/core');
      const contract = initContract().router({ get: {
        method: 'GET', path: '/packed-next-serverless-response', responses: { 200: countedSchema },
      } });
      const url = new URL('http://localhost/packed-next-serverless-response');
      if (handlerType === 'pages-router-edge') url.searchParams.set('ts-rest', 'packed-next-serverless-response');
      const request = new NextRequest(url);
      const handler = adapter.createNextHandler(contract, {
        get: async (_, { nextRequest }) => {
          assert.equal(nextRequest, request);
          assert.equal(nextRequest.nextUrl.searchParams.has('ts-rest'), false);
          return { status: 200, body: '42' };
        },
      }, { handlerType, responseValidation });
      const response = await handler(request);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^application\\/json/);
      assert.equal(await response.json(), responseValidation ? 42 : '42');
      assert.equal(calls, responseValidation ? 1 : 0);
    }
  }
}
${
  profile === 'zod-3-legacy'
    ? `
const original = z.object({ value: z.string() });
const legacyFailure = original.safeParse({ value: 1 }).error;
for (const compat of [await import('@ts-restless/core/zod3'), require('@ts-restless/core/zod3')]) {
  const adapted = compat.toStandardSchema(original);
  assert.notEqual(adapted, original);
  assert.equal('~standard' in original, false);
  assert.equal(compat.isZodObject(adapted), true);
  const historical = compat.zodErrorResponse(legacyFailure);
  assert.equal(historical.name, 'ZodError');
  assert.equal(compat.ZodErrorSchema.safeParse(historical).success, true);
  assert.equal(compat.ZodErrorSchema.safeParse({ ...historical, name: 'ValidationError' }).success, false);
  assert.deepEqual(adapted['~standard'].validate({ value: 1 }).issues, legacyFailure.issues);
}
`
    : ''
}
`;
      const file = join(consumer, 'consumer.mjs');
      await writeFile(file, runtime);
      execFileSync(process.execPath, [file], {
        cwd: consumer,
        stdio: 'pipe',
      });
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  });
}

// Native option interfaces changed arity in Query 5.80; exercise both sides
// through installed public archives rather than the private workspace helper.
const queryV5Consumers = [
  ['5.51.11', '5.51.9'],
  ['5.80.6', '5.80.6'],
  ['5.107.1', '5.107.1'],
];
test.each(queryV5Consumers)(
  'packed React Query %s preserves strict infinite inference and native execution',
  async (queryVersion, coreVersion) => {
    const consumer = await mkdtemp(join(tmpdir(), 'ts-restless-query-v5-'));
    try {
      await writeFile(
        join(consumer, 'package.json'),
        JSON.stringify({
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
            react: '18.3.1',
            'react-dom': '18.3.1',
            '@types/react': '18.3.1',
            '@types/react-dom': '18.3.0',
            '@types/node': '26.6.5',
          },
        }),
      );
      execFileSync('pnpm', ['install', '--ignore-scripts'], {
        cwd: consumer,
        stdio: 'pipe',
        env: process.env,
      });
      const source = `import { initContract } from '@ts-restless/core';
import { initTsrReactQuery } from '@ts-restless/react-query/v5';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
const c = initContract();
const contract = c.router({
  pages: {
    method: 'GET',
    path: '/pages',
    query: c.type<{ cursor: number }>(),
    responses: {
      200: c.type<{ next: number; value: string }>(),
      404: c.type<{ missing: true }>(),
    },
  },
});
const api = initTsrReactQuery(contract, { baseUrl: 'https://example.test' });
const normal = api.pages.useQuery({
  queryKey: ['normal'],
  queryData: { query: { cursor: 0 } },
  select: response => response.body.value,
});
type Normal = Expect<Equal<typeof normal.data, string | undefined>>;
const infinite = api.pages.useInfiniteQuery({
  queryKey: ['infinite'],
  initialPageParam: 0,
  queryData: ({ pageParam }) => {
    type Page = Expect<Equal<typeof pageParam, number>>;
    return { query: { cursor: pageParam } };
  },
  getNextPageParam: last => last.body.next,
  select: data => data.pages.map(page => page.body.value),
});
type Infinite = Expect<Equal<typeof infinite.data, string[] | undefined>>;
const suspense = api.pages.useSuspenseInfiniteQuery({
  queryKey: ['suspense'],
  initialPageParam: 0,
  queryData: ({ pageParam }) => ({ query: { cursor: pageParam } }),
  getNextPageParam: last => last.body.next,
  select: data => data.pages.map(page => page.body.value),
});
type Suspense = Expect<Equal<typeof suspense.data, string[]>>;
// @ts-expect-error request cursor must be numeric
api.pages.useQuery({ queryKey: ['bad'], queryData: { query: { cursor: 'bad' } } });

const initial = api.pages.useInfiniteQuery({
  queryKey: ['initial'],
  initialPageParam: 0,
  initialData: { pages: [{ status: 200, body: { next: 1, value: 'first' }, headers: new Headers() }], pageParams: [0] },
  queryData: ({ pageParam }) => ({ query: { cursor: pageParam } }),
  getNextPageParam: last => last.body.next,
  select: data => data.pages.map(page => page.body.value),
});
type Initial = Expect<Equal<typeof initial.data, string[]>>;
`;
      for (const extension of ['mts', 'cts']) {
        const file = 'consumer.' + extension;
        await writeFile(join(consumer, file), source);
        execFileSync(
          process.execPath,
          [
            resolve(root, 'node_modules/typescript/bin/tsc'),
            '--noEmit',
            '--strict',
            '--pretty',
            'false',
            '--target',
            'es2024',
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
      await writeFile(
        join(consumer, 'runtime.mjs'),
        `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
for (const load of [specifier => import(specifier), async specifier => require(specifier)]) {
  const { initContract } = await load('@ts-restless/core');
  const { initTsrReactQuery } = await load('@ts-restless/react-query/v5');
  const { QueryClient } = await load('@tanstack/react-query');
  const c = initContract();
  const contract = c.router({
    pages: { method: 'GET', path: '/pages', query: c.type(),
      responses: { 200: c.type(), 404: c.type() } },
  });
  const native = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const cursors = [];
  const failure = { status: 404, body: { missing: true }, headers: new Headers() };
  let failLater = false;
  const bound = initTsrReactQuery(contract, {
    baseUrl: 'https://f01.example',
    api: async args => {
      const cursor = args.rawQuery.cursor;
      cursors.push(cursor);
      return failLater && cursor === 1 ? failure :
        { status: 200, body: { next: cursor + 1, value: 'page-' + cursor }, headers: new Headers() };
    },
  }).initQueryClient(native);
  const options = {
    initialPageParam: 0, pages: 2,
    queryData: ({ pageParam }) => ({ query: { cursor: pageParam } }),
    getNextPageParam: last => last.body.next,
  };
  try {
    const result = await bound.pages.fetchInfiniteQuery({ ...options, queryKey: ['pages'] });
    assert.deepEqual(result.pageParams, [0, 1]);
    assert.deepEqual(result.pages.map(page => page.body.value), ['page-0', 'page-1']);
    assert.deepEqual(cursors, [0, 1]);
    cursors.length = 0;
    failLater = true;
    await assert.rejects(bound.pages.fetchInfiniteQuery({ ...options, queryKey: ['later-error'] }),
      error => error === failure);
    assert.deepEqual(cursors, [0, 1]);

    let begin;
    const started = new Promise(resolve => { begin = resolve; });
    let signal;
    let reached = false;
    const cancellable = initTsrReactQuery(contract, {
      baseUrl: 'https://f01.example',
      api: args => {
        signal = args.fetchOptions.signal;
        return new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reached = true;
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
          begin();
        });
      },
    }).initQueryClient(native);
    const pending = cancellable.pages.fetchQuery({
      queryKey: ['cancel'], queryData: { query: { cursor: 0 } },
    });
    const settled = pending.catch(error => error);
    await started;
    await native.cancelQueries({ queryKey: ['cancel'] });
    await settled;
    assert.equal(signal.aborted, true);
    assert.equal(reached, true);
  } finally {
    native.clear();
  }
}
`,
      );
      execFileSync(process.execPath, ['runtime.mjs'], {
        cwd: consumer,
        stdio: 'pipe',
      });
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  },
);
test('packed shared execution preserves strict public React and Vue inference', async () => {
  const consumer = await mkdtemp(
    join(tmpdir(), 'ts-restless-query-execution-'),
  );
  try {
    await writeFile(
      join(consumer, 'package.json'),
      JSON.stringify({
        name: 'packed-query-execution',
        private: true,
        type: 'module',
        dependencies: {
          '@ts-restless/core': 'file:' + join(archives, 'ts-restless-core.tgz'),
          '@ts-restless/react-query':
            'file:' + join(archives, 'ts-restless-react-query.tgz'),
          '@ts-restless/vue-query':
            'file:' + join(archives, 'ts-restless-vue-query.tgz'),
          '@tanstack/react-query': '5.51.11',
          '@tanstack/query-core': '5.51.9',
          '@tanstack/vue-query': '4.44.0',
          vue: '3.5.44',
          react: '18.3.1',
          'react-dom': '18.3.1',
          '@types/react': '18.3.1',
          '@types/react-dom': '18.3.0',
          '@types/node': '26.6.5',
        },
      }),
    );
    execFileSync('pnpm', ['install', '--ignore-scripts'], {
      cwd: consumer,
      stdio: 'pipe',
    });
    const source = `import { initContract } from '@ts-restless/core';
import { initTsrReactQuery } from '@ts-restless/react-query/v5';
import { initQueryClient } from '@ts-restless/vue-query';
const c = initContract();
const contract = c.router({
  read: {
    method: 'GET',
    path: '/a11/:id',
    responses: { 200: c.type<{ value: string }>() },
  },
});
const react = initTsrReactQuery(contract, { baseUrl: 'https://a11.example' });
react.read.useQuery({
  queryKey: ['a11'],
  queryData: { params: { id: '1' } },
  select: (r) => r.body.value,
});
// @ts-expect-error required path param is missing
react.read.useQuery({ queryKey: ['a11'] });
const vue = initQueryClient(contract, { baseUrl: 'https://a11.example' });
vue.read.useQuery(['a11'], () => ({ params: { id: '1' } }), {
  select: (r) => r.body.value,
});
// @ts-expect-error required request mapper is missing
vue.read.useQuery(['a11']);`;
    for (const extension of ['mts', 'cts']) {
      const file = 'consumer.' + extension;
      await writeFile(join(consumer, file), source);
      execFileSync(
        process.execPath,
        [
          resolve(root, 'node_modules/typescript/bin/tsc'),
          '--noEmit',
          '--strict',
          '--target',
          'es2024',
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
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});
