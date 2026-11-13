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
      // This published package also emits the isolated v5 workspace.
      workspaceInputs: [
        'libs/ts-rest/react-query-v5/src/**',
        'libs/ts-rest/react-query-v5/tsconfig*.json',
        'libs/ts-rest/react-query-v5/package.json',
      ],
    },
  ),
);
