import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import GithubSlugger from 'github-slugger';

export function parseDocument(file, content) {
  const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, '');
  const parser = remark().use(remarkGfm);
  if (file.endsWith('.mdx')) parser.use(remarkMdx);
  return parser.parse(body);
}

export function* nodes(tree) {
  yield tree;
  for (const child of tree.children ?? []) yield* nodes(child);
}

export function text(node) {
  if (['text', 'inlineCode'].includes(node.type)) return node.value;
  if (node.type === 'image') return node.alt ?? '';
  return (node.children ?? []).map(text).join('');
}

export function anchors(tree) {
  const slugger = new GithubSlugger();
  const ids = new Set();
  for (const node of nodes(tree)) {
    if (node.type === 'heading') ids.add(slugger.slug(text(node)));
    if (node.type === 'html') {
      for (const [, id] of node.value.matchAll(
        /\b(?:id|name)=["']([^"']+)["']/g,
      ))
        ids.add(id);
    }
    for (const attribute of node.attributes ?? []) {
      if (
        ['id', 'name'].includes(attribute.name) &&
        typeof attribute.value === 'string'
      )
        ids.add(attribute.value);
    }
  }
  return ids;
}

export function links(tree) {
  const definitions = new Map(
    [...nodes(tree)]
      .filter((node) => node.type === 'definition')
      .map((node) => [node.identifier, node.url]),
  );
  const targets = [];
  for (const node of nodes(tree)) {
    if (['link', 'image'].includes(node.type)) targets.push(node.url);
    if (['linkReference', 'imageReference'].includes(node.type))
      targets.push(definitions.get(node.identifier));
    if (node.type === 'html') {
      for (const [, target] of node.value.matchAll(
        /\b(?:href|src)=["']([^"']+)["']/g,
      ))
        targets.push(target);
    }
    for (const attribute of node.attributes ?? []) {
      if (
        ['href', 'src'].includes(attribute.name) &&
        typeof attribute.value === 'string'
      )
        targets.push(attribute.value);
    }
  }
  return targets.filter(Boolean);
}

export async function documentationFiles(root) {
  const files = [
    'AGENTS.md',
    'README.md',
    'CONTRIBUTING.md',
    'apps/docs/README.md',
  ];
  for (const directory of ['docs', 'apps/docs/content/docs'])
    files.push(
      ...(await readdir(resolve(root, directory), { recursive: true }))
        .filter((path) => /\.mdx?$/.test(path))
        .map((path) => `${directory}/${path}`),
    );
  for (const directory of await readdir(resolve(root, 'libs/ts-rest')))
    files.push(`libs/ts-rest/${directory}/README.md`);
  return files;
}

export async function workspacePackages(root) {
  const packages = new Map([
    [
      'package.json',
      JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')),
    ],
  ]);
  async function scan(directory) {
    for (const entry of await readdir(resolve(root, directory), {
      withFileTypes: true,
    })) {
      if (
        !entry.isDirectory() ||
        ['node_modules', 'dist', '.vite', '.next', 'generated'].includes(
          entry.name,
        )
      )
        continue;
      const path = `${directory}/${entry.name}`;
      const manifest = await readFile(
        resolve(root, path, 'package.json'),
        'utf8',
      ).catch(() => null);
      if (manifest) packages.set(`${path}/package.json`, JSON.parse(manifest));
      else await scan(path);
    }
  }
  for (const directory of ['apps', 'libs']) await scan(directory);
  return packages;
}
