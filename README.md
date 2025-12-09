# DevPilot: AI Auto-Dev Agent Suite
Built for the WeMakeDevs AI Agents Assemble hackathon.

## Overview
DevPilot orchestrates autonomous dev workflows (scaffold, tests, refactor) with a CLI, a Next.js dashboard, and agent backends. Runs are logged, summarized, and surfaced for humans with AI-assisted context (Kestra AI Agent, Together AI, Oumi, CodeRabbit review flows).

## Architecture (Cline, Kestra, Oumi, Vercel, CodeRabbit, Together AI)
- **Cline CLI** drives autonomous coding loops via `cli/devpilot-cli.ts` and logs to Next.js APIs.
- **Kestra** executes scheduled/test/refactor workflows; AI Agent summarizes results and notifies the app.
- **Oumi** (conceptual) RL fine-tuned model for better Jest tests; switchable in `runAgentTask`.
- **Together AI** is the default model backend for agent calls.
- **CodeRabbit** provides PR review/QA hooks (workflow-ready).
- **Vercel** hosts the Next.js dashboard/API (app router).

## Key Features
- Dashboard to view runs, AI summaries, and decisions.
- CLI to trigger scaffold/tests/refactor tasks and persist logs.
- Kestra workflows for nightly tests and refactor summaries with AI-agent post-processing.
- Pluggable model backend: Together AI by default, Oumi fine-tune path documented.
- JSON-backed storage for runs; easy to swap to DB later.

## How We Use Each Sponsor Tool
- **Cline**: autonomous CLI flows (`devpilot scaffold|tests|refactor`) that call agent tasks and log to the app.
- **Kestra**: orchestrates nightly tests (`workflows/kestra/nightly-tests.yml`) and refactor summaries (`workflows/kestra/refactor-summary.yml`), pushing results to `/api/kestra-webhook`.
- **Oumi**: RL fine-tuning scaffold for Jest generation (`ml/oumi_train.py`, `configs/test_gen_config.yaml`), optional inference switch in `apps/web/lib/agents.ts`.
- **Together AI**: default chat completion backend for `runAgentTask` (payloads already structured).
- **CodeRabbit**: intended for PR reviews/QA; repo structured for clean diffs and doc context.
- **Vercel**: deploy the Next.js 15 dashboard/API.

## Tech Stack
- Next.js 15 (app router), TypeScript, TailwindCSS
- Node/TS CLI (`tsx`), simple JSON storage for runs
- Kestra workflows (YAML)
- Optional Oumi RL fine-tuning scaffold

## Local Setup
```bash
cd apps/web
npm install
npm run dev
# open http://localhost:3000
```
Env example: `apps/web/env.local.example` (Together/Oumi flags and keys).

## How to Run DevPilot CLI commands
From repo root (keep `npm run dev` running in another terminal):
```bash
npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
npx tsx cli/devpilot-cli.ts tests apps/web/app/page.tsx
npx tsx cli/devpilot-cli.ts refactor apps/web/app/page.tsx
```
Each call writes files and logs to `/api/cline` → `.data/runs.json` → dashboard.

## How Kestra workflows are used
- `workflows/kestra/nightly-tests.yml`: nightly cron, runs `npm test`, summarizes via AI Agent, POSTs failures to `/api/kestra-webhook`.
- `workflows/kestra/refactor-summary.yml`: HTTP-triggered; summarizes refactor diffs for humans via AI Agent.
The dashboard shows posted summaries under each run’s detail.

## How Oumi RL fine-tuning is integrated (conceptual)
- `ml/oumi_train.py` + `configs/test_gen_config.yaml` mock an RL loop for Jest test quality.
- No training required for the demo; replace `mock_oumi_trainer` with real Oumi SDK calls and host an inference endpoint.
- In `apps/web/lib/agents.ts`, set `USE_OUMI_MODEL=true` and provide `OUMI_INFERENCE_URL`/`OUMI_API_KEY` to route agent calls to your fine-tuned model.

## CodeRabbit & OSS workflows
- Clean TS/Next layout with small modules for easy review.
- `docs/architecture.md` and `CONTRIBUTING.md` give reviewers context.
- Keep commits focused; run lint before PRs; prefer small diffs and doc updates alongside code.
- CodeRabbit config: `.coderabbit.yml` scopes reviews to app/CLI/workflows/docs paths and summarizes findings.

## Demo Script (≈2 minutes)
1) Show dashboard loading (runs list + detail).
2) Run CLI commands (scaffold/tests/refactor) in terminal; point to new runs appearing live.
3) Hit `/api/kestra-webhook` with a sample payload; refresh to show Kestra AI summaries.
4) Open `ml/oumi_train.py` to explain Oumi RL path is scaffolded (no training needed).
5) Mention Together AI as default and the env flag to swap to Oumi.
6) Close by highlighting sponsor integrations and hackathon scope.

---
Built for the WeMakeDevs AI Agents Assemble hackathon.

## Deployment on Vercel
- Build: `npm run build --prefix apps/web` (set in `vercel.json`; install is `npm install`).
- Output: `apps/web/.next`
- Runtime: Node.js functions for API routes (uses `/tmp` for writable storage fallback).
- Required env vars:
  - `TOGETHER_API_KEY` (default agent backend)
  - `USE_OUMI_MODEL` (default `false`)
  - `OUMI_INFERENCE_URL`, `OUMI_API_KEY` (when using Oumi)
  - Optional: `RUNS_DATA_DIR` (defaults to `/tmp/devpilot-data` for serverless)
  - Optional: `NEXT_PUBLIC_API_BASE_URL` if you prefer absolute URLs; otherwise relative is fine.
- Note: `/tmp` storage is ephemeral in serverless; for persistence, swap `lib/store.ts` to a DB/KV.

