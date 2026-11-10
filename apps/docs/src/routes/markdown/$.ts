import { createFileRoute } from '@tanstack/react-router';
import { docs, source } from '@/lib/source';
import { markdownComponents } from '@/lib/markdown';

export const Route = createFileRoute('/markdown/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat;
        if (!path?.endsWith('.md'))
          return new Response('Not found', { status: 404 });
        const slug = path.slice(0, -3);
        const page = source.getPage(slug === 'index' ? [] : slug.split('/'));
        const document = page && docs.getPage(page.path);
        if (!page || !document)
          return new Response('Not found', { status: 404 });
        const markdown = await document.getText('processed', {
          components: markdownComponents,
        });
        return new Response(
          `# ${page.data.title}\n\n${page.data.description ?? ''}\n\n${markdown}`,
          { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } },
        );
      },
    },
  },
});
