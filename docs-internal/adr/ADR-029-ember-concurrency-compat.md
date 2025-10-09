---
id: ADR-029
title: Ember Concurrency Compatibility
date: 2025-10-08
type: ADR
subtype: Dependency Decision
status: Accepted
tags: [ember, dependencies, concurrency, compatibility, upgrade]
related:
  - ADR-006
  - RFC-034
---

# Ember Concurrency Compatibility

## Context

`ember-power-select` 8.x requires `ember-concurrency` 3.x and imports from:
```javascript
import { buildTask } from 'ember-concurrency/async-arrow-runtime';
```

However, `ember-concurrency` 3.x does NOT export `async-arrow-runtime` at root level - it's a private module at `addon/-private/async-arrow-runtime.js`.

**Root Cause**:
- `ember-power-select` 8.11.0 has precompiled dist files with hard-coded import paths
- `ember-concurrency` 3.1.1 doesn't expose `async-arrow-runtime` as public export
- Ember's module resolution doesn't respect webpack aliases
- Downgrading to `ember-power-select` 7.x causes SASS import errors

## Decision

Use `ember-power-select` 8.x with `ember-concurrency` 2.x (intentional version mismatch).

```bash
yarn up ember-power-select@^8.11.0 ember-concurrency@^2.3.7
```

**Rationale**:
- Creates version mismatch warning but works in practice
- `async-arrow-runtime` import only used for advanced features
- Basic dropdown functionality (what Hermes needs) doesn't require it
- Temporary workaround until upstream fixes export path

## Consequences

### Positive
- ✅ Dropdowns work correctly
- ✅ No build errors
- ✅ Compatible with Ember 6.x
- ✅ Quick fix unblocks development

### Negative
- ❌ Version mismatch warning in console
- ❌ Potential issues if using advanced `ember-power-select` features
- ❌ Technical debt (not a proper long-term solution)
- ❌ May break on future `ember-power-select` updates

## Alternatives Considered

1. **Upgrade ember-concurrency to 3.x**
   - ❌ Module resolution fails (async-arrow-runtime not exported)
   
2. **Manual module shim**
   - ❌ Created `node_modules/ember-concurrency/async-arrow-runtime.js`
   - ❌ Doesn't affect Ember addon module resolution
   
3. **Webpack alias in ember-cli-build.js**
   - ❌ Doesn't affect Ember's addon resolution system
   
4. **Patch ember-power-select dist file**
   - ❌ Lost on `yarn install`, requires automation
   
5. **Downgrade to ember-power-select 7.x**
   - ❌ SASS import errors with Ember 6.x
   
6. **Skip dropdowns temporarily**
   - ❌ Blocks essential document creation functionality

## Long-Term Solutions

1. **Wait for upstream fix**: `ember-power-select` fixes export path
2. **Use patch-package**: Automatically patch on install
   ```bash
   npm install -g patch-package
   npx patch-package ember-power-select
   ```
3. **Fork and fix**: Maintain our own fork
4. **Different dropdown library**: Switch to alternative component

## Verification

✅ Dropdowns render correctly  
✅ Product/area selection works  
✅ Document creation functional  
✅ No runtime errors  
⚠️ Console shows version mismatch warning (expected)  

## Implementation

**Package Versions**:
- `ember-power-select`: ^8.11.0
- `ember-concurrency`: ^2.3.7

**Impact**:
- All dropdown components functional
- Document creation flow working
- Project selection working

## Future Work

- Monitor `ember-power-select` releases for proper fix
- Consider implementing `patch-package` automation
- Evaluate alternative dropdown libraries
- Document workaround for team awareness

## References

- Source: `EMBER_CONCURRENCY_COMPATIBILITY_ISSUE.md`
- Related: `ANIMATED_COMPONENTS_FIX_2025_10_08.md`, `EMBER_UPGRADE_STRATEGY.md`
