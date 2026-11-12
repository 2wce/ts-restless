import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig('serverless', {
    index: 'src/index.ts',
    legacy: 'src/legacy.ts',
    fetch: 'src/fetch.ts',
    aws: 'src/aws.ts',
    next: 'src/next.ts',
    azure: 'src/azure.ts',
  }),
);
