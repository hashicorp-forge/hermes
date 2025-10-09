# Auth Provider Command-Line Selection

## Overview

Added command-line flag and environment variable support for explicitly selecting the authentication provider in Hermes. This allows operators to override the default auto-selection behavior and force a specific authentication provider to be used.

**Implementation Date**: October 6, 2025  
**Branch**: `jrepp/dev-tidy`

## Motivation

Previously, Hermes selected authentication providers based on configuration file presence and `disabled` flags, using a priority order (Dex → Okta → Google). This worked well for most cases, but had limitations:

1. **Testing environments**: Needed explicit control over which auth provider to use
2. **Debugging**: Required ability to quickly switch providers without editing config files
3. **CI/CD pipelines**: Needed environment variable control for different stages
4. **Multi-provider setups**: When multiple providers are configured, explicit selection is useful

## Implementation

### Command-Line Flag

```bash
hermes server -auth-provider=dex
```

**Options**: `dex`, `okta`, `google`

### Environment Variable

```bash
export HERMES_AUTH_PROVIDER=dex
hermes server -config=config.hcl
```

### Behavior

When `--auth-provider` or `HERMES_AUTH_PROVIDER` is set:

1. **Disables other providers**: Automatically sets `disabled=true` for other auth providers
2. **Enables selected provider**: Ensures the selected provider's `disabled=false`
3. **Logs selection**: Logs which provider was selected and the source (flag/env)
4. **Validation**: Returns error if an invalid provider name is specified

**Priority**: Command-line flag > Environment variable > Config file

## Usage Examples

### Acceptance Testing (Docker Compose)

`testing/docker-compose.yml`:
```yaml
services:
  hermes:
    environment:
      HERMES_AUTH_PROVIDER: dex
    command: ["server", "-config=/app/config-profiles.hcl", "-profile=testing"]
```

### Local Development

```bash
# Use Dex for testing
./hermes server -config=config.hcl -auth-provider=dex

# Force Okta (even if Dex is configured)
./hermes server -config=config.hcl -auth-provider=okta

# Use Google OAuth (disable Dex and Okta)
./hermes server -config=config.hcl -auth-provider=google
```

### CI/CD Pipeline

```bash
# Development stage - use Dex
export HERMES_AUTH_PROVIDER=dex
./hermes server -config=config.hcl

# Staging - use Okta
export HERMES_AUTH_PROVIDER=okta
./hermes server -config=config.hcl

# Production - use Google OAuth
export HERMES_AUTH_PROVIDER=google
./hermes server -config=config.hcl
```

## Technical Details

### Code Changes

**File**: `internal/cmd/commands/server/server.go`

**1. Added Flag**:
```go
type Command struct {
    // ... existing fields ...
    flagAuthProvider      string
}
```

**2. Flag Registration**:
```go
f.StringVar(
    &c.flagAuthProvider, "auth-provider", "",
    "[HERMES_AUTH_PROVIDER] Authentication provider to use (e.g., 'dex', 'okta', 'google'). "+
        "Overrides the provider auto-selection based on config. When set to 'dex' or 'okta', "+
        "will disable other providers to force that provider to be used.",
)
```

**3. Provider Selection Logic**:
```go
// Handle auth provider selection from flag or environment variable
authProvider := c.flagAuthProvider
if val, ok := os.LookupEnv("HERMES_AUTH_PROVIDER"); ok && authProvider == "" {
    authProvider = val
}
if authProvider != "" {
    // Force the specified provider by disabling others
    switch strings.ToLower(authProvider) {
    case "dex":
        if cfg.Dex != nil {
            cfg.Dex.Disabled = false
        }
        if cfg.Okta != nil {
            cfg.Okta.Disabled = true
        }
        c.Log.Info("auth provider selection", "provider", "dex", "source", "flag/env")
    case "okta":
        if cfg.Dex != nil {
            cfg.Dex.Disabled = true
        }
        if cfg.Okta != nil {
            cfg.Okta.Disabled = false
        }
        c.Log.Info("auth provider selection", "provider", "okta", "source", "flag/env")
    case "google":
        // Disable both Dex and Okta to fall back to Google
        if cfg.Dex != nil {
            cfg.Dex.Disabled = true
        }
        if cfg.Okta != nil {
            cfg.Okta.Disabled = true
        }
        c.Log.Info("auth provider selection", "provider", "google", "source", "flag/env")
    default:
        c.UI.Error(fmt.Sprintf("invalid auth provider: %s (valid options: dex, okta, google)", authProvider))
        return 1
    }
}
```

### Docker Compose Integration

**File**: `testing/docker-compose.yml`

**Change**:
```yaml
environment:
  HERMES_SERVER_PROFILE: testing
  HERMES_BASE_URL: http://localhost:8001
  # Force Dex authentication provider
  HERMES_AUTH_PROVIDER: dex
```

**Removed**: `HERMES_SERVER_OKTA_DISABLED: "true"` (no longer needed)

### Dex Configuration Fix

**Issue**: Initial configuration used `issuer: http://localhost:5557/dex` which caused issuer mismatch errors when Hermes (running in a container) tried to connect.

**Solution**: Changed to use Docker service name in `testing/dex-config.yaml`:
```yaml
issuer: http://dex:5557/dex
```

This allows container-to-container communication using Docker's internal DNS.

## Verification

### Check Logs for Provider Selection

```bash
cd testing
docker compose logs hermes | grep "auth provider selection"
```

**Expected Output**:
```
hermes-acceptance  | 2025-10-06T18:44:53.762Z [INFO]  hermes: auth provider selection: provider=dex source=flag/env
```

### Test Provider Override

```bash
# Test Dex provider
docker compose exec hermes /app/hermes server -auth-provider=dex -config=/app/config-profiles.hcl -profile=testing &
docker compose logs hermes | grep -i dex

# Test Okta provider (will fail if not configured, but validates flag parsing)
docker compose exec hermes /app/hermes server -auth-provider=okta -config=/app/config-profiles.hcl -profile=testing &
docker compose logs hermes | grep -i okta

# Test Google provider
docker compose exec hermes /app/hermes server -auth-provider=google -config=/app/config-profiles.hcl -profile=testing &
docker compose logs hermes | grep -i google

# Test invalid provider (should error)
docker compose exec hermes /app/hermes server -auth-provider=invalid -config=/app/config-profiles.hcl -profile=testing
```

### Verify Service Health

```bash
cd testing
docker compose ps
```

**Expected**: `hermes-acceptance` shows `(healthy)` status

## Benefits

1. **Explicit Control**: No ambiguity about which auth provider is being used
2. **Easy Testing**: Switch providers without modifying config files
3. **CI/CD Friendly**: Environment variable support for pipeline stages
4. **Debugging**: Quickly test different providers during troubleshooting
5. **Documentation**: Log messages clearly indicate which provider and why

## Interaction with Config File

The flag/env var **overrides** config file settings by:
- Setting `disabled=true` for non-selected providers
- Setting `disabled=false` for the selected provider

This means:
- ✅ Config file can have all providers configured
- ✅ Flag/env determines which one is actually used
- ✅ No config file edits needed to switch providers

## Error Handling

**Invalid Provider**:
```bash
$ hermes server -auth-provider=invalid
error: invalid auth provider: invalid (valid options: dex, okta, google)
```

**Provider Not Configured**:
- If you select a provider that's not configured in the config file, Hermes will attempt to use it but may fail with configuration validation errors
- Example: Selecting `okta` when no `okta {}` block exists will cause errors when Okta configuration is validated

## Future Enhancements

Potential improvements:
- [ ] Add `--list-auth-providers` flag to show available providers
- [ ] Add validation to check if selected provider is configured
- [ ] Support provider aliases (e.g., `oidc` for `dex`)
- [ ] Add `--auth-provider-config` flag for inline provider configuration
- [ ] Metrics/logging for provider switch frequency

## Related Documentation

- Auth Provider Implementation: `docs-internal/DEX_AUTHENTICATION.md`
- Configuration Guide: `internal/config/README.md`
- Command-Line Reference: `hermes server --help`

## Testing

### Manual Testing Performed

1. ✅ Started Hermes with `HERMES_AUTH_PROVIDER=dex`
2. ✅ Verified log shows "auth provider selection: provider=dex source=flag/env"
3. ✅ Confirmed Hermes became healthy
4. ✅ Tested invalid provider name (correctly errors)
5. ✅ Built and deployed to acceptance environment

### Integration Tests

To add:
```go
func TestAuthProviderSelection(t *testing.T) {
    tests := []struct {
        name     string
        flag     string
        envVar   string
        expected string
    }{
        {"flag overrides env", "dex", "okta", "dex"},
        {"env when no flag", "", "okta", "okta"},
        {"config when neither", "", "", "auto"},
    }
    // ... test implementation
}
```

## Prompt Used

```
add the auth provider selection via command line and pass it through docker compose to hermes server in acceptance
```

## AI Implementation Summary

- Added `--auth-provider` command-line flag with environment variable support
- Implemented provider selection logic with automatic disabling of other providers
- Updated acceptance testing docker-compose to use `HERMES_AUTH_PROVIDER=dex`
- Fixed Dex issuer URL to use Docker service name for container communication
- Added logging to show which provider was selected and why
- Validated implementation with build tests and runtime verification

## Files Modified

- `internal/cmd/commands/server/server.go` - Added flag and selection logic
- `testing/docker-compose.yml` - Added `HERMES_AUTH_PROVIDER=dex` environment variable
- `testing/dex-config.yaml` - Fixed issuer URL for Docker networking
- `docs-internal/AUTH_PROVIDER_SELECTION.md` - This documentation

## Success Criteria

- ✅ Flag parsing works correctly
- ✅ Environment variable support works
- ✅ Provider selection logic disables other providers
- ✅ Logging shows selected provider and source
- ✅ Acceptance testing uses Dex via environment variable
- ✅ Hermes starts successfully and becomes healthy
- ✅ Invalid provider names are rejected with helpful error
