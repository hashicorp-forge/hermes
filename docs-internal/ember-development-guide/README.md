# Ember Development Guide for Hermes

**Date**: January 2025  
**Ember Version**: 6.7.0  
**TypeScript Version**: 5.x  
**Status**: Living Documentation

---

## Overview

This guide provides comprehensive best practices and patterns for developing the Hermes frontend application. Hermes uses modern Ember with TypeScript, following current best practices while managing technical debt from earlier versions.

### Quick Start

```bash
cd web
yarn install              # Install dependencies
yarn test:types           # Check TypeScript types
yarn start:with-proxy     # Start dev server with backend proxy
```

### Guide Contents

1. **[TypeScript Setup & Patterns](./01-typescript-setup.md)** - Type safety, Glint, decorators
2. **[Component Development](./02-component-development.md)** - Glimmer components, template syntax
3. **[Service Architecture](./03-service-architecture.md)** - Dependency injection, state management
4. **[Testing Strategy](./04-testing-strategy.md)** - Unit, integration, acceptance tests
5. **[Linting & Type Checking](./05-linting-type-checking.md)** - ESLint, TypeScript, template linting
6. **[Build & Development](./06-build-development.md)** - ember-cli-build.js, dev server, proxies
7. **[Common Pitfalls](./07-common-pitfalls.md)** - Known issues and solutions
8. **[Migration Guide](./08-migration-guide.md)** - Upgrading patterns, deprecation handling

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | Ember.js | 6.7.0 | SPA framework |
| **Language** | TypeScript | 5.x | Type safety |
| **Template Type Checking** | Glint | 1.5.2 | Template type safety |
| **Component Library** | HashiCorp Design System | Latest | UI components |
| **Styling** | Tailwind CSS + SCSS | Latest | Styling system |
| **State Management** | Ember Data + Services | 4.12.0 | Data layer |
| **Async Tasks** | ember-concurrency | 3.x | Task management |
| **Testing** | QUnit + ember-qunit | Latest | Test framework |
| **Code Coverage** | ember-cli-code-coverage | 3.1.0 | Coverage reports |
| **Mocking** | ember-cli-mirage | 2.4.0 | API mocking |
| **Build** | Ember CLI | 6.7.0 | Build pipeline |
| **Package Manager** | Yarn | 4.10.3 | Dependency management |

---

## Project Structure

```
web/
├── app/
│   ├── components/          # Glimmer components (.ts + .hbs or <template>)
│   ├── routes/              # Route handlers
│   ├── services/            # Singleton services
│   ├── models/              # Ember Data models
│   ├── helpers/             # Template helpers
│   ├── modifiers/           # Element modifiers
│   ├── utils/               # Pure utility functions
│   └── types/               # TypeScript type definitions
├── tests/
│   ├── unit/                # Unit tests (services, models, utils)
│   ├── integration/         # Component integration tests
│   ├── acceptance/          # Full app E2E tests
│   └── helpers/             # Test utilities and mocks
├── mirage/                  # API mocking for development
├── config/
│   ├── environment.js       # Environment configuration
│   └── targets.js           # Browser targets
├── ember-cli-build.js       # Build configuration
├── tsconfig.json            # TypeScript configuration
├── .eslintrc.js             # ESLint rules
└── package.json             # Dependencies and scripts
```

---

## Key Concepts

### Reactive State with `@tracked`

```typescript
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

export default class MyComponent extends Component {
  @tracked count = 0; // Auto-updates UI when changed
}
```

### Dependency Injection with `@service`

```typescript
import { service } from '@ember/service';
import FetchService from 'hermes/services/fetch';

export default class MyComponent extends Component {
  @service declare fetch: FetchService; // Type-safe service injection
}
```

### Actions with `@action`

```typescript
import { action } from '@ember/object';

export default class MyComponent extends Component {
  @action
  handleClick() {
    // Automatically bound to component instance
  }
}
```

---

## Development Workflow

### Day-to-Day Development

```bash
# Terminal 1: Backend (from repo root)
make docker/postgres/start
./hermes server -config=config.hcl

# Terminal 2: Frontend (from web/)
yarn start:with-proxy  # http://localhost:4201
```

### Before Committing

```bash
yarn test:types     # TypeScript check (fast, catches type errors)
yarn lint:hbs       # Template linting
yarn build          # Verify production build
yarn test:unit      # Run unit tests (if working)
```

### Full Validation

```bash
yarn validate       # Runs: test:types + test:lint + test:build
```

---

## Known Issues & Workarounds

### Test Runner Issues ⚠️

**Problem**: QUnit reports "No tests were run" despite tests existing in bundle.

**Root Cause**: `QUnit.start()` called before test modules register.

**Workaround**: Continue writing tests following best practices. Tests are syntactically correct and will work once loader issue is resolved.

**Reference**: See [docs-internal/TEST_COVERAGE_PROGRESS.md](../TEST_COVERAGE_PROGRESS.md)

### ESLint Errors (Non-Blocking) ⚠️

**Problem**: 43 ESLint errors (mostly `@typescript-eslint/no-empty-object-type`)

**Impact**: Non-blocking - linting does not prevent builds or deployment.

**Workaround**: Focus on `yarn test:types` for critical type safety.

### Ember Concurrency Task Mocking ⚠️

**Problem**: Tasks created with `task()` from ember-concurrency are difficult to mock in tests.

**Workaround**: Use `perform()` method for testability or extract logic to separate methods.

**Reference**: See [07-common-pitfalls.md](./07-common-pitfalls.md#ember-concurrency-testing)

---

## Critical Development Rules

### ✅ DO

- **Always run `yarn install` after pulling/switching branches**
- Use `@tracked` for reactive state that updates the UI
- Use `@service` for dependency injection with type declarations
- Use `@action` to bind methods that are called from templates
- Follow existing patterns in `web/app/components/` for consistency
- Write comprehensive JSDoc comments for complex logic
- Use TypeScript interfaces for all data structures
- Test with `yarn test:types` frequently during development

### ❌ DON'T

- Don't use bare `this` properties without `@tracked` for UI state
- Don't inject services without proper TypeScript declarations
- Don't use `function` for actions (loses `this` binding)
- Don't skip TypeScript compilation checks before committing
- Don't commit code with TypeScript errors
- Don't disable ESLint rules without understanding the reason
- Don't use `any` type without a clear justification comment

---

## Quick Reference

### Common Commands

```bash
# Development
yarn start                    # Dev server (Mirage enabled)
yarn start:with-proxy         # Dev server (proxy to backend)

# Testing
yarn test                     # Full test suite
yarn test:unit                # Unit tests only
yarn test:integration         # Integration tests only
yarn test:acceptance          # Acceptance tests only
yarn test:types               # TypeScript check only
yarn test:coverage            # With coverage report

# Linting
yarn lint                     # All linters
yarn lint:js                  # ESLint only
yarn lint:hbs                 # Template linter only
yarn lint:fix                 # Auto-fix all

# Build
yarn build                    # Production build
yarn test:build               # Verify production build
```

### File Templates

See individual guide sections for detailed templates:
- Component: [02-component-development.md](./02-component-development.md)
- Service: [03-service-architecture.md](./03-service-architecture.md)
- Test: [04-testing-strategy.md](./04-testing-strategy.md)

---

## Getting Help

1. **Check this guide first** - Common patterns and solutions
2. **Review existing code** - Look for similar implementations in `web/app/`
3. **Check existing docs** - See `docs-internal/` for specific fixes and strategies
4. **Test your changes** - Use `yarn test:types` and `yarn build` to validate

---

## Contributing to This Guide

This is a living document. When you discover new patterns or solve tricky problems:

1. Document the solution in the appropriate guide section
2. Update examples with real code from the project
3. Add references to actual files in the codebase
4. Include both the problem and the solution
5. Update the table of contents if adding new sections

**Last Updated**: January 2025  
**Maintainers**: Hermes Development Team
