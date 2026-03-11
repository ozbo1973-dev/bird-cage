FROM node:20-slim AS base

# Install build tools for better-sqlite3 native bindings
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install all dependencies (including dev for build)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Build the Next.js app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Install production-only dependencies with native bindings compiled
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone output bundles the minimal server
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Migration artifacts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Production node_modules (includes tsx for migration, native bindings compiled on same OS)
COPY --from=prod-deps /app/node_modules ./node_modules

COPY entrypoint.sh ./entrypoint.sh
RUN sed -i 's/\r//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./entrypoint.sh"]
