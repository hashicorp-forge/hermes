# Linting & Type Checking

**Guide**: Ember Development Guide for Hermes  
**Section**: 05 - Linting & Type Checking  
**Audience**: Frontend developers ensuring code quality

---

## Overview

Hermes uses ESLint for JavaScript/TypeScript linting, ember-template-lint for template linting, and TypeScript for type checking. This guide covers configuration and usage.

---

## TypeScript Type Checking

### Running Type Checks

```bash
# Fast type-only check (no build)
yarn test:types

# Checks run automatically during build
yarn build
```

### Configuration

See [01-typescript-setup.md](./01-typescript-setup.md) for complete TypeScript configuration details.

**Key tsconfig.json settings**:
```json
{
  "compilerOptions": {
    "strict": false,          // ⚠️ Not currently enforced (technical debt)
    "noEmit": true,          // Type checking only
    "skipLibCheck": true,     // Skip lib checks for speed
  }
}
```

### Common Type Errors

#### Missing Service Type Declaration
```typescript
// ❌ Error: Service has 'any' type
@service fetch;

// ✅ Fix: Add type declaration
@service declare fetch: FetchService;
```

#### Missing Component Signature
```typescript
// ❌ Error: Args are 'any'
export default class MyComponent extends Component {
  get title() {
    return this.args.title; // 'any' type
  }
}

// ✅ Fix: Define signature
interface MyComponentSignature {
  Args: { title: string };
}

export default class MyComponent extends Component<MyComponentSignature> {
  get title() {
    return this.args.title; // string type ✓
  }
}
```

---

## ESLint

### Running ESLint

```bash
# Lint all files
yarn lint:js

# Auto-fix issues
yarn lint:js:fix

# Run as part of full lint suite
yarn lint
```

### Configuration

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['ember', '@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    browser: true,
  },
  rules: {
    // Many rules disabled due to technical debt
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

### Known Issues ⚠️

**43 ESLint errors currently exist** (mostly `@typescript-eslint/no-empty-object-type`)

**Impact**: Non-blocking - does not prevent builds or deployment

**Workaround**: Focus on `yarn test:types` for critical type safety

**Example**:
```typescript
// ⚠️ ESLint warning (but TypeScript accepts it)
interface MySignature {}

// Better pattern
interface MySignature {
  Args: {};
  Blocks: {};
  Element: HTMLDivElement;
}
```

### Disabling Rules

Only disable rules when necessary, with justification:

```typescript
// ✅ Good: Specific disable with reason
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic plugin data structure
const pluginData: any = getPluginData();

// ❌ Bad: Broad disable without reason
/* eslint-disable @typescript-eslint/no-explicit-any */
```

---

## Template Linting

### Running Template Linting

```bash
# Lint all templates
yarn lint:hbs

# Auto-fix issues
yarn lint:hbs:fix

# Run as part of full lint suite
yarn lint
```

### Configuration

```javascript
// .template-lintrc.js
'use strict';

module.exports = {
  extends: 'recommended',
  rules: {
    'no-bare-strings': false,
    'require-button-type': true,
    'no-action': false,
    'no-implicit-this': {
      allow: ['loading'],
    },
  },
};
```

### Common Template Issues

#### Missing Button Type
```hbs
{{! ❌ Error: Missing button type }}
<button>Click Me</button>

{{! ✅ Fix: Add explicit type }}
<button type="button">Click Me</button>
```

#### Implicit This
```hbs
{{! ❌ Error: Implicit this reference }}
{{someProperty}}

{{! ✅ Fix: Explicit this reference }}
{{this.someProperty}}
```

#### Unused Block Params
```hbs
{{! ❌ Error: Unused block param }}
{{#each this.items as |item index|}}
  {{item.name}}
{{/each}}

{{! ✅ Fix: Remove unused param or prefix with _ }}
{{#each this.items as |item _index|}}
  {{item.name}}
{{/each}}
```

---

## Glint (Template Type Checking)

Glint provides TypeScript-style type checking for templates.

### Benefits

- Catches type mismatches in templates at compile time
- Validates component arg types
- Checks helper return types
- Validates block parameter types

### Configuration

```json
// tsconfig.json
{
  "glint": {
    "environment": [
      "ember-loose",                    // Allows untyped components
      "ember-template-imports"          // Supports <template> tag
    ]
  }
}
```

### Example Type Checking

```typescript
interface UserCardSignature {
  Args: {
    user: { name: string; email: string };
    editable?: boolean;
  };
}

export default class UserCard extends Component<UserCardSignature> {}
```

```hbs
{{! ✅ Type-safe }}
<UserCard @user={{this.currentUser}} @editable={{true}} />

{{! ❌ Glint error: Missing required arg 'user' }}
<UserCard @editable={{true}} />

{{! ❌ Glint error: Invalid arg type }}
<UserCard @user={{this.userEmail}} />
```

---

## Prettier (Optional)

Prettier is not currently configured in Hermes, but can be added:

```bash
yarn add -D prettier eslint-config-prettier
```

```json
// .prettierrc.js
module.exports = {
  singleQuote: true,
  trailingComma: 'es5',
  printWidth: 100,
  tabWidth: 2,
  semi: true,
};
```

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    // ... existing extends
    'prettier', // Must be last
  ],
};
```

---

## Pre-Commit Validation

### Quick Validation

```bash
# Fast checks before committing
yarn test:types        # TypeScript check (fast)
yarn lint:hbs          # Template linting
yarn build             # Full production build
```

### Full Validation

```bash
# Comprehensive validation (slower)
yarn validate          # Runs: test:types + test:lint + test:build
```

### Recommended Git Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running pre-commit checks..."

# Type checking (fast)
yarn test:types
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found"
  exit 1
fi

# Template linting
yarn lint:hbs
if [ $? -ne 0 ]; then
  echo "❌ Template lint errors found"
  exit 1
fi

echo "✅ Pre-commit checks passed"
exit 0
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## IDE Integration

### VS Code

Install recommended extensions:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "ember-tooling.ember-language-server",
    "esbenp.prettier-vscode"
  ]
}
```

Configure settings:

```json
// .vscode/settings.json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ],
  "typescript.tsdk": "node_modules/typescript/lib",
  "glint.externalTypescriptLib": "node_modules/typescript/lib"
}
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'yarn'
      
      - run: yarn install --frozen-lockfile
      - run: yarn test:types
      - run: yarn lint:js
      - run: yarn lint:hbs
      
  build:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'yarn'
      
      - run: yarn install --frozen-lockfile
      - run: yarn build
```

---

## Best Practices

### ✅ DO

- Run `yarn test:types` frequently during development
- Fix template lint errors before committing
- Use TypeScript types instead of `any` when possible
- Add JSDoc comments for complex logic
- Use `data-test-*` attributes (not linted but good practice)
- Configure your IDE for inline linting feedback

### ❌ DON'T

- Don't disable lint rules globally without team agreement
- Don't commit code with TypeScript errors
- Don't ignore template lint warnings
- Don't use `// @ts-ignore` to hide problems
- Don't skip validation checks before pushing

---

## Troubleshooting

### "Module not found" in TypeScript

**Problem**: TypeScript can't find imported module

**Solution**: Check path mappings in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "hermes/*": ["app/*"],
      "*": ["types/*"]
    }
  }
}
```

### Template Lint Errors After Upgrade

**Problem**: New template lint rules fail on existing code

**Solution**: Update `.template-lintrc.js` to disable problematic rules temporarily:
```javascript
module.exports = {
  rules: {
    'no-implicit-this': 'off', // Disable temporarily
  },
};
```

### ESLint Plugin Conflicts

**Problem**: Conflicting rules between plugins

**Solution**: Use `overrides` in `.eslintrc.js`:
```javascript
module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
  ],
};
```

---

## Next Steps

Continue to [06-build-development.md](./06-build-development.md) to learn about build configuration and development workflow.
