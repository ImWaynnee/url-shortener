#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema prisma/schema.prisma

echo "Starting NestJS in production mode..."
exec "$@"
