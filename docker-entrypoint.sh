#!/bin/sh
set -e

echo "Starting WorldWideView Marketplace entrypoint..."

# Tell Prisma CLI where the SQLite DB is in the mapped volume
export DATABASE_URL="file:/app/data/registry.db"
export DB_PATH="/app/data/registry.db"

# Apply database migrations on startup (idempotent)
echo "Running prisma migrate deploy..."
npx prisma migrate deploy

# Execute the main command (from Dockerfile CMD)
exec "$@"
