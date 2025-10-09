---
id: TODO-008
title: Make Configuration Values Configurable
date: 2025-10-09
type: TODO
priority: low
status: open
tags: [configuration, hardcoded-values, config, backend]
related:
  - []
---

# Make Configuration Values Configurable

## Description

Multiple hardcoded values throughout the codebase should be made configurable through the config file or environment variables. This improves flexibility for different deployment environments.

## Code References

### Database Configuration
- **File**: `pkg/models/testing.go`
- **Line**: 32
```go
// TODO: add back and make configurable.
```

- **File**: `internal/test/database.go`
- **Line**: 35
```go
// TODO: make log mode configurable.
```

### Network Configuration
- **File**: `pkg/workspace/adapters/google/service.go`
- **Line**: 184
```go
// TODO: remove hardcoded port.
```

### Timeout Configuration
- **File**: `pkg/algolia/client.go`
- **Lines**: 111, 327
```go
// TODO: make timeouts configurable.
// TODO: make ReadTimeout configurable.
```

### Indexer Configuration
- **File**: `internal/indexer/indexer.go`
- **Line**: 544
```go
// TODO: make sleep time configurable.
```

### Logger Configuration
- **File**: `pkg/workspace/adapters/google/backoff.go`
- **Line**: 22
```go
// TODO: enable passing in a logger.
```

### Database Validation
- **File**: `internal/db/db.go`
- **Line**: 14
```go
// TODO: validate config.
```

## Proposed Solution

### Add to config.hcl Structure

```hcl
# Database configuration
database {
  max_open_connections = 25
  max_idle_connections = 10
  log_mode = "info"  # silent, error, warn, info
}

# Network configuration
server {
  port = 8000
  oauth_callback_port = 3000  # Currently hardcoded
}

# Timeouts
timeouts {
  algolia_read = 5    # seconds
  algolia_write = 30  # seconds
  http_read = 10
  http_write = 30
}

# Indexer configuration
indexer {
  poll_interval = 60  # seconds between index updates
}

# Logging
logging {
  level = "info"
  format = "json"  # json or text
  output = "stdout"
}
```

### Implementation Steps

1. **Define Config Structs**
   ```go
   type DatabaseConfig struct {
       MaxOpenConns int    `hcl:"max_open_connections"`
       MaxIdleConns int    `hcl:"max_idle_connections"`
       LogMode      string `hcl:"log_mode"`
   }
   ```

2. **Add Config Parsing**
   - Extend existing config parsing in `internal/config/`
   - Add validation for new fields

3. **Update Code to Use Config**
   - Replace hardcoded values with config reads
   - Add sensible defaults

## Tasks

- [ ] Design configuration schema
- [ ] Add config struct definitions
- [ ] Update config parsing logic
- [ ] Database: max connections, log mode
- [ ] Network: remove hardcoded OAuth port
- [ ] Timeouts: Algolia read/write, HTTP
- [ ] Indexer: poll interval
- [ ] Logging: logger configuration
- [ ] Add validation for new config fields
- [ ] Document in config.hcl comments
- [ ] Remove TODO comments

## Impact

**Files Affected**: 7 files  
**Complexity**: Low (straightforward config plumbing)  
**Benefits**:
- Better deployment flexibility
- Easier performance tuning
- Environment-specific configuration

## Testing Strategy

- Unit tests for config parsing
- Integration tests with various config values
- Validation tests for invalid configs

## References

- `config.hcl` - Main configuration file (comprehensive, 828 lines)
- `configs/config.hcl` - Minimal configuration template (246 lines)
- `pkg/models/testing.go` - Database config
- `pkg/algolia/client.go` - Timeout config
- `internal/indexer/indexer.go` - Poll interval config
