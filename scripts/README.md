# Hermes Scripts

This directory contains utility scripts for development and testing.

## canary-local.sh

**Purpose**: Validate local docker-compose environment by running end-to-end tests.

**What it does**:
1. ✅ Checks if docker-compose services are running (starts them if needed)
2. ✅ Builds the `hermes` binary if needed
3. ✅ Runs comprehensive canary test with Meilisearch backend
4. ✅ Tests full document lifecycle: create → draft → index → search → publish → cleanup

**Usage**:

```bash
# Direct execution
./scripts/canary-local.sh

# Or via Makefile
make canary
```

**What it validates**:
- PostgreSQL connectivity and CRUD operations
- Meilisearch connectivity and indexing
- Draft document creation and indexing
- Document search functionality (drafts and published)
- Document publishing workflow (WIP → Approved)
- Search index management
- Cleanup operations

**Output**: Colorized output showing each step with ✅/❌ indicators.

**Exit codes**:
- `0` - All tests passed
- `1` - One or more tests failed

**Requirements**:
- Docker and docker-compose installed
- Port 5432 (PostgreSQL) available
- Port 7700 (Meilisearch) available

## Development Workflow

```bash
# Start development environment
docker-compose up -d

# Run canary test to validate setup
make canary

# Develop...

# Run canary test before committing
make canary

# Stop environment
docker-compose down
```

## Troubleshooting

If the canary test fails:

1. **Check docker-compose services**:
   ```bash
   docker-compose ps
   ```
   Both services should show "Up" status and be healthy.

2. **Check logs**:
   ```bash
   docker-compose logs postgres
   docker-compose logs meilisearch
   ```

3. **Restart services**:
   ```bash
   docker-compose down
   docker-compose up -d
   sleep 5  # Wait for services to be ready
   make canary
   ```

4. **Clear data and restart**:
   ```bash
   docker-compose down -v
   docker-compose up -d
   sleep 5
   make canary
   ```
