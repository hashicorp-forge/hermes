# Auth Provider Selection - Quick Reference

## TL;DR

Force a specific auth provider without editing config files:

```bash
# Command-line flag
hermes server -config=config.hcl -auth-provider=dex

# Environment variable
export HERMES_AUTH_PROVIDER=dex
hermes server -config=config.hcl

# Docker Compose
environment:
  HERMES_AUTH_PROVIDER: dex
```

## Cheat Sheet

### Available Providers
- `dex` - Local OIDC provider (testing)
- `okta` - Okta authorization server
- `google` - Google OAuth

### Priority Order
1. `--auth-provider` flag (highest)
2. `HERMES_AUTH_PROVIDER` env var
3. Config file `disabled` flags (lowest)

### Common Commands

```bash
# Show help
hermes server --help | grep -A 3 "auth-provider"

# Use Dex
hermes server -auth-provider=dex -config=config.hcl

# Use Okta
hermes server -auth-provider=okta -config=config.hcl

# Use Google (default)
hermes server -auth-provider=google -config=config.hcl

# Check which provider is active
docker compose logs hermes | grep "auth provider selection"
```

### What Happens When You Set It

**Before**:
```hcl
dex { disabled = false }
okta { disabled = false }
```

**After setting `--auth-provider=dex`**:
```hcl
dex { disabled = false }   # ✅ Enabled
okta { disabled = true }   # ❌ Auto-disabled
```

**Logs**:
```
[INFO] hermes: auth provider selection: provider=dex source=flag/env
```

## Testing Scenarios

### Scenario 1: Quick Local Test with Dex
```bash
# Start Dex
docker compose up -d dex

# Run Hermes with Dex
./hermes server -config=config.hcl -auth-provider=dex
```

### Scenario 2: Acceptance Testing
```bash
cd testing
docker compose up -d --build
# HERMES_AUTH_PROVIDER=dex is already set in docker-compose.yml
```

### Scenario 3: Switch Provider Without Restart
```bash
# Stop current instance
docker compose stop hermes

# Start with different provider
docker compose run --rm -e HERMES_AUTH_PROVIDER=okta hermes server -config=/app/config-profiles.hcl -profile=testing
```

## Troubleshooting

### "invalid auth provider: X"
**Cause**: Typo or unsupported provider  
**Fix**: Use `dex`, `okta`, or `google`

```bash
# ❌ Wrong
hermes server -auth-provider=oauth

# ✅ Correct
hermes server -auth-provider=google
```

### Provider Not Working
**Check**: Is it configured in config file?

```bash
# Verify config has the provider block
grep -A 5 "dex {" config.hcl

# Check logs for selection
docker compose logs hermes | grep "auth provider"
```

### No Selection Log Message
**Cause**: Neither flag nor env var set  
**Result**: Auto-selection based on config file  
**Fix**: Add flag or env var to force selection

## Common Pitfalls

### ❌ Wrong: Using provider not in config
```bash
# If config only has Okta, don't use Dex
hermes server -auth-provider=dex  # Will fail
```

### ❌ Wrong: Mixing old and new methods
```yaml
# Don't use both
environment:
  HERMES_SERVER_OKTA_DISABLED: "true"  # OLD
  HERMES_AUTH_PROVIDER: dex            # NEW (use this)
```

### ✅ Right: Simple and explicit
```bash
# Just set the provider you want
export HERMES_AUTH_PROVIDER=dex
hermes server -config=config.hcl
```

## Integration Examples

### GitHub Actions
```yaml
- name: Run with Dex
  env:
    HERMES_AUTH_PROVIDER: dex
  run: ./hermes server -config=config.hcl
```

### Kubernetes
```yaml
env:
- name: HERMES_AUTH_PROVIDER
  value: "okta"
```

### Systemd
```ini
[Service]
Environment="HERMES_AUTH_PROVIDER=google"
ExecStart=/usr/local/bin/hermes server -config=/etc/hermes/config.hcl
```

## Related Documentation

- **Full Guide**: [AUTH_PROVIDER_SELECTION.md](./AUTH_PROVIDER_SELECTION.md)
- **Dex Setup**: [DEX_QUICK_START.md](./DEX_QUICK_START.md)
- **Auth Overview**: [DEX_AUTHENTICATION.md](./DEX_AUTHENTICATION.md)

## One-Liners for Common Tasks

```bash
# Check active provider
docker compose logs hermes | grep "auth provider selection"

# Force Dex in acceptance
cd testing && docker compose up -d --build

# Test with different providers
for provider in dex okta google; do
  echo "Testing $provider..."
  ./hermes server -auth-provider=$provider -config=config.hcl &
  sleep 5
  pkill hermes
done

# Verify help text
./hermes server --help | grep -B 1 -A 3 HERMES_AUTH_PROVIDER
```

## FAQ

**Q: Can I use multiple providers at once?**  
A: No. Setting `--auth-provider` disables all others. Only one provider is active.

**Q: What if I don't set the flag?**  
A: Hermes uses auto-selection: Dex → Okta → Google (first non-disabled).

**Q: Does this change my config file?**  
A: No. It only overrides at runtime. Config file stays unchanged.

**Q: Can I change providers without restarting?**  
A: No. You must restart Hermes with the new flag/env var.

**Q: What about production?**  
A: Use `HERMES_AUTH_PROVIDER` in your deployment config (K8s, systemd, etc).

## Quick Verification

After setting the provider, verify it's working:

```bash
# 1. Check logs
docker compose logs hermes | tail -20 | grep -E "auth provider|listening"

# 2. Expected output
# [INFO] hermes: auth provider selection: provider=dex source=flag/env
# [INFO] hermes: listening on 0.0.0.0:8000...

# 3. Check health
curl -s http://localhost:8000/v1/healthz | jq .
```

## Test Credentials (Dex)

When using Dex provider:
- Email: `test@hermes.local`
- Password: `password`

More users: See [DEX_AUTHENTICATION.md](./DEX_AUTHENTICATION.md#test-users)

---

**Last Updated**: October 6, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
