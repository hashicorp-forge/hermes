# RFC-078: New Document Types for HashiCorp Documentation

**Status**: Proposed  
**Date**: October 9, 2025  
**Type**: RFC (Feature Proposal)  
**Related**: ADR-073 (Provider Abstraction), RFC-047 (Local Workspace)

## Summary

Expand Hermes document type system beyond RFC/PRD to support additional HashiCorp documentation needs: **ADR (Architecture Decision Record)**, **Memo (Internal Communication)**, **FRD (Functional Requirements Document)**, and **PATH (Product and Technical History)**.

## Motivation

### Current Limitations

Hermes currently supports only 3 document types:
- **RFC** (Request for Comments) - Technical proposals
- **PRD** (Product Requirements Document) - Product specifications  
- **FRD** (Functional Requirements Document) - Functional specifications (partially implemented)

**Problems**:
1. **Architecture Decisions Scattered**: No structured way to document "why we built it this way"
2. **Lost Context**: Implementation decisions fade from memory, no searchable history
3. **Onboarding Friction**: New engineers spend weeks understanding rationale
4. **Communication Gap**: No standard format for memos, announcements, technical updates
5. **Historical Knowledge**: Product evolution not documented, tribal knowledge
6. **Workarounds**: Teams misuse RFC format for non-proposal content

### User Stories

**Story 1: Engineering Manager**
> "I need to document why we chose Meilisearch over Elasticsearch, so future engineers understand the trade-offs without re-litigating the decision."

**Story 2: Staff Engineer Onboarding**
> "I've been reading code for 2 weeks. I understand *what* it does, but not *why* it was built this way. Is there documentation of the architectural decisions?"

**Story 3: Product Manager**
> "I need to write a memo explaining the shift in product strategy. RFC format doesn't fit—it's not a proposal, it's a directive."

**Story 4: Technical Writer**
> "I'm documenting the product history for the public docs. I need to trace how features evolved over time, but there's no structured timeline."

## Proposed Document Types

### 1. ADR (Architecture Decision Record)

**Purpose**: Document significant architectural decisions with context, rationale, and consequences.

**Template Structure**:
```markdown
# ADR-{number}: {Short Title}

**Status**: Proposed | Accepted | Deprecated | Superseded  
**Date**: YYYY-MM-DD  
**Type**: ADR (System Architecture | Infrastructure | Development Tooling)  
**Related**: RFC-XXX, ADR-YYY

## Context
What is the issue we're facing? What forces are at play?

## Decision
What did we decide to do and why?

## Consequences
What becomes easier or harder as a result?

### Positive ✅
- Benefit 1
- Benefit 2

### Negative ❌
- Trade-off 1
- Trade-off 2

## Alternatives Considered
What other options did we evaluate? Why did we reject them?

## Future Considerations
What might we revisit later?
```

**Metadata**:
```yaml
docType: ADR
number: 73
status: accepted
date: 2025-10-09
category: system-architecture
supersedes: [ADR-45]
supersededBy: null
relatedRFCs: [RFC-047, RFC-076]
```

**Use Cases**:
- Database schema decisions (PostgreSQL vs MongoDB)
- Provider abstraction architecture
- Testing strategy (Playwright vs Selenium)
- Deployment patterns (Docker Compose vs Kubernetes)
- Technology choices (Meilisearch vs Elasticsearch)

### 2. Memo (Internal Communication)

**Purpose**: Formal internal announcements, policy changes, technical updates.

**Template Structure**:
```markdown
# Memo: {Subject}

**From**: {Author/Team}  
**To**: {Audience}  
**Date**: YYYY-MM-DD  
**Classification**: Public | Internal | Confidential

## Summary
One-paragraph overview.

## Background
Context for this communication.

## Key Points
- Main point 1
- Main point 2
- Main point 3

## Action Items
What should readers do?

## Timeline
When does this take effect?

## Questions?
How to get clarification?
```

**Metadata**:
```yaml
docType: Memo
from: engineering-team
to: all-engineers
classification: internal
effectiveDate: 2025-10-15
expirationDate: null
```

**Use Cases**:
- Policy changes (new review process)
- Technical updates (deprecation notices)
- Incident postmortems
- Team restructuring announcements
- Process improvements

### 3. FRD (Functional Requirements Document) - Enhanced

**Purpose**: Detailed functional specifications (currently partially implemented, needs enhancement).

**Template Structure** (revised):
```markdown
# FRD-{number}: {Feature Name}

**Status**: Draft | Review | Approved | Implemented  
**Owner**: {PM Name}  
**Engineering Lead**: {Engineer Name}  
**Target Release**: Q3 2025

## Objective
What problem does this solve?

## User Stories
- As a {user type}, I want {goal}, so that {benefit}

## Functional Requirements
### Must Have (P0)
- Requirement 1
- Requirement 2

### Should Have (P1)
- Requirement 3

### Nice to Have (P2)
- Requirement 4

## Non-Functional Requirements
- Performance: < 500ms response time
- Availability: 99.9% uptime
- Security: OAuth2 authentication

## Out of Scope
What we are NOT building.

## Dependencies
- Requires RFC-123 to be implemented
- Blocked by infrastructure upgrade

## Success Metrics
How do we measure success?

## Design Mockups
[Link to Figma]

## API Specifications
[Link to OpenAPI spec]

## Testing Strategy
Unit | Integration | E2E | Load

## Rollout Plan
Phased rollout, feature flags, rollback strategy
```

**Metadata**:
```yaml
docType: FRD
number: 42
status: approved
owner: jane.doe@hashicorp.com
engineeringLead: john.smith@hashicorp.com
targetRelease: Q3-2025
relatedRFCs: [RFC-123]
epic: JIRA-456
```

### 4. PATH (Product and Technical History)

**Purpose**: Chronological record of product evolution, feature history, technical milestones.

**Template Structure**:
```markdown
# PATH: {Product/Feature Name}

**Product**: {Hermes | Terraform | Vault | ...}  
**Timeframe**: {Start Date} - {End Date or "Present"}  
**Owner**: {Product/Engineering Team}

## Overview
High-level summary of this product/feature area.

## Timeline

### YYYY-MM: {Milestone}
**Status**: {Concept | Development | Beta | GA | Deprecated}  
**Key Changes**:
- Change 1
- Change 2

**Decisions**:
- [ADR-73]: Provider abstraction
- [RFC-047]: Local workspace

**Impact**:
- Metric improvements
- User feedback

### YYYY-MM: {Next Milestone}
...

## Key Decisions Archive
Links to related ADRs and RFCs in chronological order.

## Metrics Over Time
| Date | Users | Documents | Search Queries |
|------|-------|-----------|----------------|
| 2024-01 | 50 | 120 | 1,200 |
| 2024-06 | 180 | 450 | 5,800 |
| 2025-01 | 320 | 890 | 12,400 |

## Lessons Learned
What worked? What didn't? What would we do differently?

## Future Direction
Where is this heading?
```

**Metadata**:
```yaml
docType: PATH
product: hermes
startDate: 2023-01-15
status: active
maintainer: product-team
relatedProducts: [terraform-docs, vault-docs]
```

**Use Cases**:
- Onboarding documentation
- Product marketing timeline
- Technical debt tracking
- Feature deprecation history
- Organizational memory

## Implementation Plan

### Phase 1: Backend Schema (Week 1-2)

**Database Migration**:
```go
// pkg/models/document.go
type Document struct {
    // ... existing fields ...
    DocType       string `gorm:"type:varchar(10);not null;index"` // RFC, PRD, FRD, ADR, Memo, PATH
    DocNumber     int    `gorm:"index"` // For ADR-73, RFC-123 style numbering
    Classification string `gorm:"type:varchar(20)"` // For Memos: public, internal, confidential
    EffectiveDate *time.Time // For Memos: when policy takes effect
    TargetRelease string // For FRDs: Q3-2025
    Supersedes    []string `gorm:"type:jsonb"` // For ADRs: [ADR-45, ADR-67]
    SupersededBy  *string // For ADRs: ADR-89
}
```

**API Endpoints**:
```
POST   /api/v2/documents?docType=adr
GET    /api/v2/documents?docType=adr&status=accepted
GET    /api/v2/documents/adr/73
DELETE /api/v2/documents/adr/73
```

**Validation**:
```go
// pkg/hashicorpdocs/adr/validator.go
func (v *ADRValidator) Validate(doc *Document) error {
    if doc.DocType != "ADR" {
        return errors.New("invalid docType")
    }
    if doc.DocNumber < 1 {
        return errors.New("ADR number required")
    }
    if !validStatus(doc.Status) {
        return errors.New("status must be: proposed, accepted, deprecated, superseded")
    }
    // ... more validation
}
```

### Phase 2: Template System (Week 3-4)

**Template Storage** (`pkg/hashicorpdocs/templates/`):
```
templates/
├── adr.md          # ADR template
├── memo.md         # Memo template
├── frd.md          # Enhanced FRD template
└── path.md         # PATH template
```

**Template Variables**:
```go
// pkg/hashicorpdocs/template.go
type TemplateVars struct {
    DocType       string
    DocNumber     int
    Title         string
    Author        string
    Date          string
    Status        string
    Category      string // For ADR: system-architecture, infrastructure, etc.
    From          string // For Memo
    To            string // For Memo
    Classification string // For Memo
}

func RenderTemplate(docType string, vars TemplateVars) (string, error) {
    tmpl := loadTemplate(docType)
    return executeTemplate(tmpl, vars)
}
```

**Auto-Numbering**:
```go
func GetNextDocNumber(docType string) (int, error) {
    var maxNumber int
    err := db.Model(&Document{}).
        Where("doc_type = ?", docType).
        Select("COALESCE(MAX(doc_number), 0)").
        Scan(&maxNumber).Error
    return maxNumber + 1, err
}
```

### Phase 3: Frontend UI (Week 5-6)

**Document Type Selector** (`web/app/components/document-type-selector.ts`):
```typescript
export default class DocumentTypeSelector extends Component {
  @tracked selectedType = 'RFC';

  docTypes = [
    { value: 'RFC', label: 'RFC - Request for Comments', icon: 'message-circle' },
    { value: 'PRD', label: 'PRD - Product Requirements', icon: 'clipboard-check' },
    { value: 'FRD', label: 'FRD - Functional Requirements', icon: 'list-check' },
    { value: 'ADR', label: 'ADR - Architecture Decision', icon: 'git-branch' },
    { value: 'Memo', label: 'Memo - Internal Communication', icon: 'mail' },
    { value: 'PATH', label: 'PATH - Product History', icon: 'clock-history' },
  ];

  @action
  onSelect(type: string) {
    this.selectedType = type;
    this.args.onChange(type);
  }
}
```

**Type-Specific Forms**:
```typescript
// web/app/components/document-form/adr.ts
export default class ADRForm extends Component {
  @service declare store: Store;
  
  @tracked number: number;
  @tracked title: string;
  @tracked status = 'proposed';
  @tracked category: string;
  @tracked supersedes: string[] = [];

  categories = [
    'System Architecture',
    'Infrastructure',
    'Development Tooling',
    'Security',
  ];

  @action
  async submit() {
    const doc = this.store.createRecord('document', {
      docType: 'ADR',
      docNumber: this.number,
      title: this.title,
      status: this.status,
      category: this.category,
      supersedes: this.supersedes,
    });
    await doc.save();
  }
}
```

**Search Facets**:
```typescript
// Add docType facet to search
facets = [
  { name: 'Document Type', key: 'docType', values: ['RFC', 'PRD', 'FRD', 'ADR', 'Memo', 'PATH'] },
  { name: 'Status', key: 'status', values: ['draft', 'review', 'approved', 'implemented'] },
  { name: 'Category', key: 'category', values: ['system-architecture', 'infrastructure', ...] },
];
```

### Phase 4: Search Integration (Week 7)

**Meilisearch Configuration**:
```json
{
  "filterableAttributes": [
    "docType",
    "docNumber",
    "status",
    "category",
    "classification",
    "effectiveDate",
    "targetRelease"
  ],
  "sortableAttributes": [
    "docNumber",
    "createdTime",
    "effectiveDate"
  ],
  "displayedAttributes": [
    "id",
    "docType",
    "docNumber",
    "title",
    "summary",
    "status",
    "owner"
  ]
}
```

**Search Queries**:
```
# Find all architecture ADRs
docType:ADR AND category:"System Architecture"

# Find active memos
docType:Memo AND effectiveDate < now AND expirationDate > now

# Find FRDs for Q3 release
docType:FRD AND targetRelease:"Q3-2025"

# Find deprecated decisions
docType:ADR AND status:deprecated
```

### Phase 5: Documentation & Testing (Week 8)

**Documentation**:
- Update `docs/document-types.md` with new types
- Create `docs/adr-guide.md` with best practices
- Update API docs with new endpoints
- Add examples to `docs/examples/`

**Testing**:
```go
// pkg/models/document_test.go
func TestDocumentTypes(t *testing.T) {
    tests := []struct {
        name    string
        docType string
        valid   bool
    }{
        {"RFC", "RFC", true},
        {"ADR", "ADR", true},
        {"Invalid", "INVALID", false},
    }
    // ... test cases
}
```

```typescript
// tests/e2e-playwright/tests/adr-creation.spec.ts
test('should create ADR with auto-number', async ({ page }) => {
  await page.goto('http://localhost:4200/documents/new');
  await page.selectOption('[data-test-doc-type]', 'ADR');
  
  // Verify auto-number
  const number = await page.inputValue('[data-test-doc-number]');
  expect(number).toMatch(/^\d+$/);
  
  // Fill form
  await page.fill('[data-test-title]', 'Test ADR');
  await page.selectOption('[data-test-category]', 'System Architecture');
  await page.click('[data-test-submit]');
  
  // Verify created
  await page.waitForURL(/\/documents\/adr\/\d+/);
});
```

## Success Metrics

### Adoption Metrics
| Metric | 3 Months | 6 Months | 1 Year |
|--------|----------|----------|--------|
| ADRs created | 15 | 45 | 120 |
| Memos published | 8 | 25 | 60 |
| PATHs maintained | 3 | 8 | 15 |
| Search queries for ADRs | 200 | 800 | 2,500 |
| Onboarding time reduction | 10% | 25% | 40% |

### Quality Metrics
- **Context Preservation**: 80% of architectural decisions documented
- **Searchability**: Average time to find decision < 30 seconds
- **Completeness**: All ADRs have "Alternatives Considered" section
- **Maintenance**: PATHs updated within 1 week of major change

### User Feedback
- Quarterly survey: "How useful are ADRs for understanding the system?"
- Track links to ADRs from code comments (measure discoverability)
- Monitor Slack questions about "why we chose X" (should decrease)

## Alternatives Considered

### 1. ❌ Use External ADR Tools (adr-tools, log4brains)
**Pros**: Purpose-built, markdown-based, CLI-friendly  
**Cons**: Separate system, not searchable in Hermes, poor integration  
**Rejected**: Hermes should be single source of truth

### 2. ❌ Store ADRs in Git (docs/ directory)
**Pros**: Version controlled, familiar to engineers  
**Cons**: Not searchable, no metadata, poor discoverability  
**Rejected**: Want full-text search, faceting, notifications

### 3. ❌ Use Confluence/Notion
**Pros**: Rich formatting, comments, integrations  
**Cons**: External dependency, not HashiCorp-owned, poor API  
**Rejected**: Want self-hosted, consistent with existing workflow

### 4. ❌ Generic "Document" Type with Tags
**Pros**: Flexible, no schema changes  
**Cons**: No structure, inconsistent format, poor search  
**Rejected**: Structure enforces quality and consistency

## Risks & Mitigation

### Risk 1: Low Adoption
**Mitigation**:
- Make ADR creation as easy as RFC creation
- Provide templates and examples
- Leadership champions (engineering managers write ADRs)
- Link ADRs from PRs (GitHub bot comments)

### Risk 2: Maintenance Burden
**Mitigation**:
- Auto-generated fields (date, author, number)
- Simple markdown format (no complex tooling)
- Batch migration of existing decisions (one-time effort)

### Risk 3: Outdated Documentation
**Mitigation**:
- Regular review reminders (quarterly)
- "Superseded by" links keep history
- PATH documents track evolution over time

### Risk 4: Template Fatigue
**Mitigation**:
- Templates are starting points, not rigid requirements
- Optional sections clearly marked
- Examples show flexibility

## Future Enhancements

- **Bidirectional Links**: Auto-detect references between documents
- **Visual Timeline**: Interactive PATH timeline view
- **Decision Graph**: Visualize superseded/supersedes relationships
- **Export**: Generate ADR book (PDF) for offline reading
- **Integration**: Link ADRs to Jira epics, GitHub PRs
- **Analytics**: "Most referenced ADRs", "Orphaned decisions"

## Related Work

- ADR format: https://adr.github.io/
- HashiCorp writing style guide
- RFC-047: Local Workspace Provider
- ADR-073: Provider Abstraction Architecture

## Open Questions

1. Should ADRs be versioned (ADR-73-v2) or superseded (ADR-73 → ADR-89)?
2. How to handle cross-product ADRs (affects Hermes + Terraform)?
3. Should Memos expire automatically (soft delete after 1 year)?
4. Who approves ADRs? (Engineering manager? Staff engineer? Consensus?)
5. Should PATHs be auto-generated from Git history + ADRs?

## Timeline

- **Week 1-2**: Backend schema, API endpoints
- **Week 3-4**: Template system, auto-numbering
- **Week 5-6**: Frontend UI, forms, type selector
- **Week 7**: Search integration, facets
- **Week 8**: Documentation, testing, examples
- **Week 9**: Internal beta (engineering team)
- **Week 10**: Feedback, iteration
- **Week 11**: GA launch, announcement
- **Week 12**: Retrospective, metrics baseline

**Total Effort**: 12 weeks (1 engineer + 1 PM)
