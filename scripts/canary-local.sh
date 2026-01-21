#!/usr/bin/env bash
#
# canary-local.sh - Run canary test against local docker-compose
#
# This script:
# 1. Ensures docker-compose services are running
# 2. Builds the hermes binary if needed
# 3. Runs the canary test with Meilisearch backend
# 4. Shows colored output for easy status reading

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/.."

echo -e "${BLUE}🐤 Hermes Local Canary Test${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Step 1: Check if docker-compose services are running
echo -e "${YELLOW}Checking docker-compose services...${NC}"
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}Starting docker-compose services...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Services started${NC}"
    
    # Wait for services to be healthy
    echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
    sleep 3
else
    echo -e "${GREEN}✅ Services already running${NC}"
fi

# Show service status
echo ""
echo -e "${BLUE}Service Status:${NC}"
docker-compose ps
echo ""

# Step 2: Build if binary doesn't exist or is outdated
if [ ! -f build/bin/hermes ] || [ internal/cmd/commands/canary/canary.go -nt build/bin/hermes ]; then
    echo -e "${YELLOW}Building hermes binary...${NC}"
    make bin
    echo -e "${GREEN}✅ Build complete${NC}"
else
    echo -e "${GREEN}✅ Binary is up to date${NC}"
fi
echo ""

# Step 3: Run canary test
echo -e "${BLUE}Running canary test with Meilisearch...${NC}"
echo ""

./build/bin/hermes canary -search-backend=meilisearch

# Capture exit code
CANARY_EXIT=$?

echo ""
if [ $CANARY_EXIT -eq 0 ]; then
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    echo -e "${GREEN}✅ Canary test PASSED!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}═══════════════════════════════════════════════${NC}"
    echo -e "${RED}❌ Canary test FAILED!${NC}"
    echo -e "${RED}═══════════════════════════════════════════════${NC}"
    exit 1
fi
