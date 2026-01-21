#!/bin/bash
# Document Reorganization Migration Script
# This script moves and renames documents from docs-internal/ to type-specific subdirectories

set -e

cd "$(dirname "$0")"

echo "=== Hermes Documentation Reorganization ==="
echo "Moving documents to rfc/, adr/, and memo/ subdirectories..."

# RFC Documents (Architecture, Design, Implementation)
echo -e "\n📐 Processing RFC documents..."

mv AUTH_ARCHITECTURE_DIAGRAMS.md rfc/007-multi-provider-auth-architecture.md 2>/dev/null || echo "Already moved: 007"
mv AUTH_PROVIDER_SELECTION.md rfc/009-auth-provider-selection.md 2>/dev/null || echo "Already moved: 009"
mv DEX_AUTHENTICATION_IMPLEMENTATION.md rfc/020-dex-implementation.md 2>/dev/null || echo "Already moved: 020"
mv DEX_AUTHENTICATION.md rfc/021-dex-authentication.md 2>/dev/null || echo "Already moved: 021"
mv DOCUMENT_EDITOR_IMPLEMENTATION.md rfc/026-document-editor.md 2>/dev/null || echo "Already moved: 026"
mv EMBER_DEV_SERVER_MIGRATION.md rfc/033-ember-dev-server-migration.md 2>/dev/null || echo "Already moved: 033"
mv EMBER_UPGRADE_STRATEGY.md rfc/034-ember-upgrade-strategy.md 2>/dev/null || echo "Already moved: 034"
mv FRONTEND_PROXY_CONFIGURATION.md rfc/037-frontend-proxy-config.md 2>/dev/null || echo "Already moved: 037"
mv LOCAL_WORKSPACE_SETUP_SUMMARY.md rfc/047-local-workspace-setup.md 2>/dev/null || echo "Already moved: 047"
mv OAUTH_REDIRECT_BASEURL_CONFIG.md rfc/050-oauth-redirect-baseurl.md 2>/dev/null || echo "Already moved: 050"
mv OUTBOX_PATTERN_DESIGN.md rfc/051-outbox-pattern-design.md 2>/dev/null || echo "Already moved: 051"
mv PROVIDER_SELECTION.md rfc/068-workspace-provider-selection.md 2>/dev/null || echo "Already moved: 068"
mv SEARCH_AND_AUTH_REFACTORING.md rfc/076-search-auth-refactoring.md 2>/dev/null || echo "Already moved: 076"
mv SEARCH_ENDPOINT_IMPLEMENTATION_2025_10_08.md rfc/077-search-endpoint-impl.md 2>/dev/null || echo "Already moved: 077"
mv SEARCH_SERVICE_MIGRATION_2025_10_08.md rfc/078-search-service-migration.md 2>/dev/null || echo "Already moved: 078"
mv SESSION_AUTHENTICATION_FIX.md rfc/079-session-authentication-fix.md 2>/dev/null || echo "Already moved: 079"

# ADR Documents (Architectural Decisions)
echo -e "\n📋 Processing ADR documents..."

mv ANIMATED_COMPONENTS_FIX_2025_10_08.md adr/006-animated-components-fix.md 2>/dev/null || echo "Already moved: 006"
mv EMBER_CONCURRENCY_COMPATIBILITY_ISSUE.md adr/029-ember-concurrency-compat.md 2>/dev/null || echo "Already moved: 029"
mv EMBER_DATA_STORE_ERROR_FIX_2025_10_08.md adr/032-ember-data-store-fix.md 2>/dev/null || echo "Already moved: 032"
mv FIX_LOCATION_TYPE_2025_10_07.md adr/036-fix-location-type.md 2>/dev/null || echo "Already moved: 036"
mv LOCAL_WORKSPACE_USER_INFO_FIX.md adr/048-local-workspace-user-info.md 2>/dev/null || echo "Already moved: 048"
mv PROMISE_TIMEOUT_HANG_FIX_2025_10_08.md adr/065-promise-timeout-hang.md 2>/dev/null || echo "Already moved: 065"

# Memo Documents (Status, Summaries, Investigations, Guides)
echo -e "\n📝 Processing Memo documents..."

# Investigation memos
mv ADMIN_LOGIN_HANG_ROOT_CAUSE_2025_10_08.md memo/001-admin-login-hang-rootcause.md 2>/dev/null || echo "Already moved: 001"
mv ROOT_CAUSE_MAYBEFETCHPEOPLE_HANG_2025_10_08.md memo/075-rootcause-fetchpeople-hang.md 2>/dev/null || echo "Already moved: 075"

# Implementation/completion memos
mv DOCUMENT_CONTENT_INTEGRATION_TEST_COMPLETE.md memo/025-doc-content-integration-complete.md 2>/dev/null || echo "Already moved: 025"
mv LOCAL_WORKSPACE_PROVIDER_COMPLETE.md memo/045-local-workspace-complete.md 2>/dev/null || echo "Already moved: 045"
mv TESTING_ENV_COMPLETE.md memo/084-testing-env-complete.md 2>/dev/null || echo "Already moved: 084"

# Quick reference guides
mv AUTH_PROVIDER_QUICK_REF.md memo/008-auth-provider-quickref.md 2>/dev/null || echo "Already moved: 008"
mv DEX_QUICK_START.md memo/023-dex-quickstart.md 2>/dev/null || echo "Already moved: 023"
mv DEV_QUICK_REFERENCE.md memo/017-dev-quickref.md 2>/dev/null || echo "Already moved: 017"
mv OUTBOX_PATTERN_QUICK_REF.md memo/052-outbox-pattern-quickref.md 2>/dev/null || echo "Already moved: 052"
mv PLAYWRIGHT_E2E_AGENT_GUIDE.md memo/058-playwright-agent-guide.md 2>/dev/null || echo "Already moved: 058"

# README files
mv README.md memo/073-main-readme.md 2>/dev/null || echo "Already moved: 073"
mv README-auth-providers.md memo/071-auth-providers-readme.md 2>/dev/null || echo "Already moved: 071"
mv README-local-workspace.md memo/072-local-workspace-readme.md 2>/dev/null || echo "Already moved: 072"

# Summaries and analysis
mv DEV_VELOCITY_ANALYSIS.md memo/019-dev-velocity-analysis.md 2>/dev/null || echo "Already moved: 019"
mv AGENT_USAGE_ANALYSIS.md memo/004-agent-usage-analysis.md 2>/dev/null || echo "Already moved: 004"
mv DELIVERABLES_SUMMARY.md memo/016-deliverables-summary.md 2>/dev/null || echo "Already moved: 016"

echo -e "\n✅ Migration complete!"
echo "Documents organized into:"
echo "  - rfc/     (16 architecture/design documents)"
echo "  - adr/     (6 architectural decision records)"
echo "  - memo/    (64+ status updates, guides, and summaries)"

echo -e "\n📊 Next steps:"
echo "  1. Review generated README files in each subdirectory"
echo "  2. Update main docs-internal/README.md"
echo "  3. Commit changes with migration documentation"
