# Using Shared Test Selectors

## Quick Start

Instead of defining selectors in your test file:

```typescript
// ❌ DON'T DO THIS
const FLASH_MESSAGE_SELECTOR = "[data-test-flash-notification]";
const SEARCH_INPUT_SELECTOR = "[data-test-global-search-input]";
const USER_MENU_TOGGLE_SELECTOR = "[data-test-user-menu-toggle]";
```

Import them from the shared selectors file:

```typescript
// ✅ DO THIS
import {
  FLASH_MESSAGE,
  SEARCH_INPUT,
  USER_MENU_TOGGLE,
} from "hermes/tests/helpers/selectors";
```

## Available Selectors

All selectors are exported from `tests/helpers/selectors.ts`. Here are the most commonly used:

### Common UI Elements
```typescript
import {
  FLASH_MESSAGE,       // Flash notifications
  TOOLTIP,             // Tooltips
  POPOVER,            // Generic popovers
} from "hermes/tests/helpers/selectors";
```

### Search
```typescript
import {
  SEARCH_INPUT,
  SEARCH_POPOVER,
  SEARCH_POPOVER_LINK,
  KEYBOARD_SHORTCUT,
} from "hermes/tests/helpers/selectors";
```

### Dropdowns and Selects
```typescript
import {
  TOGGLE_SELECT,
  TOGGLE_BUTTON,
  TOGGLE_ACTION,
  LINK_TO,
  FILTER_INPUT,
  LOADED_CONTENT,
} from "hermes/tests/helpers/selectors";
```

### Document Fields
```typescript
import {
  DOCUMENT_TITLE,
  DOCUMENT_SUMMARY,
  DOCUMENT_CONTRIBUTORS,
  DOCUMENT_APPROVERS,
} from "hermes/tests/helpers/selectors";
```

### Product Selection
```typescript
import {
  PRODUCT_SELECT,
  PRODUCT_VALUE,
  PRODUCT_SELECT_ITEM,
} from "hermes/tests/helpers/selectors";
```

### People Selection
```typescript
import {
  PEOPLE_SELECT_INPUT,
  PEOPLE_SELECT_OPTION,
  PEOPLE_SELECT_REMOVE_BUTTON,
} from "hermes/tests/helpers/selectors";
```

### Editable Fields
```typescript
import {
  EDITABLE_FIELD_READ_VALUE,
  EDITABLE_FIELD_SAVE_BUTTON,
} from "hermes/tests/helpers/selectors";
```

### Custom Fields
```typescript
import {
  CUSTOM_STRING_FIELD,
  CUSTOM_PEOPLE_FIELD,
} from "hermes/tests/helpers/selectors";
```

### Related Resources
```typescript
import {
  RELATED_DOCUMENT_OPTION,
  ADD_RELATED_RESOURCES_SEARCH_INPUT,
  NO_RESOURCES_FOUND,
  ADD_RESOURCE_MODAL,
  EXTERNAL_RESOURCE_TITLE_INPUT,
} from "hermes/tests/helpers/selectors";
```

### Draft Visibility
```typescript
import {
  DRAFT_VISIBILITY_DROPDOWN,
  DRAFT_VISIBILITY_TOGGLE,
  DRAFT_VISIBILITY_READ_ONLY,
  DRAFT_VISIBILITY_OPTION,
} from "hermes/tests/helpers/selectors";
```

### Sidebar Actions
```typescript
import {
  SIDEBAR_COPY_URL_BUTTON,
  SIDEBAR_PUBLISH_FOR_REVIEW_BUTTON,
  SIDEBAR_FOOTER_PRIMARY_BUTTON_READ_ONLY,
  SIDEBAR_FOOTER_SECONDARY_DROPDOWN_BUTTON,
  SIDEBAR_FOOTER_OVERFLOW_MENU,
} from "hermes/tests/helpers/selectors";
```

### Common Buttons
```typescript
import {
  APPROVE_BUTTON,
  DELETE_BUTTON,
  DOCUMENT_MODAL_PRIMARY_BUTTON,
} from "hermes/tests/helpers/selectors";
```

### Modals
```typescript
import {
  DELETE_MODAL,
  PUBLISH_FOR_REVIEW_MODAL,
  DOC_PUBLISHED_MODAL,
  TRANSFER_OWNERSHIP_MODAL,
  OWNERSHIP_TRANSFERRED_MODAL,
} from "hermes/tests/helpers/selectors";
```

### User Menu
```typescript
import {
  USER_MENU_TOGGLE,
} from "hermes/tests/helpers/selectors";
```

## Example: Before and After

### Before (Duplicate Selectors)
```typescript
import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";

const SEARCH_INPUT_SELECTOR = "[data-test-global-search-input]";
const SEARCH_POPOVER_SELECTOR = ".search-popover";
const KEYBOARD_SHORTCUT_SELECTOR = ".global-search-shortcut-affordance";

module("Integration | Component | header/search", function (hooks) {
  setupRenderingTest(hooks);

  test("it shows the search input", async function (assert) {
    await render(hbs`<Header::Search />`);
    
    assert.dom(SEARCH_INPUT_SELECTOR).exists();
    assert.dom(KEYBOARD_SHORTCUT_SELECTOR).exists();
    
    await fillIn(SEARCH_INPUT_SELECTOR, "test");
    assert.dom(SEARCH_POPOVER_SELECTOR).exists();
  });
});
```

### After (Shared Selectors)
```typescript
import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { click, fillIn, render } from "@ember/test-helpers";
import { hbs } from "ember-cli-htmlbars";
import {
  SEARCH_INPUT,
  SEARCH_POPOVER,
  KEYBOARD_SHORTCUT,
} from "hermes/tests/helpers/selectors";

module("Integration | Component | header/search", function (hooks) {
  setupRenderingTest(hooks);

  test("it shows the search input", async function (assert) {
    await render(hbs`<Header::Search />`);
    
    assert.dom(SEARCH_INPUT).exists();
    assert.dom(KEYBOARD_SHORTCUT).exists();
    
    await fillIn(SEARCH_INPUT, "test");
    assert.dom(SEARCH_POPOVER).exists();
  });
});
```

**Benefits**:
- 3 fewer lines (removed const declarations)
- Cleaner test file
- Selectors maintained in one place
- Consistent naming across tests

## Adding New Selectors

When you need a selector that doesn't exist in the shared file:

1. Check if it's specific to your component or widely used
2. If widely used (appears in 3+ test files), add it to `tests/helpers/selectors.ts`
3. Group it logically with similar selectors
4. Add a comment describing what it selects
5. Export it

Example:
```typescript
// In tests/helpers/selectors.ts

// Project-related selectors
export const PROJECT_HIT = "[data-test-project-hit]";
export const PROJECT_TILE = "[data-test-project-tile]";
export const PROJECT_STATUS = "[data-test-project-status]";
```

## Migration Strategy

When refactoring an existing test file:

1. Find all `const SOMETHING_SELECTOR = "[data-test-...]"` declarations
2. Check if they exist in shared selectors
3. If yes, import them and remove the const declarations
4. If no and they're widely used, add to shared selectors first
5. Update all references in the file
6. Run tests to verify

## See Also

- [TEST_IMPROVEMENTS_SUMMARY_2025_10_06.md](./TEST_IMPROVEMENTS_SUMMARY_2025_10_06.md) - Results of applying this pattern
- [HERMES_TESTING_PATTERNS.md](./HERMES_TESTING_PATTERNS.md) - General testing patterns
- [QUICK_START_CHECKLIST.md](./QUICK_START_CHECKLIST.md) - Getting started with testing
