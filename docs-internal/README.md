# Internal Documentation Index

**Purpose**: Navigation guide for internal development documentation  
**Audience**: Developers, AI agents, maintainers

## 🤖 AI Agent Workflows

### Test Coverage Improvement Workflow
**Status**: Active | **Last Updated**: 2025-10-03

A systematic approach for AI agents to improve test coverage iteratively.

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **AGENT_QUICK_REFERENCE.md** | One-page quick start | Start of each session |
| **AGENT_WORKFLOW_TEST_COVERAGE.md** | Complete workflow guide | Full process understanding |
| **COVERAGE_OPPORTUNITIES.md** | Prioritized target list | Selecting next work item |
| **AGENT_SESSION_HANDOFF_TEMPLATE.md** | Session documentation | End of each session |

**Quick Start for Agents**:
```bash
# Resume coverage improvement work
cd /Users/jrepp/hc/hermes
cat docs-internal/AGENT_QUICK_REFERENCE.md
cat docs-internal/COVERAGE_OPPORTUNITIES.md | grep -A 30 "Next Targets"
```

**Current Progress**:
- tests/api/ unit coverage: 11.8% (up from 8.5%)
- ModelToSearchDocument: 100% coverage ✅
- 15 test functions (up from 7)

## 📋 TODO Documents

### High Priority TODOs

#### TODO_API_TEST_SUITE.md
**Status**: Planned  
**Effort**: Large (4-5 weeks)  
**Description**: Comprehensive API test suite covering all endpoints, auth, and workflows  
**Related**: AGENT_WORKFLOW_TEST_COVERAGE.md implements this incrementally

#### TODO_INTEGRATION_TESTS.md
**Status**: Planned  
**Dependencies**: Unit tests >15% coverage  
**Description**: Integration tests with testcontainers for database and search operations

#### TODO_UNIT_TESTS.md
**Status**: In Progress (tests/api/ @ 11.8%)  
**Effort**: Medium (2-3 weeks)  
**Description**: Expand unit test coverage across pkg/ and internal/ packages  
**Related**: Use AGENT_WORKFLOW_TEST_COVERAGE.md to execute

### Architecture & Migration TODOs

#### TODO_SEARCH_ABSTRACTION.md
**Status**: Planned  
**Description**: Abstract search layer to support multiple search backends

#### TODO_SEARCH_ABSTRACTION-part2.md
**Status**: Planned  
**Dependencies**: TODO_SEARCH_ABSTRACTION.md  
**Description**: Phase 2 of search abstraction work

#### TODO_API_STORAGE_MIGRATION.md
**Status**: Planned  
**Description**: Migrate API layer to use storage abstraction

#### TODO_ABSTRACTION_IMPROVEMENTS.md
**Status**: Planned  
**Description**: General improvements to abstraction layers

### Ideation

#### TODO-ideation.md
**Status**: Ideas/Discussion  
**Description**: Collection of improvement ideas and future work

## 📊 Progress Tracking

### Migration & Integration

#### MIGRATION.md
**Description**: Overview of migration strategy and approach

#### MIGRATION_PROGRESS.md
**Description**: Detailed migration progress tracking

#### MIGRATION_STATUS.md
**Description**: Current status of migration work

#### MEILISEARCH_INTEGRATION_PROGRESS.md
**Description**: Meilisearch integration status and progress

### Search Abstraction

#### SEARCH_ABSTRACTION_INTRO_SUMMARY.md
**Description**: Introduction and summary of search abstraction work

#### SEARCH_ABSTRACTION_IMPLEMENTATION.md
**Description**: Implementation details and technical approach

### Storage Abstraction

#### STORAGE_ABSTRACTION_PROPOSAL.md
**Description**: Proposal for storage layer abstraction

#### STORAGE_SEQUENCE_DIAGRAMS.md
**Description**: Sequence diagrams for storage operations

## 🔧 Setup & Configuration

#### ENV_SETUP.md
**Description**: Environment setup instructions and configuration details

## 📁 Document Categories

### By Status
- **Active**: AGENT_WORKFLOW_TEST_COVERAGE.md, TODO_UNIT_TESTS.md
- **Planned**: TODO_API_TEST_SUITE.md, TODO_INTEGRATION_TESTS.md, TODO_SEARCH_ABSTRACTION*.md
- **In Progress**: Migration docs, Search abstraction implementation
- **Reference**: ENV_SETUP.md, STORAGE_SEQUENCE_DIAGRAMS.md

### By Audience
- **AI Agents**: AGENT_*.md, COVERAGE_OPPORTUNITIES.md
- **Developers**: TODO_*.md, ENV_SETUP.md
- **Architecture**: STORAGE_ABSTRACTION_PROPOSAL.md, SEARCH_ABSTRACTION_*.md
- **Progress Tracking**: MIGRATION_*.md, *_PROGRESS.md

### By Type
- **Workflows**: AGENT_WORKFLOW_TEST_COVERAGE.md
- **Quick Reference**: AGENT_QUICK_REFERENCE.md
- **Templates**: AGENT_SESSION_HANDOFF_TEMPLATE.md
- **TODOs**: TODO_*.md
- **Progress**: MIGRATION_PROGRESS.md, MEILISEARCH_INTEGRATION_PROGRESS.md
- **Proposals**: STORAGE_ABSTRACTION_PROPOSAL.md
- **Implementation**: SEARCH_ABSTRACTION_IMPLEMENTATION.md

## 🎯 Getting Started Paths

### For AI Agents: Improve Test Coverage
1. Read `AGENT_QUICK_REFERENCE.md` (5 min)
2. Check `COVERAGE_OPPORTUNITIES.md` for next target
3. Follow workflow in `AGENT_WORKFLOW_TEST_COVERAGE.md`
4. Document session in `AGENT_SESSION_HANDOFF_TEMPLATE.md`

### For Developers: Understand Architecture
1. Read `STORAGE_ABSTRACTION_PROPOSAL.md`
2. Review `STORAGE_SEQUENCE_DIAGRAMS.md`
3. Check `SEARCH_ABSTRACTION_INTRO_SUMMARY.md`
4. Review migration progress in `MIGRATION_STATUS.md`

### For Project Planning
1. Review all `TODO_*.md` files for scope
2. Check `MIGRATION_PROGRESS.md` for current state
3. Prioritize based on dependencies
4. Review `TODO-ideation.md` for future work

## 📈 Metrics & Progress

### Test Coverage (as of 2025-10-03)
- **tests/api/ unit**: 11.8% overall, 100% on pure functions
- **Target**: >15% overall, 100% on all pure functions
- **Integration**: Not yet measured (requires testcontainers)

### Migration Status
- See `MIGRATION_STATUS.md` for current state
- See `MIGRATION_PROGRESS.md` for detailed tracking

### Search Integration
- See `MEILISEARCH_INTEGRATION_PROGRESS.md` for current state

## 🔗 Related Resources

### Test Documentation
- `/tests/api/COVERAGE_REPORT.md` - Detailed coverage metrics
- `/tests/api/COVERAGE_SUMMARY.md` - Executive summary
- `/tests/api/TEST_SEPARATION_GUIDE.md` - Unit vs integration test guide

### Project Documentation
- `/README.md` - Main project README
- `/Makefile` - Build and test targets
- `/configs/config.hcl` - Configuration template

## 🤝 Contributing to Documentation

### Adding New Documents
1. Follow naming convention: `CATEGORY_TOPIC.md` or `AGENT_WORKFLOW_NAME.md`
2. Include header section with: Purpose, Status, Date, Dependencies
3. Update this README.md index
4. Cross-reference related documents

### Updating Existing Documents
1. Update "Last Updated" timestamp
2. Mark status changes (Planned → In Progress → Complete)
3. Update related documents if content changes
4. Keep metrics and progress sections current

### Documentation Standards
- Use Markdown formatting
- Include code examples with syntax highlighting
- Add command examples with expected output
- Link to related documents
- Include "Quick Start" section for workflows
- Add troubleshooting/common issues section

## 📞 Questions?

- Check `ENV_SETUP.md` for environment issues
- Check `AGENT_WORKFLOW_TEST_COVERAGE.md` for test coverage questions
- Check `MIGRATION_STATUS.md` for migration questions
- Check relevant `TODO_*.md` for feature/component questions

---

**Last Updated**: 2025-10-03  
**Maintainers**: Hermes development team  
**Purpose**: Internal documentation organization and navigation
