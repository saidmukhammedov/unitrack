#!/usr/bin/env bash
set -e

# Disable corepack interactive prompts in CI/CD
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Use a local writable directory for corepack shims to avoid EROFS on read-only /usr/bin
mkdir -p .bin
corepack enable --install-directory .bin
export PATH="$PWD/.bin:$PATH"

echo "=== Environment Info ==="
echo "Node version: $(node -v)"
echo "pnpm version: $(pnpm -v)"
echo "========================"

# Install dependencies using frozen lockfile
pnpm install --frozen-lockfile

# Build shared workspace packages and backend API in dependency order
pnpm --filter @unitrack/contracts build
pnpm --filter @unitrack/i18n build
pnpm --filter @unitrack/academic-core build
pnpm --filter @unitrack/api-client build
pnpm --filter @unitrack/api build

echo "=== Render build completed successfully ==="
