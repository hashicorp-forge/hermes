#!/usr/bin/env bash
#
# quick-test.sh - Quick start and test the containerized environment
#

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")"

echo -e "${BLUE}🚀 Starting Hermes Testing Environment${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up --build -d

echo ""
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"

# Wait for services
MAX_WAIT=60
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker-compose ps | grep -q "healthy.*healthy.*healthy"; then
        echo -e "${GREEN}✅ All services healthy!${NC}"
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo -e "\n${YELLOW}⚠️  Timeout waiting for services. Checking status...${NC}"
    docker-compose ps
fi

echo ""
echo -e "${BLUE}Service Status:${NC}"
docker-compose ps

# Run canary test
echo ""
echo -e "${BLUE}Running canary test...${NC}"
echo ""
docker-compose exec -T hermes /app/hermes canary -search-backend=meilisearch

# Show access info
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Environment Ready!${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Access points:${NC}"
echo -e "  Web UI:       ${GREEN}http://localhost:4201${NC}"
echo -e "  API:          ${GREEN}http://localhost:8001${NC}"
echo -e "  PostgreSQL:   ${GREEN}localhost:5433${NC}"
echo -e "  Meilisearch:  ${GREEN}http://localhost:7701${NC}"
echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo -e "  make logs         - View all logs"
echo -e "  make logs-hermes  - View Hermes logs"
echo -e "  make logs-web     - View web logs"
echo -e "  make down         - Stop services"
echo -e "  make clean        - Stop and remove volumes"
echo ""
