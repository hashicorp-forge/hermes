# {{title}}

**Status**: Draft  
**Created**: {{created_date}}  
**Owner**: {{owner}}  
**Related PRD**: {{related_prd}}  
**Engineers**: {{engineers}}  
**Epic Link**: {{epic_link}}

## Overview

[Provide a brief overview of the functional requirements]

## Related Documents

- **PRD**: [Link to Product Requirements Document]
- **RFC**: [Link to related RFC if applicable]
- **Design Docs**: [Links to design documents]

## Functional Specifications

### Feature 1: [Feature Name]

#### Description
[Detailed description of the feature]

#### User Stories
- As a [user type], I want [goal] so that [benefit]
- As a [user type], I want [goal] so that [benefit]

#### Acceptance Criteria
- [ ] Criterion 1: [Specific, measurable criterion]
- [ ] Criterion 2: [Specific, measurable criterion]
- [ ] Criterion 3: [Specific, measurable criterion]

#### Technical Requirements
- TR-1: [Technical requirement]
- TR-2: [Technical requirement]
- TR-3: [Technical requirement]

#### API Specifications

##### Endpoint: `POST /api/v1/resource`

**Request**:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Response** (200 OK):
```json
{
  "id": "123",
  "status": "success"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions

#### Data Model

```
Entity: Resource
- id: UUID (primary key)
- name: String (required, max 255)
- type: Enum (type1, type2, type3)
- created_at: Timestamp
- updated_at: Timestamp
- owner_id: UUID (foreign key to User)
```

#### Business Rules
1. Rule 1: [Specific business rule]
2. Rule 2: [Specific business rule]
3. Rule 3: [Specific business rule]

#### Validation Rules
- Field 1: [Validation requirements]
- Field 2: [Validation requirements]
- Field 3: [Validation requirements]

### Feature 2: [Feature Name]

[Repeat structure for additional features]

## User Interface Specifications

### Screen 1: [Screen Name]

#### Layout
[Description or mockup reference]

#### Components
- Component 1: [Description, behavior]
- Component 2: [Description, behavior]

#### User Interactions
1. User action → System response
2. User action → System response

#### Validation and Error Handling
- Error case 1: [How handled]
- Error case 2: [How handled]

### Screen 2: [Screen Name]

[Repeat for additional screens]

## Integration Points

### External Systems

#### System 1: [System Name]

**Integration Type**: REST API / GraphQL / Event Stream / etc.

**Endpoints Used**:
- `GET /api/endpoint1`: [Purpose]
- `POST /api/endpoint2`: [Purpose]

**Authentication**: [Method]

**Error Handling**: [Strategy]

**Rate Limits**: [If applicable]

#### System 2: [System Name]

[Repeat for additional systems]

## Performance Requirements

### Response Time
- API endpoint 1: < 200ms (p95)
- API endpoint 2: < 500ms (p95)
- Page load: < 2s (p95)

### Throughput
- Requests per second: [Target]
- Concurrent users: [Target]

### Scalability
- Target scale: [Numbers]
- Scaling strategy: [Horizontal/Vertical]

## Security Requirements

### Authentication
- [Authentication method and requirements]

### Authorization
- [Authorization rules and permissions]

### Data Protection
- Encryption at rest: [Requirements]
- Encryption in transit: [Requirements]
- PII handling: [Requirements]

### Compliance
- [Relevant compliance requirements]

## Testing Strategy

### Unit Tests
- Coverage target: [Percentage]
- Key areas: [List]

### Integration Tests
- [Scenarios to test]

### End-to-End Tests
- [User flows to test]

### Performance Tests
- Load testing: [Scenarios]
- Stress testing: [Scenarios]

### Security Tests
- [Security test cases]

## Monitoring and Observability

### Metrics
- Metric 1: [Description, alerting threshold]
- Metric 2: [Description, alerting threshold]

### Logging
- Log levels: [Configuration]
- Key events to log: [List]

### Alerts
- Alert 1: [Condition, severity]
- Alert 2: [Condition, severity]

## Deployment Strategy

### Environment Progression
1. Development → Staging → Production
2. [Specific deployment requirements]

### Feature Flags
- Flag 1: [Purpose, default state]
- Flag 2: [Purpose, default state]

### Rollback Plan
[Describe rollback procedure]

## Data Migration

[If applicable, describe data migration requirements]

### Migration Scripts
- Script 1: [Purpose]
- Script 2: [Purpose]

### Validation
- [How to validate migration success]

## Dependencies

### Technical Dependencies
- [ ] Library/Service 1
- [ ] Library/Service 2

### Team Dependencies
- [ ] Team/Person 1: [What needed]
- [ ] Team/Person 2: [What needed]

## Open Issues

- [ ] Issue 1: [Description, owner, due date]
- [ ] Issue 2: [Description, owner, due date]

## Appendix

### Glossary
- **Term 1**: Definition
- **Term 2**: Definition

### References
- [Reference 1](#)
- [Reference 2](#)

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {{created_date}} | {{owner}} | Initial draft |
