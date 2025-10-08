#!/usr/bin/env bash
# quick-start-local-workspace.sh
# One-command setup for local workspace acceptance testing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Hermes Local Workspace Quick Start${NC}"
echo ""

# Step 1: Verify configuration
echo -e "${BLUE}Step 1/4:${NC} Verifying configuration..."
if ./verify-local-workspace.sh > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Configuration verified"
else
    echo -e "${YELLOW}⚠${NC}  Configuration check failed, running detailed check..."
    ./verify-local-workspace.sh
    exit 1
fi

# Step 2: Stop any existing containers
echo ""
echo -e "${BLUE}Step 2/4:${NC} Cleaning up existing containers..."
if docker compose ps -q | grep -q .; then
    echo "Stopping existing containers..."
    docker compose down
    echo -e "${GREEN}✓${NC} Containers stopped"
else
    echo -e "${GREEN}✓${NC} No existing containers"
fi

# Step 3: Start services
echo ""
echo -e "${BLUE}Step 3/4:${NC} Starting services (this may take a few minutes on first run)..."
docker compose up -d --build

# Step 4: Wait for health checks
echo ""
echo -e "${BLUE}Step 4/4:${NC} Waiting for services to become healthy..."
MAX_WAIT=60
WAITED=0

while [ $WAITED -lt $MAX_WAIT ]; do
    HEALTHY=$(docker compose ps | grep -c "(healthy)" || echo "0")
    TOTAL=$(docker compose ps | grep -c "Up" || echo "0")
    
    echo -ne "\r  Services: $HEALTHY/$TOTAL healthy (${WAITED}s elapsed)"
    
    if [ "$HEALTHY" -ge 3 ]; then
        echo ""
        echo -e "${GREEN}✓${NC} All services healthy!"
        break
    fi
    
    sleep 2
    WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    echo -e "${YELLOW}⚠${NC}  Timeout waiting for services. Current status:"
    docker compose ps
    echo ""
    echo "Check logs:"
    echo "  docker compose logs hermes"
    echo "  docker compose logs web"
    exit 1
fi

# Run integration tests
echo ""
echo -e "${BLUE}Running integration tests...${NC}"
if ./test-local-workspace-integration.sh; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${GREEN}✅ Hermes is ready for acceptance testing!${NC}"
    echo ""
    echo "🌐 Access the application:"
    echo "   Web UI:     http://localhost:4201"
    echo "   API:        http://localhost:8001"
    echo "   Dex OIDC:   http://localhost:5558"
    echo ""
    echo "🔑 Test credentials:"
    echo "   Email:      test@hermes.local"
    echo "   Password:   password"
    echo ""
    echo "   Also available:"
    echo "   - admin@hermes.local / password"
    echo "   - user@hermes.local / password"
    echo ""
    echo "📊 Monitoring:"
    echo "   docker compose logs -f         # All services"
    echo "   docker compose logs -f hermes  # Backend only"
    echo "   docker compose logs -f web     # Frontend only"
    echo ""
    echo "🛑 Stop services:"
    echo "   docker compose down            # Stop (keep data)"
    echo "   docker compose down -v         # Stop + delete data"
    echo ""
else
    echo ""
    echo -e "${YELLOW}⚠${NC}  Integration tests failed. Check logs:"
    echo "   docker compose logs hermes"
    exit 1
fi
