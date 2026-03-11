#!/bin/sh
set -e

# Run database migrations before starting the server
npx tsx scripts/migrate.ts

# Start the Next.js server
exec node server.js
