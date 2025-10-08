# Template Documents

This directory contains template documents that are used when creating new documents of specific types.

## Structure

Each template is a markdown file that gets stored as a document in the local workspace with a specific document ID:

- `template-rfc` - RFC (Request for Comments) template
- `template-prd` - PRD (Product Requirements Document) template
- `template-adr` - ADR (Architectural Decision Record) template
- `template-frd` - FRD (Functional Requirements Document) template
- `template-memo` - Memo template

## How Templates Work

1. **Configuration Reference**: The `config.hcl` file references templates by ID in each `document_type` block:
   ```hcl
   document_type "RFC" {
     template = "template-rfc"
     ...
   }
   ```

2. **Document Creation**: When creating a new document:
   - Hermes looks up the template document by ID
   - Copies the template's content
   - Performs variable substitution (e.g., `{{title}}`, `{{owner}}`)
   - Creates the new document with the processed content

3. **Template Variables**: Templates support these placeholders:
   - `{{title}}` - Document title
   - `{{owner}}` - Document owner email
   - `{{created_date}}` - Creation date
   - Custom field values from document metadata

## Initialization

The template documents need to be seeded into the local workspace on first run. This happens through the volume mapping in `docker-compose.yml`:

```yaml
volumes:
  - ./templates:/app/workspace_data/templates:ro
```

The templates in this directory will be available to the Hermes backend and can be copied when creating new documents.

## Editing Templates

To modify a template:

1. Edit the `.md` file in this directory
2. Rebuild the container or restart if using volume mounts
3. New documents will use the updated template

## Template Format

Templates are standard Markdown files with optional YAML frontmatter. Example:

```markdown
# {{title}}

**Status**: Draft  
**Created**: {{created_date}}  
**Owner**: {{owner}}

## Section 1

Content here...
```

Variable placeholders use `{{variable_name}}` syntax and will be replaced during document creation.
