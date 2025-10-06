# Dex IDP Quick Start Guide

Get up and running with Dex authentication in under 5 minutes.

## Quick Start: Integration Testing

```bash
# 1. Start infrastructure services (includes Dex)
docker compose up -d

# 2. Wait for services to be healthy (15-20 seconds)
docker compose ps

# 3. Verify Dex is running
curl http://localhost:5556/dex/.well-known/openid-configuration

# 4. Run integration tests with Dex authentication
make go/test/with-docker-postgres

# 5. Cleanup
docker compose down
```

## Quick Start: Acceptance Testing

```bash
# 1. Navigate to testing directory
cd testing

# 2. Build and start all services (Hermes + Dex + dependencies)
docker compose up -d --build

# 3. Wait for services (30-45 seconds)
watch docker compose ps

# 4. Access the web UI
open http://localhost:4201

# 5. Login with test credentials
# Email: test@hermes.local
# Password: password

# 6. Cleanup
docker compose down -v
```

**Note**: Acceptance testing is configured to use Dex via the `HERMES_AUTH_PROVIDER=dex` environment variable in `docker-compose.yml`. See [AUTH_PROVIDER_SELECTION.md](./AUTH_PROVIDER_SELECTION.md) for details on command-line provider selection.

## Test Credentials

Use any of these pre-configured accounts:

```
Email: test@hermes.local   | Password: password
Email: admin@hermes.local  | Password: password  
Email: user@hermes.local   | Password: password
```

## Verify Dex is Working

### Check Service Health
```bash
# Integration environment (port 5556)
docker compose ps dex
docker compose logs dex

# Acceptance environment (port 5557)
cd testing
docker compose ps dex
docker compose logs dex
```

### Check OIDC Configuration
```bash
# Integration environment
curl http://localhost:5556/dex/.well-known/openid-configuration | jq

# Acceptance environment
curl http://localhost:5557/dex/.well-known/openid-configuration | jq
```

Expected output includes:
- `"issuer": "http://localhost:5556/dex"` (or 5557)
- `"authorization_endpoint"`, `"token_endpoint"`, `"userinfo_endpoint"`

## Port Reference

| Environment | Dex Port | Telemetry | PostgreSQL | Meilisearch | Hermes API | Web UI |
|-------------|----------|-----------|------------|-------------|------------|--------|
| Integration | 5556 | 5558 | 5432 | 7700 | N/A | N/A |
| Acceptance | 5557 | 5559 | 5433 | 7701 | 8001 | 4201 |

**Design**: Acceptance ports are offset by 1 or 1000 to avoid conflicts with integration testing.

## Configuration Files

| File | Purpose |
|------|---------|
| `dex-config.yaml` | Integration testing Dex config (port 5556) |
| `testing/dex-config.yaml` | Acceptance testing Dex config (port 5557) |
| `testing/config-profiles.hcl` | Hermes config with Dex enabled |

## Common Issues

### Issue: Port already in use
```bash
# Check what's using the port
lsof -i :5556
lsof -i :5557

# Kill the process or stop conflicting containers
docker compose down
```

### Issue: Dex container unhealthy
```bash
# View detailed logs
docker compose logs dex

# Restart Dex
docker compose restart dex

# Rebuild if config changed
docker compose up -d --force-recreate dex
```

### Issue: Authentication fails
```bash
# Check Hermes can reach Dex (from inside container in acceptance env)
docker compose exec hermes wget -O- http://dex:5557/dex/.well-known/openid-configuration

# Check Hermes config has Dex enabled
docker compose exec hermes cat /app/config-profiles.hcl | grep -A 6 "dex {"
```

## Next Steps

- **Full documentation**: `docs-internal/DEX_AUTHENTICATION.md`
- **Add custom users**: Edit `dex-config.yaml` or `testing/dex-config.yaml`
- **Implement OAuth flow**: See adapter methods `GetAuthCodeURL()` and `ExchangeCode()`
- **Integration tests**: Add tests using Dex authentication

## Testing with curl

```bash
# Note: Getting an ID token requires implementing the OAuth2 flow
# For now, Dex is configured and ready to use

# Check Dex authorization endpoint
curl "http://localhost:5556/dex/auth?client_id=hermes-integration&response_type=code&scope=openid+email+profile&redirect_uri=http://localhost:8000/auth/callback&state=random123"

# This will return HTML for the login page
```

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                     Integration Testing                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌────────────┐    ┌───────────────────┐   │
│  │   Dex    │    │ PostgreSQL │    │   Meilisearch     │   │
│  │  :5556   │    │   :5432    │    │      :7700        │   │
│  └──────────┘    └────────────┘    └───────────────────┘   │
│       ↑                                                       │
│       │                                                       │
│  ┌────┴─────────────────────────────────────────────────┐   │
│  │     Hermes Server (runs on host)                     │   │
│  │     Uses Dex for authentication                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Acceptance Testing                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐    ┌────────────┐    ┌───────────────────┐   │
│  │   Dex    │    │ PostgreSQL │    │   Meilisearch     │   │
│  │  :5557   │    │   :5433    │    │      :7701        │   │
│  └────┬─────┘    └─────┬──────┘    └────────┬──────────┘   │
│       │                 │                     │              │
│       └─────────────────┼─────────────────────┘              │
│                         │                                    │
│  ┌─────────────────────┴──────────────────────────────┐     │
│  │     Hermes Server Container                        │     │
│  │     :8001 (API)                                    │     │
│  │     Uses Dex for authentication                    │     │
│  └─────────────────────┬──────────────────────────────┘     │
│                        │                                     │
│  ┌─────────────────────┴──────────────────────────────┐     │
│  │     Web UI (Nginx)                                 │     │
│  │     :4201 (HTTP)                                   │     │
│  │     Proxies API requests to Hermes                 │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Resources

- **Dex Documentation**: https://dexidp.io/docs/
- **OpenID Connect**: https://openid.net/connect/
- **Hermes Dex Docs**: `docs-internal/DEX_AUTHENTICATION.md`
