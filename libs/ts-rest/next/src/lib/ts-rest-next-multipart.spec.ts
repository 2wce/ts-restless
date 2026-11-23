import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { NextApiRequest, NextApiResponse } from 'next';
// Next's own Pages API resolver applies the real body parser and `config`.
import { apiResolver } from 'next/dist/server/api-utils/node/api-resolver.js';
import { initClient, initContract } from '@ts-restless/core';
import { z } from 'zod';
import { createSingleRouteHandler } from './ts-rest-next';

const c = initContract();
const contract = c.router({
  upload: {
    method: 'POST',
    path: '/upload',
    contentType: 'multipart/form-data',
    body: z.object({
      title: z.string(),
      tags: z.array(z.string()),
      count: z.coerce.number(),
      file: z.instanceof(File),
    }),
    responses: {
      200: z.object({
        title: z.string(),
        tags: z.array(z.string()),
        count: z.number(),
        fileName: z.string(),
        fileText: z.string(),
      }),
    },
  },
});

const uploadHandler = createSingleRouteHandler(
  contract.upload,
  async ({ body, req }) => {
    // Server body types omit File fields; read the parsed value.
    const file: File = req.body.file;
    return {
      status: 200,
      body: {
        title: body.title,
        tags: body.tags,
        count: body.count,
        fileName: file.name,
        fileText: await file.text(),
      },
    };
  },
);

const maxUploadBytes = 1024 * 1024;

// Application-owned parsing, matching the Pages Router guide.
async function readFormData(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxUploadBytes) return null;
    chunks.push(chunk);
  }
  return new Response(Buffer.concat(chunks), {
    headers: { 'content-type': req.headers['content-type'] ?? '' },
  }).formData();
}

async function parsedUpload(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers['content-type']?.startsWith('multipart/form-data')) {
    const form = await readFormData(req);
    if (!form) {
      res.status(413).json({ message: 'Upload too large' });
      return;
    }
    req.body = {
      title: form.get('title') ?? undefined,
      tags: form.getAll('tags'),
      count: form.get('count') ?? undefined,
      file: form.get('file') ?? undefined,
    };
  }
  return uploadHandler(req, res);
}

const previewProps = {
  previewModeId: 'test',
  previewModeEncryptionKey: 'test',
  previewModeSigningKey: 'test',
};

async function listen(resolverModule: object) {
  const server = createServer((req, res) => {
    const query = Object.fromEntries(
      new URL(req.url ?? '/', 'http://localhost').searchParams,
    );
    void apiResolver(
      req,
      res,
      query,
      resolverModule,
      {
        ...previewProps,
        dev: false,
      },
      false,
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${port}` };
}

describe('Pages Router multipart request bodies', () => {
  let server: Server | undefined;
  afterEach(async () => {
    await new Promise((resolve) => server?.close(resolve));
    server = undefined;
  });
  const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

  it('validates fields and files parsed with the body parser disabled', async () => {
    const started = await listen({
      default: parsedUpload,
      config: { api: { bodyParser: false } },
    });
    server = started.server;
    const client = initClient(contract, { baseUrl: started.baseUrl });

    const result = await client.upload({
      body: { title: 'Report', tags: ['a', 'b'], count: 2, file },
    });

    expect(result).toMatchObject({
      status: 200,
      body: {
        title: 'Report',
        tags: ['a', 'b'],
        count: 2,
        fileName: 'hello.txt',
        fileText: 'hello',
      },
    });
  });

  it('rejects uploads exceeding the application limit', async () => {
    const started = await listen({
      default: parsedUpload,
      config: { api: { bodyParser: false } },
    });
    server = started.server;
    const client = initClient(contract, { baseUrl: started.baseUrl });

    const result = await client.upload({
      body: {
        title: 'Report',
        tags: [],
        count: 2,
        file: new File([new Uint8Array(maxUploadBytes + 1)], 'large.bin'),
      },
    });

    expect(result.status).toBe(413);
  });

  it("validates the default parser's unparsed multipart text as invalid", async () => {
    const started = await listen({ default: uploadHandler });
    server = started.server;
    const client = initClient(contract, { baseUrl: started.baseUrl });

    const result = await client.upload({
      body: { title: 'Report', tags: ['a'], count: 2, file },
    });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ name: 'ValidationError' });
  });
});
