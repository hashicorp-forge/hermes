# Quick Test Guide

## Verify the Setup

### 1. Run Unit Tests (Should Work Immediately)
```bash
make test/api/unit
```

**Expected output:**
```
Running API unit tests...
=== RUN   TestFixtures_DocumentBuilder
=== RUN   TestFixtures_UserBuilder
=== RUN   TestModelToSearchDocument_Unit
=== RUN   TestDocumentStatus_Unit
=== RUN   TestClient_Unit
=== RUN   TestWithTransaction_Unit
=== RUN   TestHelpers_Unit
PASS
ok      github.com/hashicorp-forge/hermes/tests/api     0.468s
```

### 2. Run Integration Tests with Testcontainers (Requires Docker)

**Ensure Docker is running:**
```bash
docker ps
```

**Run integration tests:**
```bash
make test/api/integration
```

**Expected behavior:**
1. Downloads container images (first time only, ~1-2 minutes)
2. Starts PostgreSQL container
3. Starts Meilisearch container
4. Runs all integration tests
5. Cleans up containers
6. Reports test results

**Expected output (abbreviated):**
```
Running API integration tests with testcontainers...
=== RUN   TestSuite_DatabaseSetup
=== RUN   TestSuite_SearchIntegration
=== RUN   TestDatabase_CreateDocument
=== RUN   TestDatabase_DocumentWithRelations
=== RUN   TestSearch_IndexAndSearchDocument
=== RUN   TestSearch_DeleteDocument
=== RUN   TestModelToSearchDocument
PASS
ok      github.com/hashicorp-forge/hermes/tests/api     45.123s
```

### 3. Run All Tests Together
```bash
make test/api
```

This runs unit tests first (fast), then integration tests (slower).

## Alternative: Use Local Docker Compose

If you prefer to manage containers manually:

**Start services:**
```bash
make docker/dev/start
```

**Run integration tests against local services:**
```bash
make test/api/integration/local
```

**Stop services:**
```bash
make docker/dev/stop
```

## Troubleshooting

### Unit Tests Fail
```
FAIL    github.com/hashicorp-forge/hermes/tests/api [build failed]
```

**Solutions:**
- Run `go mod tidy` in project root
- Check for import errors in test files
- Ensure no syntax errors

### Integration Tests Can't Connect to Docker
```
Error: Cannot connect to the Docker daemon
```

**Solutions:**
- Start Docker Desktop
- Verify Docker is running: `docker ps`
- Check Docker version: `docker version`

### Container Ports Already in Use
```
Error: Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Solutions:**
- Stop local docker-compose: `make docker/dev/stop`
- Stop any local PostgreSQL: `brew services stop postgresql` (macOS)
- Testcontainers will use random ports automatically

### Containers Don't Start
```
Error: context deadline exceeded
```

**Solutions:**
- Check Docker resource limits (Settings → Resources)
- Ensure adequate disk space: `docker system df`
- Clean up old containers: `docker system prune`
- Increase timeout: `go test -tags=integration -timeout 20m`

### Tests Timeout
```
panic: test timed out after 15m0s
```

**Solutions:**
- Increase timeout: `cd tests/api && go test -tags=integration -timeout 30m`
- Check Docker logs: `docker logs <container-id>`
- Verify Meilisearch is responding: `curl http://localhost:7700/health`

## Performance Tips

### Speed Up First Run
Pre-pull container images:
```bash
docker pull postgres:17.1-alpine
docker pull getmeili/meilisearch:v1.10
```

### Run Specific Integration Test
```bash
cd tests/api
go test -tags=integration -v -run TestDatabase_CreateDocument
```

### Run Without Testcontainers (Using Local Compose)
```bash
make docker/dev/start
cd tests/api
HERMES_TEST_POSTGRESQL_DSN="host=localhost user=postgres password=postgres port=5432 sslmode=disable" \
HERMES_TEST_MEILISEARCH_HOST="http://localhost:7700" \
go test -tags=integration -v
```

## Verifying Testcontainers Work

### Check Container Startup
While tests are running, in another terminal:
```bash
docker ps
```

You should see:
- A postgres container (e.g., `postgres:17.1-alpine`)
- A meilisearch container (e.g., `getmeili/meilisearch:v1.10`)

### Check Container Logs
```bash
# Find container IDs
docker ps

# Check PostgreSQL logs
docker logs <postgres-container-id>

# Check Meilisearch logs
docker logs <meilisearch-container-id>
```

### Verify Cleanup
After tests complete:
```bash
docker ps
```

Should show no test containers (testcontainers removes them automatically).

## Common Test Patterns

### Run Only Unit Tests (CI-Friendly)
```bash
go test -short ./...
```

### Run Only Integration Tests
```bash
go test -tags=integration ./tests/api/...
```

### Run With Verbose Output
```bash
go test -v -tags=integration ./tests/api/...
```

### Run With Race Detection
```bash
go test -race -tags=integration ./tests/api/...
```

## Success Indicators

✅ **Unit tests pass in <1 second**
✅ **Integration tests start containers automatically**
✅ **Containers clean up after tests**
✅ **No manual service management needed**
✅ **Tests work on any machine with Docker**

## Next Steps After Verification

1. ✅ Verify unit tests pass
2. ✅ Verify integration tests pass with testcontainers
3. Update CI configuration to use new targets
4. Write more unit tests for untested code
5. Consider adding more integration test scenarios

## Questions or Issues?

- Check `README.md` for detailed documentation
- Review `TEST_SEPARATION_GUIDE.md` for migration help
- Look at `REFACTORING_SUMMARY.md` for what changed
- Examine test files for examples:
  - `unit_test.go` - unit test examples
  - `integration_test.go` - integration test examples
  - `integration_containers_test.go` - testcontainers setup
