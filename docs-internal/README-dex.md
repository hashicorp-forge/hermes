# Dex OIDC Local Authentication

This guide covers using Dex as a local OpenID Connect (OIDC) provider for Hermes development and testing.

## Overview

Dex provides:
- **Local authentication** without external OAuth providers
- **No internet dependency** for development
- **Multiple authentication backends** (static users, LDAP, connectors)
- **Full OIDC compliance** for testing production-like flows
- **Quick setup** via Docker Compose

## When to Use Dex

**Use Dex for**:
- Local development and testing
- CI/CD pipelines
- Demo environments
- Isolated testing without Google Workspace or Okta

**Use Google/Okta for**:
- Production deployments
- Integration with existing identity providers
- When you need real user directories

See [README-auth-providers.md](README-auth-providers.md) for all authentication options.

## Quick Start

### Using Testing Environment

The easiest way to run Dex:

```bash
# Start all services including Dex
cd testing
docker compose up -d

# Dex available at:
# - Native mode: http://localhost:5556/dex
# - Testing mode: http://localhost:5558/dex
```

### Verify Dex is Running

```bash
# Check health
curl http://localhost:5556/dex/.well-known/openid-configuration

# Should return OIDC discovery document
```

## Default Test Users

The testing environment includes pre-configured test users:

### Local Development (Port 5556)

| Email | Password | Name |
|-------|----------|------|
| `test@hermes.local` | `password` | Test User |
| `admin@hermes.local` | `password` | Admin User |
| `demo@hermes.local` | `password` | Demo User |

### Testing Environment (Port 5558)

Same credentials, different issuer URL.

## Configuration

### Hermes Backend Configuration

Add to your `config.hcl`:

```hcl
dex {
  issuer_url    = "http://localhost:5556/dex"
  client_id     = "hermes-integration"
  client_secret = "ZXhhbXBsZS1hcHAtc2VjcmV0"
  redirect_url  = "http://localhost:8000/auth/callback"
}

providers {
  auth = "dex"  # Enable Dex authentication
}
```

### Port Conventions

**Native Development** (`./config-example.hcl`):
- Dex: `http://localhost:5556/dex`
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:4200`
- Callback: `http://localhost:8000/auth/callback`

**Testing Environment** (`./testing/config.hcl`):
- Dex: `http://localhost:5558/dex` (inside Docker: `http://dex:5558/dex`)
- Backend: `http://localhost:8001`
- Frontend: `http://localhost:4201`
- Callback: `http://localhost:8001/auth/callback`

## Dex Configuration File

### Location

- Native: `./testing/dex-config.yaml`
- Testing: Mounted into Docker container

### Structure

```yaml
issuer: http://localhost:5556/dex

storage:
  type: sqlite3
  config:
    file: /var/dex/dex.db

web:
  http: 0.0.0.0:5556

staticClients:
  - id: hermes-integration
    secret: ZXhhbXBsZS1hcHAtc2VjcmV0
    name: 'Hermes'
    redirectURIs:
      - 'http://localhost:8000/auth/callback'
      - 'http://localhost:4200/torii/redirect.html'

enablePasswordDB: true

staticPasswords:
  - email: "test@hermes.local"
    hash: "$2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W"  # password
    username: "test"
    userID: "08a8684b-db88-4b73-90a9-3cd1661f5466"
  - email: "admin@hermes.local"
    hash: "$2a$10$2b2cU8CPhOTaGrs1HRQuAueS7JTT5ZHsHSzYiFPm1leZck7Mc8T4W"  # password
    username: "admin"
    userID: "9e0e3f8a-2d6f-4c8a-8b7c-1a2b3c4d5e6f"
```

### Adding Users

Generate password hash:

```bash
# Using htpasswd (from apache2-utils)
htpasswd -bnBC 10 "" password | tr -d ':\n'

# Or using Python
python3 -c "import bcrypt; print(bcrypt.hashpw(b'password', bcrypt.gensalt()).decode())"
```

Add to `staticPasswords` in `dex-config.yaml`:

```yaml
staticPasswords:
  - email: "newuser@hermes.local"
    hash: "$2a$10$..."  # Generated hash
    username: "newuser"
    userID: "unique-uuid-here"
```

Restart Dex:
```bash
cd testing && docker compose restart dex
```

## Authentication Flow

### Login Sequence

1. User visits Hermes at `http://localhost:4200`
2. Clicks "Sign In" button
3. Redirected to Dex login: `http://localhost:5556/dex/auth?...`
4. Enters email/password (e.g., `test@hermes.local` / `password`)
5. Dex validates credentials
6. Redirects to backend callback: `http://localhost:8000/auth/callback?code=...`
7. Backend exchanges code for ID token
8. Backend validates token and creates session
9. User redirected to Hermes frontend with session cookie

### Token Format

Dex issues JWT tokens with claims:

```json
{
  "iss": "http://localhost:5556/dex",
  "sub": "08a8684b-db88-4b73-90a9-3cd1661f5466",
  "aud": "hermes-integration",
  "exp": 1696877400,
  "iat": 1696873800,
  "email": "test@hermes.local",
  "email_verified": true,
  "name": "Test User"
}
```

### Session Management

- Backend validates token on each request
- Session stored in cookie
- Token refresh handled automatically
- Logout clears session and redirects to Dex

## Multiple Environments

### Running Both Native and Testing

You can run both environments simultaneously on different ports:

```bash
# Terminal 1: Native backend
./hermes server -config=config-example.hcl

# Terminal 2: Testing environment
cd testing && docker compose up -d

# Native: http://localhost:4200
# Testing: http://localhost:4201
```

### Switching Between Configs

Use config profiles:

```bash
# Native with Dex (port 5556)
./hermes server -config=config-example.hcl

# Testing with Dex (port 5558)
./hermes server -config=testing/config.hcl

# Production with Google
./hermes server -config=config-production.hcl
```

## Troubleshooting

### Dex Not Starting

**Cause**: Port conflict or container issues

**Solution**:
```bash
# Check if port in use
lsof -i :5556
lsof -i :5558

# Restart Dex
cd testing && docker compose restart dex

# Check logs
docker compose logs dex
```

### Authentication Redirect Errors

**Cause**: Mismatched redirect URIs

**Solution**:
1. Check `redirect_url` in `config.hcl` matches:
   - For backend: `http://localhost:8000/auth/callback`
   - For frontend: `http://localhost:4200/torii/redirect.html`
2. Verify `dex-config.yaml` has both URIs in `redirectURIs`
3. Restart services after config changes

### Invalid Client Error

**Cause**: `client_id` or `client_secret` mismatch

**Solution**:
```bash
# Verify config.hcl matches dex-config.yaml
grep -A3 "^dex {" config-example.hcl
grep -A3 "staticClients:" testing/dex-config.yaml

# Should have matching:
# - client_id: hermes-integration
# - client_secret: ZXhhbXBsZS1hcHAtc2VjcmV0
```

### Login Loop

**Cause**: Token validation failing or session not persisting

**Solution**:
```bash
# Check backend logs
tail -f /tmp/hermes-backend.log | grep -i "auth\|token\|session"

# Verify issuer URL matches
curl http://localhost:5556/dex/.well-known/openid-configuration | jq .issuer
grep issuer_url config-example.hcl
```

### User Not Found

**Cause**: Wrong email or password

**Solution**:
1. Use default credentials: `test@hermes.local` / `password`
2. Check `dex-config.yaml` for available users
3. Verify password hash generated correctly
4. Check Dex logs for authentication attempts:
   ```bash
   docker compose logs dex | grep -i "password\|auth"
   ```

## Production Considerations

### Do NOT Use Dex in Production

Dex with static passwords is for **development and testing only**.

**For production**, use:
- **Google OAuth**: Enterprise SSO with Workspace
- **Okta**: Enterprise identity provider with MFA
- **Dex with external connectors**: LDAP, SAML, other OIDC providers

See [README-auth-providers.md](README-auth-providers.md) for production authentication.

### If Using Dex in Production

If you must use Dex (e.g., internal tools):

1. **Use external connectors** (LDAP, SAML) instead of static passwords
2. **Enable TLS** with valid certificates
3. **Use secure secrets** (not example values)
4. **Configure HTTPS** for all redirect URIs
5. **Enable audit logging**
6. **Implement rate limiting**
7. **Use persistent storage** (not SQLite)

## Advanced Configuration

### Custom Claims

Add custom claims in `dex-config.yaml`:

```yaml
staticPasswords:
  - email: "test@hermes.local"
    hash: "$2a$10$..."
    username: "test"
    userID: "08a8684b-db88-4b73-90a9-3cd1661f5466"
    # Custom claims
    groups:
      - "developers"
      - "admins"
```

### Multiple Clients

Support multiple applications:

```yaml
staticClients:
  - id: hermes-integration
    secret: ZXhhbXBsZS1hcHAtc2VjcmV0
    name: 'Hermes'
    redirectURIs:
      - 'http://localhost:8000/auth/callback'
  
  - id: another-app
    secret: YW5vdGhlci1zZWNyZXQ=
    name: 'Another App'
    redirectURIs:
      - 'http://localhost:9000/callback'
```

### External Connectors

Connect to external identity providers:

```yaml
connectors:
  - type: ldap
    id: ldap
    name: LDAP
    config:
      host: ldap.example.com:389
      bindDN: cn=admin,dc=example,dc=com
      bindPW: password
      userSearch:
        baseDN: ou=users,dc=example,dc=com
        filter: "(objectClass=person)"
        username: mail
        idAttr: uid
        emailAttr: mail
        nameAttr: cn
```

See [Dex connectors documentation](https://dexidp.io/docs/connectors/) for more options.

## See Also

- [Auth Providers Overview](README-auth-providers.md)
- [Authentication Architecture](AUTH_ARCHITECTURE_DIAGRAMS.md)
- [Google Workspace Setup](README-google-workspace.md)
- [Testing Environment](../testing/README.md)
- [Configuration Documentation](CONFIG_HCL_DOCUMENTATION.md)
- [Dex Official Documentation](https://dexidp.io/docs/)
