#!/bin/bash
# DevPilot CLI Helper Script for Vercel (Bash)
# Usage: ./scripts/devpilot-vercel.sh scaffold feature-name
#        ./scripts/devpilot-vercel.sh tests apps/web/app/page.tsx
#        ./scripts/devpilot-vercel.sh refactor apps/web/app/page.tsx

set -e

COMMAND=$1
TARGET=$2
VERCEL_URL=${DEVPILOT_VERCEL_URL:-""}
BYPASS_TOKEN=${VERCEL_PROTECTION_BYPASS:-""}

if [ -z "$COMMAND" ] || [ -z "$TARGET" ]; then
    echo "Usage: $0 <scaffold|tests|refactor> <target>"
    echo "Example: $0 scaffold feature-name"
    exit 1
fi

if [ "$COMMAND" != "scaffold" ] && [ "$COMMAND" != "tests" ] && [ "$COMMAND" != "refactor" ]; then
    echo "Error: Command must be one of: scaffold, tests, refactor"
    exit 1
fi

if [ -z "$VERCEL_URL" ]; then
    echo "Error: Vercel URL not set. Set DEVPILOT_VERCEL_URL environment variable"
    echo "Example: export DEVPILOT_VERCEL_URL='https://your-app.vercel.app'"
    exit 1
fi

# Remove trailing slash
VERCEL_URL=$(echo "$VERCEL_URL" | sed 's:/*$::')

# Set environment variables
export DEVPILOT_API_ENDPOINT="$VERCEL_URL/api/cline"
export DEVPILOT_AGENT_ENDPOINT="$VERCEL_URL/api/agent/run"

if [ -n "$BYPASS_TOKEN" ]; then
    export VERCEL_PROTECTION_BYPASS="$BYPASS_TOKEN"
    echo "Using Vercel protection bypass token"
fi

echo "Using Vercel deployment: $VERCEL_URL"
echo "Running: devpilot $COMMAND $TARGET"
echo ""

# Run the CLI
npx tsx cli/devpilot-cli.ts "$COMMAND" "$TARGET"



