#!/bin/bash
# Runs case ingestion, then lifecycle signal detection, appending all output
# to backend/logs/pipeline.log. Run it by hand with `npm run pipeline`, or on
# a daily schedule via scripts/install-schedule.sh.
set -u
cd "$(dirname "$0")/.."

# launchd starts with a bare PATH, so load nvm to find node and npx.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null

mkdir -p logs
exec > >(tee -a logs/pipeline.log) 2>&1

echo "=== $(date '+%Y-%m-%d %H:%M:%S') pipeline start"
npx ts-node src/ingest-cases.ts
ingest_status=$?
npx ts-node src/detect-lifecycle-signals.ts
detect_status=$?
echo "=== $(date '+%Y-%m-%d %H:%M:%S') pipeline end (ingest exit $ingest_status, detect exit $detect_status)"

[ "$ingest_status" -eq 0 ] && [ "$detect_status" -eq 0 ]
