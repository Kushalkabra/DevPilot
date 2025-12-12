# DevPilot: AI Auto-Dev Agent Suite

DevPilot reduces repetitive development work by letting autonomous agents scaffold, test, refactor, and self-review code — end-to-end.

## Quick Start

### 1. Install Dependencies

```bash
cd apps/web
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### 3. Run CLI Commands

From the repo root (in a new terminal):

```bash
# Scaffold a new feature
npx tsx cli/devpilot-cli.ts scaffold my-feature

# Generate tests for a file
npx tsx cli/devpilot-cli.ts tests apps/web/app/page.tsx

# Refactor a file
npx tsx cli/devpilot-cli.ts refactor apps/web/app/page.tsx
```

Each command will:
- Execute the task
- Generate files locally
- Log the run to the dashboard
- Automatically generate a Kestra summary

View results at `http://localhost:3000`

## Using CLI with Vercel Deployment

### Setup

1. **Set Environment Variables** (PowerShell):
```powershell
$env:DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
$env:VERCEL_PROTECTION_BYPASS="your-bypass-token"  # If protection is enabled
```

2. **Run CLI Commands**:
```powershell
npx tsx cli/devpilot-cli.ts scaffold my-feature
```

See `docs/vercel-cli-usage.md` for detailed instructions.

## Key Features

- **CLI Commands**: `scaffold`, `tests`, `refactor` tasks
- **Dashboard**: View all runs, outputs, and summaries
- **Automatic Summaries**: Kestra summaries generated automatically for each run
- **Persistent Storage**: Redis-backed storage for production deployments

## Architecture

- **CLI** (`cli/devpilot-cli.ts`): Executes tasks and logs to API
- **Dashboard** (`apps/web`): Next.js 15 app with TailwindCSS
- **Storage**: Redis (production) or file-based (local development)
- **Summaries**: Template-based (default) or optional free AI APIs (Groq, Hugging Face)





## Deployment on Vercel

### Required Environment Variables

1. **Redis Storage** (Required for production):
   - `REDIS_URL` - Your Redis connection string
   - Example: `redis://default:password@host:port`
   - See `docs/vercel-kv-setup.md` for setup instructions

2. **Optional: Enhanced AI Summaries**:
   - `GROQ_API_KEY` - For AI-powered summaries (free tier available)
   - `HUGGINGFACE_API_KEY` - Alternative free AI option
   - If not set, template-based summaries are used (no API needed)

### Deploy

1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy

The app will automatically use Redis for persistent storage and generate summaries for all runs.

## Tools Integration

This project integrates multiple  tools to create an end-to-end autonomous development workflow:

### 🎯 Kestra - Workflow Orchestration & AI Agent

**How it's used:**
- **Automatic Summary Generation**: When a CLI command runs, Kestra summaries are automatically generated using template-based analysis (no external API needed)
- **Workflow Orchestration**: Kestra workflows defined in `workflows/kestra/` for:
  - **Nightly Tests** (`nightly-tests.yml`): Scheduled cron job that runs tests and summarizes results
  - **Refactor Summaries** (`refactor-summary.yml`): HTTP-triggered workflow for analyzing refactor diffs

**Implementation:**
- **Location**: `apps/web/lib/kestra-summary.ts`
- **Integration**: Automatically called in `/api/cline` endpoint after each run is saved
- **Webhook Endpoint**: `/api/kestra-webhook` receives summaries from external Kestra workflows
- **Display**: Summaries shown in dashboard under each run's details

**Code Reference:**
```typescript
// apps/web/app/api/cline/route.ts
await addRun(body);
const summary = await generateKestraSummary(body);  // Auto-generates summary
await appendKestraSummary(body.id, summary);
```

### 🚀 Vercel - Hosting & Deployment

**How it's used:**
- **Hosting**: Next.js 15 dashboard and API routes deployed on Vercel
- **Serverless Functions**: API endpoints (`/api/cline`, `/api/runs`, `/api/kestra-webhook`) run as serverless functions
- **Environment Variables**: Secure storage for Redis URLs, API keys, and configuration

**Implementation:**
- **Deployment**: Automatic via `vercel.json` configuration
- **Build**: `cd apps/web && npm run build`
- **Runtime**: Node.js serverless functions with 60s timeout for AI operations
- **Protection**: Supports Vercel deployment protection with bypass tokens for CLI access

**Code Reference:**
- `vercel.json` - Deployment configuration
- `apps/web/app/api/*/route.ts` - Serverless API routes

### 💾 Redis (Redis Labs) - Persistent Storage

**How it's used:**
- **Run Storage**: All CLI runs and summaries persisted in Redis
- **Cross-Invocation Persistence**: Ensures data survives serverless function cold starts
- **Production Storage**: Required for Vercel deployments (serverless functions are stateless)

**Implementation:**
- **Location**: `apps/web/lib/store.ts`
- **Connection**: Uses `redis` npm package with connection pooling
- **Fallback**: Falls back to Vercel KV if `KV_REST_API_URL` is set, or file storage for local dev
- **Key Structure**: `devpilot:runs` - stores array of all runs as JSON

**Code Reference:**
```typescript
// apps/web/lib/store.ts
const client = createClient({ url: process.env.REDIS_URL });
await client.connect();
await client.set(KV_KEY, JSON.stringify(runs));
```

### 🤖 Groq / Hugging Face - Optional AI Summaries

**How it's used:**
- **Enhanced Summaries**: Optional AI-powered summaries using free-tier APIs
- **Fallback**: If not configured, uses intelligent template-based summaries (no API needed)
- **Priority**: Groq (fastest) → Hugging Face → Template-based

**Implementation:**
- **Location**: `apps/web/lib/kestra-summary.ts`
- **Groq Integration**: Uses `llama-3.1-8b-instant` model via Groq API
- **Hugging Face**: Uses `mistralai/Mistral-7B-Instruct-v0.2` via Inference API
- **Template Generator**: Analyzes run data and generates contextual summaries without API calls

**Code Reference:**
```typescript
// apps/web/lib/kestra-summary.ts
if (GROQ_API_KEY) {
  // Use Groq for AI summaries
} else if (HUGGINGFACE_API_KEY) {
  // Use Hugging Face
} else {
  // Use template-based (default, no API needed)
}
```

### 🔧 Oumi - RL Fine-Tuning (Scaffolded)

**How it's used:**
- **Future Enhancement**: Scaffolded for reinforcement learning fine-tuning of test generation
- **Placeholder**: Currently uses mock implementation, ready for Oumi SDK integration

**Implementation:**
- **Location**: `ml/oumi_train.py`, `configs/test_gen_config.yaml`
- **Integration Point**: `apps/web/lib/agents.ts` - can switch to Oumi model when `USE_OUMI_MODEL=true`
- **Status**: Ready for Oumi SDK integration when available

### 📝 CodeRabbit - PR Review Integration

**How it's used:**
- **Code Quality**: Repository structured for clean CodeRabbit reviews
- **Configuration**: `.coderabbit.yml` scopes reviews to relevant paths
- **Documentation**: `CONTRIBUTING.md` and `docs/architecture.md` provide context for reviewers

**Implementation:**
- **Config**: `.coderabbit.yml` - Review scope configuration
- **Structure**: Clean TypeScript/Next.js layout with small, reviewable modules

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, TailwindCSS
- **CLI**: Node.js with TypeScript (`tsx`)
- **Storage**: Redis (production) or file-based (local)
- **Summaries**: Template-based (default) or optional free AI APIs (Groq, Hugging Face)
- **Workflow**: Kestra for orchestration and AI agent integration
- **Hosting**: Vercel for serverless deployment

