# DevPilot Architecture

## Overview

DevPilot is an AI-powered autonomous development agent suite that reduces repetitive development work through automated scaffolding, testing, and refactoring. This document describes the system architecture, data flow, and component interactions.

## Modules

### CLI Module (`cli/devpilot-cli.ts`)

**Purpose**: Command-line interface for executing autonomous development tasks.

**Responsibilities**:
- Parse and validate CLI arguments
- Collect repository context (files, code snippets)
- Execute agent tasks (locally or remotely)
- Generate files based on agent output
- Log runs to API endpoint

**Commands**:
- `scaffold <feature-name>`: Generates new feature scaffolding
- `tests <file-path>`: Generates test files
- `refactor <file-path>`: Analyzes and suggests refactoring

**Integration Points**:
- POSTs run logs to `/api/cline` endpoint
- Can execute tasks remotely via `DEVPILOT_AGENT_ENDPOINT`
- Supports Vercel protection bypass for remote execution

### Web Application (`apps/web`)

**Purpose**: Dashboard and API server for DevPilot.

**Technology Stack**:
- Next.js 15 (app router)
- TypeScript
- TailwindCSS

**API Endpoints**:
- `POST /api/cline`: Receives and stores run logs from CLI
  - Validates payload structure
  - Stores run in persistent storage
  - Automatically generates Kestra summary
- `GET /api/runs`: Returns all stored runs for dashboard display
- `POST /api/kestra-webhook`: Receives summaries from external Kestra workflows

**UI Components**:
- Dashboard (`app/page.tsx`): Lists runs, shows details, output summaries, and Kestra summaries
- Real-time display of run status and results

**Storage**:
- Production: Redis (via `REDIS_URL`)
- Fallback: Vercel KV (via `KV_REST_API_URL`)
- Development: File-based storage (in-memory or `/tmp`)

### Agent Module (`apps/web/lib/agents.ts`)

**Purpose**: Executes agent tasks (scaffold, tests, refactor).

**Current Implementation**:
- Placeholder implementation for demonstration
- Ready for Together.ai integration
- Ready for Oumi SDK integration (when `USE_OUMI_MODEL=true`)

**Future Enhancements**:
- Together.ai integration for agent task execution
- Oumi RL fine-tuning for test generation optimization

### Kestra Workflows (`workflows/kestra`)

**Purpose**: Workflow orchestration and AI-powered analysis.

**Workflows**:
- `nightly-tests.yml`: Scheduled cron job (2 AM UTC daily)
  - Runs `npm test`
  - Uses Kestra AI Agent to summarize results
  - POSTs failure summaries to `/api/kestra-webhook`
- `refactor-summary.yml`: HTTP-triggered workflow
  - Receives refactor run details via HTTP POST
  - Uses Kestra AI Agent to analyze and summarize refactor changes
  - Outputs structured summary (title, summary, risks, followups)

**Integration**:
- Webhook endpoint: `/api/kestra-webhook`
- Automatic summary generation: `apps/web/lib/kestra-summary.ts`

### ML Module (`ml/oumi_train.py`, `configs/test_gen_config.yaml`)

**Purpose**: Reinforcement learning fine-tuning scaffold for test generation.

**Current Status**:
- Mock implementation for demonstration
- Ready for Oumi SDK integration
- Auto-creates sample dataset for demo purposes

**Future**:
- Replace `mock_oumi_trainer` with Oumi SDK
- Enable RL-based test generation optimization

## Data Flow

### Run Execution Flow

1. **CLI Command Execution**:
   - User runs CLI command (`scaffold`, `tests`, or `refactor`)
   - CLI validates input and collects repository context
   - Agent task is executed (locally or remotely)

2. **File Generation**:
   - Agent generates files based on task type
   - Files are written to appropriate directories
   - Run log is created with task details

3. **API Logging**:
   - Run log is POSTed to `/api/cline` endpoint
   - API validates payload and stores run in persistent storage

4. **Summary Generation**:
   - Kestra summary is automatically generated after run is saved
   - Summary generation follows priority chain (Together.ai > Groq > Hugging Face > Template)
   - Summary is appended to run record

5. **Dashboard Display**:
   - Dashboard fetches runs from `/api/runs` endpoint
   - Runs are displayed with summaries, outputs, and file details
   - Real-time updates as new runs are logged

### External Workflow Integration

1. **Kestra Workflow Trigger**:
   - External Kestra workflow (e.g., nightly tests) executes
   - Workflow generates AI summary of results
   - Summary is POSTed to `/api/kestra-webhook`

2. **Summary Storage**:
   - Webhook validates payload and appends summary to run
   - Summary is stored alongside run record
   - Dashboard displays summary in run details

## Deploy/Runtime

### Development Environment

- **Dashboard**: Run `npm run dev` in `apps/web` directory
- **CLI**: Run from repo root with `npx tsx cli/devpilot-cli.ts <command>`
- **Storage**: File-based or in-memory (no Redis required for local dev)

### Production Environment

- **Deployment**: Deploy Next.js app to Vercel (or any Node.js host)
- **Storage**: Redis required for persistent storage (serverless functions are stateless)
- **Environment Variables**: Configure Redis URL and optional API keys
- **Scaling**: Serverless functions automatically scale based on traffic

## Extensibility

### Storage Extensibility

- **Current**: Redis (production) or file-based (development)
- **Future**: Can swap to any database by updating `lib/store.ts`
- **Interface**: Storage module provides simple `get`/`set` interface

### Agent Task Extensibility

- **Add Task Types**: Add new task types in `cli/devpilot-cli.ts`
- **UI Updates**: Update `app/page.tsx` to display new task types
- **Agent Integration**: Wire new tasks to agent execution in `lib/agents.ts`

### AI Provider Extensibility

- **Add Providers**: Add new AI providers in `lib/kestra-summary.ts`
- **Priority Chain**: Update priority order in `generateKestraSummary()`
- **Fallback**: Always maintain template-based fallback for reliability

### Oumi Integration

- **SDK Integration**: Replace mock implementation in `ml/oumi_train.py` with Oumi SDK
- **Environment**: Set `USE_OUMI_MODEL=true` and provide endpoint/key
- **Agent Switch**: Update `lib/agents.ts` to use Oumi model when configured

