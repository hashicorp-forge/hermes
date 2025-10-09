---
id: TODO-016
title: Fix "Create Draft" Button Google Drive Branding for Local Workspace
date: 2025-10-09
type: TODO
priority: medium
status: open
progress: 0%
tags: [frontend, ui, workspace-provider, local-workspace, branding]
related:
  - TODO-013
  - README-local-workspace.md
---

# TODO-016: Fix "Create Draft" Button Google Drive Branding for Local Workspace

## Overview

The "Create draft" button in the document creation form displays "Create draft in Google Drive" text regardless of the workspace provider being used. When using the local workspace provider (not Google Workspace), this button text is misleading and should be generic or workspace-aware.

## Issue Details

**Current Behavior**:
- Button text: "Create draft in Google Drive"
- Appears in: Document creation form (`/new/doc?docType=RFC`)
- Occurs with: All workspace providers (Google Workspace, Local Workspace)

**Expected Behavior**:
- When using **Google Workspace**: "Create draft in Google Drive" ✓
- When using **Local Workspace**: "Create draft" or "Create document"
- Button text should be workspace-aware

**Discovered During**:
- E2E test development for TODO-013 (Recently Viewed feature)
- Test file: `tests/e2e-playwright/tests/dashboard-recently-viewed.spec.ts`
- Test comment reference:
  ```typescript
  // The button text is "Create draft in Google Drive" or "Create draft"
  const publishSelectors = [
    'button:has-text("Create draft")',
    // ... other selectors
  ];
  ```

## Root Cause Analysis

### Location of Issue

**Frontend Component**: Likely in document creation form
- Path: `web/app/components/doc/` or `web/app/templates/authenticated/new/`
- Button component: Probably uses `Hds::Button` from HashiCorp Design System

**Probable Code Pattern**:
```handlebars
{{! Current (incorrect) - hardcoded text }}
<Hds::Button 
  @text="Create draft in Google Drive"
  {{on "click" this.createDocument}}
/>

{{! Should be (correct) - workspace-aware }}
<Hds::Button 
  @text={{if this.isGoogleWorkspace "Create draft in Google Drive" "Create draft"}}
  {{on "click" this.createDocument}}
/>
```

### Workspace Provider Detection

The frontend likely has access to workspace provider info via:
1. **Config Service**: `web/app/services/config.ts`
2. **API Response**: Backend may include workspace type in config or user info
3. **Feature Flag**: Check if Google Workspace features are enabled

## Implementation Plan

### 1. Locate the Button Component

**Search Strategy**:
```bash
# Find the button text in templates
grep -r "Create draft in Google Drive" web/app/

# Find document creation components
find web/app -name "*new*" -o -name "*create*" | grep -i doc

# Check for hardcoded Google Drive references
grep -r "Google Drive" web/app/components/
grep -r "Google Drive" web/app/templates/
```

### 2. Identify Workspace Provider Access

**Check Config Service**:
```typescript
// web/app/services/config.ts
export default class ConfigService extends Service {
  @tracked config?: ConfigResponse;
  
  get isGoogleWorkspace(): boolean {
    return this.config?.workspace_provider === 'google';
  }
  
  get isLocalWorkspace(): boolean {
    return this.config?.workspace_provider === 'local';
  }
}
```

**Or Check Backend Config Endpoint**:
```bash
# Test what the backend returns
curl http://localhost:8001/api/v2/config | jq '.workspace_provider'
```

### 3. Update Button Component

**Option A: Conditional Text in Template**
```handlebars
<Hds::Button 
  @text={{if this.config.isGoogleWorkspace 
    "Create draft in Google Drive" 
    "Create draft"}}
  @color="primary"
  {{on "click" this.createDocument}}
/>
```

**Option B: Computed Property in Component**
```typescript
// Component TypeScript
get createButtonText(): string {
  if (this.config.isGoogleWorkspace) {
    return "Create draft in Google Drive";
  }
  return "Create draft";
}
```

```handlebars
{{! Template }}
<Hds::Button 
  @text={{this.createButtonText}}
  @color="primary"
  {{on "click" this.createDocument}}
/>
```

**Option C: Icon-based Approach**
```handlebars
{{! Show workspace-specific icon instead of text }}
<Hds::Button 
  @text="Create draft"
  @icon={{if this.config.isGoogleWorkspace "google-drive" "document"}}
  @color="primary"
  {{on "click" this.createDocument}}
/>
```

### 4. Additional Branding to Check

Search for other Google Drive references that should be workspace-aware:
- Document page headers
- Settings/configuration pages
- Help text and tooltips
- Error messages mentioning Google Drive
- Import/export functionality

## Testing

### Manual Testing

**With Local Workspace**:
```bash
# Ensure config.hcl uses local workspace
cd testing
grep -A 5 "workspace {" config.hcl

# Start environment
docker compose up -d

# Navigate to document creation
# Browser: http://localhost:4201/new
# Click RFC template
# Verify button text is "Create draft" (not "... in Google Drive")
```

**With Google Workspace** (if available):
```bash
# Configure Google Workspace provider
# Verify button text is "Create draft in Google Drive"
```

### E2E Test Update

Update the existing test to verify workspace-aware button text:

```typescript
// tests/e2e-playwright/tests/dashboard-recently-viewed.spec.ts
async function publishDocument(page: Page): Promise<string> {
  console.log('[Document] Publishing document...');

  // Verify button text is workspace-aware
  const createButton = page.locator('button:has-text("Create draft")').first();
  await expect(createButton).toBeVisible();
  
  const buttonText = await createButton.textContent();
  console.log(`[Document] Create button text: "${buttonText}"`);
  
  // Should NOT contain "Google Drive" when using local workspace
  if (process.env.WORKSPACE_PROVIDER === 'local') {
    expect(buttonText).not.toContain('Google Drive');
  }
  
  await createButton.click();
  // ... rest of function
}
```

### Unit Test (Optional)

```typescript
// web/tests/integration/components/doc-form-test.ts
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | doc-form', function(hooks) {
  setupRenderingTest(hooks);

  test('button text is workspace-aware', async function(assert) {
    // Mock local workspace config
    this.owner.lookup('service:config').config = {
      workspace_provider: 'local'
    };

    await render(hbs`<DocForm />`);

    const button = this.element.querySelector('button');
    assert.notOk(
      button.textContent.includes('Google Drive'),
      'Button should not mention Google Drive for local workspace'
    );
  });
});
```

## Acceptance Criteria

- [ ] Located the component/template with "Create draft in Google Drive" button
- [ ] Identified how to detect workspace provider in frontend (config service)
- [ ] Updated button text to be workspace-aware:
  - Google Workspace: "Create draft in Google Drive"
  - Local Workspace: "Create draft"
- [ ] Verified change works in testing environment (local workspace)
- [ ] Verified change works in Google Workspace environment (if available)
- [ ] Updated E2E tests to verify button text is workspace-aware
- [ ] Searched for and updated any other hardcoded "Google Drive" references
- [ ] Added unit/integration tests for workspace-aware button text
- [ ] Screenshots captured showing correct button text for both providers

## Additional Considerations

### Other Workspace Providers

If Hermes supports additional workspace providers in the future (e.g., Microsoft SharePoint, Confluence), the button text should be extensible:

```typescript
get createButtonText(): string {
  switch (this.config.workspaceProvider) {
    case 'google':
      return 'Create draft in Google Drive';
    case 'microsoft':
      return 'Create draft in SharePoint';
    case 'local':
    default:
      return 'Create draft';
  }
}
```

### Internationalization (i18n)

If Hermes adds internationalization support, button text should use translation keys:

```typescript
get createButtonText(): string {
  if (this.config.isGoogleWorkspace) {
    return this.intl.t('document.create.google_drive');
  }
  return this.intl.t('document.create.default');
}
```

### User Experience

Consider adding a workspace indicator elsewhere in the UI to make it clear which provider is being used:
- Settings page showing "Workspace: Local" or "Workspace: Google Drive"
- Footer indicator
- About/Help page

## Related Issues

- **Similar Branding Issues**: Search for other hardcoded provider-specific text
- **Configuration Visibility**: Users should be able to see which workspace provider is active
- **Migration Guide**: Document for teams migrating from Google Workspace to Local Workspace

## References

- [Local Workspace Documentation](../README-local-workspace.md)
- [Google Workspace Documentation](../README-google-workspace.md)
- [Configuration Guide](../CONFIG_HCL_DOCUMENTATION.md)
- [E2E Test: Recently Viewed](../../tests/e2e-playwright/tests/dashboard-recently-viewed.spec.ts)

## Estimated Effort

- **Discovery**: 15 minutes (find component/template)
- **Implementation**: 30 minutes (update button + config check)
- **Testing**: 30 minutes (manual + E2E test update)
- **Documentation**: 15 minutes (update relevant docs)
- **Total**: ~1.5 hours

## Priority Justification

**Medium Priority** because:
- ✅ **User Confusion**: Misleading button text could confuse users
- ✅ **Brand Consistency**: Hermes should not reference Google Drive when not using it
- ⚠️ **Low Impact**: Functional behavior is correct; only text is misleading
- ⚠️ **Workaround**: Users can still create documents despite confusing text

**Would be High Priority if**:
- Marketing/launch imminent (brand consistency critical)
- Multiple user complaints received
- Legal/licensing concerns about Google branding
