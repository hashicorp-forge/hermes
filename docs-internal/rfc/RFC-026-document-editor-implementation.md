---
id: RFC-026
title: Document Editor Implementation
date: 2025-10-08
type: RFC
subtype: Feature Implementation
status: Implemented
tags: [document-editor, feature, implementation, workspace]
related:
  - RFC-047
  - RFC-051
---

# Document Editor Implementation

## Context

Hermes supports both Google Workspace (iframe embedding) and local workspace (file-based storage). The document editor must seamlessly adapt between these providers at runtime, providing appropriate UI for each workspace type.

## Architecture

### Workspace Detection

**Backend** (`web/web.go`):
- Added `workspace_provider` field to `/api/v2/web/config`
- Returns `"local"` or `"google"` based on runtime configuration
- Enables frontend to select appropriate editor UI

### Document Content API

**New Endpoint** (`internal/api/v2/document_content.go`):

**GET `/api/v2/documents/:id/content`**:
- Retrieves document content as plain text
- Local: Uses `DocumentStorage().GetDocumentContent()`
- Google: Extracts text from Google Docs API structure
- Returns: `{"content": "document text..."}`

**PUT `/api/v2/documents/:id/content`**:
- Updates document content (local workspace only)
- Authorization: Owner and contributors only
- Validates document not locked before editing
- Google workspace: Returns 501 Not Implemented
- Re-indexing via background indexer (async)
- Status codes: 200 OK, 400 Bad Request, 403 Forbidden, 404 Not Found, 423 Locked, 501 Not Implemented

### Frontend Components

**Config Service** (`web/app/services/config.ts`):
- Added `workspace_provider: "google" | "local"` property
- Default: `"google"`
- Loaded from `/api/v2/web/config` at startup

**Document Component** (`web/app/components/document/index.ts`):

**State Management**:
```typescript
@tracked documentContent = "";      // Textarea content
@tracked isLoadingContent = false;  // Loading state
@tracked isSavingContent = false;   // Saving state
@tracked isEditMode = false;        // Edit vs read-only
```

**Computed Properties**:
```typescript
get isLocalWorkspace() {
  return this.configSvc.config.workspace_provider === "local";
}

get isGoogleWorkspace() {
  return this.configSvc.config.workspace_provider === "google";
}
```

**Actions**:
- `enterEditMode()` - Load content, show editor
- `saveContent()` - PUT to `/api/v2/documents/:id/content`
- `discardChanges()` - Reset and return to read-only
- `navigateToDocument()` - Open in new tab (Google only)

### Template Structure

```hbs
{{#if this.isGoogleWorkspace}}
  {{! Google Docs iframe embed }}
  <iframe src={{googleDocUrl}} />
{{else if this.isLocalWorkspace}}
  {{#if this.isEditMode}}
    {{! Text editor with save/discard buttons }}
    <textarea>{{this.documentContent}}</textarea>
    <button {{on "click" this.saveContent}}>Save</button>
    <button {{on "click" this.discardChanges}}>Discard</button>
  {{else}}
    {{! Read-only view with edit button }}
    <pre>{{this.documentContent}}</pre>
    <button {{on "click" this.enterEditMode}}>Edit Document</button>
  {{/if}}
{{/if}}
```

## User Experience

### Google Workspace
- Document embedded in iframe
- Editing happens in Google Docs
- "Open in New Tab" button for full Google Docs experience

### Local Workspace
- **Read Mode**: Pre-formatted text display with "Edit Document" button
- **Edit Mode**: Large textarea with "Save Changes" and "Discard Changes" buttons
- Loading/saving states with visual feedback
- Flash messages for success/error notifications
- Navigation to dashboard on discard

## Security

- Authorization checks: Owner and contributors only
- Document lock validation before editing
- Google workspace editing disabled (read-only via iframe)
- Session-based authentication required

## Implementation Status

✅ Backend workspace detection  
✅ Document content GET/PUT endpoints  
✅ Frontend config service integration  
✅ Smart document component (Google/local)  
✅ Text editor UI for local workspace  
✅ Authorization and locking checks  
✅ Error handling and user feedback  

## References

- Source: `DOCUMENT_EDITOR_IMPLEMENTATION.md`
- Related: `LOCAL_WORKSPACE_SETUP_SUMMARY.md`, `DOCUMENT_CONTENT_API_VALIDATION_SUMMARY.md`
