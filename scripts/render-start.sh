#!/usr/bin/env bash
set -e

# Disable corepack interactive prompts in CI/CD
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Ensure modern Corepack shims are available on PATH
mkdir -p .corepack .bin
if [ ! -f ".corepack/node_modules/corepack/dist/corepack.js" ]; then
  npm install --prefix .corepack corepack@^0.34.0
fi

node .corepack/node_modules/corepack/dist/corepack.js enable --install-directory .bin
export PATH="$PWD/.bin:$PATH"

echo "=== Environment Info ==="
echo "Node version: $(node -v)"
echo "Corepack version: $(node .corepack/node_modules/corepack/dist/corepack.js --version)"
echo "pnpm version: $(pnpm -v)"
echo "========================"

echo "=== Running database migrations ==="
pnpm --filter @unitrack/api exec prisma migrate deploy

echo "=== Starting UniTrack API server ==="
exec node apps/api/dist/index.js
