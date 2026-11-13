import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(libraryConfig({ index: 'src/index.ts' }));
