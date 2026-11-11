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
      const source = `import { initClient, initContract, executeQueryRequest, evaluateFetchApiArgs, evaluateResponse, ResponseMetadata, ResponseEvaluation, StandardSchemaV1, SchemaInputOrType, SchemaOutputOrType, ServerInferRequest, ClientInferRequest, ClientInferResponseBody } from '@ts-restless/core';
import type { ClientArgs } from '@ts-restless/core';
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
const responseContract = initContract().router({
  text: { method: 'GET', path: '/text', responses: { 200: initContract().otherResponse({ contentType: 'text/plain', body: schema }) } },
  empty: { method: 'GET', path: '/empty', responses: { 204: initContract().noBody() } },
});
const responseClient = initClient(responseContract, { baseUrl: 'https://consumer.example', validateResponse: true });
type TextOutput = Expect<Equal<Extract<Awaited<ReturnType<typeof responseClient.text>>, { status: 200 }>['body'], number>>;
type EmptyOutput = Expect<Equal<Extract<Awaited<ReturnType<typeof responseClient.empty>>, { status: 204 }>['body'], undefined>>;
const contract = initContract().router({ convert: { method: 'POST', path: '/convert', body: schema, headers: { 'X-Count': schema, 'X-Note': optionalHeader }, responses: { 200: schema } } });
const asyncHeaderClient = initClient(contract, {
  baseUrl: 'https://consumer.example',
  baseHeaders: { 'X-Count': async () => '12', 'X-Note': async (): Promise<string | undefined> => undefined },
});
type AsyncHeaderInput = Expect<Equal<NonNullable<Parameters<typeof asyncHeaderClient.convert>[0]>['headers'], { 'x-count'?: string; 'x-note'?: string } | undefined>>;
asyncHeaderClient.convert({ body: '12' });
const staticPromise: ClientArgs = {
  baseUrl: 'https://consumer.example',
  baseHeaders: {
    // @ts-expect-error asynchronous header values must use per-request callbacks
    'X-Count': Promise.resolve('12'),
  },
};
void staticPromise;
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
const emptySchema: StandardSchemaV1<undefined> = { '~standard': { version: 1, vendor: 'packed-empty', validate: (value) => value === undefined ? { value } : { issues: [{ message: 'Expected absent body' }] } } };
const emptyContract = c.router({ empty: { method: 'POST', path: '/packed-empty', body: emptySchema, responses: { 200: emptySchema } } });
const emptyFetchHandler = fetch.createFetchHandler(emptyContract, { empty: async () => {
  type EmptyResponse = Expect<Equal<ClientInferResponseBody<typeof emptyContract.empty, 200>, undefined>>;
  return { status: 200, body: undefined };
} }, { responseValidation: true });
const emptyAwsHandler = aws.createLambdaHandler(emptyContract, { empty: async () => ({ status: 200, body: undefined }) }, { responseValidation: true });
void [emptyFetchHandler, emptyAwsHandler];
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
for (const { validateIfSchema, validateMultiSchemaObject, initClient, tsRestFetchApi, initContract, StandardSchemaError, evaluateResponse, executeQueryRequest, evaluateFetchApiArgs } of [await import('@ts-restless/core'), require('@ts-restless/core')]) {
{
  let calls = 0;
  const countedSchema = { '~standard': {
    ...schema['~standard'], validate(value) {
      calls += 1;
      return schema['~standard'].validate(value);
    },
  } };
  const c = initContract();
  const contract = c.router({
    json: { method: 'GET', path: '/json', responses: { 200: countedSchema } },
    text: { method: 'GET', path: '/text', responses: { 200: c.otherResponse({ contentType: 'text/plain', body: countedSchema }) } },
    error: { method: 'GET', path: '/error', responses: { 400: countedSchema } },
    empty: { method: 'GET', path: '/empty', responses: { 204: c.noBody() } },
    binary: { method: 'GET', path: '/binary', responses: { 200: c.otherResponse({
      contentType: 'application/octet-stream', body: { '~standard': {
        version: 1, vendor: 'packed-binary', validate(value) {
          calls += 1;
          return value instanceof Blob ? { value: value.size } : { issues: [{ message: 'Expected Blob' }] };
        },
      } },
    }) } },
  });
  const app = createServer((req, res) => {
    if (req.url === '/headers') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(req.headers.authorization));
      return;
    }
    res.setHeader('x-response', 'preserved');
    res.setHeader('content-type', req.url === '/json' || req.url === '/empty' ? 'application/json' : req.url === '/binary' ? 'application/octet-stream' : 'text/plain');
    if (req.url === '/empty') { res.statusCode = 204; res.end(); }
    else if (req.url === '/error') { res.statusCode = 400; res.end('42'); }
    else res.end(req.url === '/json' ? '"42"' : req.url === '/binary' ? 'abc' : '42');
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  const baseUrl = 'http://127.0.0.1:' + app.address().port;
  try {
    for (const mode of ['default', 'query', 'delegated', 'custom', 'standalone']) {
      const api = mode === 'delegated' ? args => tsRestFetchApi(args) : mode === 'custom'
        ? async args => ({ status: args.path.endsWith('/error') ? 400 : 200, body: '42', headers: new Headers({ 'x-response': 'preserved' }) }) : undefined;
      const clientArgs = { baseUrl, validateResponse: true, api };
      const client = initClient(contract, clientArgs);
      for (const name of ['json', 'text']) {
        calls = 0;
        const result = mode === 'query'
          ? await executeQueryRequest({ ...evaluateFetchApiArgs(contract[name], clientArgs), route: contract[name] })
          : mode === 'standalone'
            ? await tsRestFetchApi({ route: contract[name], path: baseUrl + contract[name].path, method: 'GET', headers: {}, body: undefined, rawBody: undefined, rawQuery: undefined, contentType: undefined, validateResponse: true })
            : await client[name]();
        assert.equal(result.body, 42);
        assert.equal(calls, 1);
        assert.equal(result.headers.get('x-response'), 'preserved');
      }
    }
    const clientArgs = { baseUrl, validateResponse: true };
    const client = initClient(contract, clientArgs);
    calls = 0;
    const binary = await client.binary();
    assert.equal(binary.body, 3);
    assert.equal(calls, 1);
    calls = 0;
    await assert.rejects(executeQueryRequest({ ...evaluateFetchApiArgs(contract.error, clientArgs), route: contract.error }), error => error.status === 400 && error.body === 42 && error.headers.get('x-response') === 'preserved');
    assert.equal(calls, 1);
    calls = 0;
    assert.equal((await client.empty()).body, undefined);
    assert.equal(calls, 0);
    assert.equal((await initClient(contract, { baseUrl, validateResponse: false }).text()).body, '42');
    assert.equal(calls, 0);
    const invalid = initClient(contract, { baseUrl, validateResponse: true, api: async () => ({ status: 200, body: {}, headers: new Headers() }) });
    await assert.rejects(invalid.text(), StandardSchemaError);
    const headerContract = c.router({ read: { method: 'GET', path: '/headers', responses: { 200: c.type() } } });
    let resolutions = 0;
    const headerClientArgs = {
      baseUrl,
      baseHeaders: {
        Authorization: async () => { resolutions += 1; return 'Bearer packed'; },
        'X-Optional': async () => undefined,
      },
    };
    assert.equal((await initClient(headerContract, headerClientArgs).read()).body, 'Bearer packed');
    assert.equal((await executeQueryRequest({ ...evaluateFetchApiArgs(headerContract.read, headerClientArgs), route: headerContract.read })).body, 'Bearer packed');
    assert.equal(resolutions, 2);
    let dispatched = 0;
    const signal = new AbortController().signal;
    const customArgs = {
      ...headerClientArgs,
      validateResponse: true,
      api: async args => {
        dispatched += 1;
        assert.deepEqual(args.headers, { authorization: 'explicit' });
        assert.equal(args.fetchOptions.signal, signal);
        assert.equal(args.validateResponse, false);
        return { status: 200, body: '42', headers: new Headers() };
      },
    };
    calls = 0;
    const customResult = await executeQueryRequest({
      ...evaluateFetchApiArgs(contract.json, customArgs), route: contract.json,
      headers: { AUTHORIZATION: 'explicit', 'x-optional': undefined },
    }, signal);
    assert.equal(customResult.body, 42);
    assert.equal(calls, 1);
    assert.equal(dispatched, 1);
    const authFailure = new Error('packed auth failed');
    const failingClient = initClient(contract, {
      ...customArgs,
      baseHeaders: { Authorization: async () => { throw authFailure; } },
    });
    await assert.rejects(failingClient.json(), error => error === authFailure);
    assert.equal(dispatched, 1);
  } finally {
    await new Promise(resolve => app.close(resolve));
  }
}
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
for (const commonjs of [false, true]) {
  const core = commonjs ? require('@ts-restless/core') : await import('@ts-restless/core');
  const fetchAdapter = commonjs ? require('@ts-restless/serverless/fetch') : await import('@ts-restless/serverless/fetch');
  const awsAdapter = commonjs ? require('@ts-restless/serverless/aws') : await import('@ts-restless/serverless/aws');
  const c = core.initContract();
  const absent = { '~standard': { version: 1, vendor: 'packed-empty',
    validate: (value) => value === undefined ? { value } : { issues: [{ message: 'Expected absent body' }] },
  } };
  const contract = c.router({
    empty: { method: 'POST', path: '/packed-empty', body: absent, responses: { 200: absent } },
    noBody: { method: 'POST', path: '/packed-no-body', body: c.noBody(), responses: { 204: c.noBody() } },
    required: { method: 'POST', path: '/packed-required', body: schema, responses: { 200: schema } },
    response: { method: 'GET', path: '/packed-response', responses: { 200: absent } },
  });
  const router = {
    empty: async () => ({ status: 200, body: undefined }),
    noBody: async () => ({ status: 204, body: undefined }),
    required: async ({ body }) => ({ status: 200, body: String(body) }),
    response: async () => ({ status: 200, body: undefined }),
  };
  const handler = fetchAdapter.createFetchHandler(contract, router, { responseValidation: true });
  for (const body of [undefined, '']) {
    const response = await handler(new Request('http://localhost/packed-empty', { method: 'POST', headers: { 'content-type': 'application/json' }, body }));
    assert.equal(response.status, 200);
    assert.equal(response.rawBody, null);
    assert.equal(response.clone().rawBody, null);
    assert.equal(await response.text(), '');
  }
  const missing = await handler(new Request('http://localhost/packed-required', { method: 'POST', headers: { 'content-type': 'application/json' } }));
  assert.equal(missing.status, 400);
  for (const prefix of ['', String.fromCharCode(0xfeff)]) {
  const valid = await handler(new Request('http://localhost/packed-required', { method: 'POST', headers: { 'content-type': 'application/json' }, body: prefix + JSON.stringify('12') }));
  assert.equal(valid.status, 200);
  assert.equal(await valid.json(), 12);
  }
  let caught;
  const handled = new fetchAdapter.TsRestResponse(null, { status: 422 });
  const malformedHandler = fetchAdapter.createFetchHandler(contract, router, { errorHandler: (error) => { caught = error; return handled; } });
  for (const body of ['{', '   ', String.fromCharCode(0xfeff)]) {
    const response = await malformedHandler(new Request('http://localhost/packed-empty', { method: 'POST', headers: { 'content-type': 'application/json' }, body }));
    assert.equal(response, handled);
    assert.ok(caught instanceof SyntaxError);
  }
  const awsHandler = awsAdapter.createLambdaHandler(contract, router, { responseValidation: true });
  for (const version of [1, 2]) {
    const makeEvent = (path, method, body) => version === 1 ? {
      httpMethod: method, path, headers: { 'content-type': 'application/json' }, body, isBase64Encoded: false,
      requestContext: { identity: { sourceIp: '127.0.0.1' } },
    } : {
      version: '2.0', rawPath: path, rawQueryString: '', headers: { 'content-type': 'application/json' }, body, isBase64Encoded: false,
      requestContext: { http: { method, sourceIp: '127.0.0.1' } },
    };
    for (const body of [null, '']) {
      const response = await awsHandler(makeEvent('/packed-empty', 'POST', body), {});
      assert.equal(response.statusCode, 200);
      assert.equal(response.body, '');
      assert.equal(response.isBase64Encoded, false);
    }
    for (const [path, method, status] of [['/packed-response', 'GET', 200], ['/packed-no-body', 'POST', 204]]) {
      const response = await awsHandler(makeEvent(path, method, null), {});
      assert.equal(response.statusCode, status);
      assert.equal(response.body, '');
      assert.equal(response.isBase64Encoded, false);
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
            react: reactVersion,
            'react-dom': reactVersion,
            '@types/react': reactTypes,
            '@types/react-dom': domTypes,
            '@types/node': '26.6.5',
            jsdom: '22.1.0',
          },
        }),
      );
      execFileSync(
        'pnpm',
        ['install', '--ignore-scripts', '--strict-peer-dependencies'],
        {
          cwd: consumer,
          stdio: 'pipe',
          env: process.env,
        },
      );
      const source = `import { initContract } from '@ts-restless/core';
import { initTsrReactQuery } from '@ts-restless/react-query';
import { createElement, type PropsWithChildren } from 'react';

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
  write: {
    method: 'POST',
    path: '/pages',
    body: c.type<{ value: string }>(),
    responses: {
      200: c.type<{ saved: string }>(),
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
type DeclaredError = Expect<Equal<
  Extract<NonNullable<typeof normal.error>, { status: 404 }>['body'],
  { missing: true }
>>;
const mutation = api.write.useMutation();
type MutationBody = Expect<Equal<
  Parameters<typeof mutation.mutate>[0]['body'], { value: string }
>>;
type MutationData = Expect<Equal<
  NonNullable<typeof mutation.data>['body'], { saved: string }
>>;
mutation.mutate({ body: { value: 'saved' } });
// @ts-expect-error mutation body is contract typed
mutation.mutate({ body: { value: 1 } });
// @ts-expect-error mutation variables are not wrapped in queryData
mutation.mutate({ queryData: { body: { value: 'saved' } } });
const Provider = ({ children }: PropsWithChildren) =>
  createElement(api.ReactQueryProvider, null, children);
const cache = api.useQueryClient();
const cached = cache.pages.getQueryData(['normal']);
type CachedBody = Expect<Equal<
  NonNullable<typeof cached>['body'], { next: number; value: string }
>>;
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
      }
      await writeFile(
        join(consumer, 'runtime.mjs'),
        `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://react.example',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
  const native = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
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

  const { createElement, act } = await load('react');
  const { createRoot } = await load('react-dom/client');
  const { QueryClientProvider } = await load('@tanstack/react-query');
  async function waitForState(predicate) {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, 'rendered hook state did not settle');
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    }
  }
  for (const entry of ['@ts-restless/react-query', '@ts-restless/react-query/v5']) {
    const { initTsrReactQuery: init } = await load(entry);
    const hookClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: Infinity },
        mutations: { retry: false, gcTime: Infinity },
      },
    });
    const hookContract = c.router({
      read: { method: 'GET', path: '/item/:id',
        responses: { 200: c.type(), 404: c.type() } },
      write: { method: 'POST', path: '/item', body: c.type(),
        responses: { 200: c.type(), 404: c.type() } },
    });
    const missing = { status: 404, body: { missing: true }, headers: new Headers() };
    const transportError = new Error('transport unavailable');
    let value = 'first';
    const tsr = init(hookContract, {
      baseUrl: 'https://react.example',
      api: async args => {
        if (args.method === 'POST') {
          assert.equal(args.headers['content-type'], 'application/json');
          assert.equal(args.body, JSON.stringify(args.rawBody));
          assert.equal(args.fetchOptions.signal, undefined);
          if (args.rawBody.value === 'missing') return missing;
          value = args.rawBody.value;
          return { status: 200, body: { saved: value }, headers: new Headers() };
        }
        if (args.path.endsWith('/missing')) return missing;
        if (args.path.endsWith('/transport')) throw transportError;
        assert.equal(args.path, 'https://react.example/item/1');
        return { status: 200, body: { value }, headers: new Headers() };
      },
    });
    const state = {};
    function Probe() {
      state.query = tsr.read.useQuery({
        queryKey: ['item'], queryData: { params: { id: '1' } },
        select: response => response.body.value,
      });
      state.missing = tsr.read.useQuery({
        queryKey: ['missing'], queryData: { params: { id: 'missing' } },
      });
      state.transport = tsr.read.useQuery({
        queryKey: ['transport'], queryData: { params: { id: 'transport' } },
      });
      state.mutation = tsr.write.useMutation({
        onSuccess: () => state.cache.invalidateQueries({ queryKey: ['item'] }),
      });
      state.cache = tsr.useQueryClient();
      return createElement('output', null, state.query.data);
    }
    const container = document.createElement('div');
    document.body.append(container);
    const rendered = createRoot(container);
    try {
      await act(async () => {
        rendered.render(createElement(QueryClientProvider, { client: hookClient },
          createElement(tsr.ReactQueryProvider, null, createElement(Probe))));
      });
      await waitForState(() => state.query.isSuccess && state.missing.isError && state.transport.isError);
      assert.equal(container.textContent, 'first');
      assert.equal(state.missing.error, missing);
      assert.equal(state.transport.error, transportError);
      assert.deepEqual(state.cache.read.getQueryData(['item']).body, { value: 'first' });
      assert.equal(state.cache.read.getQueryData(['item']), hookClient.getQueryData(['item']));
      let saved;
      await act(async () => {
        saved = await state.mutation.mutateAsync({ body: { value: 'updated' } });
      });
      await waitForState(() => state.query.data === 'updated' && state.mutation.isSuccess);
      assert.deepEqual(saved.body, { saved: 'updated' });
      assert.equal(container.textContent, 'updated');
      assert.deepEqual(hookClient.getQueryData(['item']).body, { value: 'updated' });
      await act(async () => {
        await assert.rejects(state.mutation.mutateAsync({ body: { value: 'missing' } }),
          error => error === missing);
      });
      await waitForState(() => state.mutation.isError);
      assert.equal(state.mutation.error, missing);
      assert.equal(container.textContent, 'updated');
    } finally {
      await act(async () => { rendered.unmount(); });
      hookClient.clear();
      container.remove();
    }
  }
}
dom.window.close();
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
          '@tanstack/vue-query': '5.107.1',
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

// Native v5 consumer checks for the two migrated bindings, with no workspace-source imports.
test.each(['5.51.1', '5.107.1'])(
  'packed Vue and Solid Query %s preserve strict inference and native lifecycle',
  async (version) => {
    const consumer = await mkdtemp(join(tmpdir(), 'ts-restless-native-v5-'));
    try {
      const jsdomVersion = JSON.parse(
        await readFile(
          resolve(root, 'node_modules/jsdom/package.json'),
          'utf8',
        ),
      ).version;
      await writeFile(
        join(consumer, 'package.json'),
        JSON.stringify({
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
        }),
      );
      execFileSync('pnpm', ['install', '--ignore-scripts'], {
        cwd: consumer,
        stdio: 'pipe',
      });
      const source = `import { initContract } from '@ts-restless/core';
import { initQueryClient as initVue } from '@ts-restless/vue-query';
import { initQueryClient as initSolid } from '@ts-restless/solid-query';
import { ref, computed } from 'vue';
import { createSignal } from 'solid-js';
type Equal<A,B> = (<T>() => T extends A ? 1:2) extends (<T>() => T extends B ? 1:2) ? true:false;
type Expect<T extends true> = T;
const c = initContract();
const contract = c.router({
 read: { method:'GET', path:'/items/:id', responses:{200:c.type<{value:string}>(),404:c.type<{missing:true}>()} },
 pages: { method:'GET', path:'/pages', query:c.type<{cursor:number}>(), responses:{200:c.type<{next:number}>()} },
 write: { method:'POST', path:'/items', body:c.type<{value:string}>(), responses:{200:c.type<{value:string}>()} },
});
const vue = initVue(contract,{baseUrl:'https://native.example'});
const solid = initSolid(contract,{baseUrl:'https://native.example'});
const id = ref('1');
const v = vue.read.useQuery(computed(() => ['items',id.value]), () => ({params:{id:id.value}}), {select:r => r.body.value});
type VueSelected = Expect<Equal<typeof v.data.value,string|undefined>>;
const vp = vue.pages.useInfiniteQuery(['pages'], ({pageParam}) => { const cursor:number=pageParam;return {query:{cursor}}; }, {initialPageParam:0,getNextPageParam:last => last.body.next});
const vpSelected = vue.pages.useInfiniteQuery(['pages-selected'], ({pageParam}) => ({query:{cursor:pageParam}}), {initialPageParam:0,getNextPageParam:last => last.body.next,select:r => r.pages.map(p => p.body.next)});
type VuePage = Expect<Equal<NonNullable<typeof vp.data.value>['pages'][number]['body'],{next:number}>>;
type VuePageSelect = Expect<Equal<typeof vpSelected.data.value,number[]|undefined>>;
const [sid] = createSignal('1');
const sq = solid.read.createQuery(() => ['items',sid()], () => ({params:{id:sid()}}), () => ({select:r => r.body.value}));
type SolidSelected = Expect<Equal<typeof sq.data,string|undefined>>;
const sp = solid.pages.createInfiniteQuery(() => ['pages'], ({pageParam}) => { const cursor:number=pageParam;return {query:{cursor}}; }, {initialPageParam:0,getNextPageParam:last => last.body.next});
const spSelected = solid.pages.createInfiniteQuery(() => ['pages-selected'], ({pageParam}) => ({query:{cursor:pageParam}}), {initialPageParam:0,getNextPageParam:last => last.body.next,select:r => r.pages.map(p => p.body.next)});
type SolidPage = Expect<Equal<NonNullable<typeof sp.data>['pages'][number]['body'],{next:number}>>;
type SolidPageSelect = Expect<Equal<typeof spSelected.data,number[]|undefined>>;
vue.write.useMutation().mutate({body:{value:'ok'}});
solid.write.createMutation().mutate({body:{value:'ok'}});
// @ts-expect-error route input remains required
vue.read.useQuery(['invalid']);
// @ts-expect-error route input remains required
solid.read.createQuery(() => ['invalid'], {});
// @ts-expect-error initialPageParam is required in v5
vue.pages.useInfiniteQuery(['invalid-pages'],() => ({query:{cursor:0}}),{getNextPageParam:last => last.body.next});
// @ts-expect-error initialPageParam is required in v5
solid.pages.createInfiniteQuery(() => ['invalid-pages'],() => ({query:{cursor:0}}),{getNextPageParam:last => last.body.next});
// @ts-expect-error mutation body must match contract
vue.write.useMutation().mutate({body:{value:1}});
// @ts-expect-error mutation body must match contract
solid.write.createMutation().mutate({body:{value:1}});
`;
      for (const ext of ['mts', 'cts']) {
        const file = join(consumer, 'consumer.' + ext);
        await writeFile(file, source);
        execFileSync(
          process.execPath,
          [
            resolve(root, 'node_modules/typescript/bin/tsc'),
            '--noEmit',
            '--strict',
            '--target',
            'es2022',
            '--module',
            'nodenext',
            '--moduleResolution',
            'nodenext',
            '--esModuleInterop',
            file,
          ],
          { cwd: consumer, stdio: 'inherit' },
        );
      }
      const runtime = `import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const dom=new JSDOM('<!doctype html><html><body></body></html>');
for(const key of ['window','document','Element','SVGElement','HTMLElement','Node']) globalThis[key]=dom.window[key];
const delay=() => new Promise(resolve => setTimeout(resolve,10));
async function until(check) { for(let n=0;n<250;n++){try{check();return;}catch(error){if(n===249)throw error;await delay();}} }
for (const load of [name => import(name),name => Promise.resolve(require(name))]) {
 const {initContract}=await load('@ts-restless/core');const c=initContract();
 const contract=c.router({read:{method:'GET',path:'/items/:id',responses:{200:c.type()}},pages:{method:'GET',path:'/pages',query:c.type(),responses:{200:c.type(),404:c.type()}},write:{method:'POST',path:'/items',body:c.type(),responses:{200:c.type(),404:c.type()}}});
 for (const framework of ['vue','solid']) {
  const {initQueryClient}=await load('@ts-restless/'+framework+'-query');
  const native=await load('@tanstack/'+framework+'-query');
  const failure={status:404,body:{missing:true},headers:new Headers()};const calls=[];
  const api=async args => {calls.push(args);if(args.route===contract.pages){const cursor=args.rawQuery.cursor;return cursor<2?{status:200,body:{next:cursor+1},headers:new Headers()}:failure;}if(args.route===contract.write && args.rawBody.value==='fail') return failure;return {status:200,body:{value:args.path},headers:new Headers()};};
  const client=initQueryClient(contract,{baseUrl:'https://native.example',api});
  const queryClient=new native.QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity,staleTime:Infinity},mutations:{retry:false,gcTime:Infinity}}});
  let query,pages,mutation,change,dispose;
  if(framework==='vue') {
   const vue=await load('vue');const id=vue.ref('1');change=() => {id.value='2';};
   const app=vue.createApp({setup(){query=client.read.useQuery(vue.computed(() => ['items',id.value]),() => ({params:{id:id.value}}),{select:r => r.body.value});pages=client.pages.useInfiniteQuery(['pages'],({pageParam}) => ({query:{cursor:pageParam}}),{initialPageParam:0,getNextPageParam:r => r.body.next});mutation=client.write.useMutation();return () => null;}});
   app.use(native.VueQueryPlugin,{queryClient});app.mount(document.createElement('div'));dispose=() => app.unmount();
  } else {
   const solid=await load('solid-js');const [id,setId]=solid.createSignal('1');change=() => setId('2');
   solid.createRoot(stop => {dispose=stop;native.QueryClientProvider({client:queryClient,get children(){query=client.read.createQuery(() => ['items',id()],() => ({params:{id:id()}}),{select:r => r.body.value});pages=client.pages.createInfiniteQuery(() => ['pages'],({pageParam}) => ({query:{cursor:pageParam}}),{initialPageParam:0,getNextPageParam:r => r.body.next});mutation=client.write.createMutation();return null;}});});
  }
  const value=(obj,key) => framework==='vue'?obj[key].value:obj[key];
  try {
   await until(() => {assert.equal(value(query,'data'),'https://native.example/items/1');assert.equal(value(pages,'isSuccess'),true);});
   change();await until(() => assert.equal(value(query,'data'),'https://native.example/items/2',framework+' key change '+JSON.stringify(calls.map(a=>a.path))));
   await pages.fetchNextPage();assert.deepEqual(value(pages,'data').pages.map(p => p.body.next),[1,2]);
   await pages.fetchNextPage();assert.equal(queryClient.getQueryState(['pages']).error,failure);
   await mutation.mutateAsync({body:{value:'save'}});const args=calls.find(a => a.route===contract.write);assert.equal(args.body,JSON.stringify({value:'save'}));assert.equal(args.fetchOptions.signal,undefined);await assert.rejects(mutation.mutateAsync({body:{value:'fail'}}),error => error===failure);
   const pageCalls=calls.filter(a => a.route===contract.pages);assert.deepEqual(pageCalls.map(a => a.rawQuery.cursor),[0,1,2]);assert.ok(pageCalls.every(a => a.fetchOptions.signal instanceof AbortSignal));
  } finally {dispose();queryClient.clear();}
  // Active native cancellation must reach the installed binding's transport.
  let started=false,aborted=0,cancelDispose;
  const cancelApi=args => {started=true;return new Promise((_resolve,reject) => args.fetchOptions.signal.addEventListener('abort',() => {aborted++;reject(new DOMException('Aborted','AbortError'));},{once:true}));};
  const cancelClient=initQueryClient(contract,{baseUrl:'https://native.example',api:cancelApi});
  const cancelNative=new native.QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
  if(framework==='vue') {
   const vue=await load('vue');const app=vue.createApp({setup(){cancelClient.read.useQuery(['cancel'],() => ({params:{id:'1'}}));return () => null;}});app.use(native.VueQueryPlugin,{queryClient:cancelNative});app.mount(document.createElement('div'));cancelDispose=() => app.unmount();
  } else {
   const solid=await load('solid-js');solid.createRoot(stop => {cancelDispose=stop;native.QueryClientProvider({client:cancelNative,get children(){cancelClient.read.createQuery(() => ['cancel'],{params:{id:'1'}});return null;}});});
  }
  try {await until(() => assert.equal(started,true));await cancelNative.cancelQueries({queryKey:['cancel']});assert.equal(aborted,1);}finally{cancelDispose();cancelNative.clear();}
 }
}
dom.window.close();
`;
      const file = join(consumer, 'runtime.mjs');
      await writeFile(file, runtime);
      execFileSync(process.execPath, ['--conditions=browser', file], {
        timeout: 30000,
        cwd: consumer,
        stdio: 'pipe',
      });
    } finally {
      await rm(consumer, { recursive: true, force: true });
    }
  },
);
