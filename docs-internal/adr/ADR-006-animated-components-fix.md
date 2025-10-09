# ADR-006: Animated Components Fix

**Status**: Accepted  
**Date**: October 8, 2025  
**Type**: ADR (Frontend Decision)  
**Related**: RFC-034 (Ember Upgrade Strategy)

## Context

The application was mid-migration from `ember-animated` to Ember 6.x. Templates used `<AnimatedContainer>` and `{{#animated-if}}` components, but only TypeScript type stubs existed - no runtime Glimmer components. This caused "Component not found" errors preventing form pages from rendering.

**Affected Files**:
- `web/app/components/new/form.hbs`
- `web/app/components/project/index.hbs`
- `web/app/components/project/resource-list.hbs`

## Decision

Create passthrough stub components that provide the same API as `ember-animated` but without animations. This allows templates to continue working while deferring proper animation implementation.

**Implementation**:

1. **AnimatedContainer** (`.gts` template-only component):
   ```typescript
   const AnimatedContainer: TemplateOnlyComponent = <template>
     <div ...attributes>{{yield}}</div>
   </template>;
   ```

2. **AnimatedIf** (class-based with positional params):
   ```typescript
   export default class AnimatedIfCurly extends Component {
     static positionalParams = ['predicate'];
     get shouldRenderDefault() { return Boolean(this.args.predicate); }
   }
   ```

3. **AnimatedEach** (class-based with key tracking):
   ```typescript
   export default class AnimatedEachCurly extends Component {
     static positionalParams = ['items'];
     get keyName() { return this.args.key || '@identity'; }
   }
   ```

4. **Updated Glint Registry** (`web/types/glint/index.d.ts`):
   - Changed from broken `ember-animated` imports
   - To local stub imports from `hermes/components/*`

## Consequences

### Positive
- ✅ Application functional again (form pages render)
- ✅ No visual regression (animations weren't working anyway)
- ✅ Compatible with Ember 6.x
- ✅ Easy to replace with proper animations later

### Negative
- ❌ No animations (static rendering only)
- ❌ Technical debt (need proper animation solution)
- ❌ Performance slightly worse than optimized animations

## Alternatives Considered

1. **Fully remove ember-animated**: Required extensive template refactoring
2. **Upgrade to ember-animated 2.x**: Not compatible with Ember 6.x
3. **Use CSS animations**: Doesn't provide same declarative API
4. **Implement with ember-animated-tools**: More complex, overkill for current needs

## Implementation Notes

**Curly-Style Invocation Support**:
- Used `static positionalParams` to map first argument to named argument
- Required for `{{#animated-if condition}}` syntax
- Component reads `this.args.predicate` instead of `this.args.items[0]`

**Key Tracking**:
- AnimatedEach supports custom `@key` argument
- Defaults to `@identity` for primitive arrays
- Matches original `ember-animated` API

## Future Work

- Replace stubs with proper animations using CSS transitions or modern animation library
- Consider ember-concurrency + CSS for complex animations
- Evaluate Motion One or Framer Motion for Ember

## Verification

✅ Form pages render without errors  
✅ Conditional content shows/hides correctly  
✅ Lists render with proper key tracking  
✅ No TypeScript errors  
✅ No Glint errors  

## References

- Source: `ANIMATED_COMPONENTS_FIX_2025_10_08.md`
- Related: `EMBER_UPGRADE_STRATEGY.md`, `EMBER_CONCURRENCY_COMPATIBILITY_ISSUE.md`
