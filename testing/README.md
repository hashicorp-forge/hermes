# Hermes Testing Environment

This directory contains a **full-stack containerized environment** for testing and manual QA of Hermes. This is distinct from the integration testing setup in the root directory.

**🆕 Now uses Local Workspace Provider**: This environment uses the local filesystem adapter for document storage instead of Google Workspace, with test users mirroring Dex identities. See [README-local-workspace.md](./README-local-workspace.md) for details.

## Testing Environments Comparison

| Aspect | Integration Testing (`/docker-compose.yml`) | Testing Environment (`/testing/docker-compose.yml`) |
|--------|---------------------------------------------|---------------------------------------------------|
| **Purpose** | Backend integration tests | Full-stack testing & manual QA |
| **Scope** | Infrastructure only (DB, search) | Complete application (backend + frontend + infra) |
| **Hermes** | Runs natively on host | Containerized |
| **Frontend** | Not included | Containerized Nginx + Ember app |
| **Usage** | `make go/test/with-docker-postgres` | Manual testing via browser |
| **Ports** | 5432 (PG), 7700 (Meili) | 5433 (PG), 7701 (Meili), 8001 (API), 4201 (Web) |

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser: http://localhost:4201         │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼─────────────┐
         │  Web (Ember Dev)    │  Port 4201 → 4200
         │  ember serve        │  (hermes-web)
         │  --proxy backend    │  Live reload enabled
         └───────┬─────────────┘
                 │ /api/* proxied to backend
         ┌───────▼────────┐
         │  Hermes API    │  Port 8001 → 8000
         │  Go Backend    │  (hermes-server)
         │  + Meilisearch │  Auth: Dex OIDC
         │  + Workspace   │  Search: Algolia
         └───┬───┬───┬────┘
             │   │   │
    ┌────────▼┐ ┌▼──────────┐ ┌▼────────────┐
    │ PG 5433 │ │ Meili 7701│ │ Dex 5558    │
    └─────────┘ └───────────┘ └─────────────┘
```

## Prerequisites

**No pre-build required!** The web container runs Ember's development server, which:
- Builds assets on-demand (live reload)
- Proxies API requests to the backend
- Runs in development mode for easier debugging

## Quick Start

### 1. Start All Services

```bash
cd testing
docker compose up -d --build
```

This will:
1. Build the Hermes backend container (from `/Dockerfile`)
2. Build the web frontend container (from `/web/Dockerfile`) - **installs dependencies in container**
3. Start PostgreSQL, Meilisearch, and Dex
4. Wait for services to be healthy
5. Start Hermes backend configured for Dex authentication
6. Start web frontend with Ember dev server (`ember serve --proxy http://hermes:8000`)

**Note**: First build takes 3-5 minutes as it installs Node modules. Subsequent builds use Docker layer caching.

### 2. Access the Application

- **Web UI**: http://localhost:4201 (Ember dev server with hot reload)
- **API**: http://localhost:8001 (Hermes backend)
- **Dex**: http://localhost:5558 (OIDC provider)
- **PostgreSQL**: localhost:5433
- **Meilisearch**: http://localhost:7701

### 3. Test Authentication

1. Navigate to http://localhost:4201
2. Frontend will detect `auth_provider: "dex"` from backend config
3. Click login → redirects to Dex
4. Use test credentials:
   - Email: `test@hermes.local`
   - Password: `password`
5. After successful login, API requests include Bearer token

**Available Test Users** (see [users.json](./users.json)):
- `test@hermes.local` / `password` - Test user with tester permissions
- `admin@hermes.local` / `password` - Admin user
- `user@hermes.local` / `password` - Regular user

### 3a. Verify Local Workspace Setup

Run the verification script to ensure local workspace is properly configured:

```bash
./verify-local-workspace.sh
```

This checks:
- ✓ Provider configuration in config.hcl
- ✓ users.json exists and matches Dex identities
- ✓ Volume mounts are correct
- ✓ Dex and workspace users are aligned

### 4. Stop Services

```bash
docker compose down
```

### 5. Clean Up (Remove Volumes)

```bash
docker compose down -v
```

## Service Details

### PostgreSQL
- **Image**: postgres:17.1-alpine
- **Port**: 5433 (mapped from 5432)
- **Database**: hermes_test
- **User/Password**: postgres/postgres
- **Volume**: postgres_test

### Meilisearch
- **Image**: getmeili/meilisearch:v1.11
- **Port**: 7701 (mapped from 7700)
- **API Key**: masterKey123
- **Volume**: meilisearch_test

### Hermes Backend
- **Build**: Multi-stage Dockerfile (golang:1.25-alpine → alpine:3.19)
- **Port**: 8001 (mapped from 8000)
- **Config**: Uses environment variables + config.hcl
- **Auth**: Disabled (HERMES_SERVER_OKTA_DISABLED=true)
- **Health Check**: /api/v1/me endpoint

### Web Frontend
- **Build**: Multi-stage Dockerfile (node:20-alpine → nginx:alpine)
- **Port**: 4201 (mapped from 4200)
- **Server**: Nginx with API proxy
- **API Proxy**: /api/* → http://hermes:8000

## Development Workflow

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker-compose build hermes
docker-compose build web

# Restart service
docker-compose up -d hermes
docker-compose up -d web

# Or rebuild and restart everything
docker-compose up --build -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f hermes
docker-compose logs -f web
docker-compose logs -f postgres
docker-compose logs -f meilisearch
```

### Run Commands in Containers

```bash
# Execute hermes CLI commands
docker-compose exec hermes /app/hermes version
docker-compose exec hermes /app/hermes canary -search-backend=meilisearch

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d hermes_test

# Check Meilisearch health
docker-compose exec meilisearch wget -qO- http://localhost:7700/health
```

### Database Management

```bash
# Create database dump
docker-compose exec postgres pg_dump -U postgres hermes_test > dump.sql

# Restore database dump
docker-compose exec -T postgres psql -U postgres hermes_test < dump.sql

# Reset database (clear all data)
docker-compose down -v
docker-compose up -d
```

## Configuration

### Environment Variables

Edit `docker-compose.yml` to change:
- Database credentials
- Port mappings
- Meilisearch API key
- Hermes configuration

### Custom Config File

The Hermes service mounts `./config.hcl` as a volume. You can edit this file to customize:
- Document types
- Products
- Feature flags
- Search configuration

Changes require restarting the service:
```bash
docker-compose restart hermes
```

## Troubleshooting

### Services Won't Start

Check service health:
```bash
docker-compose ps
```

All services should show "Up (healthy)" status.

### Database Connection Errors

Ensure PostgreSQL is healthy before Hermes starts:
```bash
docker-compose logs postgres
```

The `depends_on` configuration waits for health checks, but you may need to restart:
```bash
docker-compose restart hermes
```

### Web Frontend Can't Reach API

Check nginx configuration and backend health:
```bash
docker-compose logs web
docker-compose exec web wget -qO- http://hermes:8000/api/v1/me
```

### Port Conflicts

If ports are already in use, edit `docker-compose.yml`:
- PostgreSQL: Change `5433:5432`
- Meilisearch: Change `7701:7700`
- Hermes: Change `8001:8000`
- Web: Change `4201:4200`

### Rebuild Issues

Clear Docker build cache:
```bash
docker-compose build --no-cache
```

### Permission Errors

All services run as non-root users. If you encounter permission issues with volumes:
```bash
docker-compose down -v  # Clear volumes
docker-compose up -d    # Recreate with correct permissions
```

## Testing

### Manual Testing

1. Start services: `docker-compose up -d`
2. Wait for healthy status: `docker-compose ps`
3. Open browser: http://localhost:4201
4. Test API: `curl http://localhost:8001/api/v1/me`

### Automated Testing

Run canary test inside container:
```bash
docker-compose exec hermes /app/hermes canary -search-backend=meilisearch
```

### Integration Tests

The complete stack is suitable for integration testing:
- Database migrations automatically run on startup
- Search indexes are created automatically
- Services wait for dependencies via health checks

## Differences from Root docker-compose.yml

The root `docker-compose.yml` provides only PostgreSQL and Meilisearch for local development.

This testing setup provides the complete stack:
- ✅ Full containerization
- ✅ Isolated network
- ✅ Different ports (no conflicts)
- ✅ Separate volumes (hermes_test)
- ✅ Web frontend included
- ✅ Production-like nginx setup

## Network Architecture

All services are on the `hermes-test` bridge network:
- Services communicate by name (e.g., `http://hermes:8000`)
- No need for `host.docker.internal` or localhost
- Isolated from other Docker networks

## Performance Notes

### Build Times
- **First build**: ~5-10 minutes (downloads dependencies)
- **Subsequent builds**: ~1-2 minutes (cached layers)
- **Code-only changes**: ~30 seconds (cached dependencies)

### Resource Usage
- **CPU**: ~2 cores during build, <1 core running
- **Memory**: ~2-3 GB total
- **Disk**: ~1.5 GB images + volumes

### Optimization Tips
- Keep `go.mod` and `package.json` unchanged for better caching
- Use `.dockerignore` to exclude unnecessary files
- Consider multi-stage builds (already implemented)

## CI/CD Integration

This setup is suitable for CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start test environment
  run: |
    cd testing
    docker-compose up -d
    docker-compose exec -T hermes /app/hermes canary

- name: Run tests
  run: |
    # Your test commands here
    
- name: Teardown
  run: docker-compose down -v
```

## Production Notes

⚠️ **This is a testing environment, not production-ready:**
- Uses hardcoded credentials
- Auth is disabled
- No SSL/TLS
- No load balancing
- No backup strategy
- No monitoring/alerting

For production deployment, consider:
- Kubernetes or ECS
- Managed database (RDS, Cloud SQL)
- Managed search (Elasticsearch, Algolia)
- Proper secrets management
- SSL/TLS termination
- CDN for static assets
- Monitoring and logging
