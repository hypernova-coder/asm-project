#!/bin/bash
# Start PostgreSQL server for local development
# This script initializes and starts a local PostgreSQL instance if not already running

PG_BIN="/home/z/.local/pg-extract/usr/lib/postgresql/17/bin"
PGDATA="/home/z/.local/pgdata"
PG_LOG="$PGDATA/server.log"
PG_SOCKET="/tmp/pg-socket"

# Check if PostgreSQL is already running
if "$PG_BIN/pg_isready" -h localhost -p 5432 -q 2>/dev/null; then
  echo "✅ PostgreSQL is already running on port 5432"
  exit 0
fi

# Ensure socket directory exists
mkdir -p "$PG_SOCKET"

# Initialize database if needed
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "📦 Initializing PostgreSQL database..."
  mkdir -p "$PGDATA"
  "$PG_BIN/initdb" -D "$PGDATA" --auth=trust --username=z -L /home/z/.local/pg-extract/usr/share/postgresql/17/ 2>&1
  # Configure for localhost access
  echo "listen_addresses = 'localhost'" >> "$PGDATA/postgresql.conf"
  echo "unix_socket_directories = '$PG_SOCKET'" >> "$PGDATA/postgresql.conf"
fi

# Start PostgreSQL
echo "🚀 Starting PostgreSQL server..."
"$PG_BIN/pg_ctl" -D "$PGDATA" -l "$PG_LOG" -o "-k $PG_SOCKET" start 2>&1

# Wait for it to be ready
for i in {1..10}; do
  if "$PG_BIN/pg_isready" -h localhost -p 5432 -q 2>/dev/null; then
    echo "✅ PostgreSQL started successfully on port 5432"
    # Create database if it doesn't exist
    "$PG_BIN/psql" -h localhost -U z -d postgres -c "SELECT 1 FROM pg_database WHERE datname='myproject'" 2>/dev/null | grep -q 1 || \
      "$PG_BIN/createdb" -h localhost -U z myproject 2>/dev/null
    exit 0
  fi
  sleep 1
done

echo "❌ Failed to start PostgreSQL"
exit 1
