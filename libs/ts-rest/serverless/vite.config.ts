import { defineConfig } from 'vite-plus';
import { libraryConfig } from '@ts-restless/build-config';

export default defineConfig(
  libraryConfig(
    {
      index: 'src/index.ts',
      legacy: 'src/legacy.ts',
      fetch: 'src/fetch.ts',
      aws: 'src/aws.ts',
      next: 'src/next.ts',
      azure: 'src/azure.ts',
    },
    {
      pack: {
        // Next aliases the extensionless public import; the CJS bridge also
        // lets direct Node ESM consumers resolve it without Node-only helpers.
        deps: { neverBundle: [/next-navigation\.cjs$/] },
        copy: [
          {
            from: 'src/lib/handlers/next-navigation.cjs',
            to: 'dist/lib/handlers',
          },
        ],
      },
    },
  ),
);
