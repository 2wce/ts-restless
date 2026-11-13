import { mergeConfig, type UserConfig } from 'vite-plus';
import type { PackUserConfig } from 'vite-plus/pack';
import type { Options } from 'unplugin-swc';

// Vite+ tasks are declared per package; share policy through a normal Vite config.
export function libraryConfig(
  entry: Record<string, string>,
  options: { pack?: PackUserConfig; workspaceInputs?: string[] } = {},
): UserConfig {
  const config: UserConfig = {
    run: {
      tasks: {
        pack: {
          command: 'vp pack',
          dependsOn: [
            { task: 'pack', from: ['dependencies', 'devDependencies'] },
          ],
          cache: {
            input: [
              'src/**',
              'package.json',
              'vite.config.ts',
              'tsconfig*.json',
              { pattern: 'libs/build-config/src/**', base: 'workspace' },
              { pattern: 'libs/build-config/package.json', base: 'workspace' },
              { pattern: 'libs/build-config/tsconfig.json', base: 'workspace' },
              { pattern: 'tsconfig*.json', base: 'workspace' },
              { pattern: 'pnpm-lock.yaml', base: 'workspace' },
              ...(options.workspaceInputs ?? []).map((pattern) => ({
                pattern,
                base: 'workspace' as const,
              })),
            ],
            output: ['dist/**'],
          },
        },
      },
    },
    pack: libraryPack(entry),
  };
  return mergeConfig(config, { pack: options.pack ?? {} });
}

// Publishing metadata lives in package.json; pnpm applies it when packing.
function libraryPack(entry: Record<string, string>): PackUserConfig {
  return {
    entry,
    outDir: 'dist',
    format: ['esm', 'cjs'] as Array<'esm' | 'cjs'>,
    target: 'es2019',
    dts: true,
    tsconfig: 'tsconfig.lib.json',
    sourcemap: true,
    deps: { neverBundle: [/^@ts-restless\//], dts: { neverBundle: true } },
    outExtensions: ({ format }: { format: string }) => ({
      js: format === 'es' ? '.esm.mjs' : '.cjs.js',
      dts: format === 'es' ? '.esm.d.mts' : '.cjs.d.ts',
    }),
  };
}

// Node examples share runtime/packing policy and use the package-local dist default.
export function nodePack(entry = 'src/main.ts'): PackUserConfig {
  return {
    entry: { main: entry },
    format: 'cjs',
    target: 'node26',
    dts: false,
    tsconfig: 'tsconfig.json',
    deps: { neverBundle: true, alwaysBundle: [/^@ts-restless\//] },
  };
}

// The packer and test transformer both need Nest's legacy decorator metadata.
export function decoratorOptions(tsconfigFile: string, jsx = false): Options {
  return {
    tsconfigFile,
    swcrc: false,
    jsc: {
      parser: { syntax: 'typescript', decorators: true },
      transform: {
        legacyDecorator: true,
        decoratorMetadata: true,
        ...(jsx ? { react: { runtime: 'automatic' as const } } : {}),
      },
      target: 'es2019',
      keepClassNames: true,
    },
    module: { type: 'es6' },
  };
}
