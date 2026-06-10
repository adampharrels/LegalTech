#!/bin/bash

# Start backend in background
cd /Users/adam/LegalTech/backend
node --loader ts-node/esm --experimental-specifier-resolution=node src/index.ts > backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

# Test API endpoint
echo "Testing /api/cases endpoint..."
curl -s http://localhost:3001/api/cases | head -c 500
echo "\n\nBackend PID: $BACKEND_PID"
echo "Logs available in backend.log"
