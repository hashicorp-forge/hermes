---
id: TODO-007
title: Improve TypeScript Type Safety Across Codebase
date: 2025-10-09
type: TODO
priority: medium
status: open
tags: [typescript, types, frontend, type-safety, hds]
related:
  - ADR-006
---

# Improve TypeScript Type Safety Across Codebase

## Description

Multiple locations in the frontend codebase use `any` types, `@ts-ignore`, or have incomplete type definitions. This reduces type safety and makes refactoring more error-prone.

## Code References

### Component Type Issues

#### Editable Field Component
- **File**: `web/app/components/editable-field.ts`
- **Lines**: 18-19

```typescript
onSave: any; // TODO: type this
onChange?: (value: any) => void; // TODO: type this
```

#### Editable Field Template
- **File**: `web/app/components/editable-field.hbs`
- **Lines**: 15, 36

```handlebars
{{! @glint-ignore - TODO: type this as an array }}
{{! @glint-ignore - TODO: type this as a string }}
```

#### Related Resources Component
- **File**: `web/app/components/related-resources.ts`
- **Lines**: 53-54

```typescript
modalHeaderTitle: string; // TODO: make optional
modalInputPlaceholder: string; // TODO: make optional
```

#### Document Sidebar
- **File**: `web/app/components/document/sidebar.ts`
- **Line**: 359

```typescript
// @ts-ignore - TODO: Type this
```

### HDS Type Definitions

Multiple HDS (HashiCorp Design System) component types are incomplete:

#### Table Types
- **File**: `web/types/hds/table/index.d.ts`
- **Lines**: 24, 29
```typescript
// TODO: Type these
```

#### Form Field Types
- `web/types/hds/form/toggle/base.d.ts` - Line 11
- `web/types/hds/form/checkbox/fields.d.ts` - Line 14
- `web/types/hds/form/text-input/field.d.ts` - Line 17
- `web/types/hds/form/textarea/field.d.ts` - Line 18
- `web/types/hds/form/field.d.ts` - Line 18

#### Modal and Alert Types
- `web/types/hds/alert.d.ts` - Line 22
- `web/types/hds/modal.d.ts` - Line 23

## Proposed Solution

### Phase 1: Component Props (High Priority)

1. **Editable Field Component**
   - Define proper callback signatures
   - Replace `any` with specific types
   - Add JSDoc documentation

```typescript
interface EditableFieldArgs {
  onSave: (value: string | string[]) => void | Promise<void>;
  onChange?: (value: string | string[]) => void;
  // ... other props
}
```

2. **Related Resources**
   - Make optional props actually optional
   - Consider default values

```typescript
interface RelatedResourcesArgs {
  modalHeaderTitle?: string;
  modalInputPlaceholder?: string;
}
```

### Phase 2: HDS Type Definitions (Medium Priority)

1. **Audit HDS Components**
   - List all HDS components used
   - Identify prop requirements
   
2. **Create Complete Type Definitions**
   - Reference official HDS documentation
   - Add comprehensive prop types
   - Include event handler signatures

3. **Generate from Source**
   - Consider auto-generating types from HDS if possible
   - Keep types in sync with HDS version

### Phase 3: Remove @ts-ignore (Low Priority)

1. **Document Sidebar**
   - Investigate what needs typing
   - Add proper type annotations
   - Remove `@ts-ignore` comments

## Tasks

- [ ] Phase 1: Fix component prop types
  - [ ] EditableField component and template
  - [ ] RelatedResources component
  - [ ] Document Sidebar type issue
- [ ] Phase 2: Complete HDS type definitions
  - [ ] Table components
  - [ ] Form components (toggle, checkbox, text-input, textarea)
  - [ ] Modal and Alert components
- [ ] Phase 3: Remove all `@ts-ignore` and `@glint-ignore`
- [ ] Add type checking to CI/CD if not already present
- [ ] Document type patterns in CONTRIBUTING.md

## Impact

**Files Affected**: ~15 files  
**Complexity**: Low-Medium per file  
**Benefits**:
- Better IDE autocomplete
- Catch errors at compile time
- Easier refactoring
- Better documentation

## Testing Strategy

- Run `yarn test:types` after each change
- Verify no new TypeScript errors
- Check that templates compile with Glint

## References

- `web/app/components/editable-field.ts` - Component with `any` types
- `web/types/hds/` - HDS type definitions directory
- ESLint config - `@typescript-eslint` rules
