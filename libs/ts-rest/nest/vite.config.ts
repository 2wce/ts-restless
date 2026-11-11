import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig('nest', { index: 'src/index.ts', legacy: 'src/legacy.ts' }),
);
