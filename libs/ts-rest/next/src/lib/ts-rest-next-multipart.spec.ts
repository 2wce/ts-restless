import type { IncomingMessage } from 'node:http';
import { Readable } from 'node:stream';
import type { NextApiRequest, NextApiResponse } from 'next';
import { initContract } from '@ts-restless/core';
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

// An unparsed Pages request, as Next provides it with `bodyParser: false`.
async function multipartRequest(form: FormData) {
  const encoded = new Request('http://localhost/upload', {
    method: 'POST',
    body: form,
  });
  const req = Readable.from([
    Buffer.from(await encoded.arrayBuffer()),
  ]) as unknown as NextApiRequest;
  return Object.assign(req, {
    url: '/upload',
    method: 'POST',
    query: {},
    headers: { 'content-type': encoded.headers.get('content-type') ?? '' },
    body: undefined,
  });
}

const mockResponse = () => {
  const json = vi.fn();
  const res = {
    status: vi.fn(() => ({ json, send: vi.fn(), end: vi.fn() })),
    setHeader: vi.fn(),
  } as unknown as NextApiResponse;
  return { res, json };
};

describe('Pages Router multipart request bodies', () => {
  const uploadForm = (file: File) => {
    const form = new FormData();
    form.append('title', 'Report');
    form.append('tags', 'a');
    form.append('tags', 'b');
    form.append('count', '2');
    form.append('file', file);
    return form;
  };

  it('validates fields and files parsed before the handler', async () => {
    const req = await multipartRequest(
      uploadForm(new File(['hello'], 'hello.txt', { type: 'text/plain' })),
    );
    const { res, json } = mockResponse();

    await parsedUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      title: 'Report',
      tags: ['a', 'b'],
      count: 2,
      fileName: 'hello.txt',
      fileText: 'hello',
    });
  });

  it('rejects uploads exceeding the application limit', async () => {
    const req = await multipartRequest(
      uploadForm(new File([new Uint8Array(maxUploadBytes + 1)], 'large.bin')),
    );
    const { res, json } = mockResponse();

    await parsedUpload(req, res);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(json).toHaveBeenCalledWith({ message: 'Upload too large' });
  });

  it('rejects multipart bodies nothing parsed', async () => {
    const req = await multipartRequest(
      uploadForm(new File(['hello'], 'hello.txt')),
    );
    const { res, json } = mockResponse();

    await uploadHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'ValidationError' }),
    );
  });
});
