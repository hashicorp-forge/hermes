# Testing Workspace Data

This directory contains seeded data for the local workspace provider in testing/containerized environments.

## Directory Structure

```
workspace_data/
├── templates/          # Template documents (seeded, read-only in container)
│   ├── template-rfc.md
│   ├── template-prd.md
│   ├── template-adr.md
│   ├── template-frd.md
│   └── template-memo.md
├── docs/              # Published documents (created at runtime via volume)
├── drafts/            # Draft documents (created at runtime via volume)
├── folders/           # Folder metadata (created at runtime via volume)
├── users/             # User profiles (created at runtime via volume)
└── tokens/            # Auth tokens (created at runtime via volume)
```

## Purpose

This directory serves two purposes:

1. **Git-tracked seed data**: The `templates/` directory contains pre-created template documents that are committed to git and used as the source for document creation.

2. **Runtime workspace**: Through Docker volume mapping, this directory structure is replicated in the container at `/app/workspace_data`, where runtime data (docs, drafts, folders, users, tokens) is stored in a persistent volume.

## Volume Mapping Strategy

In `docker-compose.yml`:

```yaml
volumes:
  # Seed templates (read-only, from git)
  - ./workspace_data/templates:/app/workspace_data/templates:ro
  
  # Runtime workspace data (read-write, persisted in Docker volume)
  - hermes_workspace:/app/workspace_data
```

This dual-mapping approach:
- Provides **seeded templates** from git (read-only overlay)
- Allows **runtime data persistence** in the Docker volume
- Ensures templates are always available and consistent across environments

## Template Documents

Template documents are stored with specific IDs that match the `template` field in `config.hcl`:

| Document Type | Template ID | File |
|---------------|-------------|------|
| RFC | `template-rfc` | `templates/template-rfc.md` |
| PRD | `template-prd` | `templates/template-prd.md` |
| ADR | `template-adr` | `templates/template-adr.md` |
| FRD | `template-frd` | `templates/template-frd.md` |
| Memo | `template-memo` | `templates/template-memo.md` |

### How Templates Work

1. **Reference in config.hcl**:
   ```hcl
   document_type "RFC" {
     template = "template-rfc"
     ...
   }
   ```

2. **Document lookup**: When creating a new RFC, Hermes calls `GetDocument(ctx, "template-rfc")`

3. **File resolution**: The local workspace adapter looks for:
   - `/app/workspace_data/templates/template-rfc.md` (single-file format)
   - OR `/app/workspace_data/templates/template-rfc/` (directory format)

4. **Content copy**: Template content is copied and variables are replaced:
   - `{{title}}` → Document title
   - `{{owner}}` → Owner email
   - `{{created_date}}` → Current date
   - Plus any custom field placeholders

5. **New document creation**: The processed content becomes the new document

## Editing Templates

To modify templates:

1. **Edit the file**: Modify files in `testing/workspace_data/templates/`
2. **Commit changes**: Templates are tracked in git
3. **Restart container**: `docker compose restart hermes`
4. **Test**: Create a new document to see the updated template

## Adding New Templates

To add a new document type template:

1. **Create template file**: `testing/workspace_data/templates/template-newtype.md`
2. **Add document type** in `testing/config.hcl`:
   ```hcl
   document_type "NewType" {
     template = "template-newtype"
     ...
   }
   ```
3. **Restart container**: `docker compose restart hermes`

## Runtime Data Persistence

Runtime data is stored in the `hermes_workspace` Docker volume:

- **Docs**: Published documents
- **Drafts**: Work-in-progress documents
- **Folders**: Folder organization metadata
- **Users**: User profile information
- **Tokens**: Authentication tokens

### Clearing Runtime Data

To reset the testing environment:

```bash
cd testing
docker compose down -v  # Removes volumes
docker compose up -d    # Recreates with fresh volumes
```

This will:
- ✅ Keep templates (from git)
- ❌ Delete all created documents
- ❌ Delete user data (except users.json)
- ❌ Delete all runtime state

## Best Practices

1. **Always commit template changes** - Templates are part of the codebase
2. **Use meaningful template IDs** - Follow pattern: `template-{type}`
3. **Document template variables** - Add comments in templates explaining placeholders
4. **Test template changes** - Create a test document after modifying templates
5. **Keep templates consistent** - Use similar structure across document types

## Integration with Config

The `config.hcl` file references these templates and paths:

```hcl
local_workspace {
  base_path      = "/app/workspace_data"
  templates_path = "/app/workspace_data/templates"
  docs_path      = "/app/workspace_data/docs"
  drafts_path    = "/app/workspace_data/drafts"
  ...
}

document_types {
  document_type "RFC" {
    template = "template-rfc"  # References templates/template-rfc.md
    ...
  }
}
```

This creates a complete, self-contained testing environment with:
- Predefined templates (from git)
- Runtime document storage (in Docker volume)
- Proper isolation and reproducibility
