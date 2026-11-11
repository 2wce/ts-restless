import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig('express', { index: 'src/index.ts', legacy: 'src/legacy.ts' }),
);
