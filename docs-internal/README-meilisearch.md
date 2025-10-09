# Meilisearch Setup

This guide covers setting up Meilisearch as the self-hosted search provider for Hermes.

## Overview

Meilisearch provides:
- **Open-source** search engine you control and host
- **Fast full-text search** with typo-tolerance
- **Easy deployment** via Docker, binary, or cloud services
- **No usage-based costs** - only infrastructure costs
- **Simple API** similar to Algolia

## When to Use Meilisearch

**Use Meilisearch if**:
- You want to self-host your search infrastructure
- You need a fully open-source solution
- You want predictable infrastructure costs (no usage-based pricing)
- You're in a development/testing environment

**Consider Algolia instead if**:
- You prefer fully managed search infrastructure
- You need built-in analytics and query insights
- You want global CDN distribution

See [README-algolia.md](README-algolia.md) for the managed alternative.

## Quick Start (Docker)

### Using Testing Environment

The easiest way to run Meilisearch locally:

```bash
# Start all services including Meilisearch
cd testing
docker compose up -d

# Meilisearch available at:
# - Native mode: http://localhost:7700
# - Testing mode: http://localhost:7701
```

### Standalone Docker

To run just Meilisearch:

```bash
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY="your-master-key-min-16-chars" \
  -e MEILI_ENV="development" \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5
```

## Production Deployment

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  meilisearch:
    image: getmeili/meilisearch:v1.5
    container_name: meilisearch
    ports:
      - "7700:7700"
    environment:
      - MEILI_MASTER_KEY=${MEILI_MASTER_KEY}
      - MEILI_ENV=production
      - MEILI_NO_ANALYTICS=true
      - MEILI_DB_PATH=/meili_data
    volumes:
      - meilisearch_data:/meili_data
    restart: unless-stopped

volumes:
  meilisearch_data:
```

Start with:
```bash
export MEILI_MASTER_KEY="your-secure-master-key-here"
docker compose up -d
```

### Binary Installation

Download from [Meilisearch releases](https://github.com/meilisearch/meilisearch/releases):

```bash
# Linux/macOS
curl -L https://install.meilisearch.com | sh

# Run Meilisearch
MEILI_MASTER_KEY="your-master-key" \
MEILI_ENV=production \
./meilisearch
```

### Cloud Deployment

**Meilisearch Cloud**: Official managed hosting at [meilisearch.com/cloud](https://www.meilisearch.com/cloud)

**Self-hosted options**:
- AWS ECS/Fargate with persistent EBS volumes
- Google Cloud Run with Cloud Storage
- DigitalOcean App Platform or Droplet
- Kubernetes with StatefulSet

## Configuration

### Hermes Backend Configuration

Add to your `config.hcl`:

```hcl
meilisearch {
  host       = "http://localhost:7700"  # Or your production URL
  master_key = "your-master-key-here"   # Required for authentication
}

providers {
  search = "meilisearch"  # Enable Meilisearch as search provider
}
```

### Environment Variables (Optional)

Instead of hardcoding in config.hcl:

```bash
export HERMES_MEILISEARCH_HOST="http://localhost:7700"
export HERMES_MEILISEARCH_MASTER_KEY="your-master-key"
```

### Master Key Requirements

**Development**: Minimum 16 characters

**Production**:
- Use strong, randomly generated key (32+ characters recommended)
- Store securely (environment variables, secrets manager)
- Never commit to version control

Generate a secure key:
```bash
# Using openssl
openssl rand -base64 32

# Using pwgen
pwgen -s 32 1
```

## Index Structure

Hermes creates these Meilisearch indices:

### `docs` Index

Primary index with all documents:

**Searchable Attributes**:
- `title` (highest weight)
- `docNumber`
- `excerpt`
- `content`
- `owners`
- `contributors`
- `product`

**Filterable Attributes**:
- `docType`
- `product`
- `status`
- `createdTime`
- `modifiedTime`

**Sortable Attributes**:
- `createdTime`
- `modifiedTime`

### Index Settings

Meilisearch automatically configures optimal settings:

```json
{
  "searchableAttributes": [
    "title",
    "docNumber",
    "excerpt",
    "owners",
    "contributors",
    "product",
    "content"
  ],
  "filterableAttributes": [
    "docType",
    "product",
    "status"
  ],
  "sortableAttributes": [
    "createdTime",
    "modifiedTime"
  ],
  "rankingRules": [
    "words",
    "typo",
    "proximity",
    "attribute",
    "sort",
    "exactness"
  ]
}
```

## Indexing Operations

### Initial Indexing

Populate the search index:

```bash
# Index all documents
./hermes indexer -config=config.hcl
```

The indexer will:
1. Connect to Meilisearch
2. Create `docs` index if it doesn't exist
3. Configure searchable/filterable attributes
4. Index all documents from database

### Continuous Indexing

Keep search synchronized:

```bash
# Run indexer continuously
./hermes indexer -config=config.hcl &

# Or with systemd/supervisor for production
```

### Indexer Configuration

Tune indexer behavior:

```hcl
indexer {
  max_parallel = 10              # Concurrent indexing operations
  update_header_enabled = true   # Update document headers
  update_draft_headers = false   # Skip draft header updates
}
```

## Search API

### Backend Implementation

Hermes uses the Meilisearch Go SDK:

```go
// Search query
results, err := client.Index("docs").Search(query, &meilisearch.SearchRequest{
    Filter: "docType = RFC AND product = Labs",
    Limit:  20,
    Offset: 0,
})
```

### API Endpoints

Search available at:
```
POST /api/v2/search
GET  /api/v2/search?q=query&filters=docType:RFC
```

## Monitoring

### Health Check

```bash
curl http://localhost:7700/health
# {"status":"available"}
```

### Stats and Metrics

Get index statistics:
```bash
curl -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
     http://localhost:7700/indexes/docs/stats

# Response:
# {
#   "numberOfDocuments": 1234,
#   "isIndexing": false,
#   "fieldDistribution": {...}
# }
```

### Logs

View Meilisearch logs:
```bash
# Docker
docker logs -f meilisearch

# Binary
# Logs to stdout/stderr
```

## Performance Tuning

### Memory Allocation

Meilisearch is memory-intensive:

**Minimum**: 512 MB RAM
**Recommended**: 2+ GB RAM for 10,000+ documents
**Production**: 4-8 GB RAM depending on dataset size

### Disk Space

Index size approximately 1.5-2x your source data size.

**Estimate**:
- 1,000 documents (~1MB each) = ~2-3 GB index
- 10,000 documents = ~20-30 GB index

### Database Path

Use SSD storage for best performance:

```bash
MEILI_DB_PATH=/mnt/ssd/meili_data ./meilisearch
```

### Concurrent Requests

Default: 10 concurrent requests

Increase for high-traffic:
```bash
# Set via reverse proxy (nginx, caddy)
# Or scale horizontally with multiple instances
```

## Backup and Recovery

### Backup Strategy

Create dumps for backup:

```bash
# Create dump
curl -X POST \
  -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
  http://localhost:7700/dumps

# Download dump from response path
curl -O http://localhost:7700/dumps/20231009-120000.dump
```

### Restore from Dump

```bash
# Stop Meilisearch
docker stop meilisearch

# Remove old data
rm -rf meili_data/*

# Start with dump
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY="your-master-key" \
  -v $(pwd)/20231009-120000.dump:/dumps/dump.dump \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5 \
  --import-dump /dumps/dump.dump
```

### Volume Snapshots

For Docker/Kubernetes deployments, take volume snapshots:

```bash
# Docker volume backup
docker run --rm \
  -v meilisearch_data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/meilisearch-backup.tar.gz /data
```

## Troubleshooting

### Connection Refused

**Cause**: Meilisearch not running or wrong host/port

**Solution**:
```bash
# Check if running
docker ps | grep meilisearch
curl http://localhost:7700/health

# Check config.hcl
grep -A3 "meilisearch {" config.hcl
```

### Authentication Errors

**Cause**: Missing or incorrect master key

**Solution**:
```bash
# Verify master key matches between:
# 1. Meilisearch startup (MEILI_MASTER_KEY)
# 2. config.hcl (meilisearch.master_key)

# Test with curl
curl -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
     http://localhost:7700/indexes
```

### No Search Results

**Cause**: Index empty or not created

**Solution**:
```bash
# Check index exists
curl -H "Authorization: Bearer ${MEILI_MASTER_KEY}" \
     http://localhost:7700/indexes/docs/stats

# Run indexer
./hermes indexer -config=config.hcl

# Check indexer logs
grep -i meilisearch /tmp/hermes-indexer.log
```

### Slow Search Performance

**Cause**: Insufficient memory or disk I/O bottleneck

**Solution**:
1. Increase memory allocation
2. Move data to SSD storage
3. Reduce `max_parallel` in indexer config
4. Enable pagination in search queries

## Migration from Algolia

To switch from Algolia to Meilisearch:

1. **Set up Meilisearch** (see Quick Start above)

2. **Update config.hcl**:
   ```hcl
   providers {
     search = "meilisearch"  # Change from "algolia"
   }
   ```

3. **Run indexer** to populate Meilisearch:
   ```bash
   ./hermes indexer -config=config.hcl
   ```

4. **Test search** functionality thoroughly

5. **Optional**: Keep Algolia as backup until confident

## See Also

- [Algolia Setup](README-algolia.md) - Managed alternative
- [Configuration Documentation](CONFIG_HCL_DOCUMENTATION.md)
- [Meilisearch Documentation](https://docs.meilisearch.com/)
- [Search Adapter Code](../pkg/search/adapters/meilisearch/)
