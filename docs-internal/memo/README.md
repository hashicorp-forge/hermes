# Memo Documents

Status updates, investigation findings, session summaries, quick reference guides, and completion reports from Hermes development.

## Index

### Quick Reference Guides ✅

- **MEMO-008-auth-provider-quickref.md** - Quick reference for authentication provider configuration and selection
- **MEMO-010-ember-dev-server.md** - Ember development server, proxy configuration, and upgrade strategy
- **MEMO-017-dev-quickref.md** - Development workflow quick reference (build, test, deploy)
- **MEMO-023-dex-quickstart.md** - Dex OIDC authentication quick start guide
- **MEMO-035-env-setup.md** - **NEW!** Complete environment setup guide for new developers (10-minute quick start)
- **MEMO-052-outbox-pattern-quickref.md** - Outbox pattern implementation quick reference with SQL queries and patterns
- **MEMO-058-playwright-agent-guide.md** - Comprehensive guide for AI agents using Playwright for E2E testing
- **MEMO-071-auth-providers-guide.md** - **NEW!** Complete authentication providers guide (Google, Okta, Dex)
- **MEMO-073-docs-internal-hub.md** - **NEW!** Documentation hub and navigation guide

### Analysis & Metrics ✅

- **MEMO-004-agent-usage-analysis.md** - Analysis of AI agent tool usage patterns and effectiveness
- **MEMO-016-deliverables-summary.md** - Project deliverables and milestone summary
- **MEMO-019-dev-velocity-analysis.md** - Development velocity metrics and analysis

### Implementation Reports ✅

- **MEMO-009-ai-session-playbook.md** - AI agent session playbook with success patterns and anti-patterns
- **MEMO-011-config-cleanup.md** - Configuration file cleanup - removing duplicates (config-example.hcl, dex-config.yaml)
- **MEMO-086-memo-organization-2025-10-09.md** - Documentation reorganization into structured memos

### Investigation & Root Cause Analysis 🔜

- **MEMO-001-admin-login-hang-rootcause.md** - Root cause analysis for admin login dashboard loading spinner hang in Promise.all()
- **MEMO-075-rootcause-fetchpeople-hang.md** - Root cause analysis for maybeFetchPeople hang causing admin login spinner issue

### Implementation & Completion Reports 🔜

- **MEMO-025-doc-content-integration-complete.md** - Document content API integration test completion summary
- **MEMO-045-local-workspace-complete.md** - Local workspace provider implementation completion report
- **MEMO-084-testing-env-complete.md** - Testing environment setup and configuration completion

### README Files

- ✅ **MEMO-071-auth-providers-guide.md** - Authentication providers guide (Google, Okta, Dex)
- 🔜 **MEMO-072-local-workspace-readme.md** - Local workspace provider setup and usage documentation
- ✅ **MEMO-073-docs-internal-hub.md** - Main documentation hub for docs-internal directory structure

## Document Organization

Memos are organized by type:

- **MEMO-NNN-*-rootcause.md**: Root cause analysis documents
- **MEMO-NNN-*-complete.md**: Implementation completion reports  
- **MEMO-NNN-*-quickref.md** / **NNN-*-quickstart.md**: Quick reference guides
- **MEMO-NNN-*-readme.md**: README documentation
- **MEMO-NNN-*-analysis.md**: Analysis and metrics documents
- **MEMO-NNN-*-summary.md**: Session and feature summaries
- **MEMO-NNN-*-validation.md**: Validation and test results

## Memo Format

All memos MUST include YAML frontmatter for metadata tracking and searchability:

```markdown
---
id: MEMO-NNN
title: Descriptive Title
date: YYYY-MM-DD
type: Investigation | Implementation | Guide | Analysis | Validation | Session
status: Draft | Final | Archived
tags: [tag1, tag2, tag3]
related:
  - MEMO-XXX
  - RFC-YYY
  - ADR-ZZZ
---

# Title

## Summary
Brief overview of the memo's purpose

## Content
Detailed information, findings, or instructions

## Outcomes/Next Steps
Results, action items, or follow-up work

## References
Related documents and resources
```

**Frontmatter Fields**:
- `id`: Sequential memo identifier (MEMO-001, MEMO-002, etc.)
- `title`: Full descriptive title
- `date`: Creation or last update date (YYYY-MM-DD)
- `type`: Document category (see types below)
- `status`: Draft (WIP), Final (complete), Archived (historical)
- `tags`: Searchable keywords (e.g., authentication, testing, playwright)
- `related`: Links to related documents (optional)

## Contributing

When adding new memos:
1. Assign next sequential ID (NNN format)
2. Use descriptive kebab-case filename  
3. Include type indicator in filename (-complete, -quickref, -analysis, etc.)
4. Add front matter with date and type
5. Link related RFCs, ADRs, and memos
6. Update this README index in appropriate section
