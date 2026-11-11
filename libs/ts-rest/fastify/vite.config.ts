import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig('fastify', {
    index: 'src/index.ts',
    legacy: 'src/legacy.ts',
    zod3: 'src/zod3.ts',
  }),
);
