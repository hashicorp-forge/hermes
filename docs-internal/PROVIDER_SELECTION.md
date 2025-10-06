# Provider Selection Architecture

## Overview

Hermes now supports pluggable workspace and search providers that can be selected at runtime via:
1. Configuration profiles
2. Command-line flags
3. Environment variables

This allows running Hermes with different backends without code changes.

## Architecture

### Provider Types

**Workspace Providers** (document storage):
- `google` - Google Workspace (Drive, Docs) - **Default**
- `local` - Local filesystem storage (🚧 In Development)

**Search Providers** (search/indexing):
- `algolia` - Algolia search - **Default**
- `meilisearch` - Meilisearch open-source search

### Selection Priority (highest to lowest)

1. **Command-line flags**: `--workspace-provider`, `--search-provider`
2. **Environment variables**: `HERMES_WORKSPACE_PROVIDER`, `HERMES_SEARCH_PROVIDER`
3. **Config profile `providers` block**: Explicitly set in config
4. **Default**: `google` + `algolia` (backward compatible)

## Configuration

### Profile-Based Configuration

Create profiles in your config file with provider specifications:

```hcl
// testing/config-profiles.hcl

// Google + Algolia (default behavior)
profile "default" {
  base_url = "http://localhost:8000"
  
  algolia {
    application_id = "your-app-id"
    search_api_key = "your-key"
    // ... other algolia config
  }
  
  google_workspace {
    domain = "example.com"
    // ... other google config
  }
  
  postgres { /* ... */ }
  // ... rest of config
}

// Meilisearch + Google
profile "meilisearch-dev" {
  base_url = "http://localhost:8000"
  
  providers {
    workspace = "google"
    search    = "meilisearch"
  }
  
  meilisearch {
    host                  = "http://localhost:7700"
    api_key               = "masterKey"
    docs_index_name       = "docs"
    drafts_index_name     = "drafts"
    projects_index_name   = "projects"
    links_index_name      = "links"
  }
  
  google_workspace { /* ... */ }
  postgres { /* ... */ }
  // ... rest of config
}

// Local + Meilisearch (fully local development)
profile "local" {
  base_url = "http://localhost:8000"
  
  providers {
    workspace = "local"
    search    = "meilisearch"
  }
  
  meilisearch {
    host                  = "http://localhost:7700"
    api_key               = "masterKey"
    docs_index_name       = "docs"
    drafts_index_name     = "drafts"
    projects_index_name   = "projects"
    links_index_name      = "links"
  }
  
  local_workspace {
    base_path    = "./workspace_data"
    docs_path    = "./workspace_data/docs"
    drafts_path  = "./workspace_data/drafts"
    folders_path = "./workspace_data/folders"
    users_path   = "./workspace_data/users"
    tokens_path  = "./workspace_data/tokens"
    domain       = "local.dev"
    
    smtp {
      enabled  = false
      host     = "localhost"
      port     = 1025
    }
  }
  
  // Okta MUST be enabled when using local workspace (no Google OAuth)
  okta {
    disabled = false
    // ... okta config
  }
  
  postgres { /* ... */ }
  // ... rest of config
}
```

### Running with Different Providers

#### 1. Using Profile Selection

```bash
# Default profile (google + algolia)
./hermes server -config=testing/config-profiles.hcl

# Specific profile
./hermes server -config=testing/config-profiles.hcl -profile=meilisearch-dev

# Local development profile
./hermes server -config=testing/config-profiles.hcl -profile=local
```

#### 2. Using Command-Line Flags (Override Profile)

```bash
# Override workspace provider
./hermes server -config=config.hcl -workspace-provider=local

# Override search provider
./hermes server -config=config.hcl -search-provider=meilisearch

# Override both
./hermes server -config=config.hcl \
  -workspace-provider=local \
  -search-provider=meilisearch
```

#### 3. Using Environment Variables

```bash
# Set via environment
export HERMES_WORKSPACE_PROVIDER=google
export HERMES_SEARCH_PROVIDER=meilisearch
./hermes server -config=config.hcl

# Or inline
HERMES_WORKSPACE_PROVIDER=local \
HERMES_SEARCH_PROVIDER=meilisearch \
./hermes server -config=config.hcl
```

## Provider Configurations

### Algolia Configuration

Required when `search = "algolia"`:

```hcl
algolia {
  application_id            = "your-app-id"
  search_api_key            = "your-search-key"
  write_api_key             = "your-write-key"
  docs_index_name           = "docs"
  drafts_index_name         = "drafts"
  internal_index_name       = "internal"
  links_index_name          = "links"
  missing_fields_index_name = "missing_fields"
  projects_index_name       = "projects"
}
```

### Meilisearch Configuration

Required when `search = "meilisearch"`:

```hcl
meilisearch {
  host                  = "http://localhost:7700"  # Meilisearch server URL
  api_key               = "masterKey"              # Master API key
  docs_index_name       = "docs"
  drafts_index_name     = "drafts"
  projects_index_name   = "projects"
  links_index_name      = "links"
}
```

### Google Workspace Configuration

Required when `workspace = "google"`:

```hcl
google_workspace {
  domain        = "example.com"
  docs_folder   = "folder-id"
  drafts_folder = "folder-id"
  shortcuts_folder = "folder-id"
  
  auth {
    client_email = "service@project.iam.gserviceaccount.com"
    private_key  = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    subject      = "user@example.com"
    token_url    = "https://oauth2.googleapis.com/token"
  }
  
  oauth2 {
    client_id    = "your-client-id"
    hd           = "example.com"
    redirect_uri = "http://localhost:8000/torii/redirect.html"
  }
}
```

### Local Workspace Configuration

Required when `workspace = "local"` (🚧 **In Development**):

```hcl
local_workspace {
  base_path    = "./workspace_data"           # Root directory
  docs_path    = "./workspace_data/docs"      # Published documents
  drafts_path  = "./workspace_data/drafts"    # Draft documents
  folders_path = "./workspace_data/folders"   # Folder metadata
  users_path   = "./workspace_data/users"     # User data
  tokens_path  = "./workspace_data/tokens"    # Auth tokens
  domain       = "local.dev"                  # Local domain
  
  smtp {
    enabled  = true                           # Enable email
    host     = "smtp.example.com"
    port     = 587
    username = "user"
    password = "pass"
  }
}
```

**⚠️ Important**: When using `local` workspace provider, **Okta authentication must be enabled** because the local adapter doesn't support Google OAuth.

## Provider-Specific Features

### Algolia-Specific Endpoints

When using Algolia search provider, these endpoints are available:

- **`/1/indexes/*`** - Algolia proxy for direct index access
- **`/l/short-link-id`** - Short link redirects (uses Algolia for lookup)

These endpoints are **not available** when using other search providers.

### Google Workspace-Specific Endpoints

When using Google workspace provider:

- **`/api/v1/me/subscriptions`** - Manage Google Workspace document subscriptions

This endpoint is **not available** when using other workspace providers.

### Web Configuration Endpoints

The frontend config endpoints adapt based on search provider:

- **Algolia**: `/api/v1/web/config` and `/api/v2/web/config` return Algolia connection details
- **Other Providers**: Same endpoints return minimal config without search-specific data

## Implementation Details

### Server Initialization Flow

1. **Parse flags and environment**: Determine provider names
2. **Load configuration**: Select profile and parse config
3. **Initialize workspace provider**:
   - `google` → Create Google Workspace service → Wrap in adapter
   - `local` → Create local filesystem adapter (validates paths)
4. **Initialize search provider**:
   - `algolia` → Create Algolia client → Wrap in adapter
   - `meilisearch` → Create Meilisearch client → Wrap in adapter
5. **Create server struct**: Inject providers
6. **Register handlers**: Provider-agnostic handlers + provider-specific handlers
7. **Start HTTP server**

### Code Locations

- **Config structs**: `internal/config/config.go`
- **Provider selection**: `internal/cmd/commands/server/server.go` (lines 253-418)
- **Server struct**: `internal/server/server.go`
- **Workspace providers**:
  - Interface: `pkg/workspace/provider.go`
  - Google: `pkg/workspace/adapters/google/`
  - Local: `pkg/workspace/adapters/local/`
- **Search providers**:
  - Interface: `pkg/search/search.go`
  - Algolia: `pkg/search/adapters/algolia/`
  - Meilisearch: `pkg/search/adapters/meilisearch/`

## Testing Combinations

### 1. Google + Algolia (Production Default)

```bash
./hermes server -config=config.hcl -profile=default
```

**Features**: All features available, full Google Workspace integration, Algolia search.

### 2. Google + Meilisearch

```bash
./hermes server -config=config.hcl -profile=meilisearch-dev
```

**Features**: Full Google Workspace integration, open-source search. No short links (`/l/`), no Algolia proxy.

### 3. Local + Meilisearch (🚧 In Development)

```bash
./hermes server -config=config.hcl -profile=local
```

**Features**: Local filesystem storage, open-source search. Requires Okta for auth. No Google-specific features.

**Status**: Local workspace adapter is partially implemented. Full implementation pending.

## Migration Path

### Adding a New Provider

1. **Create adapter** implementing `workspace.Provider` or `search.Provider`
2. **Add config struct** to `internal/config/config.go`
3. **Add switch case** in `internal/cmd/commands/server/server.go`
4. **Add conversion method** (e.g., `ToAdapterConfig()`)
5. **Document** in this file
6. **Test** with different combinations

### Example: Adding MinIO Workspace Provider

```go
// 1. Config struct (internal/config/config.go)
type MinIO struct {
    Endpoint        string `hcl:"endpoint"`
    AccessKeyID     string `hcl:"access_key_id"`
    SecretAccessKey string `hcl:"secret_access_key"`
    BucketName      string `hcl:"bucket_name"`
}

// 2. Conversion method
func (m *MinIO) ToMinIOAdapterConfig() *minioadapter.Config {
    return &minioadapter.Config{
        Endpoint:        m.Endpoint,
        AccessKeyID:     m.AccessKeyID,
        SecretAccessKey: m.SecretAccessKey,
        BucketName:      m.BucketName,
    }
}

// 3. Add to switch case (internal/cmd/commands/server/server.go)
case "minio":
    if cfg.MinIO == nil {
        c.UI.Error("error: minio configuration required")
        return 1
    }
    minioCfg := cfg.MinIO.ToMinIOAdapterConfig()
    minioAdapter, err := minioadapter.NewAdapter(minioCfg)
    if err != nil {
        c.UI.Error(fmt.Sprintf("error initializing minio: %v", err))
        return 1
    }
    workspaceProvider = minioAdapter
```

## Troubleshooting

### "unknown workspace provider" error

**Cause**: Invalid provider name in flag/env/config.

**Fix**: Use valid provider name: `google`, `local`.

### "configuration required" error

**Cause**: Selected provider but missing corresponding config block.

**Fix**: Ensure config file has matching block (e.g., `meilisearch {}` when using `search = "meilisearch"`).

### "Okta authentication must be enabled" error

**Cause**: Using non-Google workspace provider without Okta.

**Fix**: When using `local` workspace, enable Okta authentication in config:

```hcl
okta {
  disabled = false
  auth_server_url = "https://your-org.okta.com"
  client_id = "your-client-id"
  jwt_signer = "your-jwt-signer"
  aws_region = "us-east-1"
}
```

### Provider selection not working

**Check priority order**:
1. Command-line flags override everything
2. Environment variables override config
3. Config `providers` block is used last
4. Default is `google` + `algolia`

**Debug**: Run with provider logging:

```bash
./hermes server -config=config.hcl -profile=local 2>&1 | grep "Using.*provider"
# Should output:
# Using workspace provider: local
# Using search provider: meilisearch
```

## Future Enhancements

### Planned Providers

- **Workspace Providers**:
  - MinIO/S3-compatible object storage
  - Azure Blob Storage
  - Local filesystem (complete implementation)
  
- **Search Providers**:
  - Elasticsearch
  - OpenSearch
  - Typesense

### Potential Features

- **Multi-provider support**: Use multiple search backends simultaneously (primary + replica)
- **Provider-specific middleware**: Dynamic handler registration based on active providers
- **Provider health checks**: Monitor provider health and failover
- **Migration tools**: Migrate data between providers (e.g., Google → MinIO)

## Related Documentation

- [EXISTING_PATTERNS.md](./EXISTING_PATTERNS.md) - Provider abstraction patterns
- [SEARCH_ABSTRACTION_DESIGN.md](./design/SEARCH_ABSTRACTION_DESIGN.md) - Search provider design
- [WORKSPACE_ABSTRACTION_DESIGN.md](./design/WORKSPACE_ABSTRACTION_DESIGN.md) - Workspace provider design (if exists)
- [testing/README.md](../testing/README.md) - Test environment setup

## Commit Message

```
feat: add runtime provider selection for workspace and search backends

**Prompt Used**:
Under ./testing add a new config block for a local workspace and the 
meilisearch abstraction. Add command line arguments to hermes server 
similar to canary that allows selecting the workspace and search backend 
provider by name. This will trigger a branch in main that pulls in that 
specific config section to create the provider, then inject the providers 
into the server struct for the handlers to take advantage of. Do not try 
to maintain backwards compatibility, work directly towards the solution.

**AI Implementation Summary**:
1. Added provider selection config structures:
   - Providers block in config with workspace/search fields
   - LocalWorkspace config block for local filesystem storage
   - Meilisearch config block for Meilisearch search
   - Conversion methods to adapter configs

2. Added command-line flags and environment variables:
   - --workspace-provider / HERMES_WORKSPACE_PROVIDER
   - --search-provider / HERMES_SEARCH_PROVIDER
   - Priority: CLI flags > env vars > config > defaults

3. Implemented dynamic provider initialization:
   - Switch-case based on provider name
   - Google Workspace + Algolia (default, backward compatible)
   - Local filesystem + Meilisearch (new, local development)
   - Validates required config sections exist

4. Conditional handler registration:
   - Algolia-specific: /1/indexes/, /l/ (short links)
   - Google-specific: /api/v1/me/subscriptions
   - Provider-agnostic: all other API endpoints

5. Configuration:
   - Added "local" profile in testing/config-profiles.hcl
   - Demonstrated providers block usage
   - Documented all provider configurations

**Limitations**:
- Local workspace adapter not fully implemented (returns error)
- Non-Google workspace providers require Okta authentication
- Short links endpoint not available without Algolia

**Verification**:
- make bin: ✅ Success
- Code compiles cleanly with new provider selection logic
- Architecture supports future provider additions
- Documentation complete in docs-internal/PROVIDER_SELECTION.md
```
