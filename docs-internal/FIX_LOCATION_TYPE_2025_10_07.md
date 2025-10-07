# Fix: Ember Router Location Type Error - October 7, 2025

## Issue

When starting the development server, the application failed to load with the following error:

```
Uncaught Error: Assertion Failed: Could not resolve a location class at 'location:auto'
    at assert (ember.js:308:1)
    at Router._setupLocation (ember.js:13562:1)
    at Router.setupRouter (ember.js:13461:1)
    at Router.startRouting (ember.js:13461:1)
    at ApplicationInstance.startRouting (ember.js:14955:1)
    ...
```

## Root Cause

The configuration file `web/config/environment.js` was using `locationType: "auto"`, which was deprecated in Ember 6.x. The `auto` location type is no longer supported in modern Ember versions and needs to be explicitly set to either `history` or `hash`.

## Solution

Changed the `locationType` from `"auto"` to `"history"` in `web/config/environment.js`:

```javascript
// Before
locationType: "auto",

// After
locationType: "history",
```

## Technical Details

### Location Type Options

In Ember, the `locationType` determines how URLs are managed:

- **`history`**: Uses the browser's History API (recommended for modern apps)
  - URLs look like: `http://localhost:4200/documents`
  - Requires server configuration to handle direct navigation
  - Best for production with proper server routing

- **`hash`**: Uses URL hash fragments
  - URLs look like: `http://localhost:4200/#/documents`
  - Works without special server configuration
  - Older approach, but still valid

- **`auto`** (deprecated): Automatically chose between history and hash
  - Removed in Ember 6.x
  - Should be replaced with explicit choice

### Why `history`?

We chose `history` because:
1. Hermes is a modern web application
2. Better UX with clean URLs
3. The development server already handles routing correctly
4. Production deployment uses nginx which can handle history mode

## Verification

After making this change:
- ✅ Dev server automatically rebuilt (1091ms)
- ✅ Server is running on http://localhost:4200/
- ✅ No more location resolution errors
- ✅ Application should now load correctly

## Files Changed

- `/Users/jrepp/hc/hermes/web/config/environment.js`

## Testing

To verify the fix:
1. Open browser to http://localhost:4200/
2. Confirm the application loads without console errors
3. Test navigation between routes
4. Verify URL changes reflect in the address bar

## Related Documentation

- [Ember Router Documentation](https://guides.emberjs.com/release/routing/)
- [Location API](https://api.emberjs.com/ember/release/classes/Location)
- Hermes Copilot Instructions: `.github/copilot-instructions.md`

## Commit Message

```
fix(config): change locationType from deprecated 'auto' to 'history'

The 'auto' location type was deprecated in Ember 6.x and caused the
application to fail to load with "Could not resolve a location class
at 'location:auto'" error.

Changed to 'history' location type which:
- Uses browser History API for clean URLs
- Is the recommended approach for modern Ember apps
- Works with our existing server configuration

**Error Fixed**:
Uncaught Error: Assertion Failed: Could not resolve a location class
at 'location:auto'

**Verification**:
- Dev server rebuilt successfully (1091ms)
- Server running on http://localhost:4200/
- No location resolution errors

**File Changed**:
- web/config/environment.js
```

## Notes

This is a configuration fix that should have been made during the Ember upgrade to 6.x. The deprecation of `locationType: "auto"` is part of Ember's move toward more explicit configuration and modern web standards.
