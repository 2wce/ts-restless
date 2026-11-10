import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  anchors,
  documentationFiles,
  links,
  parseDocument,
} from './lib/documentation.mjs';

export async function checkLinks(root, files) {
  let checked = 0;
  const failures = [];
  const cache = new Map();
  async function document(file) {
    if (!cache.has(file))
      cache.set(
        file,
        parseDocument(file, await readFile(resolve(root, file), 'utf8')),
      );
    return cache.get(file);
  }
  for (const file of files) {
    for (const target of links(await document(file))) {
      // Public URLs are checked against rendered output by the site tests.
      if (
        /^[a-z][a-z\d+.-]*:/i.test(target) ||
        target.startsWith('//') ||
        (file.startsWith('apps/docs/content/docs/') && target.startsWith('/'))
      )
        continue;
      checked++;
      try {
        const url = new URL(target, 'https://docs.invalid/');
        const path = decodeURIComponent(target.split(/[?#]/)[0]);
        const destination = path
          ? path.startsWith('/')
            ? resolve(root, `.${path}`)
            : resolve(root, dirname(file), path)
          : resolve(root, file);
        const info = await stat(destination).catch(() => null);
        if (!info) failures.push(`${file}: missing target ${target}`);
        else if (url.hash && info.isFile() && /\.mdx?$/.test(destination)) {
          if (
            !anchors(await document(destination)).has(
              decodeURIComponent(url.hash.slice(1)),
            )
          )
            failures.push(`${file}: missing anchor ${target}`);
        }
      } catch (error) {
        failures.push(`${file}: invalid link ${target}: ${error.message}`);
      }
    }
  }
  return { checked, failures };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const files = await documentationFiles(root);
  const result = await checkLinks(root, files);
  if (result.failures.length) {
    console.error(result.failures.join('\n'));
    process.exitCode = 1;
  } else
    console.log(
      `Checked ${result.checked} repository links and anchors in ${files.length} documents.`,
    );
}
