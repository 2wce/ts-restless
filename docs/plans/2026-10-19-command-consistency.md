# Command consistency implementation plan

> Historical planning record. Use [the roadmap](../roadmap.md) for current delivery status and [ADRs](../adr/README.md) for accepted decisions. Dated checkpoints and baseline code below retain their original context.

> **For agentic workers:** Use executing-plans for inline execution.

**Goal:** Use pnpm for root dependency installation and user/CI entry points, Vite+ for workspace tasks, and Bun only in intentional consumer compatibility fixtures.

**Architecture:** Docs is a normal workspace app with dependencies in the shared root lockfile. Its docs-specific framework versions coexist with example versions. Root docs commands select the package's Vite+ task graph. Servers have caching disabled.

**Tech Stack:** Node 26.12.0, pnpm 12.14.0, existing Vite+ 1.3.0, TanStack Start/Fumadocs (the subsequent approved migration supersedes Next).

**Spec:** The user approved moving docs off Bun, then requested that docs install with the other apps through the root pnpm workspace. Baseline: fe0765c5.

## Constraints

- Preserve docs behavior and checked MDX examples. The later approved TanStack/native Twoslash migration supersedes the initial Next and TypeScript 5.8 pins; see 2026-10-19-docs-tanstack.md.
- Use one root workspace and lockfile; no docs-specific workspace boundary.
- Keep docs excluded from the main native TypeScript checker and formatter; verify through the docs Vite build, native type checking and output tests.
- Reuse the workspace Vite+ version; no custom command runner.
- Keep Bun-based consumer fixtures unchanged.
- Do not invoke publishing/versioning commands while verifying wiring.

## Tasks

- [x] Include apps/docs in pnpm-workspace.yaml; remove its old Bun lock and temporary standalone pnpm workspace/lock.
- [x] Add the existing Vite+ catalog tool to docs, expose build/dev/start through distinct internal tasks, and disable caching for dev/start.
- [x] Use root docs:build/docs:dev/docs:start scripts to select the docs package through Vite+.
- [x] Regenerate the shared root lockfile. The later TanStack migration removes the now-unneeded Next package extension.
- [x] Replace nested pnpm workspace task calls in build-test-all, release build and check-workspace with vp run, preserving order and uncached inference checks.
- [x] Document command roles, root installation, docs build/dev/start commands and Bun compatibility fixtures. Align database README with ordinary pnpm script entry points.
- [x] Verify docs production build/start/dev and root build-test-all; review final diff and commit the cleanup. Initial probing reproduced nested path widening on newer compilers. Native Twoslash 4 now replaces the classic integration, with explicit literal paths in the hidden nested setup.

## Verified outcome

Docs installs with the other workspace apps through the root pnpm lockfile.
User/CI commands use pnpm and scripts delegate workspace tasks to Vite+.
Bun remains in intentional compatibility fixtures and package installation
examples. The later TanStack migration supersedes this plan's initial Next
implementation. Root build-test-all, docs dev/build/preview and frozen install
passed. The completed docs migration plan records the compiler/runtime checks.
