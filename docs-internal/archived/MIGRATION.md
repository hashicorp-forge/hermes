# Hermes Frontend & Backend Modernization Migration Plan

**Project**: Hermes (hashicorp-forge/hermes)  
**Branch**: `jrepp/dev-tidy`
**Status**: In Progress

## 🎯 Migration Objectives

- **Primary**: Update Go modules to 1.25.0 and latest stable versions
- **Secondary**: Modernize web frontend dependencies and toolchain
- **Outcome**: Secure, maintainable, and performant development environment on latest stable runtime and packages

---


## 🚀 Migration Plan - Bottom-Up Approach

### **Phase 1: Foundation Stabilization**
*Goal: Fix blocking build issues and establish stable foundation*

#### **Commit 1: `fix: resolve css build pipeline issues`**
**Estimated Time**: 2-3 hours  
**Risk Level**: 🟡 Medium

**Tasks:**
- [ ] Identify CleanCSS version causing `util.isRegExp` error  
- [ ] Update `ember-cli-postcss` to latest compatible version
- [ ] Replace deprecated CSS minification plugins
- [ ] Test CSS compilation pipeline

**Validation:**
```bash
yarn test:build  # Must succeed
yarn test:lint   # Must pass
```

**Files to modify:**
- `web/package.json` (CSS processing dependencies)
- Potentially `web/ember-cli-build.js`

#### **Commit 2: `fix: stabilize core ember toolchain`**
**Estimated Time**: 1-2 hours  
**Risk Level**: 🟢 Low

**Tasks:**
- [ ] Verify `ember-cli-babel@^7.26.11` full compatibility
- [ ] Update `ember-cli-typescript` if needed
- [ ] Add missing TypeScript declarations
- [ ] Ensure Ember CLI 3.28.6 stability

**Validation:**
```bash
yarn test:types  # Must pass
ember --version  # Verify CLI working
```

#### **Commit 3: `test: add migration test hooks`**
**Estimated Time**: 1 hour  
**Risk Level**: 🟢 Low

**Tasks:**
- [ ] Add `test:types` script for TypeScript checking
- [ ] Add `test:build` script for build validation  
- [ ] Add `test:lint` separate from full test suite
- [ ] Add `validate` script combining all checks

**Scripts to add:**
```json
{
  "scripts": {
    "test:build": "ember build --environment=production",
    "test:types": "tsc --noEmit",  
    "test:lint": "eslint . --cache",
    "test:deps": "yarn check",
    "validate": "yarn test:deps && yarn test:types && yarn test:lint && yarn test:build"
  }
}
```

### **Phase 2: Test Infrastructure Modernization**
*Goal: Restore test functionality and development confidence*

#### **Commit 4: `fix: resolve test-helpers compatibility issues`** 
**Estimated Time**: 2-4 hours  
**Risk Level**: 🟡 Medium

**Tasks:**
- [ ] Analysis: Compare @ember/test-helpers v2.6.0 vs v5.3.0 APIs
- [ ] Decision: Downgrade to compatible version OR update test contexts
- [ ] Fix `element` and `clearRender` property access in tests
- [ ] Ensure ember-qunit v9.0.4 compatibility

**Test files to fix:**
- `tests/acceptance/authenticated/new/doc-test.ts:241`
- `tests/integration/components/floating-u-i/content-test.ts:139,203`  
- `tests/integration/components/x/dropdown-list/index-test.ts:109`

**Validation:**
```bash
yarn test:ember  # Must pass
yarn test        # Full test suite
```

#### **Commit 5: `fix: update test type declarations`**
**Estimated Time**: 1-2 hours  
**Risk Level**: 🟢 Low

**Tasks:**
- [ ] Update test context interfaces
- [ ] Add missing type declarations
- [ ] Ensure QUnit/ember-qunit type compatibility
- [ ] Fix implicit 'any' type issues

### **Phase 3: API Layer Updates**
*Goal: Ensure runtime API compatibility*

#### **Commit 6: `fix: resolve algoliasearch api breaking changes`**
**Estimated Time**: 2-3 hours  
**Risk Level**: 🟡 Medium

**Tasks:**
- [ ] Analyze Algoliasearch v4 vs v5 API differences
- [ ] Update search service type definitions in `app/services/algolia.ts`
- [ ] Fix `SearchClient.initIndex()` method calls
- [ ] Test search functionality with updated API

**Key files:**
- `app/services/algolia.ts` (multiple type errors)
- `app/services/latest-docs.ts:57`
- `app/routes/authenticated/my/documents.ts:59`

#### **Commit 7: `feat: update design system components safely`**
**Estimated Time**: 3-4 hours  
**Risk Level**: 🟠 High

**Tasks:**
- [ ] Test @hashicorp/design-system-components compatibility
- [ ] Update incrementally if possible (3.1.0 → 3.6.0 max)
- [ ] Document any breaking changes
- [ ] Avoid ember-stargate/ember-resources conflicts

**Decision Point**: May need to stay at v3.x for Ember 3.28 compatibility

### **Phase 4: Build System Optimization**
*Goal: Performance and maintenance improvements*

#### **Commit 8: `perf: optimize build pipeline`**
**Estimated Time**: 2-3 hours  
**Risk Level**: 🟢 Low

**Tasks:**
- [ ] Update webpack to latest compatible version  
- [ ] Optimize TailwindCSS v3.4.17 integration
- [ ] Remove deprecated build flags
- [ ] Clean up PostCSS configuration

#### **Commit 9: `docs: update development setup`**
**Estimated Time**: 1 hour  
**Risk Level**: 🟢 Low

**Tasks:**
- [ ] Document Node.js LTS recommendation (instead of v24.7.0)
- [ ] Update build/dev instructions for new toolchain
- [ ] Add troubleshooting guide
- [ ] Document migration decisions and trade-offs

---

## 🧪 Testing Strategy

### **Pre-Commit Validation (Required)**
Each commit must pass:
```bash
# Backend validation
make bin                    # Go build
go mod verify              # Module integrity

# Frontend validation  
yarn validate              # All frontend checks
yarn test:build           # Production build
yarn test:types           # TypeScript check
yarn test:lint            # Linting

# Integration validation
make dev                   # Full stack startup
```

### **Test Hooks Implementation**
```json
{
  "scripts": {
    "validate": "npm-run-all test:deps test:types test:lint test:build",
    "test:build": "ember build --environment=production",
    "test:types": "tsc --noEmit",
    "test:lint": "eslint . --cache", 
    "test:deps": "yarn check",
    "test:ember": "ember test",
    "test:quick": "npm-run-all test:types test:lint"
  }
}
```

---

## 🎯 Success Criteria

### **✅ Complete Success Indicators**
- [ ] `make dev` starts without errors
- [ ] All builds complete successfully (`yarn build`)  
- [ ] Test suite passes (`yarn test`)
- [ ] No console errors in development mode
- [ ] Go application builds and runs (`make bin && ./hermes`)
- [ ] Web assets compile and serve correctly

### **✅ Minimum Viable Success** 
- [ ] Go application builds and runs
- [ ] Web assets compile (even with warnings)
- [ ] Development environment functional
- [ ] Basic functionality preserved

---

## 🚦 Risk Assessment

| Risk Level | Components | Mitigation Strategy |
|------------|------------|-------------------|
| 🟢 **Low** | CSS fixes, TypeScript versions, Build scripts | Standard testing, easy rollback |
| 🟡 **Medium** | Test helpers, Algoliasearch API, CSS pipeline | Careful API analysis, staged rollout |
| 🟠 **High** | Design system upgrades, Major dependency changes | Conservative approach, fallback versions |
| 🔴 **Deferred** | Ember CLI 4.x+, Ember 4.x/5.x framework | Future migration phase |

---

## 📋 Commit Message Convention

| Prefix | Usage | Example |
|--------|-------|---------|
| `fix:` | Bug fixes, compatibility issues | `fix: resolve css build pipeline issues` |
| `feat:` | New features, upgrades | `feat: update design system components safely` |
| `test:` | Testing infrastructure | `test: add migration test hooks` |  
| `perf:` | Performance improvements | `perf: optimize build pipeline` |
| `docs:` | Documentation updates | `docs: update development setup` |

---

## 📊 Dependencies Overview

### **Go Dependencies (✅ Complete)**
```
Key Updates:
- gorm.io/gorm: v1.24.3 → v1.31.0
- gopkg.in/DataDog/dd-trace-go.v1: v1.49.1 → v1.65.1 (conflict resolved)  
- golang.org/x/oauth2: v0.8.0 → v0.31.0
- google.golang.org/api: v0.126.0 → v0.249.0
```

### **Web Dependencies (🟡 In Progress)**
```
Completed Updates:
- yarn: 1.22.22 → 4.10.3
- typescript: ^5.2.2 → ^5.9.2  
- eslint: ^8.51.0 → ^9.36.0
- @ember/test-helpers: ^2.6.0 → ^5.3.0 (causing issues)

Pending/Problematic:
- algoliasearch: ^4.25.2 (downgraded from v5 for compatibility)
- @hashicorp/design-system-components: ^3.6.0 (downgraded from v4.x)
- CSS build pipeline: needs CleanCSS fix
```

---

## 🔧 Development Environment

### **Current Setup**
- **Node.js**: v24.7.0 (⚠️ not tested with Ember CLI 3.28)
- **Yarn**: 4.10.3 (✅ updated)
- **Go**: 1.25.0 (✅ updated)  
- **Ember CLI**: 3.28.6 (stable, no changes)

### **Recommended Setup**
- **Node.js**: LTS version (v20.x recommended)
- **Yarn**: 4.10.3+ (via Corepack)
- **Go**: 1.25.0+

---

## 📝 Migration Log

### **Completed Actions**
- [x] Go modules updated to latest versions
- [x] DataDog dependency conflicts resolved
- [x] Yarn upgraded to v4.10.3 with Corepack
- [x] Core build tools updated (TypeScript, ESLint, Prettier)
- [x] hash-value dependency replaced with object-hash
- [x] Basic Ember dependencies partially updated

### **Next Actions** 
- [ ] **Phase 1, Commit 1**: Fix CSS build pipeline issues
- [ ] **Phase 1, Commit 2**: Stabilize core Ember toolchain  
- [ ] **Phase 1, Commit 3**: Add migration test hooks

---

## 🤝 Contributing to Migration

When working on migration commits:

1. **Follow the phase order** - don't skip ahead
2. **Test each commit independently** - ensure `yarn validate` passes
3. **Keep commits atomic** - one logical change per commit
4. **Document decisions** - update this file with findings
5. **Validate integration** - ensure `make dev` still works

---

**Last Updated**: September 24, 2025  
**Next Review**: After Phase 1 completion