# Memo Documents

Status updates, investigation findings, session summaries, quick reference guides, and completion reports from Hermes development.

## Index

### Investigation & Root Cause Analysis

- **001-admin-login-hang-rootcause.md** - Root cause analysis for admin login dashboard loading spinner hang in Promise.all()
- **075-rootcause-fetchpeople-hang.md** - Root cause analysis for maybeFetchPeople hang causing admin login spinner issue

### Implementation & Completion Reports

- **025-doc-content-integration-complete.md** - Document content API integration test completion summary
- **045-local-workspace-complete.md** - Local workspace provider implementation completion report
- **084-testing-env-complete.md** - Testing environment setup and configuration completion

### Quick Reference Guides

- **008-auth-provider-quickref.md** - Quick reference for authentication provider configuration and selection
- **017-dev-quickref.md** - Development workflow quick reference (build, test, deploy)
- **023-dex-quickstart.md** - Dex OIDC authentication quick start guide
- **052-outbox-pattern-quickref.md** - Outbox pattern implementation quick reference with SQL queries and patterns
- **058-playwright-agent-guide.md** - Comprehensive guide for AI agents using Playwright for E2E testing

### README Files

- **071-auth-providers-readme.md** - Authentication providers documentation (Google, Okta, Dex)
- **072-local-workspace-readme.md** - Local workspace provider setup and usage documentation
- **073-main-readme.md** - Main README for docs-internal directory structure

### Analysis & Metrics

- **004-agent-usage-analysis.md** - Analysis of AI agent tool usage patterns and effectiveness
- **019-dev-velocity-analysis.md** - Development velocity metrics and analysis
- **016-deliverables-summary.md** - Project deliverables and milestone summary

### Session Summaries

Detailed session notes from development work, organized by date and topic.

### Validation & Testing

Playwright E2E test results, integration test findings, and validation summaries for various features.

### Configuration & Setup

Environment setup guides, configuration documentation, and deployment instructions.

## Document Organization

Memos are organized by type:

- **NNN-*-rootcause.md**: Root cause analysis documents
- **NNN-*-complete.md**: Implementation completion reports  
- **NNN-*-quickref.md** / **NNN-*-quickstart.md**: Quick reference guides
- **NNN-*-readme.md**: README documentation
- **NNN-*-analysis.md**: Analysis and metrics documents
- **NNN-*-summary.md**: Session and feature summaries
- **NNN-*-validation.md**: Validation and test results

## Memo Format

```markdown
# Title

**Date**: YYYY-MM-DD
**Type**: Investigation | Implementation | Guide | Analysis
**Related**: Links to related documents

## Summary
Brief overview of the memo's purpose

## Content
Detailed information, findings, or instructions

## Outcomes/Next Steps
Results, action items, or follow-up work

## References
Related documents and resources
```

## Contributing

When adding new memos:
1. Assign next sequential ID (NNN format)
2. Use descriptive kebab-case filename  
3. Include type indicator in filename (-complete, -quickref, -analysis, etc.)
4. Add front matter with date and type
5. Link related RFCs, ADRs, and memos
6. Update this README index in appropriate section
