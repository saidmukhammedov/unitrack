# Multi-stage production Dockerfile for @unitrack/api

FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
WORKDIR /app

# Stage 1: Dependencies and Build
FROM base AS builder
WORKDIR /app

# Copy root workspace configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/academic-core/package.json ./packages/academic-core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Generate Prisma Client and build workspace packages & API
RUN pnpm --filter @unitrack/contracts run build && \
    pnpm --filter @unitrack/i18n run build && \
    pnpm --filter @unitrack/academic-core run build && \
    pnpm --filter @unitrack/api-client run build && \
    pnpm --filter @unitrack/api run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@12.15.0 --activate

# Install OpenSSL for Prisma engine compatibility on Alpine
RUN apk add --no-cache openssl

# Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/config/package.json ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/academic-core/package.json ./packages/academic-core/
COPY packages/api-client/package.json ./packages/api-client/
COPY apps/api/package.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy compiled outputs from builder
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/packages/i18n/dist ./packages/i18n/dist
COPY --from=builder /app/packages/academic-core/dist ./packages/academic-core/dist
COPY --from=builder /app/packages/api-client/dist ./packages/api-client/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules/.pnpm/@prisma+client* ./node_modules/.pnpm/

# Use non-root user
USER node

EXPOSE 4000
ENV PORT=4000

CMD ["sh", "-c", "pnpm --filter @unitrack/api exec prisma migrate deploy && node apps/api/dist/index.js"]
