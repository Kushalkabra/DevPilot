# DevPilot CLI Helper Script for Vercel (PowerShell)
# Usage: .\scripts\devpilot-vercel.ps1 scaffold feature-name
#        .\scripts\devpilot-vercel.ps1 tests apps/web/app/page.tsx
#        .\scripts\devpilot-vercel.ps1 refactor apps/web/app/page.tsx

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("scaffold", "tests", "refactor")]
    [string]$Command,
    
    [Parameter(Mandatory=$true)]
    [string]$Target,
    
    [string]$VercelUrl = $env:DEVPILOT_VERCEL_URL,
    [string]$BypassToken = $env:VERCEL_PROTECTION_BYPASS
)

if (-not $VercelUrl) {
    Write-Host "Error: Vercel URL not set. Set DEVPILOT_VERCEL_URL or pass -VercelUrl" -ForegroundColor Red
    Write-Host "Example: `$env:DEVPILOT_VERCEL_URL='https://your-app.vercel.app'" -ForegroundColor Yellow
    exit 1
}

# Remove trailing slash
$VercelUrl = $VercelUrl.TrimEnd('/')

# Set environment variables
$env:DEVPILOT_API_ENDPOINT = "$VercelUrl/api/cline"
$env:DEVPILOT_AGENT_ENDPOINT = "$VercelUrl/api/agent/run"

if ($BypassToken) {
    $env:VERCEL_PROTECTION_BYPASS = $BypassToken
    Write-Host "Using Vercel protection bypass token" -ForegroundColor Green
}

Write-Host "Using Vercel deployment: $VercelUrl" -ForegroundColor Cyan
Write-Host "Running: devpilot $Command $Target" -ForegroundColor Cyan
Write-Host ""

# Run the CLI
npx tsx cli/devpilot-cli.ts $Command $Target



