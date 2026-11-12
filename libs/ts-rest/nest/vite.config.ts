import { defineConfig } from 'vite-plus';
import swc from 'unplugin-swc';
import { libraryConfig, decoratorOptions } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig(
    { index: 'src/index.ts', legacy: 'src/legacy.ts' },
    { pack: { plugins: [swc.rollup(decoratorOptions('tsconfig.lib.json'))] } },
  ),
);
