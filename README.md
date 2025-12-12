# DevPilot: AI Auto-Dev Agent Suite

DevPilot reduces repetitive development work by letting autonomous agents scaffold, test, refactor, and self-review code — end-to-end.

![DevPilot Dashboard](assets/Screenshot%202025-12-12%20224016.png)

*Dashboard showing executed runs, agent output summaries, and automatically generated Kestra AI summaries*

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

2. **Optional: AI Summaries** (choose one or use template-based):
   - `TOGETHER_API_KEY` - For high-quality AI summaries (recommended)
   - `GROQ_API_KEY` - Fast AI summaries (free tier available)
   - `HUGGINGFACE_API_KEY` - Alternative free AI option
   - If none are set, template-based summaries are used (no API needed)
   
   **Priority**: Together.ai > Groq > Hugging Face > Template-based

### Deploy

1. Push your code to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel Dashboard
4. Deploy

The app will automatically use Redis for persistent storage and generate summaries for all runs.

## Tools Integration

This project integrates multiple  tools to create an end-to-end autonomous development workflow:

### 🛠️ Cline - CLI Framework & Autonomous Agent

**How it's used:**
- **CLI Interface**: Provides the command-line interface for executing autonomous development tasks
- **Task Execution**: Drives the `scaffold`, `tests`, and `refactor` commands
- **Context Collection**: Automatically collects repository context (files, code snippets) for agent tasks
- **Remote Execution**: Supports running agent tasks locally or remotely on Vercel

**Implementation:**
- **Location**: `cli/devpilot-cli.ts`
- **Commands**: 
  - `scaffold <feature-name>` - Generates new feature scaffolding
  - `tests <file-path>` - Generates test files
  - `refactor <file-path>` - Analyzes and suggests refactoring
- **Integration**: Logs all runs to `/api/cline` endpoint for dashboard tracking
- **Remote Support**: Can execute agent tasks on Vercel via `DEVPILOT_AGENT_ENDPOINT`

**Code Reference:**
```typescript
// cli/devpilot-cli.ts
const agentResult = await runAgentTask(taskType, agentPayload);
await persistAgentOutput(agentResult.files);
await postLog(log);  // Logs to /api/cline
```

**Usage:**
```bash
# Local execution
npx tsx cli/devpilot-cli.ts scaffold my-feature

# Remote execution (set DEVPILOT_AGENT_ENDPOINT)
$env:DEVPILOT_AGENT_ENDPOINT="https://your-app.vercel.app/api/agent/run"
npx tsx cli/devpilot-cli.ts scaffold my-feature
```

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

### 🤖 Together.ai - AI Model Backend (Optional)

**How it's used:**
- **Agent Tasks**: Powers the core agent task execution for scaffold, tests, and refactor operations
- **Kestra Summaries**: Optional AI-powered summary generation with high-quality analysis
- **Model Access**: Uses Together.ai's hosted LLM models (Llama-3-70b-chat-hf by default)

**Implementation:**
- **Location**: 
  - `apps/web/lib/agents.ts` - Agent task execution
  - `apps/web/lib/kestra-summary.ts` - Summary generation
- **Integration**: Automatically used when `TOGETHER_API_KEY` is set
- **Priority**: Highest priority for AI summaries (Together.ai > Groq > Hugging Face > Template)

**Switching to Together.ai:**
Simply set the environment variable in Vercel Dashboard:
```bash
TOGETHER_API_KEY=your-together-api-key
TOGETHER_MODEL=meta-llama/Llama-3-70b-chat-hf  # Optional, defaults to Llama-3-70b
```

**Code Reference:**
```typescript
// apps/web/lib/kestra-summary.ts
if (TOGETHER_API_KEY) {
  // Uses Together.ai for high-quality summaries
  const summary = await generateWithTogether(run);
}

// apps/web/lib/agents.ts
const response = await fetch("https://api.together.xyz/v1/chat/completions", {
  headers: { Authorization: `Bearer ${TOGETHER_API_KEY}` },
  body: JSON.stringify({ model: TOGETHER_MODEL, messages: [...] })
});
```

**Benefits:**
- High-quality AI summaries with better context understanding
- Reliable model access with Together.ai's infrastructure
- Easy switching via environment variables (no code changes needed)

### 🤖 Groq / Hugging Face - Optional Free AI Summaries

**How it's used:**
- **Enhanced Summaries**: Optional AI-powered summaries using free-tier APIs
- **Fallback**: If not configured, uses intelligent template-based summaries (no API needed)
- **Priority**: Together.ai → Groq → Hugging Face → Template-based

**Implementation:**
- **Location**: `apps/web/lib/kestra-summary.ts`
- **Groq Integration**: Uses `llama-3.1-8b-instant` model via Groq API (free tier)
- **Hugging Face**: Uses `mistralai/Mistral-7B-Instruct-v0.2` via Inference API (free tier)
- **Template Generator**: Analyzes run data and generates contextual summaries without API calls

**Switching AI Providers:**
The system automatically selects the best available option:
1. **Together.ai** (if `TOGETHER_API_KEY` is set) - Highest quality
2. **Groq** (if `GROQ_API_KEY` is set) - Fast, free tier
3. **Hugging Face** (if `HUGGINGFACE_API_KEY` is set) - Free tier
4. **Template-based** (default) - No API needed, works out of the box

**Code Reference:**
```typescript
// apps/web/lib/kestra-summary.ts
// Priority order:
if (TOGETHER_API_KEY) {
  return await generateWithTogether(run);  // Best quality
} else if (GROQ_API_KEY) {
  return await generateWithGroq(run);  // Fast, free
} else if (HUGGINGFACE_API_KEY) {
  return await generateWithHuggingFace(run);  // Free
} else {
  return generateTemplateSummary(run);  // Default, no API
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
- **CLI**: Node.js with TypeScript (`tsx`) - Powered by Cline
- **Storage**: Redis (production) or file-based (local)
- **Summaries**: Template-based (default) or optional AI APIs (Together.ai, Groq, Hugging Face)
- **Workflow**: Kestra for orchestration and AI agent integration
- **Hosting**: Vercel for serverless deployment

