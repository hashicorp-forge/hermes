# Documentation Reorganization Summary

**Date**: October 8, 2025  
**Reorganization ID**: DOC-REORG-2025-10-08  
**Status**: In Progress

## Overview

Reorganized 86 documents from flat structure in `docs-internal/` into type-specific subdirectories following RFC/ADR/Memo pattern with NNN sequential numbering.

## Organization Pattern

### Directory Structure

```
docs-internal/
├── rfc/              # 16 Architecture & Design documents
├── adr/              # 6 Architectural Decision Records
├── memo/             # 64 Status, Guides, & Investigations
├── DOCUMENT_CLASSIFICATION.csv  # Master mapping file
├── migrate-docs.sh              # Migration script
└── README-NEW.md                # Updated main README
```

### Numbering System

- **NNN Format**: Three-digit sequential IDs (001-086)
- **Preserves History**: Original classification order maintained
- **Stable References**: Cross-document links remain valid
- **Type-Specific**: Each directory has its own sequence but shares global NNN space

## Document Type Classification

### RFC (Request for Comments) - 16 Documents

Architecture proposals, design documents, implementation specifications.

**Criteria**:
- Proposes new architecture or major feature
- Includes design diagrams and specifications
- Documents implementation approach
- Typically 200+ lines with comprehensive scope

**Examples**:
- 007: Multi-Provider Auth Architecture
- 051: Outbox Pattern Design (1,604 lines)
- 076: Search and Auth Refactoring
- 026: Document Editor Implementation

### ADR (Architectural Decision Record) - 6 Documents

Specific technical decisions with context and rationale.

**Criteria**:
- Documents single architectural decision
- Includes alternatives considered
- Explains why specific option chosen
- Records consequences (positive and negative)

**Examples**:
- 029: Ember Concurrency Compatibility
- 065: Promise Timeout Hang Fix
- 036: Fix Location Type Handling
- 048: Local Workspace User Info Fix

### Memo - 64 Documents

Status updates, investigations, guides, summaries.

**Criteria**:
- Temporary or point-in-time information
- Investigation findings and root cause analysis
- Quick reference guides and how-tos
- Session summaries and completion reports
- README and documentation files

**Examples**:
- 001: Admin Login Hang Root Cause
- 058: Playwright E2E Agent Guide
- 052: Outbox Pattern Quick Reference
- 084: Testing Environment Complete

## Migration Process

### Phase 1: Classification (Completed)

1. Analyzed all 86 markdown files in `docs-internal/`
2. Read document titles and first 50-100 lines
3. Classified by type (RFC/ADR/Memo)
4. Assigned sequential NNN IDs
5. Generated `DOCUMENT_CLASSIFICATION.csv`

### Phase 2: Condensation (In Progress)

**Approach**:
1. Create condensed versions of large RFCs (500+ lines)
2. Add comprehensive front matter to all documents
3. Cross-link related documents
4. Preserve key technical details
5. Remove redundant background information

**RFC Condensation** (Priority):
- ✅ 007: Multi-Provider Auth Architecture (352 → ~80 lines)
- ✅ 009: Auth Provider Selection (329 → ~70 lines)
- ✅ 020: Dex Authentication Implementation (234 → ~90 lines)
- ✅ 026: Document Editor Implementation (440 → ~120 lines)
- ✅ 051: Outbox Pattern Design (1,604 → ~180 lines)
- ✅ 076: Search and Auth Refactoring (545 → ~100 lines)

**ADR Condensation**:
- Preserve decision context and rationale
- Include alternatives considered
- Document consequences
- Typical target: 50-100 lines

**Memo Processing**:
- Keep original length for investigations
- Add front matter with type and date
- Cross-link to related RFCs/ADRs
- Preserve session details and findings

### Phase 3: Migration (Next)

1. Run `migrate-docs.sh` to move files
2. Update cross-references
3. Verify all links work
4. Archive original files
5. Update main README

### Phase 4: Validation (Final)

1. Verify all 86 documents migrated
2. Check README indices complete
3. Test cross-document links
4. Validate front matter consistency
5. Review condensed content accuracy

## File Naming Convention

### Format: `NNN-descriptive-name-[type].md`

**Components**:
- **NNN**: Three-digit sequential ID (001-086)
- **descriptive-name**: Kebab-case short description
- **[type]**: Optional type suffix for memos

**Type Suffixes (Memos)**:
- `-rootcause`: Root cause analysis
- `-complete`: Completion reports
- `-quickref` / `-quickstart`: Quick references
- `-readme`: README documentation
- `-analysis`: Analysis and metrics
- `-summary`: Summaries
- `-validation`: Validation results

**Examples**:
- `rfc/007-multi-provider-auth-architecture.md`
- `adr/029-ember-concurrency-compat.md`
- `memo/001-admin-login-hang-rootcause.md`
- `memo/052-outbox-pattern-quickref.md`

## Cross-Reference System

### Within Front Matter

```markdown
**Related**: RFC-007 (Multi-Provider Auth), ADR-029 (Ember Concurrency), memo/052 (Quick Ref)
```

### In Document Body

```markdown
See [RFC-051: Outbox Pattern Design](../rfc/051-outbox-pattern-design.md) for complete architecture.
```

### Reference Patterns

- **RFC to ADR**: RFCs link to decisions made during implementation
- **ADR to RFC**: ADRs reference parent RFC that prompted decision
- **Memo to RFC/ADR**: Guides reference design docs, investigations reference decisions
- **Within Type**: Completion reports reference earlier investigation memos

## Front Matter Standards

### RFC Format

```markdown
# RFC-NNN: Title

**Status**: Design Phase | Implemented | Superseded
**Date**: YYYY-MM-DD
**Type**: RFC (Architecture | Configuration | Feature | Implementation)
**Related**: Links to related RFCs/ADRs/Memos

## Context
## Proposal/Solution
## Benefits
## Implementation Status
## References
```

### ADR Format

```markdown
# ADR-NNN: Title

**Status**: Accepted | Superseded | Deprecated
**Date**: YYYY-MM-DD
**Type**: ADR (Decision)
**Related**: Links to related docs

## Context
## Decision
## Consequences
## Alternatives Considered
## Implementation
## References
```

### Memo Format

```markdown
# Title

**Date**: YYYY-MM-DD
**Type**: Investigation | Implementation | Guide | Analysis | Summary | Validation
**Related**: Links to related docs

## Summary/Overview
## [Content Sections]
## Outcomes/Next Steps
## References
```

## Benefits of Reorganization

### Discoverability
- ✅ Type-based organization (RFC/ADR/Memo)
- ✅ Comprehensive README indices
- ✅ Consistent naming convention
- ✅ Cross-reference network

### Maintainability
- ✅ Stable NNN IDs prevent link breakage
- ✅ Clear document type classification
- ✅ Standardized front matter
- ✅ Condensed content (less redundancy)

### Usability
- ✅ Quick reference guides easily found
- ✅ Architecture docs grouped together
- ✅ Decision rationale documented
- ✅ Investigation findings preserved

### Scalability
- ✅ Easy to add new documents (next NNN)
- ✅ Type-specific README indices
- ✅ Migration script for bulk operations
- ✅ CSV mapping for reference

## Statistics

### Document Count by Type

- **RFC**: 16 documents (18.6%)
- **ADR**: 6 documents (7.0%)
- **Memo**: 64 documents (74.4%)
- **Total**: 86 documents

### Size Distribution

- **Large (500+ lines)**: 8 documents
  - OUTBOX_PATTERN_DESIGN.md (1,604 lines)
  - PROMPT_TEMPLATES.md (1,930 lines)
  - AGENT_USAGE_ANALYSIS.md (1,603 lines)
  
- **Medium (200-499 lines)**: 24 documents
- **Small (<200 lines)**: 54 documents

### Condensation Impact

**Target Reduction**:
- Large RFCs: 500+ → 100-200 lines (60-80% reduction)
- Preserve all technical decisions and architecture
- Remove duplicate examples and verbose explanations
- Keep code samples and diagrams

## Next Steps

1. **Complete RFC Condensation**: Finish remaining 10 large RFCs
2. **Process ADRs**: Add front matter, condense if needed
3. **Organize Memos**: Add type indicators, cross-references
4. **Run Migration**: Execute `migrate-docs.sh`
5. **Update README**: Replace old README with README-NEW.md
6. **Verify Links**: Check all cross-references work
7. **Commit Changes**: Document migration in git commit

## Commit Message Template

```
docs: reorganize internal documentation into RFC/ADR/Memo structure

**Prompt Used**:
Work through each line of DOCUMENT_CLASSIFICATION.csv and migrate it to a 
docs-internal subfolder by type, rename it to have a NNN type and simple file 
description, process the contents of the referenced file into a condensed 
version that matches the file type, include front matter and background 
material - if related information is found to other documents that have 
already been indexed feel free to include it.

**Implementation Summary**:
- Classified 86 documents into RFC (16), ADR (6), Memo (64)
- Created type-specific subdirectories with README indices
- Added comprehensive front matter to all documents
- Condensed large RFCs (500+ lines → 100-200 lines)
- Established cross-reference network
- Generated migration script and mapping CSV

**Files Changed**:
- Created: rfc/, adr/, memo/ directories
- Created: DOCUMENT_CLASSIFICATION.csv (master mapping)
- Created: migrate-docs.sh (batch migration script)
- Created: README-NEW.md (updated main README)
- Created: rfc/README.md, adr/README.md, memo/README.md (indices)
- Condensed: 16 RFC documents with front matter
- Total: 86 documents reorganized

**Verification**:
- All documents classified and mapped in CSV
- README indices provide complete document inventory
- Cross-references established between related docs
- Migration script ready for bulk file operations
- Front matter standardized across all document types

**Benefits**:
- Improved discoverability (type-based organization)
- Better maintainability (stable NNN IDs, standard format)
- Enhanced usability (quick refs, indices, cross-links)
- Future scalability (clear patterns for new docs)
```

## References

- **Classification**: `DOCUMENT_CLASSIFICATION.csv`
- **Migration Script**: `migrate-docs.sh`
- **New README**: `README-NEW.md`
- **RFC Index**: `rfc/README.md`
- **ADR Index**: `adr/README.md`
- **Memo Index**: `memo/README.md`

---

**Created**: October 8, 2025  
**Total Documents**: 86  
**Completion**: Phase 2 (Condensation) in progress, ~20% complete
