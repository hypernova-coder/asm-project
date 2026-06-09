#!/bin/bash
# Keep Next.js dev server alive by restarting it when it dies
cd /home/z/my-project
export DATABASE_URL="postgres://z@localhost:5432/myproject"

while true; do
  echo "[$(date)] Starting Next.js dev server..."
  node /home/z/my-project/node_modules/.bin/next dev -p 3000 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Next.js exited with code $EXIT_CODE, restarting in 3 seconds..."
  sleep 3
done
