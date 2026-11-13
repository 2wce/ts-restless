#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseArgs } = require('node:util');

const LIBS_DIR = path.resolve(__dirname, '../../libs/ts-rest');
const OUTPUT_FILE = path.resolve(__dirname, './content/docs/changelog.mdx');

function parseChangelogContent(content, packageName) {
  const lines = content.split('\n');
  const entries = [];
  let currentVersion = null;
  let currentEntry = null;
  let currentSection = null;
  let inContent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('# @ts-restless/')) {
      continue;
    }

    const versionMatch = line.match(/^## (\d+\.\d+\.\d+.*?)$/);
    if (versionMatch) {

      if (currentEntry && currentVersion) {
        entries.push(currentEntry);
      }

      currentVersion = versionMatch[1];
      currentEntry = {
        version: currentVersion,
        package: packageName,
        changes: [],
        hasContent: false,
      };
      currentSection = null;
      inContent = false;
      continue;
    }

    if (!currentVersion || !currentEntry) {
      continue;
    }

    const sectionMatch = line.match(/^### (.+)$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      inContent = true;
      continue;
    }

    const changeMatch = line.match(/^- ([a-f0-9]+): (.+)$/);
    if (changeMatch) {
      const [, hash, description] = changeMatch;
      currentEntry.changes.push({
        hash,
        description,
        section: currentSection || 'Changes',
      });
      currentEntry.hasContent = true;
      inContent = true;
      continue;
    }

    if (line.trim() && !line.startsWith('#') && inContent) {

      if (
        !currentEntry.hasContent &&
        (line.includes('-') || line.trim().length > 0)
      ) {
        currentEntry.hasContent = true;
      }
    }
  }

  if (currentEntry && currentVersion) {
    entries.push(currentEntry);
  }

  return entries;
}

function parseChangelog(filePath, packageName) {
  return parseChangelogContent(fs.readFileSync(filePath, 'utf8'), packageName);
}

function findChangelogFiles(libsDir) {
  const packages = fs
    .readdirSync(libsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();

  const changelogFiles = [];

  for (const pkg of packages) {
    const changelogPath = path.join(libsDir, pkg, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      changelogFiles.push({
        path: changelogPath,
        package: `${pkg}`,
      });
    }
  }

  return changelogFiles;
}

function aggregateChangelogs(libsDir = LIBS_DIR) {
  const changelogFiles = findChangelogFiles(libsDir);
  const versionMap = new Map();

  for (const { path: filePath, package: packageName } of changelogFiles) {
    const entries = parseChangelog(filePath, packageName);

    for (const entry of entries) {
      if (!versionMap.has(entry.version)) {
        versionMap.set(entry.version, []);
      }
      versionMap.get(entry.version).push(entry);
    }
  }

  return versionMap;
}

function sortVersions(versions) {
  return [...versions].sort((a, b) => {
    const parseVersion = (v) => {
      const parts = v.split(/[.-]/);
      return parts.map((part) => {
        const num = parseInt(part, 10);
        return isNaN(num) ? part : num;
      });
    };

    const aParts = parseVersion(a);
    const bParts = parseVersion(b);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] ?? 0;
      const bPart = bParts[i] ?? 0;

      if (typeof aPart === 'number' && typeof bPart === 'number') {
        if (aPart !== bPart) return bPart - aPart;
      } else {
        const aStr = String(aPart);
        const bStr = String(bPart);
        if (aStr !== bStr) return bStr.localeCompare(aStr);
      }
    }

    return 0;
  });
}

function generateMDX(versionMap) {
  const sortedVersions = sortVersions(versionMap.keys());

  let content = `---
title: Changelog
description: Combined ts-restless changelog, including historical upstream ts-rest releases.

---

`;

  for (const version of sortedVersions) {
    const entries = versionMap.get(version);

    const hasContent = entries.some(
      (entry) => entry.hasContent || entry.changes.length > 0,
    );
    if (!hasContent) {
      continue;
    }

    content += `## ${version}\n\n`;

    for (const entry of entries) {
      if (entry.changes.length > 0) {
        for (const change of entry.changes) {
          const repository =
            Number(version.split('.')[0]) >= 4
              ? '2wce/ts-restless'
              : 'ts-rest/ts-rest';
          const githubUrl = `https://github.com/${repository}/commit/${change.hash}`;
          content += `- ([${change.hash}](${githubUrl})) **${entry.package}**: ${change.description}\n`;
        }
      } else if (entry.hasContent) {

        content += `- **${entry.package}**: Updated\n`;
      }
    }

    content += '\n';
  }

  return content;
}

function generateChangelog({
  libsDir = LIBS_DIR,
  outputFile = OUTPUT_FILE,
  check = false,
} = {}) {
  const content = generateMDX(aggregateChangelogs(libsDir));
  const current = fs.existsSync(outputFile)
    ? fs.readFileSync(outputFile, 'utf8')
    : null;
  if (check) return current === content;
  if (current !== content) {
    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, content);
  }
  return true;
}

function main() {
  try {
    const { values } = parseArgs({
      options: {
        check: { type: 'boolean', default: false },
        'libs-dir': { type: 'string', default: LIBS_DIR },
        output: { type: 'string', default: OUTPUT_FILE },
      },
    });
    const fresh = generateChangelog({
      libsDir: values['libs-dir'],
      outputFile: values.output,
      check: values.check,
    });
    if (!fresh) {
      console.error(`Changelog is stale: ${values.output}`);
      process.exitCode = 1;
    } else {
      console.log(
        `${values.check ? 'Changelog is current' : 'Changelog generated'}: ${values.output}`,
      );
    }
  } catch (error) {
    console.error('Error generating changelog:', error);
    process.exitCode = 1;
  }
}

if (require.main === module) main();
module.exports = {
  parseChangelog,
  parseChangelogContent,
  aggregateChangelogs,
  generateMDX,
  generateChangelog,
};
