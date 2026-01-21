# ADR Documents (Architectural Decision Records)

Architectural decisions made during Hermes development, documenting the context, options considered, and rationale for specific technical choices.

## Quick Stats

- **Total ADRs**: 6
- **Status**: 6 Accepted
- **Categories**: Frontend (5), Backend (1)
- **Date Range**: October 7-8, 2025

## Index by Category

### Frontend Decisions (5 ADRs)

| ID | Title | Status | Date | Decision |
|----|-------|--------|------|----------|
| [006](006-animated-components-fix.md) | Animated Components Fix | Accepted | Oct 8 | Create passthrough stub components for ember-animated migration |
| [029](029-ember-concurrency-compat.md) | Ember Concurrency Compatibility | Accepted | Oct 8 | Use ember-power-select 8.x with ember-concurrency 2.x (version mismatch) |
| [032](032-ember-data-store-fix.md) | Ember Data Store Fix | Accepted | Oct 8 | Replace store.findAll() with direct fetch() and manual store management |
| [036](036-fix-location-type.md) | Fix Location Type | Accepted | Oct 7 | Change locationType from deprecated 'auto' to 'history' |
| [065](065-promise-timeout-hang.md) | Promise Timeout Hang Fix | Accepted | Oct 8 | Implement comprehensive timeout and error handling for promises |

### Backend Decisions (1 ADR)

| ID | Title | Status | Date | Decision |
|----|-------|--------|------|----------|
| [048](048-local-workspace-user-info.md) | Local Workspace User Info Fix | Accepted | Oct 8 | Fix provider initialization and add base_url for OAuth redirects |

## Index by Related RFC

| ADR | Related RFC | Relationship |
|-----|-------------|--------------|
| 006 | RFC-034 | Ember Upgrade Strategy - animated components migration |
| 029 | RFC-034 | Ember Upgrade Strategy - dependency compatibility |
| 032 | RFC-007, RFC-020 | Multi-Provider Auth, Dex Auth - store fixes for auth |
| 036 | RFC-034 | Ember Upgrade Strategy - router configuration |
| 048 | RFC-047, RFC-020 | Local Workspace, Dex Auth - user identity resolution |
| 065 | memo/001, memo/075 | Admin Login Hang investigations |

## Decisions by Problem Domain

### Ember 6.x Upgrade Issues
- **006**: Animated components not loading (ember-animated migration)
- **029**: ember-power-select incompatible with ember-concurrency 3.x
- **032**: Ember Data store.findAll() incompatible with single-object responses
- **036**: Deprecated 'auto' locationType causing app failure

### Authentication & Identity
- **032**: Store error when accessing undefined session data (Dex auth)
- **048**: Local workspace user info not displaying after Dex authentication

### Error Handling & Resilience
- **065**: Dashboard hanging on failed API requests (no timeout handling)

## Decision Format

Each ADR follows this structure:

```markdown
# ADR-NNN: Title

**Status**: Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
**Type**: ADR (Decision)
**Related**: Links to related RFCs/ADRs

## Context
Problem or situation requiring a decision

## Decision
What was decided and key rationale

## Consequences
Impact of the decision (positive and negative)

## Alternatives Considered
Other options evaluated

## Implementation
How the decision was implemented

## References
Source documents
```

## ADR Status Values

- **Accepted**: Decision has been made and is current
- **Superseded**: Decision replaced by newer ADR
- **Deprecated**: Decision no longer relevant

## Decision Process

1. **Identify Decision Point**: Recognize need for architectural choice
2. **Document Context**: Capture problem, constraints, requirements
3. **Evaluate Alternatives**: Consider multiple approaches with pros/cons
4. **Make Decision**: Choose option with clear rationale
5. **Record Consequences**: Document impact on system
6. **Implement**: Execute decision with verification
7. **Review**: Validate decision effectiveness over time

## Contributing

When adding new ADRs:
1. Assign next sequential ID (NNN format)
2. Use descriptive kebab-case filename
3. Include comprehensive front matter
4. Document all alternatives considered
5. Link related RFCs and ADRs
6. Update this README index
