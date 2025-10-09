---
id: RFC-009
title: Auth Provider Command-Line Selection
date: 2025-10-06
type: RFC
subtype: Configuration
status: Implemented
tags: [authentication, configuration, cli, dex, okta, google]
related:
  - RFC-007
  - RFC-020
---

# Auth Provider Command-Line Selection

## Context

Hermes auto-selects authentication providers based on config file presence using priority order (Dex → Okta → Google). For testing, debugging, CI/CD, and multi-provider setups, explicit provider selection is needed without modifying configuration files.

## Proposal

Add command-line flag and environment variable for explicit auth provider selection:

```bash
# Flag
hermes server -auth-provider=dex

# Environment variable
export HERMES_AUTH_PROVIDER=dex
hermes server -config=config.hcl
```

**Options**: `dex`, `okta`, `google`  
**Priority**: Command-line flag > Environment variable > Config file auto-selection

## Behavior

When provider explicitly selected:
1. Disables other providers (sets `disabled=true`)
2. Enables selected provider (`disabled=false`)
3. Logs selection source (flag/env)
4. Validates provider name (error on invalid)

## Use Cases

**Acceptance Testing**:
```yaml
# testing/docker-compose.yml
services:
  hermes:
    environment:
      HERMES_AUTH_PROVIDER: dex
```

**Local Development**:
```bash
# Switch between providers quickly
./hermes server -config=config.hcl -auth-provider=dex
./hermes server -config=config.hcl -auth-provider=google
```

**CI/CD Pipeline**:
```bash
# Different stages use different providers
export HERMES_AUTH_PROVIDER=dex    # dev
export HERMES_AUTH_PROVIDER=okta   # staging
export HERMES_AUTH_PROVIDER=google # prod
```

## Implementation

**File**: `internal/cmd/commands/server/server.go`

- Added `flagAuthProvider string` field to Command
- Added flag parsing: `cmd.flagAuthProvider = f.String("auth-provider", "", "...")`
- Added environment variable fallback: `os.Getenv("HERMES_AUTH_PROVIDER")`
- Added provider selection logic in `applyAuthProviderSelection()`

## References

- Source: `AUTH_PROVIDER_SELECTION.md`
- Related: `AUTH_ARCHITECTURE_DIAGRAMS.md`, `DEX_AUTHENTICATION.md`
