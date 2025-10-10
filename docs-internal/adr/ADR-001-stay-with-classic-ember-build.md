# ADR-001: Stay with Classic Ember CLI Build System

**Date**: October 10, 2025  
**Status**: Accepted  
**Deciders**: Engineering Team  
**Technical Story**: Evaluated migration to Embroider + Vite for build performance improvements

---

## Context

Hermes currently uses the classic Ember CLI build system with Broccoli for asset compilation. Modern Ember applications are moving toward Embroider, a new build system that promises:

- **Faster builds**: 30-70% faster than classic Broccoli
- **Modern tooling**: Support for Vite or Webpack 5
- **Better code splitting**: Automatic route-based splitting
- **Improved tree-shaking**: Smaller production bundles
- **Native ES modules**: Better browser compatibility

We investigated migrating to Embroider with Vite to achieve maximum build performance improvements.

---

## Decision

**We will stay with the classic Ember CLI build system (Broccoli) for now.**

We will not migrate to Embroider at this time, whether with Vite or Webpack.

---

## Rationale

### Technical Findings

An aggressive migration attempt to Embroider + Vite revealed several blockers:

1. **Vite Integration Not Production-Ready**
   - `@embroider/vite@1.3.2` is marked as experimental
   - Build fails with plugin error: `Cannot read properties of undefined (reading 'code')`
   - Limited documentation and examples
   - Unclear error messages make debugging difficult

2. **Migration Complexity**
   - Requires async module.exports (breaking change)
   - New dependency management patterns
   - Additional configuration files (vite.config.js)
   - Potential addon compatibility issues

3. **Current Build System Works**
   - Classic build is stable and well-understood
   - No production issues or blocking performance problems
   - Team is familiar with debugging and optimization
   - All tooling (tests, coverage, linting) works correctly

4. **Risk vs. Reward**
   - Build time improvements would be nice-to-have, not critical
   - Migration risk is high (broken builds, addon issues)
   - No user-facing benefits (build time doesn't affect runtime)
   - Time investment better spent on features

### Detailed Analysis

**Embroider + Vite** (Attempted):
- ✅ Modern, fastest option (60-70% faster builds)
- ❌ Not production-ready (plugin errors)
- ❌ Experimental status
- ❌ Poor error messages
- ❌ Migration blocked by tooling immaturity

**Embroider + Webpack** (Considered):
- ✅ More stable than Vite
- ✅ Better documentation
- ✅ 30-50% faster builds
- ⚠️ Still requires significant testing
- ⚠️ Webpack configuration complexity
- ⚠️ Not as fast as Vite

**Classic Broccoli** (Current):
- ✅ Proven, stable, works today
- ✅ Team expertise and familiarity
- ✅ All tooling integrated
- ✅ Zero migration risk
- ⚠️ Slower builds than alternatives
- ⚠️ Older technology stack

---

## Consequences

### Positive

- **Zero disruption**: No changes to existing workflows
- **No risk**: Avoid potential build breakage or addon conflicts
- **Team velocity**: Focus on features, not infrastructure
- **Stable foundation**: Known performance characteristics
- **Easy maintenance**: Existing knowledge base remains valid

### Negative

- **Slower builds**: Continue with current build times (~45-60 seconds)
- **Technical debt**: Build system aging relative to ecosystem
- **Missed optimizations**: Don't benefit from Embroider improvements
- **Future migration**: Will eventually need to migrate as ecosystem moves forward

### Neutral

- **Monitoring required**: Keep track of Embroider maturity
- **Future re-evaluation**: Should revisit decision in 6-12 months
- **Documentation**: Learnings from investigation documented for future reference

---

## Alternatives Considered

### 1. Migrate to Embroider + Webpack

**Pros**:
- More stable than Vite
- Significant performance improvement (30-50%)
- Better ecosystem support
- Easier rollback path

**Cons**:
- Still requires substantial testing
- Webpack configuration complexity
- Migration effort (~1-2 weeks)
- Potential addon compatibility issues

**Decision**: Rejected. Risk still outweighs benefit given current build times are acceptable.

### 2. Incremental Embroider Adoption

**Approach**: Enable Embroider optimizations gradually
- Start with safest options (staticHelpers, staticModifiers)
- Test thoroughly at each step
- Rollback if issues arise

**Pros**:
- Lower risk per change
- Easier to identify breaking changes
- Can stop migration if needed

**Cons**:
- Time-consuming (spread over weeks/months)
- Partial performance benefits only
- Maintenance burden of hybrid state

**Decision**: Rejected. Not worth the ongoing maintenance burden.

### 3. Wait and Monitor

**Approach**: Track Embroider ecosystem maturity, revisit later

**Pros**:
- Let others find and fix issues
- Better documentation emerges over time
- Tooling matures and stabilizes
- Lower risk when we eventually migrate

**Cons**:
- Delay benefits indefinitely
- Build system continues aging
- Larger migration gap over time

**Decision**: **Accepted** (this ADR). Best balance of risk and reward.

---

## Implementation

### Immediate Actions

1. ✅ Rollback all Embroider migration changes
2. ✅ Remove Embroider dependencies from package.json
3. ✅ Restore original ember-cli-build.js
4. ✅ Delete vite.config.js
5. ✅ Verify classic build works correctly
6. ✅ Document investigation findings

### Monitoring Plan

**Every 3 months**, review:
- Embroider adoption rates in Ember community
- `@embroider/vite` release notes and stability
- Build performance issues in production
- Team feedback on development experience

**Conditions for re-evaluation**:
- `@embroider/vite` reaches v2.0 or marked stable
- Build times become a blocking development issue
- Major Ember version upgrade requires Embroider
- Three or more successful migration case studies from similar apps

---

## References

### Documentation
- [Investigation Report](../EMBROIDER_VITE_MIGRATION.md) - Full technical analysis
- [Embroider GitHub](https://github.com/embroider-build/embroider)
- [Ember CLI Build Pipeline](https://cli.emberjs.com/release/advanced-use/build-pipeline/)

### Related Work
- Migration attempt commit: (to be reverted)
- Package backups: `package.json.backup`, `ember-cli-build.js.backup`

### Community Examples
- Monitor [Embroider Showcase](https://github.com/embroider-build/embroider#showcase) for production apps
- Track issues in [embroider-build/embroider](https://github.com/embroider-build/embroider/issues)

---

## Notes

### Lessons Learned

1. **Bleeding edge has costs**: Experimental tools can block entire migrations
2. **Measure before migrating**: We don't have baseline build time metrics
3. **Test in branches**: Infrastructure changes need isolated validation
4. **Document everything**: Investigation provides value even if migration fails

### Future Considerations

- Consider measuring current build times before next evaluation
- Set up metrics dashboard for build performance
- Create test plan template for future infrastructure changes
- Establish criteria for "production-ready" external dependencies

---

## Decision Review

**Review Date**: January 10, 2026 (3 months)  
**Reviewers**: Engineering team, Tech Lead  
**Success Criteria**: 
- Classic build continues to work reliably
- No blocking build performance issues
- Team velocity maintained or improved

---

## Appendix

### Build Time Estimates

**Classic Broccoli (Current)**:
- Full build: ~45-60 seconds (estimated, not measured)
- Incremental rebuild: ~5-10 seconds
- Dev server start: ~8-12 seconds

**Embroider + Webpack (Projected)**:
- Full build: ~25-35 seconds (30-40% faster)
- Incremental rebuild: ~2-4 seconds (50-60% faster)
- Dev server start: ~4-6 seconds

**Embroider + Vite (Theoretical)**:
- Full build: ~10-20 seconds (60-70% faster)
- Incremental rebuild: <1 second (90%+ faster)
- Dev server start: ~1-2 seconds (instant HMR)

**Note**: These are estimates. Actual results would vary based on codebase size and machine specs.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Classic build obsolescence | Medium | Low | Monitor ecosystem, plan migration when needed |
| Build time becomes blocking | Low | Medium | Optimize current system, measure metrics |
| Team unfamiliarity with future tools | Low | Low | Keep documentation updated, attend Ember conferences |
| Addon compatibility issues arise | Low | Medium | Stay current with addon updates |

---

**Approved by**: Engineering Team  
**Date**: October 10, 2025
