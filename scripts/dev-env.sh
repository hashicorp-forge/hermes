#!/bin/bash
# Hermes Development Environment Selector
# Helps switch between different development configurations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
HERMES_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}Hermes Development Environment Selector${NC}"
echo ""
echo "Select your development setup:"
echo ""
echo "  1) Native Backend + Native Frontend (ports: 8000/4200)"
echo "  2) Testing Backend (Docker) + Native Frontend (ports: 8001/4200)"
echo "  3) Fully Containerized Testing (ports: 8001/4201)"
echo "  4) Check Status"
echo "  5) Stop All Services"
echo ""
read -p "Enter choice [1-5]: " choice

case $choice in
  1)
    echo -e "${GREEN}Starting Native Backend + Native Frontend${NC}"
    echo ""
    echo "This will:"
    echo "  - Start dependencies: Dex, PostgreSQL, Meilisearch (Docker)"
    echo "  - Start Hermes backend natively (port 8000)"
    echo "  - Start Ember frontend natively (port 4200, proxying to 8000)"
    echo ""
    
    # Start dependencies
    cd "$HERMES_ROOT"
    echo -e "${YELLOW}Starting dependencies (Docker)...${NC}"
    docker compose up -d dex postgres meilisearch
    
    # Wait for dependencies
    echo "Waiting for dependencies to be ready..."
    sleep 5
    
    # Check if backend binary exists
    if [ ! -f "$HERMES_ROOT/hermes" ]; then
      echo -e "${YELLOW}Building Hermes backend...${NC}"
      make bin
    fi
    
    # Start backend in background
    echo -e "${YELLOW}Starting Hermes backend (port 8000)...${NC}"
    ./hermes server -config=config.hcl > /tmp/hermes-backend.log 2>&1 &
    BACKEND_PID=$!
    echo "Backend PID: $BACKEND_PID"
    
    # Wait for backend to be ready
    echo "Waiting for backend to be ready..."
    for i in {1..30}; do
      if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is ready!${NC}"
        break
      fi
      sleep 1
    done
    
    # Start frontend
    echo -e "${YELLOW}Starting Ember frontend (port 4200)...${NC}"
    cd "$HERMES_ROOT/web"
    echo "Run: yarn start:proxy:local"
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo "  - Backend: http://localhost:8000"
    echo "  - Frontend: http://localhost:4200"
    echo "  - Backend logs: tail -f /tmp/hermes-backend.log"
    ;;
    
  2)
    echo -e "${GREEN}Starting Testing Backend (Docker) + Native Frontend${NC}"
    echo ""
    echo "This will:"
    echo "  - Start testing environment (Docker): Dex, PostgreSQL, Meilisearch, Hermes (port 8001)"
    echo "  - Start Ember frontend natively (port 4200, proxying to 8001)"
    echo ""
    
    # Start testing backend
    cd "$HERMES_ROOT/testing"
    echo -e "${YELLOW}Starting testing environment...${NC}"
    docker compose up -d hermes dex postgres meilisearch
    
    # Wait for services
    echo "Waiting for services to be ready..."
    sleep 10
    
    # Check health
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
      echo -e "${GREEN}Backend is ready!${NC}"
    else
      echo -e "${RED}Backend health check failed${NC}"
    fi
    
    # Instructions for frontend
    echo ""
    echo -e "${YELLOW}Starting Ember frontend (port 4200)...${NC}"
    echo "Run: cd $HERMES_ROOT/web && yarn start:proxy:testing"
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo "  - Backend: http://localhost:8001 (Docker)"
    echo "  - Frontend: http://localhost:4200 (Native)"
    echo "  - Backend logs: docker compose logs -f hermes"
    ;;
    
  3)
    echo -e "${GREEN}Starting Fully Containerized Testing${NC}"
    echo ""
    
    # Start all services
    cd "$HERMES_ROOT/testing"
    echo -e "${YELLOW}Starting all services...${NC}"
    docker compose up -d
    
    # Wait for services
    echo "Waiting for services to be ready..."
    sleep 15
    
    # Check health
    echo ""
    docker compose ps
    echo ""
    
    if curl -s http://localhost:4201/ > /dev/null 2>&1; then
      echo -e "${GREEN}Services are ready!${NC}"
    else
      echo -e "${YELLOW}Services may still be starting...${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Setup complete!${NC}"
    echo "  - Backend: http://localhost:8001"
    echo "  - Frontend: http://localhost:4201"
    echo "  - View logs: docker compose logs -f"
    ;;
    
  4)
    echo -e "${GREEN}Checking Service Status${NC}"
    echo ""
    
    echo -e "${BLUE}Port Check:${NC}"
    echo "Backend (native): $(lsof -i :8000 2>/dev/null | grep LISTEN > /dev/null && echo -e '${GREEN}RUNNING${NC}' || echo -e '${RED}NOT RUNNING${NC}')"
    echo "Backend (testing): $(lsof -i :8001 2>/dev/null | grep LISTEN > /dev/null && echo -e '${GREEN}RUNNING${NC}' || echo -e '${RED}NOT RUNNING${NC}')"
    echo "Frontend (native): $(lsof -i :4200 2>/dev/null | grep LISTEN > /dev/null && echo -e '${GREEN}RUNNING${NC}' || echo -e '${RED}NOT RUNNING${NC}')"
    echo "Frontend (testing): $(lsof -i :4201 2>/dev/null | grep LISTEN > /dev/null && echo -e '${GREEN}RUNNING${NC}' || echo -e '${RED}NOT RUNNING${NC}')"
    echo ""
    
    echo -e "${BLUE}Health Checks:${NC}"
    curl -s http://localhost:8000/health > /dev/null 2>&1 && echo "Backend (native): ✓" || echo "Backend (native): ✗"
    curl -s http://localhost:8001/health > /dev/null 2>&1 && echo "Backend (testing): ✓" || echo "Backend (testing): ✗"
    curl -s http://localhost:4200/ > /dev/null 2>&1 && echo "Frontend (native): ✓" || echo "Frontend (native): ✗"
    curl -s http://localhost:4201/ > /dev/null 2>&1 && echo "Frontend (testing): ✓" || echo "Frontend (testing): ✗"
    echo ""
    
    echo -e "${BLUE}Docker Services (Testing):${NC}"
    cd "$HERMES_ROOT/testing"
    docker compose ps
    echo ""
    
    echo -e "${BLUE}Docker Services (Root):${NC}"
    cd "$HERMES_ROOT"
    docker compose ps
    ;;
    
  5)
    echo -e "${YELLOW}Stopping All Services${NC}"
    echo ""
    
    # Kill native backend
    echo "Stopping native backend..."
    pkill -f "hermes server" || echo "No native backend running"
    
    # Kill native frontend
    echo "Stopping native frontend..."
    lsof -ti :4200 | xargs kill -9 2>/dev/null || echo "No native frontend running"
    
    # Stop testing docker compose
    echo "Stopping testing environment..."
    cd "$HERMES_ROOT/testing"
    docker compose down
    
    # Stop root docker compose
    echo "Stopping root dependencies..."
    cd "$HERMES_ROOT"
    docker compose down
    
    echo ""
    echo -e "${GREEN}All services stopped${NC}"
    ;;
    
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac
