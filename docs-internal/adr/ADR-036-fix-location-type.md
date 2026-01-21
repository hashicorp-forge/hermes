---
id: ADR-036
title: Fix Location Type
date: 2025-10-07
type: ADR
subtype: Configuration Decision
status: Accepted
tags: [ember, configuration, routing, location-type]
related:
  - RFC-034
---

# Fix Location Type

## Context

Development server failed to load with error:
```
Uncaught Error: Assertion Failed: Could not resolve a location class at 'location:auto'
```

**Root Cause**: `web/config/environment.js` used `locationType: "auto"`, which was deprecated and removed in Ember 6.x.

## Decision

Change `locationType` from `"auto"` to `"history"` in configuration.

```javascript
// Before
locationType: "auto",

// After
locationType: "history",
```

## Rationale

**Location Type Options**:
- **`history`**: Uses browser History API for clean URLs (`/documents`)
  - Recommended for modern apps
  - Requires server routing configuration
  - Better UX with clean URLs
  
- **`hash`**: Uses URL hash fragments (`/#/documents`)
  - Works without server configuration
  - Older approach but still valid
  
- **`auto`**: Deprecated in Ember 6.x
  - Automatically chose between history/hash
  - Must be replaced with explicit choice

**Why `history`**:
1. Hermes is a modern web application
2. Better UX with clean URLs
3. Development server handles routing correctly
4. Production deployment (nginx) supports history mode
5. Industry standard for SPAs

## Consequences

### Positive
- ✅ Application loads successfully
- ✅ Clean URLs without hash fragments
- ✅ Modern browser History API
- ✅ Ember 6.x compatible
- ✅ No location resolution errors

### Negative
- ❌ Requires server configuration for direct navigation
- ❌ Nginx/Apache must route all paths to index.html
- ❌ Slightly more complex deployment vs hash mode

## Alternatives Considered

1. **Use `hash` location type**
   - ✅ Simpler server configuration
   - ❌ Ugly URLs with hash fragments
   - ❌ Not modern best practice
   
2. **Stay with `auto`**
   - ❌ Not supported in Ember 6.x
   - ❌ Application won't load
   
3. **Custom location implementation**
   - ❌ Unnecessary complexity
   - ❌ Reinventing the wheel

## Implementation

**File Changed**: `web/config/environment.js`

**Server Requirements**:
- Development: ember-cli dev server already configured
- Production: Nginx must route all paths to `/index.html`

**Nginx Configuration** (for reference):
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Verification

✅ Dev server rebuilt successfully (1091ms)  
✅ Application loads at http://localhost:4200/  
✅ No location resolution errors  
✅ Navigation between routes works  
✅ URL changes reflect in address bar  
✅ Browser back/forward buttons work  

## Future Considerations

- Ensure production nginx configuration supports history mode
- Document deployment requirements for operations team
- Add smoke tests for routing in CI/CD

## References

- Source: `FIX_LOCATION_TYPE_2025_10_07.md`
- Ember Router Docs: https://guides.emberjs.com/release/routing/
- Related: `EMBER_UPGRADE_STRATEGY.md`
