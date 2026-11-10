import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLinks } from './check-doc-links.mjs';
import {
  documentationFiles,
  links,
  nodes,
  parseDocument,
  text,
  workspacePackages,
} from './lib/documentation.mjs';

const contributorFiles = new Set([
  'AGENTS.md',
  'CONTRIBUTING.md',
  'README.md',
  'apps/docs/README.md',
]);
const checkedGuides = new Set([
  'apps/docs/content/docs/client/vue-query-v5.mdx',
  'apps/docs/content/docs/client/solid-query-v5.mdx',
  'apps/docs/content/docs/server/nest.mdx',
]);
const nativeCommands = new Set([
  'install',
  'add',
  'remove',
  'exec',
  'dlx',
  'approve',
  'pack',
  'publish',
  'rebuild',
]);

export function checkFacts({ files, packages, nodeVersion }) {
  const failures = [];
  const root = packages.get('package.json');
  const libraries = new Map(
    [...packages]
      .filter(
        ([path, pkg]) =>
          path.startsWith('libs/ts-rest/') && pkg.private !== true,
      )
      .map(([, pkg]) => [pkg.name, pkg]),
  );
  const trees = new Map(
    [...files].map(([file, value]) => [file, parseDocument(file, value)]),
  );
  const inventory = trees.get('docs/support-inventory.md');
  const rows = inventory
    ? [...nodes(inventory)].filter(
        (node) =>
          node.type === 'tableRow' &&
          text(node.children[0]).startsWith('@ts-restless/'),
      )
    : [];
  const seen = new Set();
  for (const row of rows) {
    const name = text(row.children[0]);
    const pkg = libraries.get(name);
    if (!pkg || seen.has(name)) {
      failures.push(
        `docs/support-inventory.md: unknown or duplicate public package ${name}`,
      );
      continue;
    }
    seen.add(name);
    const documented = text(row.children[1])
      .split(';')
      .map((item) => item.trim())
      .sort();
    const actual = Object.entries(pkg.peerDependencies ?? {})
      .map(
        ([peer, range]) =>
          `${peer}: ${range}${pkg.peerDependenciesMeta?.[peer]?.optional ? ' (optional)' : ''}`,
      )
      .sort();
    if (JSON.stringify(documented) !== JSON.stringify(actual))
      failures.push(
        `docs/support-inventory.md: ${name} peers differ from manifest; expected ${actual.join('; ')}`,
      );
  }
  for (const name of libraries.keys())
    if (!seen.has(name))
      failures.push(`docs/support-inventory.md: inventory missing ${name}`);
  if (root.engines?.node !== nodeVersion)
    failures.push('.nvmrc: Node version differs from root engines');
  if (root.packageManager !== `pnpm@${root.engines?.pnpm}`)
    failures.push('package.json: pnpm packageManager differs from engines');

  for (const [file, tree] of trees) {
    const publicGuide = file.startsWith('apps/docs/content/docs/');
    const current =
      publicGuide ||
      contributorFiles.has(file) ||
      /^libs\/ts-rest\/[^/]+\/README\.md$/.test(file);
    if (!current) continue;
    for (const node of nodes(tree)) {
      if (node.type === 'code') {
        if (
          checkedGuides.has(file) &&
          /^(ts|tsx|typescript)$/.test(node.lang ?? '') &&
          !/\btwoslash\b/.test(node.meta ?? '')
        ) {
          failures.push(
            `${file}: executable examples must retain twoslash compiler checking`,
          );
        }
        if (/\/\/\s*@noErrors\b/.test(node.value))
          failures.push(
            `${file}: remove blanket @noErrors suppression; use explicit expected diagnostics for intentional errors`,
          );
        for (const [, specifier] of node.value.matchAll(
          /(?:\bfrom\s*|\b(?:import|require)\s*\(\s*|\bimport\s*)["'](@ts-restless\/[^"']+)["']/g,
        ))
          checkSpecifier(file, specifier);
        if (/^(sh|bash|shell|zsh)$/.test(node.lang ?? '')) {
          for (const line of node.value.split('\n')) {
            if (!/^\s*(pnpm|npm|yarn|bun)\s+(add|install|remove)\b/.test(line))
              continue;
            for (const [, specifier] of line.matchAll(
              /(?:^|\s)(@ts-restless\/[a-z\d-]+)(?:@[^\s]+)?(?=\s|$)/g,
            ))
              checkSpecifier(file, specifier);
          }
        }
      }
      for (const attribute of node.attributes ?? []) {
        if (
          node.name === 'InstallTabs' &&
          attribute.name === 'packageName' &&
          typeof attribute.value === 'string'
        )
          for (const token of attribute.value.split(/\s+/))
            if (token.startsWith('@ts-restless/'))
              checkSpecifier(file, token.replace(/@[^@/]+$/, ''));
      }
      if (contributorFiles.has(file)) {
        if (node.type === 'text') {
          for (const [, tool, version] of node.value.matchAll(
            /\b(Node(?:\.js)?|pnpm)\s*(\d+\.\d+\.\d+)\b/g,
          )) {
            const expected = tool.startsWith('Node')
              ? nodeVersion
              : root.engines.pnpm;
            if (version !== expected)
              failures.push(
                `${file}: ${tool} ${version} differs from configured ${expected}`,
              );
          }
        }
        if (node.type === 'inlineCode') checkCommand(file, node.value);
        if (
          node.type === 'code' &&
          /^(sh|bash|shell|zsh)$/.test(node.lang ?? '')
        )
          for (const line of node.value.split('\n'))
            checkCommand(file, line.trim());
      }
    }
  }

  function checkSpecifier(file, specifier) {
    const [, name, suffix] =
      specifier.match(/^(@ts-restless\/[^/]+)(.*)$/) ?? [];
    const pkg = libraries.get(name);
    const subpath = suffix ? `.${suffix}` : '.';
    if (
      !pkg ||
      !Object.hasOwn(pkg.exports ?? {}, subpath) ||
      !Object.hasOwn(pkg.publishConfig?.exports ?? {}, subpath)
    )
      failures.push(`${file}: unavailable public import/install ${specifier}`);
  }

  function checkCommand(file, command) {
    if (!command.startsWith('pnpm ') || /[<>]/.test(command)) return;
    const parts = command.split(/\s+/).slice(1);
    let selected = root;
    if (parts[0] === '--filter' || parts[0] === '-F') {
      parts.shift();
      const name = parts.shift().replace(/\.\.\.$/, '');
      selected = [...packages.values()].find((pkg) => pkg.name === name);
      if (!selected) {
        failures.push(`${file}: unknown workspace filter ${name}`);
        return;
      }
    }
    if (parts[0] === '-w' || parts[0] === '--workspace-root') parts.shift();
    if (parts[0] === 'run') parts.shift();
    const script = parts[0];
    if (!script || script.startsWith('-') || nativeCommands.has(script)) return;
    if (!Object.hasOwn(selected.scripts ?? {}, script))
      failures.push(`${file}: unknown script ${script} in ${selected.name}`);
  }

  const adrs = new Map();
  for (const [file, tree] of trees) {
    if (!file.startsWith('docs/adr/') || basename(file) === 'README.md')
      continue;
    const id = basename(file).match(/^(\d{4})-[a-z\d-]+\.md$/)?.[1];
    if (!id) {
      failures.push(`${file}: invalid ADR filename`);
      continue;
    }
    if (adrs.has(id)) failures.push(`${file}: duplicate ADR ID ${id}`);
    const paragraphs = tree.children.filter(
      (node) => node.type === 'paragraph',
    );
    const metadata = text(paragraphs[0] ?? {});
    const status = metadata.match(
      /Status:\s*(Accepted|Proposed|Rejected|Superseded by ADR-\d{4})(?=[.\s]|$)/i,
    )?.[1];
    adrs.set(id, { file, tree, status });
    if (!status) failures.push(`${file}: invalid ADR status`);
    const date = metadata.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    if (
      !date ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    )
      failures.push(`${file}: invalid ADR decision date`);
    if (
      tree.children[0]?.type !== 'heading' ||
      tree.children[0].depth !== 1 ||
      paragraphs.length < 3
    )
      failures.push(`${file}: ADR needs a title, decision and rationale`);
    if (!links(tree).length) failures.push(`${file}: ADR needs evidence links`);
  }
  for (const [id, adr] of adrs) {
    const replacement = adr.status?.match(/^Superseded by ADR-(\d{4})$/i)?.[1];
    if (!replacement) continue;
    const next = adrs.get(replacement);
    if (
      !next ||
      replacement === id ||
      !links(adr.tree).some(
        (link) =>
          resolve(dirname(adr.file), link.split('#')[0]) === resolve(next.file),
      ) ||
      !links(next.tree).some(
        (link) =>
          resolve(dirname(next.file), link.split('#')[0]) === resolve(adr.file),
      )
    )
      failures.push(
        `${adr.file}: supersession needs an existing replacement and reciprocal ADR links`,
      );
  }
  return failures;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const paths = await documentationFiles(root);
  const files = new Map(
    await Promise.all(
      paths.map(async (path) => [
        path,
        await readFile(resolve(root, path), 'utf8'),
      ]),
    ),
  );
  const packages = await workspacePackages(root);
  const nodeVersion = (await readFile(resolve(root, '.nvmrc'), 'utf8'))
    .trim()
    .replace(/^v/, '');
  const result = await checkLinks(root, paths);
  const failures = [
    ...result.failures,
    ...checkFacts({ files, packages, nodeVersion }),
  ];
  if (failures.length) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      `Documentation facts and ADRs match repository metadata; ${result.checked} links/anchors checked across ${paths.length} documents.`,
    );
}
