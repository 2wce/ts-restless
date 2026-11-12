# Workspace build configuration

`@ts-restless/build-config` is a private, source-only workspace package. Vite configs
import its presets directly; there is no build or pack task for this package.

```ts
import {
  libraryConfig,
  nodePack,
  decoratorOptions,
} from '@ts-restless/build-config';
```

- `libraryConfig(entry, options?)` declares a library's Vite+ pack task,
  cache inputs/outputs and ESM/CJS artifacts. It supports package-specific pack
  overrides and additional workspace cache inputs. React Query owns its
  `unbundle` setting and Nest owns its decorator plugin in their package configs.
- `nodePack(entry?)` shares Node example packing settings and uses package-local
  `dist` output.
- `decoratorOptions(tsconfigFile, jsx?)` shares Nest's legacy decorator metadata
  transform for builds and tests.

Consumers declare this package in `devDependencies` using `workspace:*`.
The package owns the Vite+/SWC dependencies used by its presets and option types.
Root
`vite.config.ts` continues to own workspace tasks, tests, lint and formatting.

Published libraries emit ESM/CJS and declaration files into their own `dist`.
The preset does not generate manifests or copy release metadata. Each public
package declares `files` and pnpm `publishConfig` overrides in its source manifest;
native pnpm packing includes compiled output, readme, changelog and license.

Shared preset changes invalidate library build caches. Consumer and versioning
tests live under `tests/packaging` and `tests/releases`, using
`tests/vite.config.ts`. Native tarball tasks live in root `vite.config.ts`.
