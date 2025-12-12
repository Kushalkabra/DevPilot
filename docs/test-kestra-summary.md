# Testing Kestra Summaries

## Manual Test via curl/PowerShell

To test if Kestra summaries are working, you can manually POST to the webhook endpoint:

**PowerShell:**
```powershell
$body = @{
    runId = "run-1765390981522"  # Use an actual run ID from your dashboard
    status = "success"
    summary = "Test summary from manual POST"
    decision = "Proceed with deployment"
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json

$env:VERCEL_PROTECTION_BYPASS="eWiP0eRa50moZeAiW7J626hYv1zGsBV3"

curl -X POST "https://dev-pilot-3pb2w1zza-kushalkabras-projects.vercel.app/api/kestra-webhook?x-vercel-protection-bypass=$env:VERCEL_PROTECTION_BYPASS" `
  -H "Content-Type: application/json" `
  -d $body
```

**Or using Invoke-RestMethod:**
```powershell
$body = @{
    runId = "run-1765390981522"  # Use an actual run ID
    status = "success"
    summary = "Test summary from PowerShell"
    decision = "Proceed"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
}

$url = "https://dev-pilot-3pb2w1zza-kushalkabras-projects.vercel.app/api/kestra-webhook?x-vercel-protection-bypass=eWiP0eRa50moZeAiW7J626hYv1zGsBV3"

Invoke-RestMethod -Uri $url -Method Post -Body $body -Headers $headers
```

## Check the Logs

After posting, check Vercel function logs for:
- `[kestra-webhook] Received request:`
- `[kestra-webhook] Appending summary to run:`
- `[store] appendKestraSummary called for runId:`
- `[store] Successfully saved Kestra summary to Redis/KV`

## Refresh Dashboard

After posting, refresh your dashboard - the Kestra summary should appear under the run details.

## Common Issues

1. **Run ID doesn't match**: Make sure the `runId` matches exactly (case-sensitive)
2. **Redis not saving**: Check logs for Redis connection errors
3. **Dashboard not refreshing**: Hard refresh (Ctrl+Shift+R) the dashboard page

