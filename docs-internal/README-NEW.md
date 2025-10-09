# Hermes Internal Documentation

Internal documentation for the Hermes document management system, organized by document type following industry-standard patterns.

## Directory Structure

```
docs-internal/
├── rfc/              # Request for Comments (Architecture & Design)
├── adr/              # Architectural Decision Records
├── memo/             # Status Updates, Guides, & Investigations
├── api-development/  # API development notes
├── archived/         # Archived historical documents
├── completed/        # Completed feature documentation
├── sessions/         # Development session notes
├── testing/          # Testing documentation and strategies
└── todos/            # Task tracking and planning
```

## Document Types

### RFC (Request for Comments)
**Location**: [`rfc/`](rfc/)

Architecture proposals, design documents, and implementation specifications for major features and refactorings.

**Examples**:
- Multi-Provider Auth Architecture
- Search and Auth Refactoring
- Outbox Pattern Design
- Document Editor Implementation
- Ember Dev Server Migration

**Format**: `NNN-descriptive-name.md`

**See**: [rfc/README.md](rfc/README.md) for complete index

### ADR (Architectural Decision Records)
**Location**: [`adr/`](adr/)

Documented architectural decisions with context, alternatives considered, and rationale.

**Examples**:
- Ember Concurrency Compatibility
- Promise Timeout Hang Fix
- Location Type Handling
- Store Error Fix
- Animated Components Fix

**Format**: `NNN-descriptive-name.md`

**See**: [adr/README.md](adr/README.md) for complete index

### Memo
**Location**: [`memo/`](memo/)

Status updates, investigation findings, quick reference guides, session summaries, and completion reports.

**Categories**:
- **Root Cause Analysis**: Investigation findings and debugging sessions
- **Completion Reports**: Implementation and feature completion summaries
- **Quick Reference**: Developer guides and quick-start documentation
- **Analysis**: Metrics, velocity, and usage analysis
- **Validation**: Test results and validation summaries

**Format**: `NNN-descriptive-name-type.md`

**See**: [memo/README.md](memo/README.md) for complete index

## Quick Links

### Getting Started
- [Development Quick Reference](memo/017-dev-quickref.md)
- [Environment Setup](memo/035-env-setup.md)
- [Testing Environment Complete](memo/084-testing-env-complete.md)

### Authentication
- [Multi-Provider Auth Architecture](rfc/007-multi-provider-auth-architecture.md)
- [Auth Provider Selection](rfc/009-auth-provider-selection.md)
- [Dex Quick Start](memo/023-dex-quickstart.md)
- [Auth Providers README](memo/071-auth-providers-readme.md)

### Search
- [Search and Auth Refactoring](rfc/076-search-auth-refactoring.md)
- [Search Endpoint Implementation](rfc/077-search-endpoint-impl.md)
- [Search Service Migration](rfc/078-search-service-migration.md)

### Document Management
- [Document Editor Implementation](rfc/026-document-editor.md)
- [Outbox Pattern Design](rfc/051-outbox-pattern-design.md)
- [Local Workspace Setup](rfc/047-local-workspace-setup.md)
- [Local Workspace README](memo/072-local-workspace-readme.md)

### Testing
- [Playwright E2E Agent Guide](memo/058-playwright-agent-guide.md)
- [Integration Test Findings](memo/043-integration-test-findings.md)
- [E2E Test Fixes](memo/028-e2e-test-fixes.md)

## Document Numbering

Documents are numbered sequentially using NNN format (001-999) based on their position in the original classification. This preserves historical ordering and makes cross-references stable.

## Document Migration

This directory was reorganized on October 8, 2025, following the prompt:

> "Work through each line of DOCUMENT_CLASSIFICATION.csv and migrate it to a docs-internal subfolder by type, rename it to have a NNN type and simple file description, process the contents of the referenced file into a condensed version that matches the file type, include front matter and background material - if related information is found to other documents that have already been indexed feel free to include it."

**Migration Process**:
1. Created type-specific subdirectories (rfc/, adr/, memo/)
2. Renamed files with NNN prefix and descriptive names
3. Added comprehensive front matter to each document
4. Condensed content while preserving key information
5. Cross-linked related documents
6. Generated README files for each subdirectory

**See**: `DOCUMENT_CLASSIFICATION.csv` for complete mapping of original to new filenames

## Contributing

### Adding New Documents

1. **Determine Document Type**:
   - **RFC**: Major architecture, design, or implementation proposal
   - **ADR**: Specific architectural decision with alternatives evaluated
   - **Memo**: Status update, guide, investigation, or summary

2. **Assign ID**: Use next sequential NNN in appropriate directory

3. **Create File**: Use format `NNN-descriptive-name.md`

4. **Add Front Matter**:
   ```markdown
   # RFC/ADR/Title
   
   **Status**: Design Phase | Implemented | Accepted | Superseded
   **Date**: YYYY-MM-DD
   **Type**: RFC/ADR/Memo (Category)
   **Related**: Links to related docs
   ```

5. **Update Index**: Add entry to appropriate README.md

### Front Matter Guidelines

**Required Fields**:
- Title (H1)
- Status
- Date
- Type
- Related (if applicable)

**Optional Fields**:
- Authors
- Reviewers
- Supersedes/Superseded By

## Maintenance

- **Active Development**: New RFCs and ADRs added as features are designed
- **Continuous Updates**: Memos added for investigations, completions, and sessions
- **Quarterly Review**: Archive outdated documents, update cross-references
- **Annual Cleanup**: Remove duplicate information, consolidate related docs

## Tools

- **Classification**: `DOCUMENT_CLASSIFICATION.csv` - Master document mapping
- **Migration**: `migrate-docs.sh` - Batch file organization script
- **Index Generation**: README.md files in each subdirectory

## Related Documentation

- **Main Project README**: `../README.md`
- **GitHub Copilot Instructions**: `../.github/copilot-instructions.md`
- **Testing Guide**: `../TESTING_ENVIRONMENTS.md`
- **Configuration Examples**: `../config.hcl`, `../configs/config.hcl`

---

**Last Updated**: October 8, 2025  
**Organization System**: RFC/ADR/Memo pattern with NNN sequential numbering  
**Total Documents**: 86 (16 RFCs, 6 ADRs, 64 Memos)
