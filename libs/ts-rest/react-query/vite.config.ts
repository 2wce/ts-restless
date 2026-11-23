import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig(
    {
      index: 'src/index.ts',
      tanstack: 'src/tanstack.ts',
      v5: 'src/v5.ts',
    },
    {
      pack: {
        unbundle: true,
        tsconfig: '../../../tsconfig.react-query-pack.json',
      },
    },
  ),
);
