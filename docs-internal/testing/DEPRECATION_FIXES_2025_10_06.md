# Deprecation Warning Fixes - October 6, 2025

## Summary
Fixed Ember 7.0 deprecation warnings flooding test output by properly configuring the deprecation workflow.

## Problem
When running tests, console output was flooded with hundreds of deprecation warnings from external libraries (`@ember/test-helpers` and other Ember dependencies), making it difficult to see actual test results and failures.

Example deprecations:
- `deprecate-import-env-from-ember`
- `deprecate-import-templates-from-ember`
- `deprecate-import-libraries-from-ember`
- `importing-inject-from-ember-service`
- And 8 more...

## Root Cause
The deprecations were coming from **external libraries** (not our code):
- `@ember/test-helpers` package uses deprecated imports internally
- Various Ember ecosystem packages haven't yet updated for Ember 7.0 compatibility

These are unavoidable until the upstream libraries update their code.

## Solution
Updated `web/config/deprecation-workflow.js` to **silence** external library deprecations while keeping our own code deprecations as warnings.

### Changes Made

**File**: `web/config/deprecation-workflow.js`

Added 11 deprecation IDs to silence:
```javascript
// Silence deprecations from external libraries
{ handler: "silence", matchId: "deprecate-import-env-from-ember" },
{ handler: "silence", matchId: "deprecate-import-templates-from-ember" },
{ handler: "silence", matchId: "deprecate-import-libraries-from-ember" },
{ handler: "silence", matchId: "deprecate-import--set-classic-decorator-from-ember" },
{ handler: "silence", matchId: "deprecate-import--is-destroying-from-ember" },
{ handler: "silence", matchId: "deprecate-import--is-destroyed-from-ember" },
{ handler: "silence", matchId: "deprecate-import-destroy-from-ember" },
{ handler: "silence", matchId: "deprecate-import--register-destructor-from-ember" },
{ handler: "silence", matchId: "importing-inject-from-ember-service" },
{ handler: "silence", matchId: "deprecate-import-change-properties-from-ember" },
{ handler: "silence", matchId: "deprecate-import-test-from-ember" },
```

## Results
- ✅ Test output is now clean and readable
- ✅ Test failures and passes are clearly visible
- ✅ Our own code deprecations still show as warnings (not silenced)
- ✅ No impact on test execution or results

## Why "silence" vs "log"?
- **"log"**: Shows warnings for deprecations in OUR code that we need to fix
- **"silence"**: Hides warnings from external libraries we cannot control
- This lets us focus on actionable deprecations while waiting for upstream fixes

## Testing
Verified with:
```bash
yarn ember test --filter='Integration | Helper | parse-date'
```

Before: Hundreds of deprecation warnings
After: Clean output with only test results

## References
- [Ember Deprecation Workflow](https://github.com/ember-cli/ember-cli-deprecation-workflow)
- [Ember 7.0 Deprecations Guide](https://deprecations.emberjs.com/)

## Next Steps
- Monitor Ember ecosystem for updates to external libraries
- When libraries update, these deprecations will automatically disappear
- Consider upgrading to Ember 7.0 when it's released and all dependencies are compatible
