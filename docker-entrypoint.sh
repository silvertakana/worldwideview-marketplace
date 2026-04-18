#!/bin/sh
set -e

echo "Starting WorldWideView Marketplace entrypoint..."

# Tell Prisma CLI where the SQLite DB is in the mapped volume
export DATABASE_URL="file:/app/data/registry.db"
export DB_PATH="/app/data/registry.db"

# Apply database migrations on startup (idempotent)
echo "Running prisma migrate deploy..."
npx prisma migrate deploy

# Seed built-in plugins (idempotent)
echo "Seeding plugins..."
npx --yes tsx prisma/seed.ts

# Start the internal NPM cron sync daemon in the background
echo "Starting NPM sync daemon..."
node scripts/cron.mjs &

# Execute the main command (from Dockerfile CMD)
exec "$@"
