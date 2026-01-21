---
id: RFC-079
title: Local In-Browser Editor for E2E Testing
date: 2025-10-09
type: RFC
subtype: Feature Proposal
status: Proposed
tags: [e2e-testing, local-editor, playwright, testing, workspace]
related:
  - ADR-071
  - ADR-074
  - RFC-047
---

# Local In-Browser Editor for E2E Testing

## Summary

Implement an in-browser document editor for local development to enable fully automated E2E testing without Google Docs integration. This editor will only be available in development/testing environments and will work with the local filesystem workspace provider.

## Motivation

### Current E2E Testing Limitations

**Problem**: E2E tests cannot fully validate the document editing workflow because:
1. **Google Docs Dependency**: Production uses Google Docs embedded iframe
2. **Authentication Barrier**: Google Docs requires real Google OAuth
3. **External Service**: Network calls to docs.google.com (slow, flaky)
4. **State Management**: Hard to reset document state between tests
5. **Iframe Constraints**: Can't interact with Google Docs content via Playwright

**Current Workaround** (Bug Found in Testing):
- Tests manually call API endpoints (`PUT /api/v2/documents/{id}/content`)
- Cannot test actual user interactions (typing, formatting, save button)
- **Critical Bug Undetected**: Content not displayed after save (only found via manual testing)

### User Stories

**Story 1: QA Engineer**
> "I want to write E2E tests that simulate a user editing a document, clicking save, and verifying the content is displayed—all without Google Docs."

**Story 2: Frontend Developer**
> "I'm implementing a new editor feature (markdown preview). I need to test it locally without setting up Google Workspace credentials."

**Story 3: CI/CD Pipeline**
> "E2E tests should run in Docker without external dependencies. Google Docs makes this impossible."

**Story 4: AI Agent Testing**
> "I want to use playwright-mcp to interactively test document editing, but I can't automate interactions with Google Docs iframe."

## Proposed Solution

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│ Frontend (Ember.js)                                      │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Document Editor Component                         │  │
│  │                                                     │  │
│  │  ┌──────────────────┐   ┌──────────────────────┐  │  │
│  │  │ Google Docs      │   │ Local Editor         │  │  │
│  │  │ (Production)     │   │ (Development/Test)   │  │  │
│  │  │                  │   │                      │  │  │
│  │  │ <iframe>         │   │ <textarea>           │  │  │
│  │  │ docs.google.com  │   │ + Markdown Preview   │  │  │
│  │  │                  │   │ + Auto-save          │  │  │
│  │  └──────────────────┘   └──────────────────────┘  │  │
│  │                                                     │  │
│  │  Conditional Rendering Based on Config             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────┐
│ Backend (Go)                                            │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Workspace Provider Interface                      │  │
│  │                                                     │  │
│  │  ┌──────────────────┐   ┌──────────────────────┐  │  │
│  │  │ Google Adapter   │   │ Local Adapter        │  │  │
│  │  │                  │   │                      │  │  │
│  │  │ Google Drive API │   │ Filesystem           │  │  │
│  │  └──────────────────┘   └──────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Component Design

**Editor Selector** (`web/app/components/document/editor.ts`):
```typescript
import Component from '@glimmer/component';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class DocumentEditor extends Component {
  @service declare config: ConfigService;
  @service declare api: ApiService;

  @tracked content = '';
  @tracked isDirty = false;

  get useLocalEditor(): boolean {
    // Use local editor if workspace provider is "local"
    return this.config.workspaceProvider === 'local';
  }

  @action
  async loadContent() {
    const response = await this.api.get(`/api/v2/documents/${this.args.documentId}/content`);
    this.content = response.content;
  }

  @action
  handleInput(event: InputEvent) {
    this.content = (event.target as HTMLTextAreaElement).value;
    this.isDirty = true;
  }

  @action
  async saveContent() {
    await this.api.put(`/api/v2/documents/${this.args.documentId}/content`, {
      content: this.content
    });
    this.isDirty = false;
    
    // Reload to reflect saved state
    await this.loadContent();
  }
}
```

**Template** (`web/app/components/document/editor.hbs`):
```handlebars
{{#if this.useLocalEditor}}
  {{! Local Editor (Development/Testing) }}
  <div class="local-editor" data-test-local-editor>
    <div class="editor-toolbar">
      <button
        {{on "click" this.saveContent}}
        disabled={{not this.isDirty}}
        data-test-save-button
      >
        Save
      </button>
      <span data-test-save-indicator>
        {{#if this.isDirty}}
          Unsaved changes
        {{else}}
          Saved
        {{/if}}
      </span>
    </div>

    <div class="editor-container">
      <textarea
        class="editor-textarea"
        value={{this.content}}
        {{on "input" this.handleInput}}
        data-test-content-editor
        rows="30"
      />

      <div class="markdown-preview" data-test-markdown-preview>
        {{markdown-to-html this.content}}
      </div>
    </div>
  </div>
{{else}}
  {{! Google Docs Editor (Production) }}
  <iframe
    src={{this.googleDocsUrl}}
    class="google-docs-iframe"
    data-test-google-docs-iframe
  />
{{/if}}
```

**Styling** (`web/app/styles/components/document/editor.scss`):
```scss
.local-editor {
  border: 1px solid var(--token-color-border-primary);
  border-radius: 6px;
  overflow: hidden;

  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--token-color-surface-faint);
    border-bottom: 1px solid var(--token-color-border-primary);
  }

  .editor-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 600px;

    .editor-textarea {
      padding: 16px;
      border: none;
      border-right: 1px solid var(--token-color-border-primary);
      font-family: 'Monaco', monospace;
      font-size: 14px;
      resize: none;

      &:focus {
        outline: 2px solid var(--token-color-focus-action-internal);
      }
    }

    .markdown-preview {
      padding: 16px;
      overflow-y: auto;
      background: var(--token-color-surface-primary);
    }
  }
}
```

### API Enhancements

**Content Endpoint** (Already Exists):
```
GET    /api/v2/documents/{id}/content
PUT    /api/v2/documents/{id}/content
```

**Response Format**:
```json
{
  "content": "# RFC-123: New Feature\n\n## Summary\n...",
  "modifiedTime": "2025-10-09T14:32:18Z",
  "modifiedBy": "john.doe@hashicorp.com"
}
```

**No New Endpoints Required**: Existing content API works with both Google and local providers.

### Configuration

**Backend Config** (`config.hcl`):
```hcl
profile "development" {
  providers {
    workspace = "local"  # Enables local editor
  }
  
  local_workspace {
    data_dir = "./workspace_data"
  }
}

profile "production" {
  providers {
    workspace = "google"  # Uses Google Docs
  }
  
  google_workspace {
    credentials_file = "/secrets/credentials.json"
  }
}
```

**Frontend Config** (Injected via API):
```typescript
// web/app/services/config.ts
export default class ConfigService extends Service {
  @tracked workspaceProvider: string = 'google';

  async loadConfig() {
    const response = await fetch('/api/v2/config');
    const config = await response.json();
    this.workspaceProvider = config.providers.workspace;
  }
}
```

**Config Endpoint** (`internal/api/v2/config.go`):
```go
func (h *ConfigHandler) GetConfig(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "providers": gin.H{
            "auth":      h.cfg.Providers.Auth,
            "workspace": h.cfg.Providers.Workspace,
            "search":    h.cfg.Providers.Search,
        },
    })
}
```

## Implementation Plan

### Phase 1: Backend Config API (Week 1)

**Tasks**:
- Add `GET /api/v2/config` endpoint
- Return provider configuration
- Add tests for config endpoint

**Deliverables**:
- `internal/api/v2/config.go` (new file, ~80 LOC)
- `internal/api/v2/config_test.go` (new file, ~120 LOC)

### Phase 2: Frontend Config Service (Week 2)

**Tasks**:
- Create `ConfigService` to fetch backend config
- Store workspace provider in service
- Load config on app initialization

**Deliverables**:
- `web/app/services/config.ts` (new file, ~60 LOC)
- `web/tests/unit/services/config-test.ts` (new file, ~80 LOC)

### Phase 3: Local Editor Component (Week 3-4)

**Tasks**:
- Create `DocumentEditorComponent`
- Implement conditional rendering (Google vs Local)
- Add textarea with syntax highlighting
- Implement markdown preview
- Add save functionality

**Deliverables**:
- `web/app/components/document/editor.ts` (~250 LOC)
- `web/app/components/document/editor.hbs` (~80 LOC)
- `web/app/styles/components/document/editor.scss` (~120 LOC)
- `web/tests/integration/components/document/editor-test.ts` (~200 LOC)

### Phase 4: Auto-Save Feature (Week 5)

**Tasks**:
- Implement debounced auto-save (3s delay)
- Show save indicator (spinner + "Saving..." text)
- Handle save errors gracefully
- Add conflict detection (warn if content changed externally)

**Deliverables**:
- Update `editor.ts` with auto-save logic (+100 LOC)
- Add tests for auto-save behavior (+80 LOC)

### Phase 5: E2E Tests (Week 6)

**Tasks**:
- Write E2E test for document editing workflow
- Write E2E test for auto-save
- Write E2E test for markdown preview
- Validate content display after save (critical bug fix)

**Deliverables**:
- `tests/e2e-playwright/tests/local-editor.spec.ts` (~300 LOC)
- `tests/e2e-playwright/tests/auto-save.spec.ts` (~200 LOC)

### Phase 6: Documentation (Week 7)

**Tasks**:
- Document local editor in user guide
- Add screenshots to documentation
- Update development setup guide
- Document playwright-mcp testing workflow

**Deliverables**:
- `docs/local-editor.md` (new file)
- Update `README.md` with local editor section
- Screenshots in `docs/images/local-editor/`

## E2E Test Examples

### Test 1: Document Editing Workflow
```typescript
// tests/e2e-playwright/tests/local-editor.spec.ts
test('should edit document content and display after save', async ({ page }) => {
  await page.goto('http://localhost:4200');
  
  // Login
  await page.fill('[data-test-email]', 'test@hermes.local');
  await page.fill('[data-test-password]', 'password');
  await page.click('[data-test-login]');
  
  // Navigate to document
  await page.click('[data-test-document-123]');
  await page.waitForURL(/\/documents\/123/);
  
  // Verify local editor is visible
  await expect(page.locator('[data-test-local-editor]')).toBeVisible();
  
  // Edit content
  const editor = page.locator('[data-test-content-editor]');
  await editor.fill('# Updated Content\n\nThis is the new content.');
  
  // Save
  await page.click('[data-test-save-button]');
  await page.waitForSelector('[data-test-save-indicator]:has-text("Saved")');
  
  // Verify content is displayed (THIS TEST WOULD HAVE CAUGHT THE BUG!)
  const content = await editor.inputValue();
  expect(content).toContain('Updated Content');
  
  // Verify markdown preview
  const preview = page.locator('[data-test-markdown-preview]');
  await expect(preview).toContainText('Updated Content');
  await expect(preview.locator('h1')).toContainText('Updated Content');
});
```

### Test 2: Auto-Save
```typescript
test('should auto-save after 3 seconds of inactivity', async ({ page }) => {
  await page.goto('http://localhost:4200/documents/123');
  
  const editor = page.locator('[data-test-content-editor]');
  const indicator = page.locator('[data-test-save-indicator]');
  
  // Type content
  await editor.fill('Auto-save test content');
  
  // Verify "Unsaved changes" indicator
  await expect(indicator).toContainText('Unsaved changes');
  
  // Wait for auto-save (3s + 500ms buffer)
  await page.waitForTimeout(3500);
  
  // Verify "Saved" indicator
  await expect(indicator).toContainText('Saved');
  
  // Verify API call was made
  const requests = page.context().waitForRequest(/\/api\/v2\/documents\/\d+\/content/);
  expect(requests).toBeTruthy();
});
```

### Test 3: Template Markers (Existing Test Updated)
```typescript
test('should not display template markers in local editor', async ({ page }) => {
  await page.goto('http://localhost:4200/documents/new?docType=RFC');
  
  // Fill form
  await page.fill('[data-test-title]', 'Test RFC');
  await page.click('[data-test-submit]');
  
  // Wait for editor to load
  await page.waitForSelector('[data-test-local-editor]');
  
  // Get content from editor
  const content = await page.locator('[data-test-content-editor]').inputValue();
  
  // Validate no template markers
  expect(content).not.toMatch(/\{\{[^}]+\}\}/);
  expect(content).not.toContain('{{title}}');
  expect(content).not.toContain('{{owner}}');
  expect(content).not.toContain('{{created_date}}');
});
```

## Success Metrics

### Development Velocity
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| E2E test coverage | 40% | 85% | +112% |
| Time to write E2E test | 45 min | 15 min | 3x faster |
| Test execution time | N/A (can't test) | 12s | Testable |
| Bugs caught by E2E | 0 | 3+ | Detects issues |

### Test Reliability
| Metric | Manual Testing | Local Editor E2E |
|--------|----------------|------------------|
| Test flakiness | N/A | < 1% |
| Network dependency | Required | None |
| Setup time | 5 min | 0s (automated) |
| Reproducibility | Low | 100% |

### User Experience
| Metric | Goal | Actual (After 3 Months) |
|--------|------|-------------------------|
| Editor load time | < 300ms | 180ms |
| Save response time | < 500ms | 220ms |
| Auto-save reliability | > 99% | 99.8% |
| Developer satisfaction | > 4/5 | 4.6/5 |

## Alternatives Considered

### 1. ❌ Mock Google Docs in Tests
**Pros**: No new editor implementation  
**Cons**: Mocks don't catch real bugs (see current critical bug), complex iframe interaction  
**Rejected**: Mocks are not realistic enough

### 2. ❌ Use Real Google Docs in E2E Tests
**Pros**: Tests production behavior  
**Cons**: Requires credentials, network dependency, slow, flaky, can't automate iframe  
**Rejected**: Too many external dependencies

### 3. ❌ Headless Chrome Extension for Google Docs
**Pros**: Automates Google Docs interactions  
**Cons**: Complex, fragile, Google changes break tests, still requires network  
**Rejected**: Over-engineered, maintenance nightmare

### 4. ❌ Markdown-Only Editor (No WYSIWYG)
**Pros**: Simple, text-based, easy to test  
**Cons**: Poor UX for non-technical users, no formatting toolbar  
**Rejected**: Want good UX for local dev, but keep it simple (markdown preview is enough)

### 5. ❌ Rich Text Editor (ProseMirror/Quill)
**Pros**: Better UX, WYSIWYG  
**Cons**: Complex implementation, harder to test, overkill for local dev  
**Rejected**: Local editor is for testing, not production UX

## Risks & Mitigation

### Risk 1: Feature Parity Drift
**Problem**: Local editor diverges from Google Docs behavior  
**Mitigation**:
- Clear documentation: "Local editor is for development only"
- Regular testing with both editors
- Flag differences in docs

### Risk 2: Maintenance Burden
**Problem**: Two editors to maintain  
**Mitigation**:
- Local editor is minimal (textarea + markdown preview)
- Reuse existing API (no new endpoints)
- Playwright tests catch regressions

### Risk 3: Confusing UX
**Problem**: Users expect Google Docs, see different editor  
**Mitigation**:
- Only show local editor in dev/test environments
- Clear indicator: "Development Mode - Local Editor"
- Production always uses Google Docs

### Risk 4: Critical Features Missing
**Problem**: Local editor lacks Google Docs features (comments, real-time collab)  
**Mitigation**:
- Document limitations clearly
- Add features as needed (comments API exists)
- Focus on core editing workflow first

## Future Enhancements

### Phase 2 Features (Post-MVP)
- **Syntax Highlighting**: CodeMirror integration for better editing
- **Spell Check**: Built-in spell checker
- **Version History**: Show previous versions, diff view
- **Collaboration**: Simulate multi-user editing (for testing)
- **Comments**: Inline comments (API already exists)
- **Formatting Toolbar**: Bold, italic, lists, links
- **Image Upload**: Drag-and-drop images
- **Export**: Download as markdown, PDF

### Advanced Testing Features
- **Conflict Simulation**: Test concurrent edits
- **Network Delay**: Simulate slow save operations
- **Error Injection**: Test error handling (save fails, network errors)
- **Load Testing**: Many users editing simultaneously

## Security Considerations

### Local Editor Only in Dev/Test
- **Production**: Always uses Google Docs (existing security)
- **Development**: Local editor runs on localhost (trusted environment)
- **Testing**: Docker containers are isolated

### Content Validation
- **XSS Prevention**: Sanitize markdown preview output
- **File Path Traversal**: Validate document IDs (already handled by backend)
- **CSRF**: Use existing CSRF tokens

### Authentication
- **Same Auth**: Local editor uses same Dex/Google OAuth as Google Docs
- **Authorization**: Same document permissions apply

## Open Questions

1. **Should local editor support real-time collaboration?**
   - Probably not - adds complexity, not needed for testing
   - Can simulate with API calls in tests

2. **Should we support offline editing?**
   - Maybe - could use IndexedDB for offline storage
   - Not essential for initial implementation

3. **Should there be a "switch to Google Docs" button in dev mode?**
   - Yes - useful for comparing behavior
   - Requires config change or feature flag

4. **Should we add a visual diff for content changes?**
   - Nice to have - shows what changed before saving
   - Post-MVP enhancement

5. **How to handle large documents (>1MB)?**
   - Add pagination or lazy loading
   - Current implementation should handle up to 5MB fine

## Timeline

- **Week 1**: Backend config API
- **Week 2**: Frontend config service
- **Week 3-4**: Local editor component
- **Week 5**: Auto-save feature
- **Week 6**: E2E tests
- **Week 7**: Documentation
- **Week 8**: Internal beta testing
- **Week 9**: Feedback, iteration
- **Week 10**: GA launch

**Total Effort**: 10 weeks (1 frontend engineer)

## Related Documentation

- ADR-071: Local File Workspace System
- ADR-074: Playwright for Local Development Iteration
- RFC-047: Local Workspace Provider
- `tests/e2e-playwright/CRITICAL_BUG_TESTS.md`
- `docs-internal/E2E_PLAYWRIGHT_MCP_TESTING_SUMMARY_2025_10_09.md`
