# ── Build Stage ────────────────────────────────────────────────
FROM node:22-slim AS build

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY tsconfig.json package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY keyspot-sdk/apps/ keyspot-sdk/apps/

# Remove .env files — DATABASE_URL comes from the deployment platform
RUN find /app -name ".env" -type f -delete

RUN corepack enable && corepack prepare && pnpm install --no-frozen-lockfile

# Generate Prisma client (creates TypeScript types from schema)
RUN pnpm --filter @roadsidelab/keyspot-server db:generate

# Build core and its deps first (fixes @keyspot/native import of core/errors)
RUN pnpm --filter @roadsidelab/keyspot-patterns run build
RUN pnpm --filter @roadsidelab/keyspot-core run build

# Build native (depends on core/errors)
RUN pnpm --filter @roadsidelab/keyspot-native run build

# Build the project
RUN pnpm build

# ── Production Stage ───────────────────────────────────────────
FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only the built artifacts and node_modules (production deps only)
COPY --from=build /app/packages/ ./packages/
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/keyspot-sdk/apps/ ./keyspot-sdk/apps/

# Switch to non-root user for security
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# DATABASE_URL and DIRECT_URL must be set by the deployment platform (e.g. Neon)
CMD ["sh", "-c", "node packages/@keyspot/server/dist/index.js"]
