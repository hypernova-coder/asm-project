#!/bin/bash
# Start PostgreSQL server for local development
# This script initializes and starts a local PostgreSQL instance if not already running

PG_BIN="/home/z/.local/pg-extract/usr/lib/postgresql/17/bin"
PGDATA="/home/z/.local/pgdata"
PG_LOG="$PGDATA/server.log"

# Check if PostgreSQL is already running
if "$PG_BIN/pg_isready" -h localhost -p 5432 -q 2>/dev/null; then
  echo "✅ PostgreSQL is already running on port 5432"
  exit 0
fi

# Start PostgreSQL
echo "🚀 Starting PostgreSQL server..."
"$PG_BIN/pg_ctl" -D "$PGDATA" -l "$PG_LOG" start 2>&1

# Wait for it to be ready
for i in {1..10}; do
  if "$PG_BIN/pg_isready" -h localhost -p 5432 -q 2>/dev/null; then
    echo "✅ PostgreSQL started successfully on port 5432"
    exit 0
  fi
  sleep 1
done

echo "❌ Failed to start PostgreSQL"
exit 1
