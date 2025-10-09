---
id: MEMO-073
title: Docs Internal - Documentation Hub
date: 2025-10-09
type: Guide
status: Final
tags: [documentation, index, onboarding]
related:
  - MEMO-035
  - MEMO-017
---

# Hermes Documentation Hub

**Welcome!** This directory contains all internal documentation for the Hermes project.

## 🚀 Quick Start for New Developers

1. **Setup Environment**: Read [MEMO-035: Environment Setup](memo/MEMO-035-env-setup.md)
2. **Dev Workflows**: Read [MEMO-017: Dev Quick Reference](memo/MEMO-017-dev-quickref.md)
3. **Authentication**: Read [MEMO-023: Dex Quick Start](memo/MEMO-023-dex-quickstart.md)
4. **Testing**: Read [MEMO-058: Playwright E2E Guide](memo/MEMO-058-playwright-agent-guide.md)

## 📁 Documentation Structure

### `/memo/` - Quick Reference Guides ⭐

**Most useful for day-to-day development**. Concise, practical guides with YAML frontmatter.

**Essential Memos**:
- **MEMO-017**: Dev Quick Reference (workflows, ports, debugging)
- **MEMO-023**: Dex Quick Start (5-minute auth setup)
- **MEMO-035**: Environment Setup (complete onboarding guide)
- **MEMO-058**: Playwright E2E Agent Guide (testing workflows)

**Configuration & Setup**:
- **MEMO-014**: Config HCL Documentation (all config options)
- **MEMO-011**: Config Cleanup (configuration file strategy)

**Architecture & Design**:
- **MEMO-004**: Agent Usage Analysis (AI-assisted development patterns)
- **MEMO-019**: Dev Velocity Analysis (productivity metrics)
- **MEMO-052**: Outbox Pattern Quick Ref (database patterns)

**Frontend Development**:
- **MEMO-010**: Ember Dev Server (frontend architecture)

**AI Agent Guides**:
- **MEMO-008**: Auth Provider Quick Ref (runtime provider selection)
- **MEMO-009**: AI Session Playbook (agent workflow patterns)

**Project Meta**:
- **MEMO-016**: Deliverables Summary (prompt templates)
- **MEMO-086**: Memo Organization (how this system works)

See [memo/README.md](memo/README.md) for complete index.

### `/rfc/` - Request for Comments

**Design documents** for major features and architecture changes.

**Key RFCs**:
- **RFC-007**: Multi-Provider Auth Architecture
- **RFC-009**: Auth Provider Selection
- **RFC-020**: Dex Authentication Implementation
- **RFC-026**: Document Editor Implementation
- **RFC-033**: Ember Dev Server Migration
- **RFC-051**: Outbox Pattern Design
- **RFC-076**: Search and Auth Refactoring
- **RFC-079**: Local Editor E2E Testing
- **RFC-080**: Outbox Pattern Document Sync

See [rfc/README.md](rfc/README.md) for complete list.

### `/adr/` - Architecture Decision Records

**Decision logs** explaining "why we chose X over Y" with context and consequences.

**Key ADRs**:
- **ADR-006**: Animated Components Fix
- **ADR-029**: Ember Concurrency Compatibility
- **ADR-032**: Ember Data Store Error Fix
- **ADR-036**: Fix Location Type
- **ADR-048**: Local Workspace User Info
- **ADR-065**: Promise Timeout Hang
- **ADR-070**: Testing Docker Compose Environment
- **ADR-071**: Local File Workspace System
- **ADR-072**: Dex OIDC Authentication for Development
- **ADR-073**: Provider Abstraction Architecture
- **ADR-074**: Playwright for Local Iteration
- **ADR-075**: Meilisearch as Local Search Solution

See [adr/README.md](adr/README.md) for complete list.

### `/todos/` - Active Work Items

**Tracked TODOs** with priority, status, and progress tracking.

**High Priority**:
- **TODO-002**: API Test Suite (29% complete)
- **TODO-003**: Search Provider Migration (71% complete)
- **TODO-004**: Async Email Sending
- **TODO-005**: Data Consistency (critical)

See [todos/README.md](todos/README.md) for full backlog.

### `/testing/` - Testing Documentation

**Test strategies**, environment setup, and debugging guides.

**Key Documents**:
- Test parallelization guides
- Coverage analysis
- Integration test patterns
- E2E test strategies

### `/sessions/` - Development Session Notes

**Chronological logs** of development sessions for historical context.

### `/archived/` - Historical Documentation

**Superseded documents** kept for reference but no longer current.

### `/completed/` - Finished Implementation Notes

**Implementation summaries** for completed features and fixes.

## 📊 Finding Documentation

### By Topic

**Authentication**:
- MEMO-023 (Dex Quick Start)
- MEMO-008 (Auth Provider Quick Ref)
- RFC-007 (Multi-Provider Auth Architecture)
- RFC-009 (Auth Provider Selection)
- ADR-072 (Dex OIDC Decision)

**Development Workflows**:
- MEMO-017 (Dev Quick Reference)
- MEMO-035 (Environment Setup)
- MAKEFILE_ROOT_TARGETS.md (Make commands)

**Testing**:
- MEMO-058 (Playwright E2E Guide)
- RFC-079 (Local Editor E2E Testing)
- ADR-070 (Testing Docker Compose)
- ADR-074 (Playwright for Local Iteration)

**Search & Search Providers**:
- MEMO-052 (Outbox Pattern)
- RFC-076 (Search Refactoring)
- ADR-075 (Meilisearch Decision)
- TODO-003 (Search Provider Migration)

**Frontend (Ember.js)**:
- MEMO-010 (Ember Dev Server)
- RFC-033 (Dev Server Migration)
- RFC-034 (Ember Upgrade Strategy)
- ADR-006, ADR-029, ADR-032, ADR-036 (Various fixes)

**Configuration**:
- MEMO-014 (Config HCL Documentation)
- MEMO-011 (Config Cleanup)
- TODO-008 (Make Config Configurable)

**Database & Persistence**:
- MEMO-052 (Outbox Pattern)
- RFC-051 (Outbox Design)
- RFC-080 (Document Sync)
- TODO-005 (Data Consistency)

**AI-Assisted Development**:
- MEMO-004 (Agent Usage Analysis)
- MEMO-009 (AI Session Playbook)
- MEMO-016 (Deliverables Summary)
- MEMO-019 (Dev Velocity Analysis)
- PROMPT_TEMPLATES.md (Prompt library)

### By Document Type

**Quick Start Guides** (read these first):
- MEMO-035: Environment Setup
- MEMO-017: Dev Quick Reference
- MEMO-023: Dex Quick Start

**Reference Guides** (keep these handy):
- MEMO-014: Config HCL Documentation
- MEMO-058: Playwright E2E Guide
- MAKEFILE_ROOT_TARGETS.md: Make commands
- PROMPT_TEMPLATES.md: AI prompt library

**Architecture Documents** (understand the design):
- RFCs in `/rfc/` for "what we're building"
- ADRs in `/adr/` for "why we chose this approach"

**Implementation Notes** (how it was built):
- Session notes in `/sessions/`
- Completion summaries in `/completed/`

## 🏗️ Documentation Standards

### YAML Frontmatter

All memos, RFCs, and ADRs use YAML frontmatter:

```yaml
---
id: MEMO-NNN or RFC-NNN or ADR-NNN
title: Descriptive Title
date: YYYY-MM-DD
type: Guide | RFC | ADR | Memo | Analysis | etc.
status: Draft | Final | Archived
tags: [tag1, tag2, tag3]
related:
  - MEMO-XXX
  - RFC-YYY
---
```

**Benefits**:
- Machine-readable metadata
- Easy cross-referencing
- Search/filter by tags
- Status tracking

### Naming Conventions

**Memos**: `MEMO-NNN-short-description.md` (sequential numbering)  
**RFCs**: `RFC-NNN-feature-name.md` (3-digit zero-padded)  
**ADRs**: `ADR-NNN-decision-name.md` (3-digit zero-padded)  
**TODOs**: `TODO-NNN-task-description.md` (sequential)

### When to Create What

**Create a MEMO when**:
- Writing a quick reference guide
- Documenting a completed session
- Creating an analysis report
- Writing a playbook or checklist

**Create an RFC when**:
- Designing a new feature (before implementation)
- Proposing significant architectural changes
- Need stakeholder review and feedback

**Create an ADR when**:
- Making an architectural decision
- Choosing between multiple options
- Decision will have long-term impact
- Need to document the "why" for future developers

**Create a TODO when**:
- Tracking work items
- Managing backlog
- Need priority/status tracking
- Want to link related work

## 🔍 Search Tips

**Find by topic**:
```bash
# Search all markdown files
grep -r "authentication" docs-internal/*.md

# Search memos only
grep -r "testing" docs-internal/memo/*.md

# Find by tag (in frontmatter)
grep -A 5 "^tags:" docs-internal/memo/*.md | grep "testing"
```

**Find by status**:
```bash
# Find draft documents
grep "status: Draft" docs-internal/**/*.md

# Find completed work
grep "status: Final" docs-internal/memo/*.md
```

**Find related documents**:
```bash
# Find docs related to a specific memo/RFC/ADR
grep "MEMO-017" docs-internal/**/*.md
```

## 🤝 Contributing Documentation

### Adding a New Memo

1. **Choose next number**: Check `memo/README.md` for highest MEMO-NNN
2. **Create file**: `memo/MEMO-NNN-description.md`
3. **Add frontmatter**: Use template above
4. **Write content**: Clear, concise, practical
5. **Update index**: Add to `memo/README.md`
6. **Cross-reference**: Link from related docs

### Adding an RFC

1. **Choose next number**: Check `rfc/README.md`
2. **Create file**: `rfc/RFC-NNN-feature.md`
3. **Use RFC template**: See existing RFCs for structure
4. **Include**: Problem, Proposal, Alternatives, Trade-offs
5. **Update index**: Add to `rfc/README.md`

### Adding an ADR

1. **Choose next number**: Check `adr/README.md`
2. **Create file**: `adr/ADR-NNN-decision.md`
3. **Use ADR template**: Context, Decision, Consequences
4. **Update index**: Add to `adr/README.md`

## 📈 Documentation Metrics

**Current Status** (as of October 9, 2025):
- **Memos**: 12 (with more in progress)
- **RFCs**: 80+ (major feature designs)
- **ADRs**: 75+ (architecture decisions)
- **TODOs**: 10 active work items
- **Test Coverage**: See `TEST_COVERAGE_PROGRESS.md`
- **Documentation Ratio**: ~38% (lines of docs / lines of code)

## 🎓 Learning Path

**Week 1: Environment & Basics**
- Day 1: MEMO-035 (Environment Setup)
- Day 2: MEMO-017 (Dev Workflows)
- Day 3: MEMO-023 (Dex Auth)
- Day 4: MEMO-058 (E2E Testing)
- Day 5: Run tests, create first PR

**Week 2: Architecture**
- Read key RFCs (007, 009, 020, 026, 076)
- Read key ADRs (070, 071, 072, 073, 074, 075)
- Understand provider abstraction pattern
- Review test suite structure

**Week 3+: Deep Dives**
- Pick a TODO from `/todos/README.md`
- Read related RFCs/ADRs
- Implement with TDD
- Document in session notes

## 🆘 Getting Help

**Stuck on setup?** → MEMO-035, MEMO-017  
**Authentication issues?** → MEMO-023, MEMO-008  
**Test failures?** → MEMO-058, ADR-070, ADR-074  
**Architecture questions?** → Search RFCs and ADRs  
**Configuration problems?** → MEMO-014  

**Still stuck?** File an issue with:
1. What you're trying to do
2. What you expected
3. What actually happened
4. Relevant logs/errors
5. Which docs you've read

## 📝 Commit Standards

**All AI-generated or AI-assisted commits MUST include the prompt in the commit message.**

See `.github/copilot-instructions.md` for full commit standards.

## 🔗 External Resources

- **GitHub Repository**: https://github.com/hashicorp/hermes
- **HashiCorp Design System**: https://design-system.service.hashicorp.com/
- **Ember.js Docs**: https://guides.emberjs.com/
- **Go Documentation**: https://go.dev/doc/
- **Playwright Docs**: https://playwright.dev/

---

**Last Updated**: October 9, 2025  
**Maintainer**: Hermes Team  
**Questions?** See `MEMO-073` (this file) or file an issue
