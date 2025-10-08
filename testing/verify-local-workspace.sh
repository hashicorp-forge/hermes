#!/usr/bin/env bash
# verify-local-workspace.sh
# Verifies that local workspace provider is properly configured for acceptance testing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔍 Verifying Local Workspace Configuration..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=1
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

FAILED=0

# Check 1: config.hcl has providers block with workspace = "local"
echo "1. Checking config.hcl provider configuration..."
if grep -q 'providers\s*{' config.hcl && grep -A5 'providers\s*{' config.hcl | grep -q 'workspace\s*=\s*"local"'; then
    pass "config.hcl has workspace provider set to 'local'"
else
    fail "config.hcl missing 'providers { workspace = \"local\" }' block"
fi

# Check 2: local_workspace block exists
echo "2. Checking local_workspace configuration..."
if grep -q 'local_workspace\s*{' config.hcl; then
    pass "config.hcl has local_workspace block"
else
    fail "config.hcl missing 'local_workspace' block"
fi

# Check 3: users.json exists and is valid JSON
echo "3. Checking users.json..."
if [ -f users.json ]; then
    if jq empty users.json 2>/dev/null; then
        USER_COUNT=$(jq 'length' users.json)
        pass "users.json exists and is valid JSON ($USER_COUNT users)"
        
        # Check that Dex users are present
        for email in "test@hermes.local" "admin@hermes.local" "user@hermes.local"; do
            if jq -e --arg email "$email" '.[$email]' users.json >/dev/null 2>&1; then
                pass "  - $email found in users.json"
            else
                fail "  - $email NOT found in users.json"
            fi
        done
    else
        fail "users.json exists but is invalid JSON"
    fi
else
    fail "users.json does not exist"
fi

# Check 4: docker-compose.yml has volume mount for users.json
echo "4. Checking docker-compose.yml volume mounts..."
if grep -q './users.json:/app/workspace_data/users.json' docker-compose.yml; then
    pass "docker-compose.yml mounts users.json to /app/workspace_data/users.json"
else
    fail "docker-compose.yml missing users.json volume mount"
fi

# Check 5: docker-compose.yml has hermes_workspace volume
if grep -q 'hermes_workspace:/app/workspace_data' docker-compose.yml && grep -q 'hermes_workspace:' docker-compose.yml; then
    pass "docker-compose.yml has hermes_workspace volume configured"
else
    fail "docker-compose.yml missing hermes_workspace volume"
fi

# Check 6: dex-config.yaml has matching users
echo "5. Checking Dex configuration alignment..."
if [ -f dex-config.yaml ]; then
    for email in "test@hermes.local" "admin@hermes.local" "user@hermes.local"; do
        if grep -q "$email" dex-config.yaml; then
            pass "  - $email found in dex-config.yaml"
        else
            warn "  - $email NOT found in dex-config.yaml (user won't be able to login)"
        fi
    done
else
    warn "dex-config.yaml not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC} Local workspace is properly configured."
    echo ""
    echo "Next steps:"
    echo "  1. Start the environment: docker compose up -d --build"
    echo "  2. Wait for health checks: docker compose ps"
    echo "  3. Login at http://localhost:4201 with test@hermes.local / password"
    echo "  4. Verify users API: docker compose exec hermes cat /app/workspace_data/users.json"
    exit 0
else
    echo -e "${RED}✗ Some checks failed.${NC} Please fix the issues above."
    exit 1
fi
