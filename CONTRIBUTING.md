# Contributing to DevPilot

Thanks for helping improve DevPilot! Keep changes small, typed, and documented so CodeRabbit and humans can review quickly.

## Workflow
- Branch from main; keep PRs scoped to one logical change.
- Run `npm run lint` (or relevant checks) before opening a PR.
- Update docs when behavior changes.

## Code areas
- **apps/web**: Next.js app router UI + API routes.
- **cli/**: DevPilot CLI entry (`devpilot scaffold|tests|refactor`).
- **apps/web/lib**: Agent logic, storage helpers.
- **workflows/kestra**: Kestra YAML workflows.
- **ml/**: Oumi RL fine-tuning scaffold.

## Style
- TypeScript strictness on; prefer small, composable modules.
- Tailwind for UI; keep classlists readable.
- Tests: add/adjust when changing logic.

## Commits/PRs
- Clear titles; link issues if any.
- Include what changed, why, and how to test.
- CodeRabbit: repo includes `.coderabbit.yml`; keep PRs small and scoped to included paths.

## Environment
- Copy `apps/web/env.local.example` to `.env.local` for local runs.

