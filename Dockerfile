# ── Stage 1: Install dependencies ──
FROM node:26-alpine AS deps
RUN corepack enable pnpm
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm i --frozen-lockfile

# ── Stage 2: Install PRODUCTION-ONLY dependencies ──
FROM node:26-alpine AS proddeps
RUN corepack enable pnpm
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm i --prod --frozen-lockfile

# ── Stage 3: Build the application ──
FROM node:26-alpine AS builder
RUN corepack enable pnpm
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build args for Next.js build-time env inlining
ARG NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="placeholder-key-for-build"
ARG NEXT_PUBLIC_SITE_URL="https://placeholder.marketplace.dev"
ARG NEXT_PUBLIC_AUTH_HOST_URL="https://placeholder.auth.dev"
ARG NEXT_PUBLIC_WWV_COOKIE_DOMAIN=".placeholder.dev"
ENV DATABASE_URL="file:./dummy.db"
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_AUTH_HOST_URL=${NEXT_PUBLIC_AUTH_HOST_URL}
ENV NEXT_PUBLIC_WWV_COOKIE_DOMAIN=${NEXT_PUBLIC_WWV_COOKIE_DOMAIN}
RUN npx prisma generate
RUN pnpm run build

# ── Stage 4: Production runner ──
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone server
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public
# Copy Prisma schema, migrations, and SQLite DB
COPY --from=builder /app/prisma ./prisma
# Copy seed data dependencies (prisma/seed.ts imports ../src/data/knownPlugins)
COPY --from=builder /app/src/data ./src/data
# Copy Prisma Config
COPY --from=builder /app/prisma.config.ts ./

# Copy production-only node_modules so CLI tools like Prisma config can load
COPY --from=proddeps /app/node_modules ./node_modules

# Copy scripts
COPY --from=builder /app/scripts ./scripts

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Declare /app/data as a persistent volume mount point
VOLUME ["/app/data"]

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
