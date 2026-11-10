import { createFileRoute } from '@tanstack/react-router';
import { source } from '@/lib/source';

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            '# ts-restless',
            '',
            '> Contract-first typed REST for TypeScript. These guides describe development source; merged or unreleased features may be absent from published prereleases. Start with the migration guide and verify release availability.',
            '',
            '## Guides',
            '',
            ...source
              .getPages()
              .map(
                (page) =>
                  `- [${page.data.title}](/markdown/${page.slugs.join('/') || 'index'}.md): ${page.data.description ?? ''}`,
              ),
            '',
          ].join('\n'),
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        ),
    },
  },
});
