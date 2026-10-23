#!/usr/bin/env bash
set -e

# Disable corepack interactive prompts in CI/CD
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

echo "=== Ensuring modern Corepack (>=0.31.0) ==="
# Install a compatible Corepack locally to support Node 20 with current npm registry signing keys
mkdir -p .corepack .bin
if [ ! -f ".corepack/node_modules/corepack/dist/corepack.js" ]; then
  npm install --prefix .corepack corepack@^0.34.0
fi

# Generate shims in local .bin to avoid EROFS on read-only system /usr/bin
node .corepack/node_modules/corepack/dist/corepack.js enable --install-directory .bin
export PATH="$PWD/.bin:$PATH"

echo "=== Environment Info ==="
echo "Node version: $(node -v)"
echo "Corepack version: $(node .corepack/node_modules/corepack/dist/corepack.js --version)"
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
