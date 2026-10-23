#!/usr/bin/env bash
set -e

# Ensure local corepack shims are available on PATH
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
mkdir -p .bin
corepack enable --install-directory .bin
export PATH="$PWD/.bin:$PATH"

echo "=== Running database migrations ==="
pnpm --filter @unitrack/api exec prisma migrate deploy

echo "=== Starting UniTrack API server ==="
exec node apps/api/dist/index.js
