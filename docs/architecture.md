# DevPilot Architecture

## Modules
- **CLI (`cli/devpilot-cli.ts`)**
  - Commands: `scaffold`, `tests`, `refactor`.
  - Collects repo context, calls `runAgentTask`, writes generated files, logs runs to `/api/cline`.
  - Posts telemetry used by the dashboard.

- **Web app (`apps/web`)**
  - Next.js 15 (app router) + Tailwind UI.
  - APIs:
    - `/api/cline`: stores run logs.
    - `/api/runs`: returns stored runs.
    - `/api/kestra-webhook`: appends Kestra AI summaries to runs.
  - UI (`app/page.tsx`): lists runs, shows details, output summaries, and Kestra summaries.
  - Storage: JSON file at `apps/web/.data/runs.json` via `lib/store.ts`.

- **Agents (`apps/web/lib/agents.ts`)**
  - Default: Together AI chat completion.
  - Optional: switch to Oumi inference when `USE_OUMI_MODEL=true` and endpoint/key are provided.

- **Kestra workflows (`workflows/kestra`)**
  - `nightly-tests.yml`: cron; runs `npm test`, AI summarizes, posts failures to `/api/kestra-webhook`.
  - `refactor-summary.yml`: HTTP trigger; AI summarizes refactor diffs.

- **ML scaffold (`ml/oumi_train.py`, `configs/test_gen_config.yaml`)**
  - Mock RL fine-tuning loop for Jest test generation.
  - Auto-creates a tiny sample dataset; no real training required for demo.
  - Replace `mock_oumi_trainer` with Oumi SDK to make it real.

## Data Flow
1) CLI triggers task → agent generates summary/files → logs POSTed to `/api/cline`.
2) Runs persist to `.data/runs.json`; `/api/runs` serves the dashboard.
3) Kestra workflows POST AI summaries to `/api/kestra-webhook`; stored alongside runs.
4) Dashboard renders runs, outputs, and Kestra summaries.

## Deploy/Runtime
- Dev: `npm run dev` in `apps/web`; CLI from repo root with `npx tsx ...`.
- Prod: Deploy Next.js app to Vercel (or any Node host); ensure writeable storage or swap `lib/store` to a DB.

## Extensibility
- Swap JSON store with DB by updating `lib/store.ts`.
- Add more agent task types in `cli/devpilot-cli.ts` and UI mapping in `app/page.tsx`.
- Integrate real Oumi inference by filling env vars and adjusting `runAgentTask`.

