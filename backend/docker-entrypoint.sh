#!/bin/sh
set -e

echo "Starting backend entrypoint..."

# Run Prisma DB Push to sync schema with database
# Using db push instead of migrate deploy because there are no migration files
echo "Running Prisma DB Push..."
npx prisma db push

echo "Starting application..."
exec "$@"
