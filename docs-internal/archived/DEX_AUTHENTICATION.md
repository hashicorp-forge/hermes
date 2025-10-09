# Dex IDP Authentication Integration

This document describes the Dex OIDC authentication integration for Hermes, providing a local authentication solution for development and testing environments.

## Overview

Dex is an OpenID Connect (OIDC) identity provider that has been integrated into Hermes to support local authentication without requiring external OAuth providers like Google or Okta. This is particularly useful for:

- **Local development**: Test authentication flows without internet connectivity
- **Integration testing**: Automated tests can use static credentials
- **Acceptance testing**: QA can test with predefined user accounts
- **CI/CD pipelines**: Reproducible authentication for automated testing

## Architecture

### Components

1. **Dex Server** (`ghcr.io/dexidp/dex:v2.41.1`)
   - Runs as a Docker container
   - Provides OIDC authentication endpoints
   - Configured with static password authentication

2. **Dex Auth Adapter** (`pkg/auth/adapters/dex/`)
   - Implements the `auth.Provider` interface
   - Validates OIDC ID tokens from Dex
   - Extracts user email from token claims

3. **Configuration** (`internal/config/config.go`)
   - HCL block support: `dex { ... }`
   - Environment-specific settings

### Authentication Priority

The auth middleware (`internal/auth/auth.go`) selects providers in this order:
1. **Dex** (if configured and not disabled)
2. **Okta** (if configured and not disabled)
3. **Google** (default fallback)

## Deployment Configurations

### Integration Testing (docker-compose.yml)

**Purpose**: Provides infrastructure for Go integration tests

**Dex Configuration**:
- **Port**: 5556 (host) → 5556 (container)
- **Telemetry**: 5558 (host) → 5558 (container)
- **Config**: `dex-config.yaml` (root directory)
- **Issuer**: `http://localhost:5556/dex`
- **Client ID**: `hermes-integration`
- **Client Secret**: `ZXhhbXBsZS1hcHAtc2VjcmV0`

**Usage**:
```bash
# Start services
docker compose up -d

# Check Dex health
docker compose ps dex
docker compose logs dex

# Run integration tests
make go/test/with-docker-postgres

# Stop services
docker compose down
```

### Acceptance Testing (testing/docker-compose.yml)

**Purpose**: Full-stack containerized environment for acceptance testing

**Dex Configuration**:
- **Port**: 5557 (host) → 5557 (container) - *non-conflicting*
- **Telemetry**: 5559 (host) → 5559 (container) - *non-conflicting*
- **Config**: `testing/dex-config.yaml`
- **Issuer**: `http://dex:5557/dex` (internal), `http://localhost:5557/dex` (external)
- **Client ID**: `hermes-acceptance`
- **Client Secret**: `YWNjZXB0YW5jZS1hcHAtc2VjcmV0`

**Hermes Configuration** (`testing/config-profiles.hcl`):
```hcl
profile "testing" {
  # ... other config ...
  
  dex {
    disabled      = false
    issuer_url    = "http://dex:5557/dex"
    client_id     = "hermes-acceptance"
    client_secret = "YWNjZXB0YW5jZS1hcHAtc2VjcmV0"
    redirect_url  = "http://localhost:8001/auth/callback"
  }
}
```

**Usage**:
```bash
cd testing

# Build and start all services
docker compose up -d --build

# Check service health
docker compose ps

# View Hermes logs
docker compose logs -f hermes

# Access web UI
open http://localhost:4201

# Stop and cleanup
docker compose down -v
```

**Note**: The acceptance environment is configured to force Dex authentication via `HERMES_AUTH_PROVIDER=dex` in docker-compose.yml. See [AUTH_PROVIDER_SELECTION.md](./AUTH_PROVIDER_SELECTION.md) for command-line provider selection options.

## Test Users

All environments are configured with the same static test users:

| Email | Username | Password | User ID |
|-------|----------|----------|---------|
| `test@hermes.local` | `test` | `password` | `08a8684b-db88-4b73-90a9-3cd1661f5466` |
| `admin@hermes.local` | `admin` | `password` | `08a8684b-db88-4b73-90a9-3cd1661f5467` |
| `user@hermes.local` | `user` | `password` | `08a8684b-db88-4b73-90a9-3cd1661f5468` |

**Note**: These are bcrypt-hashed passwords stored in the Dex config files.

## Configuration Reference

### HCL Configuration Block

```hcl
dex {
  # Required: URL of the Dex OIDC issuer
  issuer_url = "http://localhost:5556/dex"
  
  # Required: OIDC client ID for Hermes
  client_id = "hermes-integration"
  
  # Optional: OIDC client secret (required for authorization code flow)
  client_secret = "ZXhhbXBsZS1hcHAtc2VjcmV0"
  
  # Optional: Callback URL for OIDC authentication
  redirect_url = "http://localhost:8000/auth/callback"
  
  # Optional: Disable Dex authentication (default: false)
  disabled = false
}
```

### Environment Variables

Dex configuration can be overridden with environment variables:
- `HERMES_DEX_ISSUER_URL`
- `HERMES_DEX_CLIENT_ID`
- `HERMES_DEX_CLIENT_SECRET`
- `HERMES_DEX_REDIRECT_URL`
- `HERMES_DEX_DISABLED`

## Authentication Flow

### Bearer Token Authentication (Current Implementation)

1. Client obtains ID token from Dex (via direct authentication or authorization code flow)
2. Client sends request with `Authorization: Bearer <id_token>` header
3. Dex adapter verifies the token signature and claims
4. Email is extracted from token claims and stored in request context
5. Request proceeds to handler with authenticated user

### Authorization Code Flow (Helper Methods Available)

The Dex adapter provides helper methods for implementing full OAuth2/OIDC flows:

```go
// Get authorization URL to redirect user to Dex login
authURL := adapter.GetAuthCodeURL(state)

// Exchange authorization code for email after callback
email, err := adapter.ExchangeCode(ctx, code)
```

## Development Workflow

### Adding New Test Users

Edit the appropriate config file (`dex-config.yaml` or `testing/dex-config.yaml`):

```yaml
staticPasswords:
- email: "newuser@hermes.local"
  hash: "$2a$10$..." # Generate with: echo "password" | htpasswd -nBC 10 "" | tr -d ':\n'
  username: "newuser"
  userID: "unique-uuid-here"
```

Restart Dex:
```bash
docker compose restart dex
```

### Testing Authentication

#### Using curl:
```bash
# Get ID token from Dex (simplified - requires implementing token endpoint)
# In practice, you'd use the authorization code flow or direct grant

# Make authenticated request
curl -H "Authorization: Bearer <id_token>" http://localhost:8000/api/v1/me
```

#### Using the Web UI:
```bash
# Start acceptance testing environment
cd testing
docker compose up -d --build

# Open browser
open http://localhost:4201

# Login with: test@hermes.local / password
```

## Troubleshooting

### Dex container not starting

```bash
# Check logs
docker compose logs dex

# Common issues:
# - Port conflict: Ensure 5556/5557 and 5558/5559 are available
# - Config syntax error: Validate YAML syntax in dex-config.yaml
# - Volume mount issue: Ensure config file exists and is readable
```

### Authentication fails with "no Authorization header"

The Dex adapter expects a Bearer token in the Authorization header. Ensure your client is:
1. Obtaining an ID token from Dex
2. Sending it in the `Authorization: Bearer <token>` header

### Token verification fails

```bash
# Check Dex issuer URL is accessible from Hermes
docker compose exec hermes wget -O- http://dex:5557/dex/.well-known/openid-configuration

# Verify client ID matches in both Hermes config and Dex config
```

### Email claim not found

Ensure the Dex token includes email scope:
- Check `staticPasswords` entries have `email` field
- Verify scopes include `email` in token requests

## File Reference

### Core Implementation Files

- `pkg/auth/adapters/dex/adapter.go` - Dex OIDC adapter implementation
- `pkg/auth/adapters/dex/adapter_test.go` - Unit tests
- `internal/auth/auth.go` - Auth middleware with provider selection
- `internal/config/config.go` - Configuration struct with Dex support

### Configuration Files

- `dex-config.yaml` - Integration testing Dex configuration
- `testing/dex-config.yaml` - Acceptance testing Dex configuration
- `testing/config-profiles.hcl` - Hermes profiles with Dex config

### Docker Files

- `docker-compose.yml` - Integration testing services (port 5556)
- `testing/docker-compose.yml` - Acceptance testing services (port 5557)

## Security Considerations

### Development/Testing Only

⚠️ **WARNING**: The current Dex configuration is designed for **development and testing only**:

- Static passwords with predictable credentials
- No TLS/HTTPS encryption
- Memory-based storage (data lost on restart)
- Approval screen disabled for convenience
- Weak secrets

### Production Recommendations

For production use, Dex should be configured with:

1. **Real identity providers** (LDAP, SAML, GitHub, etc.) instead of static passwords
2. **TLS encryption** for all endpoints
3. **Persistent storage** (etcd, PostgreSQL, etc.)
4. **Strong secrets** and proper key management
5. **Approval screen enabled** for user consent
6. **Rate limiting** and security monitoring
7. **Proper redirect URI validation**

Alternatively, use Okta or Google OAuth for production (already supported in Hermes).

## Future Enhancements

Potential improvements:

- [ ] Add integration tests for Dex adapter
- [ ] Implement token refresh flow
- [ ] Add logout endpoint support
- [ ] Create web UI for authorization code flow
- [ ] Support multiple Dex instances (e.g., development vs staging)
- [ ] Add metrics/monitoring for auth failures
- [ ] Document production Dex deployment

## Related Documentation

- [Dex Official Documentation](https://dexidp.io/docs/)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- Hermes auth package: `pkg/auth/README.md`
- Config documentation: `internal/config/README.md`

## Support

For issues or questions:
1. Check this documentation
2. Review Dex logs: `docker compose logs dex`
3. Review Hermes logs for auth errors
4. Check the GitHub issues for known problems
