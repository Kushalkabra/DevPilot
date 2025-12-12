# Using DevPilot CLI with Vercel Deployment

This guide explains how to use the DevPilot CLI with your deployed Vercel application.

## Quick Start

### Option 1: Set Environment Variables (Recommended)

Set the environment variable pointing to your Vercel deployment:

**Windows (PowerShell):**
```powershell
$env:DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
```

**Windows (CMD):**
```cmd
set DEVPILOT_API_ENDPOINT=https://your-app.vercel.app/api/cline
npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
```

**Linux/Mac:**
```bash
export DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
```

### Option 2: Create a `.env` file

Create a `.env` file in the repo root:

```env
DEVPILOT_API_ENDPOINT=https://your-app.vercel.app/api/cline
```

Then use a tool like `dotenv-cli`:
```bash
npx dotenv-cli npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
```

### Option 3: Use a Helper Script

Use the provided helper script (see `scripts/devpilot-vercel.sh` or `scripts/devpilot-vercel.ps1`).

## Vercel Protection Bypass

If your Vercel deployment has protection enabled (password protection, Vercel Authentication, etc.), you'll need to set the bypass token:

**Windows (PowerShell):**
```powershell
$env:DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
$env:VERCEL_PROTECTION_BYPASS="your-bypass-token"
npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
```

**Linux/Mac:**
```bash
export DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
export VERCEL_PROTECTION_BYPASS="your-bypass-token"
npx tsx cli/devpilot-cli.ts scaffold onboarding-wizard
```

To get your bypass token:
1. Visit your protected Vercel deployment
2. Open browser DevTools → Network tab
3. Look for the `vercel-protection-bypass` cookie value
4. Or check Vercel dashboard → Deployment → Settings → Protection

## Available Commands

Once configured, use the CLI as normal:

```bash
# Scaffold a new feature
npx tsx cli/devpilot-cli.ts scaffold feature-name

# Generate tests for a file
npx tsx cli/devpilot-cli.ts tests apps/web/app/page.tsx

# Refactor a file
npx tsx cli/devpilot-cli.ts refactor apps/web/app/page.tsx
```

## How It Works

1. **CLI Execution**: The CLI runs locally on your machine
2. **Context Collection**: It collects repository context (files, target file content)
3. **Agent Task**: Currently runs agent tasks locally (placeholder implementation)
4. **Logging**: Results are logged to your Vercel deployment via `/api/cline`
5. **Dashboard**: View results in your Vercel dashboard at `https://your-app.vercel.app`

## Remote Agent Execution (Optional)

To run agent tasks remotely on Vercel instead of locally, you can use the `/api/agent/run` endpoint:

```bash
# Set the agent endpoint
$env:DEVPILOT_AGENT_ENDPOINT="https://your-app.vercel.app/api/agent/run"
$env:DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
npx tsx cli/devpilot-cli.ts scaffold feature-name
```

This requires the agent API endpoint to be deployed (see `apps/web/app/api/agent/run/route.ts`).

## Troubleshooting

### Connection Errors
- Verify your Vercel URL is correct
- Check if the deployment is live: `curl https://your-app.vercel.app/api/runs`
- Ensure CORS is configured if needed

### Authentication Errors
- If you see 401/403 errors, set `VERCEL_PROTECTION_BYPASS`
- Verify the bypass token is correct

### Agent Task Failures
- Check Vercel function logs in the Vercel dashboard
- Ensure `TOGETHER_API_KEY` is set in Vercel environment variables
- Verify the agent endpoint is deployed and accessible

## Example: Full Workflow

```powershell
# 1. Set your Vercel deployment URL
$env:DEVPILOT_API_ENDPOINT="https://dev-pilot-3pb2w1zza-kushalkabras-projects.vercel.app/api/cline"

# 2. (Optional) Set bypass token if protection is enabled
$env:VERCEL_PROTECTION_BYPASS="your-token-here"

# 3. Run CLI commands
npx tsx cli/devpilot-cli.ts scaffold new-feature
npx tsx cli/devpilot-cli.ts tests apps/web/app/page.tsx

# 4. View results in dashboard
# Open: https://dev-pilot-3pb2w1zza-kushalkabras-projects.vercel.app
```



