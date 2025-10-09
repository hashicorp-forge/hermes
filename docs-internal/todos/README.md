# TODOs Directory

This directory contains structured TODO items for the Hermes project. Each TODO follows a standardized format with YAML front matter and clear tracking of progress.

## Naming Convention

All TODO files follow the pattern: `TODO-NNN-short-description.md`

- **NNN**: Zero-padded 3-digit sequential number (001, 002, 003, etc.)
- **short-description**: Kebab-case brief description of the todo

## Front Matter Format

Each TODO file includes YAML front matter with the following fields:

```yaml
---
id: TODO-NNN
title: Full Title of the TODO
date: YYYY-MM-DD
type: TODO
priority: low|medium|high|critical
status: open|in-progress|blocked|completed
progress: N%  # Optional, for tracking completion percentage
tags: [tag1, tag2, tag3]
related:
  - ADR-XXX
  - RFC-YYY
  - MEMO-ZZZ
---
```

## Current TODOs

### TODO-001: Add Compile-Time Interface Checks for Abstractions
- **Priority**: Medium
- **Status**: Open
- **Description**: Add compile-time checks for workspace and search provider interfaces

### TODO-002: Build Comprehensive API Test Suite
- **Priority**: High
- **Status**: In Progress (29%)
- **Description**: Build complete integration test coverage for v1 and v2 APIs

### TODO-003: Migrate API Handlers to Search Provider Abstraction
- **Priority**: High
- **Status**: In Progress (71%)
- **Description**: Migrate all handlers from direct Algolia calls to SearchProvider abstraction

### TODO-004: Implement Asynchronous Email Sending
- **Priority**: High
- **Status**: Open
- **Description**: Move email sending to background workers to avoid blocking HTTP responses

### TODO-005: Fix Data Consistency Between Search Index and Database
- **Priority**: Critical
- **Status**: Open
- **Description**: Implement outbox pattern to ensure consistency between search and database

### TODO-006: Migrate V1 API Handlers to Search Provider
- **Priority**: High
- **Status**: Blocked (by TODO-003)
- **Description**: Update V1 drafts and reviews handlers to use SearchProvider abstraction

### TODO-007: Improve TypeScript Type Safety Across Codebase
- **Priority**: Medium
- **Status**: Open
- **Description**: Replace `any` types and complete HDS type definitions

### TODO-008: Make Configuration Values Configurable
- **Priority**: Low
- **Status**: Open
- **Description**: Move hardcoded values (ports, timeouts, etc.) to configuration

### TODO-009: Implement Document Template System
- **Priority**: Medium
- **Status**: Open
- **Description**: Create template system for emails, document headers, and custom fields

### TODO-010: Remove Legacy Algolia Products Requirement
- **Priority**: Low
- **Status**: Open
- **Description**: Remove products from Algolia indexing once fully migrated to database

## Status Definitions

- **open**: Not yet started, ready to be picked up
- **in-progress**: Currently being worked on
- **blocked**: Waiting on external dependency or decision
- **completed**: Finished and verified

## Priority Definitions

- **critical**: Blocking other work or production issues
- **high**: Important for near-term goals
- **medium**: Needed but not urgent
- **low**: Nice to have, can be deferred

## Usage

When creating a new TODO:

1. **Choose Next Number**: Find the highest TODO-NNN and increment
2. **Create File**: Use the naming convention `TODO-NNN-description.md`
3. **Add Front Matter**: Copy the template above and fill in all fields
4. **Write Content**: Include clear description, context, tasks, and success criteria
5. **Update This README**: Add entry to "Current TODOs" section

When completing a TODO:

1. **Update Status**: Change status to `completed` in front matter
2. **Add Completion Date**: Add `completed_date: YYYY-MM-DD` to front matter
3. **Link to PRs/Commits**: Reference relevant PRs or commits in the file
4. **Update README**: Mark as completed in this file

## Related Documentation

- **ADRs**: Architecture Decision Records in `docs-internal/adr/`
- **RFCs**: Request for Comments in `docs-internal/rfc/`
- **MEMOs**: Internal memos in `docs-internal/memo/`

## Conversion from Old Format

This directory was restructured on October 9, 2025, to use standardized naming and front matter. Previous files:
- `TODO-ideation.md` → Removed (empty)
- `TODO_ABSTRACTION_IMPROVEMENTS.md` → TODO-001
- `TODO_API_TEST_SUITE.md` → TODO-002
- `TODO_CONTINUE_COV.md` → Removed (empty)
- `TODO_HANDLER_MIGRATION.md` → TODO-003
