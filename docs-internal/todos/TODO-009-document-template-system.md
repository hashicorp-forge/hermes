---
id: TODO-009
title: Implement Document Template System
date: 2025-10-09
type: TODO
priority: medium
status: open
tags: [templates, documents, email, customization]
related:
  - TODO-004
  - RFC-078
---

# Implement Document Template System

## Description

Multiple areas of the codebase would benefit from a template system:
1. Email content templates (for notifications)
2. Document header templates (for new document types)
3. Custom editable fields configuration

## Code References

### Email Templates
- **File**: `internal/api/documents.go`
- **Line**: 516
```go
// TODO: use a template for email content.
```

Currently, email content is hardcoded in the handler code. A template system would allow:
- Consistent email formatting
- Easy customization per deployment
- Localization support
- A/B testing of email content

### Custom Fields
- **File**: `pkg/document/replace_header.go`
- **Line**: 635
```go
// TODO: Don't hardcode these custom fields and instead create something
//       more extensible using regexp package and move to helpers.go.
```

### Document Type Consolidation
- **File**: `pkg/document/document.go`
- **Lines**: 74, 132
```go
// TODO: consolidate with CustomEditableFields.
// TODO: consolidate with DisplayName and make corresponding frontend changes
```

## Proposed Solution

### Phase 1: Email Template System

Use Go's `text/template` or `html/template` packages:

```go
// pkg/templates/email.go
type EmailTemplate struct {
    Subject  string
    Body     string
    Template *template.Template
}

func (e *EmailTemplate) Render(data interface{}) (string, error) {
    var buf bytes.Buffer
    err := e.Template.Execute(&buf, data)
    return buf.String(), err
}
```

**Template Files**:
```
templates/
  email/
    document_published.html
    review_requested.html
    approval_granted.html
```

**Example Template**:
```html
<!DOCTYPE html>
<html>
<body>
  <h1>Document Status Changed</h1>
  <p>Hi {{.RecipientName}},</p>
  <p>The document <strong>{{.DocumentTitle}}</strong> has been {{.Status}}.</p>
  <p><a href="{{.DocumentURL}}">View Document</a></p>
</body>
</html>
```

### Phase 2: Document Field Configuration

Create a declarative configuration for document types:

```yaml
# config/document_types.yaml
document_types:
  - name: RFC
    display_name: "Request for Comments"
    custom_fields:
      - name: stakeholders
        type: people_select
        required: false
      - name: contributors
        type: people_select
        required: true
```

### Phase 3: Header Template System

Make document headers configurable:

```
templates/
  headers/
    rfc_header.md
    prd_header.md
    frd_header.md
```

## Tasks

- [ ] Phase 1: Email Templates
  - [ ] Design template structure
  - [ ] Implement template loader
  - [ ] Create default email templates
  - [ ] Update handlers to use templates
  - [ ] Add template validation
- [ ] Phase 2: Document Field Configuration
  - [ ] Design field configuration schema
  - [ ] Implement field parser
  - [ ] Update document creation to use config
  - [ ] Migrate existing hardcoded fields
- [ ] Phase 3: Header Templates
  - [ ] Extract header generation logic
  - [ ] Create template system
  - [ ] Migrate existing document types
  - [ ] Add support for custom document types

## Impact

**Complexity**: Medium-High  
**Benefits**:
- Customizable email content
- Support for new document types without code changes
- Easier localization
- Better separation of concerns

## Dependencies

- **Relates to**: TODO-004 (Async email sending)
- **Enables**: RFC-078 (New document types)

## References

- `internal/api/documents.go` - Email content hardcoded
- `pkg/document/replace_header.go` - Custom fields hardcoded
- `pkg/document/document.go` - Field consolidation needed
- Go `text/template` package documentation
