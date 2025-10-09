# Provider Selection Quick Start

## TL;DR

Run Hermes with different backend providers:

```bash
# Default (Google Workspace + Algolia)
./hermes server -config=config.hcl

# Google Workspace + Meilisearch
./hermes server -config=config.hcl --search-provider=meilisearch

# Command-line flags (highest priority)
./hermes server -config=config.hcl \
  --workspace-provider=google \
  --search-provider=meilisearch

# Environment variables (medium priority)  
export HERMES_WORKSPACE_PROVIDER=google
export HERMES_SEARCH_PROVIDER=meilisearch
./hermes server -config=config.hcl

# Config profiles (lowest priority)
./hermes server -config=testing/config-profiles.hcl -profile=local
```

## Available Providers

### Workspace (Document Storage)
- ✅ **`google`** - Google Workspace (Drive/Docs) - Default, Production-ready
- 🚧 **`local`** - Local filesystem storage - In development

### Search (Indexing)
- ✅ **`algolia`** - Algolia SaaS search - Default, Production-ready
- ✅ **`meilisearch`** - Meilisearch open-source - Production-ready

## Setup: Meilisearch Local Development

Want to develop against Meilisearch instead of Algolia?

### 1. Start Meilisearch

```bash
# Docker
docker run -d \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.5 \
  --master-key="masterKey123"

# Or with docker-compose
cat > docker-compose.meilisearch.yml <<EOF
version: '3.8'
services:
  meilisearch:
    image: getmeili/meilisearch:v1.5
    ports:
      - "7700:7700"
    volumes:
      - ./meili_data:/meili_data
    environment:
      MEILI_MASTER_KEY: masterKey123
    restart: unless-stopped
EOF

docker-compose -f docker-compose.meilisearch.yml up -d
```

### 2. Update config

Add to your config file:

```hcl
profile "meilisearch-dev" {
  base_url = "http://localhost:8000"
  
  # Specify providers
  providers {
    workspace = "google"      # Still use Google Workspace
    search    = "meilisearch" # But use Meilisearch for search
  }
  
  # Meilisearch configuration
  meilisearch {
    host                  = "http://localhost:7700"
    api_key               = "masterKey123"
    docs_index_name       = "docs"
    drafts_index_name     = "drafts"
    projects_index_name   = "projects"
    links_index_name      = "links"
  }
  
  # ... rest of your config (google_workspace, postgres, etc.)
}
```

### 3. Run Hermes

```bash
# Using profile
./hermes server -config=config.hcl -profile=meilisearch-dev

# Or using flag override
./hermes server -config=config.hcl --search-provider=meilisearch
```

### 4. Verify

```bash
# Check Meilisearch is working
curl http://localhost:7700/health
# Should return: {"status":"available"}

# Check Hermes selected correct provider
./hermes server -config=config.hcl -profile=meilisearch-dev 2>&1 | grep "Using.*provider"
# Should show:
# Using workspace provider: google
# Using search provider: meilisearch
```

## Common Scenarios

### Scenario 1: Test Against Meilisearch Without Changing Config

```bash
# Just add the flag
HERMES_SEARCH_PROVIDER=meilisearch ./hermes server -config=config.hcl
```

**Note**: Your config must have a `meilisearch` block.

### Scenario 2: Multiple Environments

Create profiles for each environment:

```hcl
// config-profiles.hcl

profile "production" {
  providers {
    workspace = "google"
    search    = "algolia"
  }
  algolia { /* production keys */ }
  google_workspace { /* production */ }
}

profile "staging" {
  providers {
    workspace = "google"
    search    = "meilisearch"
  }
  meilisearch { host = "http://staging-meili:7700" }
  google_workspace { /* staging */ }
}

profile "dev" {
  providers {
    workspace = "google"
    search    = "meilisearch"
  }
  meilisearch { host = "http://localhost:7700" }
  google_workspace { /* dev */ }
}
```

Then:
```bash
# Production
./hermes server -config=config-profiles.hcl -profile=production

# Staging
./hermes server -config=config-profiles.hcl -profile=staging

# Dev
./hermes server -config=config-profiles.hcl -profile=dev
```

### Scenario 3: CI/CD Override

```bash
# In CI, override providers via environment
export HERMES_WORKSPACE_PROVIDER=google
export HERMES_SEARCH_PROVIDER=meilisearch
./hermes server -config=config.hcl
```

### Scenario 4: Fully Local Development (Future)

When local workspace is complete:

```bash
./hermes server -config=config.hcl -profile=local
```

This will use:
- Local filesystem for document storage (no Google API calls)
- Meilisearch for search (no Algolia)
- Okta for authentication (required when workspace != google)

## Limitations

### Algolia-Only Features

When NOT using Algolia, these features are unavailable:
- **Short links** (`/l/short-id`) - Uses Algolia for lookups
- **Algolia proxy** (`/1/indexes/*`) - Direct Algolia API access

### Google Workspace-Only Features

When NOT using Google workspace, these features are unavailable:
- **Document subscriptions** (`/api/v1/me/subscriptions`) - Google-specific

### Local Workspace Requirements

When using `local` workspace:
- ⚠️ **Okta authentication REQUIRED** (no Google OAuth support)
- 🚧 **Not fully implemented** (returns error currently)

## Troubleshooting

### Error: "unknown [workspace|search] provider"

**Problem**: Typo in provider name

**Fix**: Use exact names: `google`, `local`, `algolia`, `meilisearch`

### Error: "configuration required when using X provider"

**Problem**: Selected provider but config block missing

**Fix**: Add the required config block (see [PROVIDER_SELECTION.md](./PROVIDER_SELECTION.md))

### Error: "Okta authentication must be enabled"

**Problem**: Using non-Google workspace without Okta

**Fix**: Enable Okta in config when using `local` workspace

### Meilisearch connection fails

**Problem**: Meilisearch not running or wrong host/key

**Fix**:
```bash
# Check Meilisearch is running
curl http://localhost:7700/health

# Check API key
curl http://localhost:7700/indexes \
  -H "Authorization: Bearer masterKey123"

# Check config matches
grep -A5 "meilisearch {" config.hcl
```

## Next Steps

- 📖 **Full docs**: [PROVIDER_SELECTION.md](./PROVIDER_SELECTION.md)
- 🧪 **Test script**: `./testing/test-provider-selection.sh`
- 💡 **Config examples**: `testing/config-profiles.hcl`
- 🏗️ **Architecture**: See "Provider Selection Flow" in PROVIDER_SELECTION.md

## Priority Order Reminder

1. 🥇 **Command-line flags** (`--workspace-provider`, `--search-provider`)
2. 🥈 **Environment variables** (`HERMES_WORKSPACE_PROVIDER`, `HERMES_SEARCH_PROVIDER`)
3. 🥉 **Config `providers` block**
4. 🏅 **Default** (`google` + `algolia`)

Higher priority always wins!
