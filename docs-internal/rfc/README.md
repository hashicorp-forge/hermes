# RFC Documents (Request for Comments)

Architecture proposals, design documents, and implementation specifications for major features and refactorings in Hermes.

## Quick Stats

- **Total RFCs**: 16
- **Status**: 14 Implemented, 1 Design Phase, 1 Partially Complete
- **Categories**: Authentication (5), Search (4), Documents (2), Frontend (3), Configuration (2)

## Index by Category

### Authentication & Authorization (5 RFCs)

| ID | Title | Status | Description |
|----|-------|--------|-------------|
| [007](007-multi-provider-auth-architecture.md) | Multi-Provider Auth Architecture | Implemented | Runtime auth provider selection (Google/Okta/Dex) with provider-specific headers |
| [009](009-auth-provider-selection.md) | Auth Provider Selection | Implemented | Command-line flag and env var for explicit auth provider override |
| [020](020-dex-authentication-implementation.md) | Dex OIDC Implementation | Implemented | Complete Dex integration for local development and testing |
| [021](021-dex-authentication.md) | Dex Authentication | Implemented | Dex IDP architecture and deployment configurations |
| [079](079-session-authentication-fix.md) | Session Authentication Fix | Implemented | Session-based auth flow for OIDC providers |

### Search Architecture (4 RFCs)

| ID | Title | Status | Description |
|----|-------|--------|-------------|
| [051](051-outbox-pattern-design.md) | Outbox Pattern Design | Design Phase | Async search index updates with person/identity tracking and transactional consistency |
| [076](076-search-auth-refactoring.md) | Search & Auth Refactoring | Implemented | Backend-only search eliminating direct Algolia access |
| [077](077-search-endpoint-impl.md) | Search Endpoint Implementation | Implemented | Search endpoint design and implementation |
| [078](078-search-service-migration.md) | Search Service Migration | Implemented | Migration to backend proxy pattern for search |

### Document Management (2 RFCs)

| ID | Title | Status | Description |
|----|-------|--------|-------------|
| [026](026-document-editor.md) | Document Editor | Implemented | Smart editor supporting Google Workspace (iframe) and local workspace (text editor) |
| [047](047-local-workspace-setup.md) | Local Workspace Setup | Implemented | File-based document storage provider for testing |

### Frontend Infrastructure (3 RFCs)

| ID | Title | Status | Description |
|----|-------|--------|-------------|
| [033](033-ember-dev-server-migration.md) | Ember Dev Server Migration | Implemented | Migration from Mirage to backend proxy |
| [034](034-ember-upgrade-strategy.md) | Ember Upgrade Strategy | Partially Complete | Strategy for Ember 6.x upgrade |
| [037](037-frontend-proxy-config.md) | Frontend Proxy Config | Implemented | Frontend-to-backend proxy configuration |

### Configuration & Deployment (2 RFCs)

| ID | Title | Status | Description |
|----|-------|--------|-------------|
| [050](050-oauth-redirect-baseurl.md) | OAuth Redirect BaseURL | Implemented | Environment-agnostic OAuth redirect configuration |
| [068](068-workspace-provider-selection.md) | Workspace Provider Selection | Implemented | Runtime selection of storage backend (Google/Local/S3/Azure) |

## Index by Status

### ✅ Implemented (14)
007, 009, 020, 021, 026, 033, 037, 047, 050, 068, 076, 077, 078, 079

### 🚧 Design Phase (1)
051 (Outbox Pattern)

### 🔄 Partially Complete (1)
034 (Ember Upgrade - ongoing)

## Document Format

Each RFC follows this structure:

```markdown
# RFC-NNN: Title

**Status**: Design Phase | Implemented | Superseded
**Date**: YYYY-MM-DD
**Type**: RFC (Architecture | Configuration | Feature)
**Related**: Links to related RFCs/ADRs

## Context
Problem statement and background

## Proposal/Solution
Architecture and implementation approach

## Benefits
Key advantages and improvements

## Implementation Status
Checkboxes for completed/pending work

## References
Source documents and related materials
```

## Contributing

When adding new RFCs:
1. Assign next sequential ID (NNN format)
2. Use descriptive kebab-case filename
3. Include comprehensive front matter
4. Link related RFCs and ADRs
5. Update this README index
