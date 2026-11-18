import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const config = libraryConfig({
  index: 'src/index.ts',
  legacy: 'src/legacy.ts',
});

export default defineConfig({
  ...config,
  pack: {
    ...config.pack,
    // One declaration graph gives both module formats the same private brand.
    format: { esm: { dts: false }, cjs: {} },
    hooks: {
      'build:done': async ({ options }) => {
        if (options.format !== 'cjs') return;
        for (const entry of Object.keys(options.entry)) {
          await writeFile(
            join(options.outDir, `${entry}.esm.d.mts`),
            `export * from './${entry}.cjs.js';\n`,
          );
        }
      },
    },
  },
});
