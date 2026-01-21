# Migration Guide

**Guide**: Ember Development Guide for Hermes  
**Section**: 08 - Migration Guide  
**Audience**: Frontend developers handling upgrades

---

## Overview

This guide covers upgrading Ember, handling deprecations, and migrating code patterns in the Hermes codebase.

---

## Current State

**Ember Version**: 6.7.0 (released mid-2024)  
**Target Version**: 6.9.0 (latest stable) → 7.0 (future)  
**Migration Status**: Planning Phase

**Blockers**:
- Test suite needs fixing before upgrading
- Test coverage needs improvement (currently <10%)

---

## Upgrade Strategy

### Phase 1: Fix Test Suite (Prerequisite)

Before upgrading Ember, fix existing test infrastructure:

1. **Fix test runner** (currently reports "No tests were run")
2. **Re-enable disabled tests**
3. **Establish baseline coverage** (<10% currently)

**Reference**: See `docs-internal/EMBER_UPGRADE_STRATEGY.md` for detailed plan.

### Phase 2: Increase Test Coverage

Target coverage goals:

| Component Type | Current | Target |
|----------------|---------|--------|
| Services | ~0% | 70% |
| Routes | ~0% | 60% |
| Components | ~10% | 65% |
| Overall | ~5% | 60% |

### Phase 3: Upgrade to Latest 6.x

1. Update package.json
2. Run codemods for deprecations
3. Fix breaking changes
4. Verify all tests pass

### Phase 4: Upgrade to 7.0 (Future)

When Ember 7.0 is released:
1. Review breaking changes
2. Run codemods
3. Update code patterns
4. Comprehensive testing

---

## Handling Deprecations

### ember-cli-deprecation-workflow

Hermes uses `ember-cli-deprecation-workflow` to manage deprecations:

```javascript
// config/deprecation-workflow.js
self.deprecationWorkflow = self.deprecationWorkflow || {};
self.deprecationWorkflow.config = {
  // Throw errors for new deprecations
  throwOnUnhandled: true,
  
  workflow: [
    { handler: 'silence', matchId: 'some-deprecation-id' },
    { handler: 'log', matchId: 'another-deprecation-id' },
  ]
};
```

### Capturing Deprecations

Run app and capture deprecations:

```bash
yarn start
# Visit all routes in browser
# Check console for deprecation warnings
# Update config/deprecation-workflow.js
```

### Resolving Deprecations

1. **Identify deprecation**: Check console or deprecation-workflow.js
2. **Find affected code**: Search codebase for deprecated pattern
3. **Replace with new pattern**: Follow deprecation guide
4. **Test thoroughly**: Ensure functionality unchanged
5. **Remove from workflow**: Delete silence/log entry

---

## Common Migration Patterns

### Classic Components → Glimmer Components

#### Before (Classic Component)

```javascript
// app/components/my-component.js
import Component from '@ember/component';
import { computed } from '@ember/object';

export default Component.extend({
  tagName: 'div',
  classNames: ['my-component'],
  
  title: computed('model.name', function() {
    return this.get('model.name').toUpperCase();
  }),
  
  actions: {
    handleClick() {
      this.sendAction('onClick');
    }
  }
});
```

#### After (Glimmer Component)

```typescript
// app/components/my-component.ts
import Component from '@glimmer/component';
import { action } from '@ember/object';

interface MyComponentSignature {
  Args: {
    model: { name: string };
    onClick: () => void;
  };
  Element: HTMLDivElement;
}

export default class MyComponent extends Component<MyComponentSignature> {
  get title(): string {
    return this.args.model.name.toUpperCase();
  }
  
  @action
  handleClick(): void {
    this.args.onClick();
  }
}
```

```hbs
{{! app/components/my-component.hbs }}
<div class="my-component" {{on "click" this.handleClick}}>
  {{this.title}}
</div>
```

### `{{action}}` → `{{on}}`

#### Before

```hbs
<button {{action "handleClick"}}>Click Me</button>
```

#### After

```hbs
<button {{on "click" this.handleClick}}>Click Me</button>
```

### `@computed` → Native Getters

#### Before

```javascript
import { computed } from '@ember/object';

export default Component.extend({
  fullName: computed('firstName', 'lastName', function() {
    return `${this.firstName} ${this.lastName}`;
  })
});
```

#### After

```typescript
export default class MyComponent extends Component {
  get fullName(): string {
    return `${this.args.firstName} ${this.args.lastName}`;
  }
}
```

### Observers → Tracked Properties

#### Before (Anti-pattern)

```javascript
import { observer } from '@ember/object';

export default Component.extend({
  dataChanged: observer('data', function() {
    this.set('processedData', this.processData());
  })
});
```

#### After

```typescript
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class MyComponent extends Component {
  @tracked data: Data[] = [];
  
  get processedData(): ProcessedData[] {
    return this.processData(this.data);
  }
  
  @action
  updateData(newData: Data[]): void {
    this.data = newData; // Triggers getter recomputation
  }
}
```

### `inject.service()` → `@service`

#### Before

```javascript
import { inject as service } from '@ember/service';

export default Component.extend({
  fetch: service()
});
```

#### After

```typescript
import { service } from '@ember/service';
import FetchService from 'hermes/services/fetch';

export default class MyComponent extends Component {
  @service declare fetch: FetchService;
}
```

### Mixins → Services or Inheritance

#### Before (Mixin)

```javascript
// mixins/validatable.js
import Mixin from '@ember/object/mixin';

export default Mixin.create({
  validate() {
    // Validation logic
  }
});

// component.js
import Validatable from '../mixins/validatable';

export default Component.extend(Validatable, {
  // Component logic
});
```

#### After (Service)

```typescript
// services/validator.ts
import Service from '@ember/service';

export default class ValidatorService extends Service {
  validate(data: unknown): boolean {
    // Validation logic
    return true;
  }
}

// component.ts
import { service } from '@ember/service';

export default class MyComponent extends Component {
  @service declare validator: ValidatorService;
  
  validateData(): boolean {
    return this.validator.validate(this.data);
  }
}
```

---

## Ember Barrel Imports

### Deprecated Pattern

```javascript
// ❌ Deprecated: Importing from 'ember'
import Ember from 'ember';
import { computed } from 'ember';
```

### Current Pattern

```typescript
// ✅ Modern: Direct package imports
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
```

### Codemod

```bash
# Run codemod to fix barrel imports
npx ember-codemods-telemetry-helpers
npx ember-no-implicit-this-codemod
```

---

## TypeScript Migration

### Step-by-Step JS → TS Migration

1. **Rename file**: `.js` → `.ts`
   ```bash
   mv app/components/my-component.js app/components/my-component.ts
   ```

2. **Add signature interface**:
   ```typescript
   interface MyComponentSignature {
     Args: {
       title: string;
     };
   }
   
   export default class MyComponent extends Component<MyComponentSignature> {
   ```

3. **Add type annotations**:
   ```typescript
   @service declare fetch: FetchService;
   @tracked count: number = 0;
   
   get doubled(): number {
     return this.count * 2;
   }
   ```

4. **Fix type errors**:
   ```bash
   yarn test:types
   ```

---

## Template Migration

### Angle Bracket Components

#### Before

```hbs
{{my-component title=this.title onClick=(action "handleClick")}}
```

#### After

```hbs
<MyComponent @title={{this.title}} @onClick={{this.handleClick}} />
```

### Named Blocks

#### Before (Multiple Components)

```hbs
<Modal>
  {{#modal.header}}
    <h2>{{this.title}}</h2>
  {{/modal.header}}
  
  {{#modal.body}}
    <p>{{this.content}}</p>
  {{/modal.body}}
</Modal>
```

#### After (Named Blocks)

```hbs
<Modal>
  <:header>
    <h2>{{this.title}}</h2>
  </:header>
  
  <:body>
    <p>{{this.content}}</p>
  </:body>
</Modal>
```

---

## Codemods

### Available Codemods

```bash
# Fix angle bracket components
npx ember-angle-brackets-codemod app/

# Fix implicit this in templates
npx ember-no-implicit-this-codemod app/

# Convert classic components to Glimmer
npx ember-native-class-codemod app/

# Fix tracked properties
npx tracked-tools-codemod app/
```

### Running Codemods Safely

1. **Commit current state**:
   ```bash
   git add -A
   git commit -m "Before codemod"
   ```

2. **Run codemod on subset**:
   ```bash
   npx ember-angle-brackets-codemod app/components/my-component.js
   ```

3. **Review changes**:
   ```bash
   git diff
   ```

4. **Test changes**:
   ```bash
   yarn test:types
   yarn lint
   yarn build
   ```

5. **Commit if successful**:
   ```bash
   git add -A
   git commit -m "Apply angle-brackets codemod to my-component"
   ```

---

## Breaking Changes in 7.0

### Expected Changes

Based on Ember RFC process, 7.0 may include:

1. **Removal of classic components** (use Glimmer components)
2. **Removal of observers** (use tracked properties)
3. **Removal of `{{action}}` helper** (use `{{on}}` modifier)
4. **Strict mode templates by default**
5. **Import cleanup** (removal of legacy imports)

### Preparing for 7.0

- [ ] Convert all classic components to Glimmer
- [ ] Remove all observers
- [ ] Replace all `{{action}}` with `{{on}}`
- [ ] Enable strict mode in templates
- [ ] Clean up all deprecated imports

---

## Upgrade Checklist

### Pre-Upgrade

- [ ] All tests passing
- [ ] Test coverage >60%
- [ ] All deprecations resolved
- [ ] TypeScript strict mode enabled (if possible)
- [ ] Full backup/branch created

### During Upgrade

- [ ] Update package.json dependencies
- [ ] Run `yarn install`
- [ ] Run codemods for new version
- [ ] Fix TypeScript errors
- [ ] Fix template lint errors
- [ ] Fix test failures

### Post-Upgrade

- [ ] All tests passing
- [ ] No new deprecations
- [ ] Manual smoke testing
- [ ] Performance testing
- [ ] Update documentation

---

## Version-Specific Guides

### Upgrading 6.7 → 6.9

**Changes**:
- Minor bug fixes
- New features (additive)
- No breaking changes

**Steps**:
1. Update package.json: `"ember-source": "~6.9.0"`
2. Run `yarn install`
3. Test application
4. Deploy

### Upgrading 6.x → 7.0 (Future)

**Expected Breaking Changes**:
- Classic component removal
- Observer removal
- `{{action}}` helper removal

**Steps**:
1. Complete deprecation resolution
2. Run ember-cli-update
3. Apply codemods
4. Fix breaking changes
5. Comprehensive testing

---

## Resources

### Official Documentation

- **Ember Guides**: https://guides.emberjs.com/
- **Ember Release Notes**: https://github.com/emberjs/ember.js/releases
- **Deprecation Guide**: https://deprecations.emberjs.com/

### Codemods

- **ember-codemods**: https://github.com/ember-codemods
- **Codemod Registry**: https://ember-codemods.github.io/

### Community

- **Ember Discord**: https://discord.gg/emberjs
- **Ember Forum**: https://discuss.emberjs.com/

---

## Best Practices

### ✅ DO

- Upgrade incrementally (minor versions first)
- Resolve all deprecations before major upgrades
- Run codemods on small subsets first
- Test thoroughly after each change
- Document migration decisions
- Keep dependencies up to date

### ❌ DON'T

- Don't skip minor versions
- Don't ignore deprecations
- Don't run multiple codemods simultaneously
- Don't upgrade without test coverage
- Don't deploy immediately after upgrade

---

## Next Steps

This completes the Ember Development Guide for Hermes. For specific issues or questions:

1. Check [07-common-pitfalls.md](./07-common-pitfalls.md)
2. Review existing codebase patterns in `web/app/`
3. Consult `docs-internal/` for Hermes-specific documentation
4. Ask team members or consult Ember community resources

---

**Guide Maintained By**: Hermes Development Team  
**Last Updated**: January 2025  
**Ember Version**: 6.7.0
