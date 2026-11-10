import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [
  'AGENTS.md',
  'README.md',
  'CONTRIBUTING.md',
  'apps/docs/README.md',
];
for (const directory of ['docs', 'apps/docs/content/docs']) {
  files.push(
    ...(await readdir(resolve(root, directory), { recursive: true }))
      .filter((path) => /\.mdx?$/.test(path))
      .map((path) => `${directory}/${path}`),
  );
}
for (const directory of await readdir(resolve(root, 'libs/ts-rest'))) {
  files.push(`libs/ts-rest/${directory}/README.md`);
}

let links = 0;
const failures = [];
for (const file of files) {
  const content = (await readFile(resolve(root, file), 'utf8')).replace(
    /^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1\s*$/gm,
    '',
  );
  for (const match of content.matchAll(/\]\(([^\s)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('/')) continue;
    const path = decodeURIComponent(target.split('#')[0]);
    if (!path) continue;
    links++;
    const destination = resolve(root, dirname(file), path);
    if (!(await stat(destination).catch(() => null)))
      failures.push(`${file}: ${target}`);
  }
}
if (failures.length) {
  console.error(`Missing documentation targets:\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${links} relative file links in ${files.length} documentation files.`,
  );
}
