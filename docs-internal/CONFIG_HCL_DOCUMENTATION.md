# config-example.hcl Documentation Enhancement

**Date**: October 8, 2025  
**Status**: Complete  
**Files Modified**: `config-example.hcl`  

## Overview

The root-level `config-example.hcl` file has been comprehensively documented to serve as:
1. **Production-ready example configuration** showing all available options
2. **Self-documenting reference** for all configuration sections
3. **Quick-start guide** for different deployment scenarios

The file has been **added to git tracking** as an example configuration that users can copy to `config.hcl` for their local development.

## Changes Made

### Expanded from 286 lines to 652 lines

The configuration file now includes:

#### 1. File Header
- Overview of Hermes configuration capabilities
- Multi-provider support explanation (authentication, workspace, search)
- Clear indication this is for local development with Dex + Local + Meilisearch

#### 2. Comprehensive Section Documentation

**Base Configuration**
- `base_url`: Purpose and usage in link generation
- `log_format`: Options and recommendations
- `shortener_base_url`: Optional short link support
- `support_link_url`: User help documentation
- `google_analytics_tag_id`: Frontend analytics

**Search Providers**
- **Algolia**: Complete field documentation with purpose of each index
- **Meilisearch**: Self-hosted alternative configuration
- Clear indication which provider is active via `providers` section

**Observability**
- **Datadog**: Metrics configuration with environment overrides

**Document Types**
- Detailed explanation of each field (long_name, description, flight_icon, template)
- Custom field types documented (string, people, person)
- Optional validation checks (check blocks)
- Example third document type (Memo) as template

**Email Notifications**
- Behavior differences between Google Workspace and Local Workspace
- Email event types explained

**Feature Flags**
- Percentage-based rollout capability documented
- Purpose of each flag (api_v2, projects)

**Workspace Providers**

*Google Workspace* (google_workspace):
- Clear folder hierarchy explanation
- Service account vs OAuth 2.0 authentication
- Group approvals feature
- User not found email configuration
- Complete service account setup with multiline private key example
- OAuth redirect URI configuration for different environments

*Local Workspace* (local_workspace):
- Purpose: local dev, testing, CI/CD
- Directory structure explanation
- SMTP configuration for optional email sending
- Domain configuration for user emails

**Indexer**
- Parallelism tuning guidance
- Header update behavior (published vs drafts)
- Database vs search backend as source of truth

**Jira Integration**
- Cloud vs Data Center configuration
- API token generation instructions

**Authentication Providers**
- **Dex**: Local development configuration (currently active)
- **Okta**: AWS ALB + Okta deployment with JWT verification
- Clear "one provider at a time" guidance

**Database**
- PostgreSQL connection parameters
- Docker commands for local development

**Products**
- Purpose explanation (tagging, organization)
- Abbreviation format requirements
- Multiple examples for adding custom products

**Provider Selection**
- Critical `providers` block documented
- Workspace options: google, local
- Search options: algolia, meilisearch
- Current selection clearly indicated

**Server**
- Binding address options
- Security considerations (localhost vs all interfaces)

#### 3. Configuration Examples Section

Added comprehensive examples at the end showing:
1. **Local Development with Dex + Local + Meilisearch** (current config)
2. **Production with Google Workspace + Algolia**
3. **Production with Okta + Google Workspace + Meilisearch**
4. **Testing with Dex + Google Workspace + Algolia**

Each example includes:
- Authentication provider configuration
- Workspace provider selection
- Search provider selection
- Required service commands
- Typical use case

## Verification

✅ **Syntax Valid**: Config file parses correctly
```bash
cp config-example.hcl config.hcl
./hermes server -config=config.hcl -help
```

✅ **Server Starts**: Successfully loads and runs
```bash
./hermes server -config=config.hcl
# Output: "Using workspace provider: local"
# Output: "Using search provider: meilisearch"
# Output: "listening on 127.0.0.1:8000..."
```

✅ **Git Tracked**: Example file is now under version control
```bash
git status config-example.hcl
# Output: "new file:   config-example.hcl"
```

## Benefits

### For New Users
- Self-contained documentation reduces onboarding time
- Clear examples for different deployment scenarios
- Inline comments explain *why* not just *what*

### For Developers
- Single source of truth for all configuration options
- Easy to find and modify settings
- Examples show recommended patterns

### For Operations
- Production deployment options clearly documented
- Security considerations highlighted
- Service dependencies explicit

## Relationship to Other Config Files

- **`configs/config.hcl`**: Template with minimal comments (246 lines)
- **`./config-example.hcl`**: Fully documented working example (652 lines) ← **THIS FILE** (copy to `config.hcl` for use)
- **`./config.hcl`**: Your local configuration (gitignored, create from example)
- **`dex-config.yaml`**: Dex OIDC provider configuration (separate file)
- **`docker-compose.yml`**: Service definitions (PostgreSQL, Dex, Meilisearch)

## Usage Guidelines

### For Local Development
1. Copy the example file: `cp config-example.hcl config.hcl`
2. Adjust database credentials if needed
3. Start services: `docker compose up -d postgres dex meilisearch`
4. Run server: `./hermes server -config=config.hcl`

### For Production Deployment
1. Copy the example file as your starting point: `cp config-example.hcl config.hcl`
2. Enable appropriate authentication provider (Google/Okta)
3. Configure workspace provider (typically Google Workspace)
4. Configure search provider (Algolia or Meilisearch)
5. Update products to match your organization
6. Set secure passwords and API keys
7. Configure `base_url` to public URL
8. Set `log_format = "json"` for structured logging

### For Testing/CI
1. Copy the example file: `cp config-example.hcl config.hcl`
2. Use `local_workspace` provider for filesystem-based testing
3. Use `meilisearch` for search (faster than Algolia setup)
4. Use `dex` for authentication (no external dependencies)
5. Set `email.enabled = false` or configure SMTP

## Future Enhancements

Potential improvements to consider:
- [ ] Add profile-based configuration examples
- [ ] Document environment variable overrides
- [ ] Add configuration validation command
- [ ] Create schema file for IDE autocomplete
- [ ] Add migration guide from v1 to v2 configuration

## References

- Configuration parsing: `internal/config/config.go`
- Provider selection: `internal/cmd/server.go`
- Algolia adapter: `pkg/search/adapters/algolia/`
- Meilisearch adapter: `pkg/search/adapters/meilisearch/`
- Local workspace adapter: `pkg/workspace/adapters/local/`
- Google workspace adapter: `pkg/workspace/adapters/google/`
- Dex adapter: `pkg/auth/adapters/dex/`
- Okta adapter: `pkg/auth/adapters/okta/`
