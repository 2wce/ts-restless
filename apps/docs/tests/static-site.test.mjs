import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const app = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(app, 'dist/client');
const content = resolve(app, 'content/docs');
const escapeHtml = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const pages = (await readdir(content, { recursive: true })).filter((path) =>
  /\.mdx?$/.test(path),
);

test('exports an agent index with a readable Markdown target for every guide', async () => {
  const index = await readFile(resolve(output, 'llms.txt'), 'utf8');
  assert.match(index, /development|unreleased/i);
  for (const path of pages) {
    const slug =
      path.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '') || 'index';
    const target = `/markdown/${slug}.md`;
    assert.ok(index.includes(`](${target})`), `Index missing ${target}`);
    const markdown = await readFile(resolve(output, `.${target}`), 'utf8');
    assert.match(markdown, /^# /);
    assert.doesNotMatch(
      markdown,
      /<\/?(?:InstallTabs|Tabs|Tab|Callout|Steps|Step|Files|Folder|File)\b/,
    );
    assert.doesNotMatch(markdown, /<html\b/);
  }
});

test('Markdown preserves installation commands, tab alternatives and contract types', async () => {
  const quickstart = await readFile(
    resolve(output, 'markdown/quickstart.md'),
    'utf8',
  );
  assert.match(quickstart, /pnpm add @ts-restless\/core@alpha/);
  assert.match(quickstart, /npm install @ts-restless\/core@alpha/);
  for (const alternative of [
    'Zod',
    'Valibot',
    'Arktype',
    'None',
    'Express',
    'Fastify',
    'Nest',
    'Next',
  ]) {
    assert.ok(quickstart.includes(alternative), `Lost tab: ${alternative}`);
  }
  assert.match(quickstart, /initContract/);
  const contract = await readFile(
    resolve(output, 'markdown/contract/overview.md'),
    'utf8',
  );
  assert.match(contract, /c\.type<Pokemon>/);
  assert.match(contract, /contract\.ts/);
  const query = await readFile(
    resolve(output, 'markdown/client/react-query-v5.md'),
    'utf8',
  );
  assert.match(
    query,
    /pnpm add @ts-restless\/react-query@alpha @tanstack\/react-query@5/,
  );
  assert.match(query, /fetchOptions/);
});

test('Markdown retains migration availability and warning guidance', async () => {
  const migration = await readFile(
    resolve(output, 'markdown/ts-restless-migration.md'),
    'utf8',
  );
  assert.match(migration, /alpha\.5` is published/);
  assert.match(migration, /Alpha\.2 does not contain/);
  assert.match(migration, /Stable `4\.0\.0` is not published/);
  assert.match(migration, /Async base headers.*absent from alpha\.5/);
  assert.match(migration, /F04 is published in alpha\.5/);
  const queryMigration = await readFile(
    resolve(output, 'markdown/query-v5-migration.md'),
    'utf8',
  );
  assert.match(queryMigration, /alpha\.3` is the first published release/);
  assert.doesNotMatch(queryMigration, /draft PR #22/);
  assert.match(migration, /alpha\.2.*native Query4/);
  assert.match(migration, /release notes/);
  const fetch = await readFile(
    resolve(output, 'markdown/client/fetch.md'),
    'utf8',
  );
  assert.match(fetch, /warning/i);
  assert.match(fetch, /fetchOptions/);
});

test('Markdown guide links resolve to public pages and anchors', async () => {
  for (const path of pages) {
    const slug =
      path.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '') || 'index';
    const markdown = (
      await readFile(resolve(output, `markdown/${slug}.md`), 'utf8')
    ).replace(/^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '');
    for (const [, href] of markdown.matchAll(/\]\(([^\s)]+)\)/g)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) continue;
      const target = new URL(
        href,
        `https://docs.example/${slug === 'index' ? '' : slug}`,
      );
      const destination = await readFile(
        resolve(output, `.${target.pathname}`, 'index.html'),
        'utf8',
      ).catch(() => null);
      assert.ok(
        destination,
        `Markdown /${slug} links to missing page: ${href}`,
      );
      if (target.hash) {
        assert.ok(
          destination.includes(
            `id="${decodeURIComponent(target.hash.slice(1))}"`,
          ),
          `Markdown /${slug} links to missing anchor: ${href}`,
        );
      }
    }
  }
});

test('release entry pages direct readers to availability without denying published prereleases', async () => {
  for (const slug of ['', 'faq', 'quickstart']) {
    const html = await readFile(resolve(output, slug, 'index.html'), 'utf8');
    assert.ok(
      !/No library release is available yet|Until the new-scope packages are published/.test(
        html,
      ),
      `Stale availability on /${slug}`,
    );
    assert.match(html, /prerelease/i);
    assert.match(html, /href="\/ts-restless-migration"/);
  }
});

for (const path of pages) {
  const slug = path.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
  test(`prerenders /${slug} with its content and metadata`, async () => {
    const markdown = await readFile(resolve(content, path), 'utf8');
    const title = markdown.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1];
    const html = await readFile(resolve(output, slug, 'index.html'), 'utf8');
    assert.match(html, /<html/);
    assert.ok(title && html.includes(`<title>${escapeHtml(title)}</title>`));
    assert.match(html, /<article[ >]/);
    assert.ok(title && html.includes(title), `page title missing: ${title}`);
    if (markdown.includes('twoslash')) {
      assert.match(
        html,
        /twoslash-hover|twoslash-query-line|twoslash-popup-container/,
      );
      assert.match(html, /<pre[ >]/);
    }
  });
}

test('exports a static search index containing SDK documentation', async () => {
  const index = JSON.parse(
    await readFile(resolve(output, 'api/search.json'), 'utf8'),
  );
  assert.match(JSON.stringify(index), /contract|fetch/i);
});

test('exports a static 404 page with a link back to documentation', async () => {
  const html = await readFile(resolve(output, '404.html'), 'utf8');
  assert.match(html, /404 — Page not found/);
  assert.match(html, /Return to the docs/);
});

for (const path of pages) {
  const slug = path.replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '');
  test(`/${slug} guide links resolve to rendered pages and anchors`, async () => {
    const html = await readFile(resolve(output, slug, 'index.html'), 'utf8');
    const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/)?.[1];
    assert.ok(article, `Missing article: /${slug}`);
    for (const [, href] of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
      if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith('//')) continue;
      const target = new URL(href, `https://docs.example/${slug}`);
      const page = resolve(output, `.${target.pathname}`, 'index.html');
      const destination = await readFile(page, 'utf8').catch(() => null);
      assert.ok(destination, `/${slug} links to missing page: ${href}`);
      if (target.hash) {
        const id = decodeURIComponent(target.hash.slice(1));
        assert.ok(
          destination.includes(`id="${id}"`),
          `/${slug} links to missing anchor: ${href}`,
        );
      }
    }
  });
}

for (const [slug, packages] of [
  [
    'client/react-query-v5',
    '@ts-restless/react-query@alpha @tanstack/react-query@5',
  ],
  [
    'client/solid-query-v5',
    '@ts-restless/solid-query@alpha @tanstack/solid-query@5',
  ],
  ['client/vue-query-v5', '@ts-restless/vue-query@alpha @tanstack/vue-query@5'],
  [
    'recipies/frontend-only',
    '@ts-restless/core@alpha @ts-restless/react-query@alpha',
  ],
]) {
  test(`/${slug} tags each fork dependency for alpha while preserving peers`, async () => {
    const html = await readFile(resolve(output, slug, 'index.html'), 'utf8');
    const code = [...html.matchAll(/<pre\b[^>]*>([\s\S]*?)<\/pre>/g)].map(
      (match) => match[1].replace(/<[^>]*>/g, ''),
    );
    // Tabs prerender only the selected pnpm panel; all managers share the same package list.
    assert.ok(
      code.some((text) => text.includes(`pnpm add ${packages}`)),
      `Missing install command: pnpm add ${packages}`,
    );
  });
}
