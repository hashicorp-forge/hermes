#!/bin/bash
# Example: Running Hermes with Different Provider Combinations

set -e

echo "=== Hermes Provider Selection Examples ==="
echo ""

# Example 1: Default providers (Google + Algolia)
echo "1. Default providers (Google + Algolia):"
echo "   ./hermes server -config=testing/config-profiles.hcl -profile=default"
echo ""

# Example 2: Using command-line flags
echo "2. Override with command-line flags:"
echo "   ./hermes server -config=testing/config-profiles.hcl \\"
echo "     -workspace-provider=google \\"
echo "     -search-provider=meilisearch"
echo ""

# Example 3: Using environment variables
echo "3. Override with environment variables:"
echo "   export HERMES_WORKSPACE_PROVIDER=google"
echo "   export HERMES_SEARCH_PROVIDER=meilisearch"
echo "   ./hermes server -config=testing/config-profiles.hcl"
echo ""

# Example 4: Using a profile with providers block
echo "4. Using profile with providers block:"
echo "   ./hermes server -config=testing/config-profiles.hcl -profile=local"
echo "   # This profile sets: workspace=local, search=meilisearch"
echo ""

# Example 5: Testing provider validation
echo "5. Testing provider validation:"
echo ""
echo "   Invalid provider:"
./build/bin/hermes server -config=testing/config-profiles.hcl \
  -workspace-provider=invalid 2>&1 | grep -E "Using|error" || true
echo ""

echo "   Missing configuration:"
./build/bin/hermes server -config=testing/config-profiles.hcl \
  -search-provider=meilisearch 2>&1 | grep -E "Using|error" || true
echo ""

echo "   Local workspace (not implemented):"
./build/bin/hermes server -config=testing/config-profiles.hcl \
  -profile=local 2>&1 | grep -E "Using|error" || true
echo ""

echo "=== Provider Selection Test Complete ==="
echo ""
echo "Key Features:"
echo "  ✅ Command-line flag support (--workspace-provider, --search-provider)"
echo "  ✅ Environment variable support (HERMES_WORKSPACE_PROVIDER, HERMES_SEARCH_PROVIDER)"
echo "  ✅ Config profile providers block"
echo "  ✅ Provider validation"
echo "  ✅ Configuration requirement checking"
echo "  ✅ Backward compatibility (defaults to google+algolia)"
echo ""
echo "Available Providers:"
echo "  Workspace: google, local* (*in development)"
echo "  Search:    algolia, meilisearch"
echo ""
echo "See docs-internal/PROVIDER_SELECTION.md for full documentation"
