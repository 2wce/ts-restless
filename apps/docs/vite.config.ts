import { defineConfig } from 'vite-plus';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { readdirSync } from 'node:fs';

const pages = readdirSync('content/docs', { recursive: true })
  .filter(
    (path): path is string => typeof path === 'string' && /\.mdx?$/.test(path),
  )
  .map((path) => ({
    path: '/' + path.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, ''),
  }));

export default defineConfig({
  plugins: [
    fumadocsMdx(),
    tailwindcss(),
    tanstackStart({
      pages: [
        ...pages,
        ...pages.map(({ path }) => {
          const markdownPath = `/markdown/${path.slice(1) || 'index'}.md`;
          return {
            path: markdownPath,
            prerender: {
              outputPath: markdownPath.slice(1),
              autoSubfolderIndex: false,
            },
          };
        }),
        {
          path: '/llms.txt',
          prerender: { outputPath: 'llms.txt', autoSubfolderIndex: false },
        },
        {
          path: '/404',
          prerender: { outputPath: '404.html', autoSubfolderIndex: false },
        },
        {
          path: '/api/search.json',
          prerender: {
            outputPath: 'api/search.json',
            autoSubfolderIndex: false,
            crawlLinks: false,
          },
        },
      ],
      prerender: { enabled: true, crawlLinks: false, failOnError: true },
    }),
    react(),
  ],
  resolve: { tsconfigPaths: true },
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
  run: {
    tasks: {
      'build-app': { command: ['vp build', 'tsc --noEmit'], cache: false },
      'dev-app': { command: 'vp dev', cache: false },
      'start-app': { command: 'vp preview', cache: false },
      'test-site': {
        command: [
          'node ../../scripts/check-doc-links.mjs',
          'node --test tests/static-site.test.mjs',
        ],
        dependsOn: ['build-app'],
        cache: false,
      },
    },
  },
});
