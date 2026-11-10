# Vite+ toolchain trial

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

The user prefers Vite+ as a lean replacement for Nx and overlapping build, test, lint and format tools. If Vite+ requires more custom integration than a small composition of maintained packages, use the latter without Nx.

## First deliverable

Run a disposable trial against the committed source on `chore/dx-improvements`. Keep Node 26.12.0 and TypeScript 5.2.2. Pin Vite+ 1.3.0 locally; no global installation. Preserve public API paths, peer version ranges, ESM/CommonJS output, browser targets, inferred declarations, React client directives and Nest decorator metadata.

The trial copies source into `/private/tmp/ts-rest-viteplus-trial/repo`, installs Vite+ into a separate `toolchain` directory and reuses existing application dependencies for compilation. This is a feasibility experiment, not a production installation benchmark.

## Acceptance evidence

1. Build core, React Query (including v5), Nest and serverless without the Nx Rollup patch or log interception.
2. Exercise packed exports under `require` and `import`, check declaration targets and compile a real typed contract/client consumer.
3. Inspect client directives and execute Nest metadata assertions against built output.
4. Run a cached task twice, change a tracked input and show correct invalidation.
5. Record the installed Vite+ dependency closure and explain remaining framework dependencies.

## Decision

Recommend Vite+ only if the evidence passes with declarative configuration or a small maintained plugin. Record failures honestly. Do not hide unsupported behavior or add custom compilation frameworks to force acceptance. Compare fallback costs with the same package compatibility requirements. Full Nx removal and the Jest-to-Vitest migration follow the trial.
