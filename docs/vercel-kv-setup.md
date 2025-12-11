# Setting Up Persistent Storage for Vercel

## Problem

Vercel serverless functions are stateless - each request is a new function invocation. This means:
- Memory storage doesn't persist between requests
- `/tmp` directory is ephemeral and gets cleared
- Runs logged via CLI won't appear in the dashboard

## Solution: Redis Storage

The application supports two Redis storage options:
1. **Standard Redis** (Redis Labs, Upstash, self-hosted) - Recommended
2. **Vercel KV** (Vercel's managed Redis service)

## Setup Steps

### Option 1: Standard Redis (Recommended)

Works with Redis Labs, Upstash, or any Redis-compatible service.

#### 1. Get Your Redis URL

Your Redis URL should look like:
```
redis://default:password@host:port
```

Example (Redis Labs):
```
redis://default: your secret code
```

#### 2. Add Environment Variable to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - Key: `REDIS_URL`
   - Value: Your Redis connection string
   - Environment: Production, Preview, Development (select all)

#### 3. Redeploy

After adding the environment variable:
1. Go to **Deployments**
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger a new deployment

### Option 2: Vercel KV

#### 1. Create a Vercel KV Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** → **Create Database**
4. Choose **KV** (Redis)
5. Select a region and create the database

#### 2. Get Your KV Credentials

After creating the KV database:
1. Go to **Storage** → Your KV database
2. Copy the following environment variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

#### 3. Add Environment Variables to Vercel

1. Go to your project settings → **Environment Variables**
2. Add:
   - `KV_REST_API_URL` = (your KV REST API URL)
   - `KV_REST_API_TOKEN` = (your KV REST API token)

#### 4. Redeploy Your Application

After adding the environment variables, redeploy your application.

### Verify It's Working

After redeployment, test the CLI:

```powershell
$env:DEVPILOT_API_ENDPOINT="https://your-app.vercel.app/api/cline"
$env:VERCEL_PROTECTION_BYPASS="your-bypass-token"
npx tsx cli/devpilot-cli.ts scaffold test-feature
```

Then check your dashboard - the run should appear!

## How It Works

The updated `lib/store.ts` automatically:
1. Checks for `REDIS_URL` first (standard Redis connection)
2. Falls back to `KV_REST_API_URL` and `KV_REST_API_TOKEN` (Vercel KV)
3. Falls back to file/memory storage if neither is configured (for local development)

Priority order:
1. `REDIS_URL` → Standard Redis connection
2. `KV_REST_API_URL` + `KV_REST_API_TOKEN` → Vercel KV
3. File/memory storage → Local development fallback

## Local Development

For local development, the store still uses file-based storage (`.data/runs.json`), so you don't need KV locally unless you want to test the KV integration.

## Troubleshooting

### Runs Still Not Appearing

1. **Check environment variables**: 
   - Ensure `REDIS_URL` is set (for standard Redis), OR
   - Ensure `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set (for Vercel KV)
2. **Check deployment logs**: Look for one of these messages:
   - `[store] Using Redis for persistent storage (REDIS_URL)`
   - `[store] Using Vercel KV for persistent storage`
3. **Verify Redis/KV connection**: Make sure your Redis instance is accessible and credentials are correct
4. **Check function logs**: Go to Vercel Dashboard → Your Deployment → Functions → View logs

### Error: "Redis connection failed" or "Vercel KV not available"

This means the environment variables aren't set correctly or the connection failed. Check:
- `REDIS_URL` format is correct: `redis://default:password@host:port`
- Redis instance is accessible from Vercel's servers
- Credentials are correct

### Still Using File Storage

If you see `[store] Vercel KV not available` or no Redis message in logs, the fallback is working but Redis/KV isn't configured. Set up Redis following Option 1 or Option 2 above.

## Alternative: Database Storage

If you prefer a database over KV, you can:
1. Use Vercel Postgres
2. Use MongoDB Atlas
3. Use any other database

Update `lib/store.ts` to use your preferred database client instead of Vercel KV.

