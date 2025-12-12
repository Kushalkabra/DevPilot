# Quick Start: Using CLI with Vercel

## 🚀 Fastest Way to Get Started

### Step 1: Get Your Vercel URL
Your deployment URL should look like: `https://your-app.vercel.app`

### Step 2: Set Environment Variables

**Windows PowerShell:**
```powershell
$env:DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
$env:DEVPILOT_AGENT_ENDPOINT="https://your-app.vercel.app/api/agent/run"
```

**Linux/Mac:**
```bash
export DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
export DEVPILOT_AGENT_ENDPOINT="https://your-app.vercel.app/api/agent/run"
```

### Step 3: Run CLI Commands

```bash
npx tsx cli/devpilot-cli.ts scaffold my-feature
npx tsx cli/devpilot-cli.ts tests apps/web/app/page.tsx
npx tsx cli/devpilot-cli.ts refactor apps/web/app/page.tsx
```

### Step 4: View Results

Open your Vercel dashboard: `https://your-app.vercel.app`

## 🔒 If Vercel Protection is Enabled

Add the bypass token:

**Windows PowerShell:**
```powershell
$env:VERCEL_PROTECTION_BYPASS="your-bypass-token-here"
```

**Linux/Mac:**
```bash
export VERCEL_PROTECTION_BYPASS="your-bypass-token-here"
```

## 📝 Using Helper Scripts

**Windows PowerShell:**
```powershell
$env:DEVPILOT_VERCEL_URL="https://your-app.vercel.app"
.\scripts\devpilot-vercel.ps1 scaffold my-feature
```

**Linux/Mac:**
```bash
export DEVPILOT_VERCEL_URL="https://your-app.vercel.app"
./scripts/devpilot-vercel.sh scaffold my-feature
```

## 🎯 What Happens?

1. **CLI runs locally** - Collects your repo context
2. **Agent task runs on Vercel** (if `DEVPILOT_AGENT_ENDPOINT` is set) - Uses your Vercel deployment's AI backend
3. **Results logged to Vercel** - Stored in your Vercel deployment
4. **Files written locally** - Generated files saved to your repo
5. **View in dashboard** - See all runs at your Vercel URL

## ❓ Troubleshooting

- **Connection errors?** Check your Vercel URL is correct
- **401/403 errors?** Set `VERCEL_PROTECTION_BYPASS` token
- **Agent fails?** Check Vercel function logs and ensure `TOGETHER_API_KEY` is set in Vercel

For more details, see `docs/vercel-cli-usage.md`



