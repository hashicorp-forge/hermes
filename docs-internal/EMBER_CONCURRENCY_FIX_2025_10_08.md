# Ember Concurrency Runtime Error Fix - October 8, 2025

## Issue Summary

**Error**: Console error about `ember-concurrency/async-arrow-runtime` module not found
**Impact**: Interactive elements like dropdowns were not functional despite the form rendering correctly
**Root Cause**: Missing Babel plugin configuration for ember-concurrency

## Problem Details

The application was showing a module resolution error in the browser console:
```
Module not found: ember-concurrency/async-arrow-runtime
```

This error prevented ember-concurrency tasks from working properly, which broke interactive UI elements like:
- Dropdown menus (ember-power-select components)
- Async button actions
- Background tasks

The `ember-concurrency` library requires a Babel plugin to transform async arrow function syntax into a format that works with its task system. Without this plugin, the code tries to import a runtime module that doesn't exist in the standard module resolution path.

## Investigation

1. **Verified ember-concurrency installation**: Package was correctly installed at version ^2.2.1
2. **Located the runtime file**: Found at `node_modules/ember-concurrency/addon/-private/async-arrow-runtime.js`
3. **Found the babel plugin**: Located at `node_modules/ember-concurrency/lib/babel-plugin-transform-ember-concurrency-async-tasks.js`
4. **Checked babel configuration**: Discovered the plugin was not included in `web/babel.config.js`

## Solution

Added the ember-concurrency Babel plugin to transform async arrow functions:

**File**: `/Users/jrepp/hc/hermes/web/babel.config.js`

```javascript
module.exports = {
  presets: [
    '@babel/preset-env'
  ],
  plugins: [
    // Add support for JavaScript private methods used by Ember Data 5.7.0
    '@babel/plugin-proposal-private-methods',
    // Support for private fields as well
    '@babel/plugin-proposal-private-property-in-object',
    '@babel/plugin-proposal-class-properties',
    // Transform ember-concurrency async tasks to support arrow functions
    ['ember-concurrency/lib/babel-plugin-transform-ember-concurrency-async-tasks', {
      // Enables async arrow function support for ember-concurrency tasks
      // This resolves the "ember-concurrency/async-arrow-runtime" module error
    }]
  ],
};
```

## What This Plugin Does

The babel plugin transforms ember-concurrency task definitions from:

```javascript
// Before transformation
import { task } from 'ember-concurrency';

class MyComponent {
  @task
  *myTask() {
    // task implementation
  }
}
```

Into code that properly uses the async-arrow-runtime when arrow functions are used:

```javascript
// With arrow function syntax (requires the plugin)
import { task } from 'ember-concurrency';

const myTask = task(async () => {
  // task implementation
});
```

The plugin automatically handles the transformation and injects the necessary runtime imports.

## Verification Steps

1. ✅ Added babel plugin configuration
2. ✅ Restarted Ember dev server to pick up babel config changes
3. 🔄 Testing dropdown functionality (in progress)

## Expected Outcome

After this fix:
- The `ember-concurrency/async-arrow-runtime` error should be resolved
- Dropdown menus should open and function correctly
- All ember-concurrency tasks should work properly
- Interactive elements using tasks should be responsive

## Related Files

- `/Users/jrepp/hc/hermes/web/babel.config.js` - Modified
- `/Users/jrepp/hc/hermes/web/package.json` - ember-concurrency dependency (no changes)
- Affected components using ember-concurrency:
  - `web/app/components/x/dropdown-list/index.ts`
  - `web/app/components/x/dropdown-list/item.ts`
  - `web/app/components/inputs/people-select.ts`
  - `web/app/components/header/toolbar.ts`
  - Many others (see grep results)

## Technical Notes

### Why This Was Missing

The ember-concurrency library includes the babel plugin but doesn't automatically add it to the project's babel configuration. Projects must explicitly configure it in their `babel.config.js` or `.babelrc`.

This is a common setup step that was likely overlooked during initial project setup or when ember-concurrency was added.

### Ember Build Process

The Ember CLI build process uses Babel to transpile JavaScript code. When the babel configuration changes:
1. The dev server must be restarted to pick up the new config
2. The build cache is invalidated
3. All JavaScript files are re-transpiled with the new plugin

### Performance Impact

The babel plugin adds minimal overhead:
- Runs at build time only (no runtime cost)
- Transforms are cached by Babel
- No impact on bundle size

## References

- ember-concurrency documentation: https://ember-concurrency.com/
- Babel plugin source: `node_modules/ember-concurrency/lib/babel-plugin-transform-ember-concurrency-async-tasks.js`
- Related Hermes components: 20+ files using ember-concurrency tasks

## Prompt Used

```
fix: There is an error in the console about ember-concurrency/async-arrow-runtime module not found, which is a dependency issue, but the document creation form is rendering and functional.

The dropdown didn't open. The ember-concurrency error is preventing some interactive elements from working properly. However, the form is visible and the text inputs are working. Let me take a screenshot to document the current state:
```

## AI Implementation Summary

- Investigated ember-concurrency installation and found it was properly installed
- Located the runtime file and babel plugin in node_modules
- Identified missing babel plugin configuration
- Added the plugin to `web/babel.config.js` with appropriate comments
- Restarted Ember dev server to apply changes

## Status

✅ **Fix Applied** - Babel configuration updated
🔄 **Testing In Progress** - Ember dev server rebuilding with new configuration
⏳ **Verification Pending** - Will test dropdown functionality once build completes
