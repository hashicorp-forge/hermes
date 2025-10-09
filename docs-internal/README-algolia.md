# Algolia Search Setup

This guide covers setting up Algolia as the search provider for Hermes.

## Overview

Algolia provides:
- **Fast full-text search** across all document content
- **Faceted search** by document type, product, status
- **Typo-tolerance** and relevance ranking
- **Search analytics** and insights

## When to Use Algolia

**Use Algolia if**:
- You need hosted, managed search infrastructure
- You want built-in analytics and monitoring
- You prefer not to self-host search services
- You need global CDN distribution for search

**Consider Meilisearch instead if**:
- You want to self-host and control your search infrastructure
- You need a fully open-source solution
- You're cost-sensitive (Algolia has usage-based pricing)

See [README-meilisearch.md](README-meilisearch.md) for the self-hosted alternative.

## Setup Steps

### 1. Create Algolia Account

1. [Sign up for Algolia](https://www.algolia.com/users/sign_up) (free tier available)
2. Create an application for Hermes
3. Navigate to **Settings** → **API Keys**

### 2. Get API Credentials

You'll need three keys from [API Keys settings](https://www.algolia.com/account/api-keys):

- **Application ID**: Unique identifier for your Algolia application
- **Search-Only API Key**: Public key for frontend search queries
- **Admin API Key**: Private key for indexing operations (keep secure!)

### 3. Configure Hermes Backend

Add to your `config.hcl`:

```hcl
algolia {
  application_id = "YOUR_APP_ID"
  search_api_key = "YOUR_SEARCH_KEY"    # Search-only key
  write_api_key  = "YOUR_ADMIN_KEY"      # Admin key (keep secure!)
}

providers {
  search = "algolia"  # Enable Algolia as search provider
}
```

### 4. Configure Frontend (Optional)

**Note**: As of October 2025, the frontend proxies all Algolia requests through the backend at `/1/indexes/*`. You typically don't need to set these environment variables anymore.

If you need direct client-side access for specific use cases:

```bash
# At build time
export HERMES_WEB_ALGOLIA_APP_ID="YOUR_APP_ID"
export HERMES_WEB_ALGOLIA_SEARCH_API_KEY="YOUR_SEARCH_KEY"

cd web && yarn build
```

## Algolia Index Structure

Hermes creates the following Algolia indices:

### `docs` Index

Primary index for all documents with these searchable attributes:

- **`objectID`**: Unique document identifier (Google Doc ID or local file ID)
- **`title`**: Document title
- **`excerpt`**: First paragraph or summary
- **`docType`**: Document type (RFC, PRD, FRD, etc.)
- **`docNumber`**: Document number (e.g., "RFC-123")
- **`product`**: Associated product/team
- **`status`**: Document status (Draft, In Review, Approved, Published)
- **`owners`**: Document owners (searchable)
- **`contributors`**: Document contributors
- **`approvers`**: Document approvers
- **`content`**: Full document text (searchable)
- **`createdTime`**: Document creation timestamp
- **`modifiedTime`**: Last modification timestamp

### `docs_created_time_desc` Replica

Sorted by creation time (newest first).

### `docs_modified_time_desc` Replica

Sorted by modification time (recently updated first).

## Search Configuration

### Searchable Attributes (Priority Order)

Algolia searches these attributes in priority order:

1. `title` (highest priority)
2. `docNumber`
3. `excerpt`
4. `owners`
5. `contributors`
6. `product`
7. `content` (full text)

### Facets for Filtering

Users can filter search results by:
- `docType` (RFC, PRD, FRD, etc.)
- `product` (Labs, Vault, Terraform, etc.)
- `status` (Draft, Published, etc.)

## Indexing Operations

### Initial Indexing

After configuring Algolia, run the indexer to populate the search index:

```bash
# Index all documents
./hermes indexer -config=config.hcl
```

The indexer will:
1. Query all documents from the database
2. Fetch full document content from workspace provider
3. Extract metadata and text content
4. Push to Algolia indices

### Continuous Indexing

The indexer runs continuously to keep search up-to-date:

```bash
# Run indexer in background
./hermes indexer -config=config.hcl &
```

The indexer polls for changes and:
- Reindexes modified documents
- Removes deleted documents
- Updates document headers in Google Docs

### Indexer Configuration

Control indexer behavior in `config.hcl`:

```hcl
indexer {
  max_parallel = 10              # Number of concurrent indexing operations
  update_header_enabled = true   # Rewrite document headers with metadata
  update_draft_headers = false   # Don't update headers for drafts
}
```

## Search API

### Frontend Search

The frontend uses Algolia's JavaScript client (proxied through backend):

```javascript
// Search query
const results = await algolia.search('query', {
  filters: 'docType:RFC AND product:Labs',
  hitsPerPage: 20,
  page: 0
});
```

### Backend Proxy

All search requests go through the backend proxy at `/1/indexes/*`:

```
GET /1/indexes/docs/query
POST /1/indexes/docs/query
```

This provides:
- **Security**: API keys never exposed to frontend
- **Monitoring**: Centralized logging and metrics
- **Rate limiting**: Backend can enforce search quotas

## Monitoring and Analytics

### Algolia Dashboard

Access your Algolia dashboard to monitor:
- **Search analytics**: Top queries, no-results queries, click-through rates
- **Usage metrics**: API calls, storage, bandwidth
- **Index status**: Document count, size, last update

### Query Logs

Enable query logging in Algolia settings to:
- Track search patterns
- Identify missing content
- Optimize search relevance

## Cost Considerations

Algolia pricing is based on:
- **Records**: Number of documents in indices
- **Operations**: Search queries and indexing operations
- **Additional features**: Analytics, query suggestions, etc.

**Free Tier**: 10,000 records, 10,000 search requests/month

**Optimization Tips**:
- Use replica indices instead of creating separate indices
- Batch indexing operations
- Cache frequent queries on the backend
- Consider Meilisearch for cost-sensitive deployments

## Troubleshooting

### No Search Results

**Cause**: Index not populated or backend not configured

**Solution**:
```bash
# Check indexer logs
./hermes indexer -config=config.hcl 2>&1 | grep -i algolia

# Verify indices exist
curl -H "X-Algolia-API-Key: YOUR_ADMIN_KEY" \
     -H "X-Algolia-Application-Id: YOUR_APP_ID" \
     "https://YOUR_APP_ID.algolia.net/1/indexes"
```

### Stale Search Results

**Cause**: Indexer not running or not polling frequently enough

**Solution**:
1. Ensure indexer is running: `ps aux | grep "hermes indexer"`
2. Check indexer logs for errors
3. Manually trigger reindex: restart indexer process

### API Key Errors

**Cause**: Invalid or missing API keys

**Solution**:
1. Verify keys in Algolia dashboard (Settings → API Keys)
2. Ensure `write_api_key` uses Admin API Key (not Search-Only Key)
3. Check `config.hcl` has correct keys in `algolia` block

## Migration from Algolia to Meilisearch

If you want to switch to Meilisearch:

1. Set up Meilisearch (see [README-meilisearch.md](README-meilisearch.md))
2. Update `config.hcl`:
   ```hcl
   providers {
     search = "meilisearch"  # Switch provider
   }
   ```
3. Run indexer to populate Meilisearch
4. Algolia indices can be kept as backup or deleted

## See Also

- [Meilisearch Setup](README-meilisearch.md) - Self-hosted alternative
- [Configuration Documentation](CONFIG_HCL_DOCUMENTATION.md)
- [Search Adapter Code](../pkg/search/adapters/algolia/)
