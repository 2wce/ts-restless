import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      'check-inference': {
        command: 'tsc --noEmit -p tsconfig.json',
        dependsOn: ['@ts-restless/core#pack'],
        cache: false,
      },
    },
  },
});
