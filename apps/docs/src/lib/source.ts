import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
    files: ['**/*.mdx', '**/*.md'],
    postprocess: { includeProcessedMarkdown: { output: 'function' } },
  },
});

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
});
