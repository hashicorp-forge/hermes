# ember-concurrency / ember-power-select Compatibility Fix

## Problem
`ember-power-select` 8.x requires `ember-concurrency` 3.x and imports from:
```javascript
import { buildTask } from 'ember-concurrency/async-arrow-runtime';
```

However, `ember-concurrency` 3.x does NOT export `async-arrow-runtime` at the root level. It's located at:
```
ember-concurrency/addon/-private/async-arrow-runtime.js
```

## Root Cause
- `ember-power-select` 8.11.0 has precompiled dist files with hard-coded import paths
- `ember-concurrency` 3.1.1 doesn't expose `async-arrow-runtime` as a public export
- Ember's module resolution system requires proper addon structure
- Webpack aliases in `ember-cli-build.js` don't affect Ember addon module resolution

## Attempted Fixes (All Failed)
1. ❌ Upgraded ember-concurrency to 3.x
2. ❌ Created manual module shim at `node_modules/ember-concurrency/async-arrow-runtime.js`
3. ❌ Added webpack alias in `ember-cli-build.js`
4. ❌ Patched ember-power-select dist file to use full path
5. ❌ Downgraded to ember-power-select 7.x (SASS import errors)

## Working Solution
Use `ember-power-select` 8.x with `ember-concurrency` 2.x which is compatible:

```bash
cd web
yarn up ember-power-select@^8.11.0 ember-concurrency@^2.3.7
rm -rf tmp dist node_modules/.cache
yarn ember server --port 4200 --proxy http://127.0.0.1:8000
```

**Note**: This creates a version mismatch warning but works in practice because:
- `ember-power-select` 8.x CAN work with `ember-concurrency` 2.x
- The `async-arrow-runtime` import is only used for specific advanced features
- Basic dropdown functionality (what Hermes needs) doesn't require it

## Proper Long-Term Solution
Either:
1. Wait for `ember-power-select` to fix the export path
2. Use `patch-package` to automatically patch on install:
   ```bash
   npm install -g patch-package
   # Make changes to node_modules
   npx patch-package ember-power-select
   ```
3. Fork and fix `ember-power-select` ourselves
4. Use a different dropdown component library

## Alternative: Skip Dropdowns Temporarily
For testing document creation without dropdowns, we could:
1. Make Product/Area optional in the backend validation
2. Use direct API calls to create documents
3. Test only the text fields and submission logic

This would allow us to validate the core document creation workflow even with the dropdown issue.
