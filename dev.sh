#!/bin/bash

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}AI Litigation Navigator - Development Start Script${NC}\n"

# Check if ports are available
check_port() {
  lsof -i :$1 > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "⚠️  Port $1 is already in use"
    return 1
  fi
  return 0
}

# Start backend
echo -e "${GREEN}Starting Backend Server...${NC}"
if check_port 3001; then
  cd backend
  npx ts-node src/index.ts &
  BACKEND_PID=$!
  echo "✓ Backend started (PID: $BACKEND_PID) on port 3001"
  sleep 2
else
  echo "✗ Could not start backend - port 3001 is in use"
  exit 1
fi

# Start frontend
echo -e "\n${GREEN}Starting Frontend Server...${NC}"
if check_port 3000; then
  cd ../frontend
  npm run dev &
  FRONTEND_PID=$!
  echo "✓ Frontend started (PID: $FRONTEND_PID) on port 3000"
else
  echo "✗ Could not start frontend - port 3000 is in use"
  kill $BACKEND_PID
  exit 1
fi

echo -e "\n${GREEN}✓ All services started!${NC}"
echo -e "Backend:  ${BLUE}http://localhost:3001${NC}"
echo -e "Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "\nPress Ctrl+C to stop all services"

# Trap Ctrl+C to clean up
trap "echo -e '\n${GREEN}Shutting down services...${NC}'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT

# Wait for processes
wait
