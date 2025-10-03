# Quick Start: Running Tests

## Prerequisites
```bash
# Make sure PostgreSQL and Meilisearch are running
make docker/dev/start
```

## Run Tests

### Option 1: Run All Working Tests (~7 min)
```bash
make test/api
```

### Option 2: Quick Smoke Test (~1 min)
```bash
make test/api/quick
```

### Option 3: Manual (from tests/api directory)
```bash
cd tests/api

# All working tests
go test -v -run "Test(Suite|Database|Search|Model)" -timeout 10m

# Single test
go test -v -run TestDatabase_CreateDocument

# With coverage
go test -v -cover -run "Test(Suite|Database|Search|Model)"
```

## What Tests Run

✅ **Working Tests** (7 total)
- `TestSuite_DatabaseSetup` - DB setup verification
- `TestSuite_SearchIntegration` - Meilisearch health check
- `TestDatabase_CreateDocument` - Document CRUD
- `TestDatabase_DocumentWithRelations` - Relationships
- `TestSearch_IndexAndSearchDocument` - Search functionality (3 subtests)
- `TestSearch_DeleteDocument` - Delete from search
- `TestModelToSearchDocument` - Model conversion

⏭️ **Skipped Tests** (4 total)
- `TestDocuments_Get` - Needs API handler refactor
- `TestDocuments_Patch` - Needs API handler refactor
- `TestDocuments_Delete` - Needs API handler refactor
- `TestDocuments_List` - Needs API handler refactor

## Troubleshooting

### "connection refused" error
```bash
# Check if services are running
docker ps | grep hermes

# Restart services
make docker/dev/start
```

### "citext extension" error
This has been fixed in `internal/test/database.go`. If you still see it:
```bash
# Rebuild the test binary
cd tests/api && go test -c -o /dev/null
```

### Tests are slow
This is expected (~60s per test). Future optimization planned:
- Database pooling
- Transaction rollback instead of drop/create
- Parallel execution

### "record not found" for document type
Database seeding should handle this. If it fails:
1. Check `suite.go` `seedDatabase()` method
2. Ensure PostgreSQL is accessible
3. Check for conflicting test databases

## Environment Variables

```bash
# PostgreSQL (default shown)
HERMES_TEST_POSTGRESQL_DSN="host=localhost user=postgres password=postgres port=5432 sslmode=disable"

# Meilisearch (default shown)
HERMES_TEST_MEILISEARCH_HOST="http://localhost:7700"
```

## Need More Help?

- **Architecture & Design**: See `tests/api/README.md`
- **Changes Made**: See `tests/api/IMPROVEMENTS.md`
- **Full Summary**: See `tests/api/SUMMARY.md`
- **Build Issues**: See root `.github/copilot-instructions.md`
