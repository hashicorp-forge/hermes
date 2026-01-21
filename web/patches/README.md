# ember-concurrency Patch for ember-power-select Compatibility

## Purpose
This patch adds a public export for `async-arrow-runtime` to `ember-concurrency` version 3.1.1, enabling compatibility with `ember-power-select` 8.x.

## Problem
`ember-power-select` 8.x imports from:
```javascript
import { buildTask } from 'ember-concurrency/async-arrow-runtime';
```

However, `ember-concurrency` 3.x only provides this module at a private path:
```
ember-concurrency/addon/-private/async-arrow-runtime.js
```

This causes a runtime error: "Could not find module `ember-concurrency/async-arrow-runtime`"

## Solution
The patch creates a new file `async-arrow-runtime.js` at the root of the ember-concurrency package that re-exports the private module:

```javascript
// Re-export async-arrow-runtime from the private location
// This is needed for compatibility with ember-power-select 8.x
export { buildTask } from './addon/-private/async-arrow-runtime';
```

## Patch Application

### Automatic (via postinstall)
The patch is automatically applied after `yarn install` via the `postinstall` script in `package.json`:

```json
"scripts": {
  "postinstall": "patch-package"
}
```

### Manual Application
If needed, you can manually apply the patch:

```bash
cd web
yarn patch-package
```

## Maintenance

### When to Update This Patch
- When upgrading `ember-concurrency` to a new version
- If `ember-concurrency` officially exports `async-arrow-runtime` (patch can be removed)
- If `ember-power-select` changes its import path

### Verifying the Patch
After installation, verify the file exists:

```bash
cat node_modules/ember-concurrency/async-arrow-runtime.js
```

Should output:
```javascript
// Re-export async-arrow-runtime from the private location  
// This is needed for compatibility with ember-power-select 8.x
export { buildTask } from './addon/-private/async-arrow-runtime';
```

### Testing the Fix
The fix resolves the "power-select" dropdown rendering issue in the document creation form. Test by:

1. Start the dev server: `yarn start:with-proxy`
2. Navigate to `/new/doc?docType=RFC`
3. Verify the Product/Area dropdown renders and functions correctly
4. Check browser console for no ember-concurrency errors

## Future-Proofing

### Option 1: Wait for Upstream Fix
Monitor these issues:
- ember-concurrency: Check if they add official export in future versions
- ember-power-select: Check if they update import path

### Option 2: Alternative Dependencies
Consider these alternatives if patch becomes problematic:
- `ember-power-select-with-create` - different version line
- Custom dropdown component using Ember's built-in primitives
- HashiCorp Design System dropdown components

### Option 3: Contribute Upstream
This could be contributed as a PR to `ember-concurrency`:
- Add `async-arrow-runtime.js` export
- Update package.json to include in published files
- Document as public API for build tools

## References
- ember-concurrency: https://github.com/machty/ember-concurrency
- ember-power-select: https://github.com/cibernox/ember-power-select
- patch-package: https://github.com/ds300/patch-package

## Related Documentation
- `/docs-internal/EMBER_CONCURRENCY_COMPATIBILITY_ISSUE.md` - Full investigation
- `/docs-internal/PLAYWRIGHT_DOCUMENT_CREATION_2025_10_08.md` - Testing documentation
