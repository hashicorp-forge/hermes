#!/usr/bin/env bash
# test-local-workspace-integration.sh
# Integration test to verify local workspace provider is working correctly

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Local Workspace Integration Test${NC}"
echo ""

# Check if containers are running
if ! docker compose ps | grep -q "Up"; then
    echo -e "${RED}✗ Containers not running. Start with: docker compose up -d${NC}"
    exit 1
fi

echo "1️⃣  Checking Hermes container health..."
if docker compose ps hermes | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Hermes container is healthy"
else
    echo -e "${RED}✗ Hermes container is not healthy${NC}"
    docker compose logs hermes | tail -20
    exit 1
fi

echo ""
echo "2️⃣  Verifying users.json is mounted..."
if docker exec hermes-server test -f /app/workspace_data/users.json; then
    USER_COUNT=$(docker exec hermes-server sh -c "cat /app/workspace_data/users.json | grep -o '\"email\"' | wc -l")
    echo -e "${GREEN}✓${NC} users.json mounted successfully ($USER_COUNT users)"
else
    echo -e "${RED}✗ users.json not found in container${NC}"
    exit 1
fi

echo ""
echo "3️⃣  Checking workspace directory structure..."
for dir in docs drafts folders; do
    if docker exec hermes-server test -d "/app/workspace_data/$dir"; then
        echo -e "${GREEN}✓${NC} /app/workspace_data/$dir exists"
    else
        echo -e "${RED}✗ /app/workspace_data/$dir missing${NC}"
        exit 1
    fi
done

echo ""
echo "4️⃣  Verifying backend configuration..."
CONFIG_CHECK=$(docker exec hermes-server cat /app/config.hcl | grep -A3 'providers {' | grep 'workspace.*=.*"local"' || echo "")
if [ -n "$CONFIG_CHECK" ]; then
    echo -e "${GREEN}✓${NC} Backend configured to use local workspace provider"
else
    echo -e "${RED}✗ Backend not configured for local workspace${NC}"
    exit 1
fi

echo ""
echo "5️⃣  Testing backend health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Backend health check passed (HTTP 200)"
else
    echo -e "${RED}✗ Backend health check failed (HTTP $HEALTH_RESPONSE)${NC}"
    exit 1
fi

echo ""
echo "6️⃣  Testing web config endpoint (should return workspace provider info)..."
CONFIG_RESPONSE=$(curl -s http://localhost:8001/api/v2/web/config)
if echo "$CONFIG_RESPONSE" | grep -q '"baseURL"'; then
    echo -e "${GREEN}✓${NC} Web config endpoint responding"
    
    # Check if workspace provider info is available (optional)
    if echo "$CONFIG_RESPONSE" | grep -qi 'local'; then
        echo -e "${GREEN}✓${NC} Response mentions local provider"
    fi
else
    echo -e "${RED}✗ Web config endpoint not responding correctly${NC}"
    echo "Response: $CONFIG_RESPONSE"
    exit 1
fi

echo ""
echo "6a. Testing /me endpoint with local workspace users..."
# First, we need to get a valid session token by authenticating with Dex
# For now, we'll test that the endpoint requires authentication
ME_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/v2/me)
if [ "$ME_RESPONSE" = "401" ] || [ "$ME_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✓${NC} /me endpoint correctly requires authentication (HTTP $ME_RESPONSE)"
else
    echo -e "${RED}✗ /me endpoint should require authentication (got HTTP $ME_RESPONSE)${NC}"
    exit 1
fi

# Test HEAD method (lightweight auth check)
ME_HEAD_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X HEAD http://localhost:8001/api/v2/me)
if [ "$ME_HEAD_RESPONSE" = "401" ] || [ "$ME_HEAD_RESPONSE" = "403" ]; then
    echo -e "${GREEN}✓${NC} /me HEAD endpoint correctly requires authentication (HTTP $ME_HEAD_RESPONSE)"
else
    echo -e "${RED}✗ /me HEAD endpoint should require authentication (got HTTP $ME_HEAD_RESPONSE)${NC}"
    exit 1
fi

echo ""
echo "7️⃣  Testing Dex authentication endpoint..."
DEX_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5558/dex/.well-known/openid-configuration)
if [ "$DEX_HEALTH" = "200" ]; then
    echo -e "${GREEN}✓${NC} Dex OIDC provider is responding (HTTP 200)"
else
    echo -e "${RED}✗ Dex OIDC provider not accessible (HTTP $DEX_HEALTH)${NC}"
    exit 1
fi

echo ""
echo "8️⃣  Verifying volume persistence..."
VOLUME_EXISTS=$(docker volume ls | grep testing_hermes_workspace || echo "")
if [ -n "$VOLUME_EXISTS" ]; then
    echo -e "${GREEN}✓${NC} hermes_workspace volume exists"
    
    # Check volume mount point
    MOUNT_POINT=$(docker volume inspect testing_hermes_workspace | grep Mountpoint | cut -d'"' -f4)
    echo -e "${GREEN}✓${NC} Volume mounted at: $MOUNT_POINT"
else
    echo -e "${RED}✗ hermes_workspace volume not found${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ All integration tests passed!${NC}"
echo ""
echo "Local workspace provider is fully operational."
echo ""
echo "Next steps:"
echo "  1. Open http://localhost:4201 in your browser"
echo "  2. Login with: test@hermes.local / password"
echo "  3. Create a document to test document storage"
echo "  4. Restart containers to verify persistence: docker compose restart"
echo ""
echo "Monitoring:"
echo "  - Backend logs: docker compose logs -f hermes"
echo "  - Web logs: docker compose logs -f web"
echo "  - All logs: docker compose logs -f"
