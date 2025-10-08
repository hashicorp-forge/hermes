# Testing Configuration Refactoring Summary

**Date**: 2025-10-08  
**Objective**: Refactor `testing/config.hcl` to follow patterns from core `config.hcl` and establish a proper template-based document system for local workspace testing.

## Changes Made

### 1. Document Types Enhancement

**Location**: `testing/config.hcl`

Expanded document types from 2 to 5, matching the core configuration patterns:

| Document Type | Template ID | Features |
|---------------|-------------|----------|
| RFC | `template-rfc` | 4 custom fields, 1 check, more_info_link |
| PRD | `template-prd` | 3 custom fields, more_info_link |
| ADR | `template-adr` | 4 custom fields, 2 checks, more_info_link |
| FRD | `template-frd` | 3 custom fields, more_info_link |
| Memo | `template-memo` | 2 custom fields |

**Key improvements**:
- Added comprehensive custom fields matching core config
- Added validation checks for RFC and ADR
- Added more_info_links for documentation
- Consistent structure across all document types

### 2. Products Expansion

**Location**: `testing/config.hcl`

Expanded from 2 to 7 products, matching core configuration:

- Engineering (ENG)
- Labs (LAB)
- Platform (PLT)
- Security (SEC)
- Infrastructure (INF)
- Product Management (PM)
- Design (DES)

### 3. Local Workspace Configuration

**Location**: `testing/config.hcl`

Enhanced configuration with:
- Added `templates_path = "/app/workspace_data/templates"` configuration
- Comprehensive comments explaining container path mapping
- Documentation of volume mapping strategy

### 4. Template System Implementation

Created a dual-directory template system:

#### A. Development Templates (`testing/templates/`)

Human-readable template files for reference and development:
- `rfc.md` - RFC template with full structure
- `prd.md` - PRD template with full structure
- `adr.md` - ADR template with full structure
- `frd.md` - FRD template with full structure
- `memo.md` - Memo template with full structure
- `README.md` - Documentation

**Purpose**: Development reference, not used directly by Hermes

#### B. Runtime Templates (`testing/workspace_data/templates/`)

Git-tracked template documents that Hermes actually uses:
- `template-rfc.md` - RFC template document (ID: template-rfc)
- `template-prd.md` - PRD template document (ID: template-prd)
- `template-adr.md` - ADR template document (ID: template-adr)
- `template-frd.md` - FRD template document (ID: template-frd)
- `template-memo.md` - Memo template document (ID: template-memo)

**Purpose**: Actual templates used by local workspace provider for document creation

### 5. Docker Volume Mapping

**Location**: `testing/docker-compose.yml`

Updated volume mappings for the `hermes` service:

```yaml
volumes:
  # Configuration (read-only)
  - ./config.hcl:/app/config.hcl:ro
  
  # User data (read-only)
  - ./users.json:/app/workspace_data/users.json:ro
  
  # Template documents (read-only, from git)
  - ./workspace_data/templates:/app/workspace_data/templates:ro
  
  # Runtime workspace data (read-write, persistent volume)
  - hermes_workspace:/app/workspace_data
```

**Strategy**:
- Templates are read-only overlays from git
- Runtime data goes into persistent Docker volume
- Ensures consistency and reproducibility

### 6. Git Tracking Strategy

**Location**: `testing/workspace_data/.gitignore`

Configured to track:
- ✅ `templates/` - Template documents (seed data)
- ✅ `README.md` - Documentation

Ignore runtime data:
- ❌ `docs/` - Published documents
- ❌ `drafts/` - Draft documents
- ❌ `folders/` - Folder metadata
- ❌ `users/` - User profiles
- ❌ `tokens/` - Auth tokens

### 7. Documentation

Created comprehensive documentation:

1. **`testing/templates/README.md`** - Explains development template structure
2. **`testing/workspace_data/README.md`** - Explains runtime template system, volume mapping, and persistence strategy
3. **`testing/workspace_data/.gitignore`** - Documents git tracking strategy

## Architecture

### Template Flow

```
Document Creation Request
  ↓
config.hcl: document_type "RFC" { template = "template-rfc" }
  ↓
Local Workspace Provider: GetDocument(ctx, "template-rfc")
  ↓
File System: /app/workspace_data/templates/template-rfc.md
  ↓
Template Content Loaded
  ↓
Variable Substitution ({{title}}, {{owner}}, etc.)
  ↓
New Document Created in /app/workspace_data/drafts/
```

### Directory Mapping

```
Host System                     Container                      Purpose
────────────────────────────────────────────────────────────────────────────────
testing/config.hcl         →   /app/config.hcl               Configuration
testing/users.json         →   /app/workspace_data/users.json User data
testing/workspace_data/
  templates/               →   /app/workspace_data/templates/ Template documents
Docker Volume              →   /app/workspace_data/           Runtime data
  (hermes_workspace)            ├── docs/                     Published docs
                                ├── drafts/                   Draft docs
                                ├── folders/                  Folder metadata
                                ├── users/                    User profiles
                                └── tokens/                   Auth tokens
```

## Benefits

1. **Consistency**: Testing environment now matches core config patterns
2. **Reproducibility**: Templates are tracked in git, ensuring consistent behavior
3. **Isolation**: Runtime data is separate from seed data
4. **Maintainability**: Clear separation between development templates and runtime templates
5. **Documentation**: Comprehensive READMEs explain the system
6. **Flexibility**: Easy to add new document types or modify templates
7. **Testing**: Realistic document creation scenarios with proper templates

## Usage

### Creating a Document

When creating a new RFC document:

1. User selects "RFC" document type in UI
2. Backend looks up template ID from config: `template-rfc`
3. Local workspace provider loads `/app/workspace_data/templates/template-rfc.md`
4. Variables are replaced: `{{title}}`, `{{owner}}`, etc.
5. New document created in `/app/workspace_data/drafts/`

### Modifying Templates

1. Edit file in `testing/workspace_data/templates/`
2. Commit changes to git
3. Restart container: `docker compose restart hermes`
4. Create new document to test changes

### Adding New Document Type

1. Create template file: `testing/workspace_data/templates/template-newtype.md`
2. Add document_type in `testing/config.hcl`:
   ```hcl
   document_type "NewType" {
     template = "template-newtype"
     ...
   }
   ```
3. Restart container
4. Test creating a new document of that type

## Verification Steps

To verify the setup:

1. **Start environment**:
   ```bash
   cd testing
   docker compose up -d --build
   ```

2. **Check logs**:
   ```bash
   docker compose logs hermes | grep -i template
   ```

3. **Verify templates available**:
   ```bash
   docker exec hermes-server ls -la /app/workspace_data/templates/
   ```

4. **Create test document**:
   - Open http://localhost:4201
   - Log in with Dex (admin@hermes.local)
   - Create new RFC document
   - Verify template content is used

5. **Check runtime data**:
   ```bash
   docker exec hermes-server ls -la /app/workspace_data/drafts/
   ```

## Future Enhancements

Potential improvements for the template system:

1. **Template Variables**: Add more sophisticated variable replacement (conditionals, loops)
2. **Template Validation**: Validate templates on startup
3. **Template Versioning**: Track template versions for auditing
4. **UI Template Editor**: Allow editing templates through UI
5. **Template Import/Export**: Share templates across environments
6. **Template Inheritance**: Allow templates to extend other templates

## Related Files

- `testing/config.hcl` - Main configuration file
- `testing/docker-compose.yml` - Container orchestration
- `testing/workspace_data/templates/` - Runtime template documents
- `testing/templates/` - Development template reference files
- `config.hcl` - Core configuration (reference)

## Testing Checklist

- [x] Templates created and tracked in git
- [x] Config updated with comprehensive document types
- [x] Products expanded to match core config
- [x] Docker volume mappings configured
- [x] Git tracking strategy documented
- [x] READMEs created explaining the system
- [ ] Test document creation with each template
- [ ] Verify template variable substitution works
- [ ] Test template modifications persist across restarts
- [ ] Validate all document types work in UI

## Prompt Used

**Objective**: Refactor the ./testing hcl to use the patterns established in the core ./config.hcl so that we have a good set of documents and local workspace templates configured. Generate the local workspace templates in the testing directory and link them into the config so that they will be used by the container runtime (through the mapped volume) ensure that the core content of the mapped volume is established through the git repo.

**Implementation Strategy**:
1. Analyzed core config.hcl patterns for document types, products, and configuration
2. Created dual-directory template system (development + runtime)
3. Implemented git-tracked seed data for templates
4. Updated docker-compose volume mappings for proper isolation
5. Created comprehensive documentation explaining the architecture
6. Established clear separation between seed data and runtime data

**Result**: Complete, self-contained testing environment with production-like document types, proper template system, and clear documentation for maintenance and extension.
