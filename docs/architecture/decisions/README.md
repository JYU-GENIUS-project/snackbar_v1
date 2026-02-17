# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records documenting the key technical decisions made for the Self-Service Snack Bar Kiosk System.

## What are ADRs?

Architecture Decision Records are documents that capture important architectural decisions made along with their context and consequences. They provide a historical record of the project's architectural evolution.

## ADR Index

| ADR | Title | Status | Date |
| --- | ----- | ------ | ---- |
| [ADR-001](ADR-001-containerization-strategy.md) | Containerization Strategy with Docker and Docker Compose | Accepted | 2025-12-02 |
| [ADR-002](ADR-002-postgresql-database.md) | PostgreSQL as Primary Database | Accepted | 2025-12-02 |
| [ADR-003](ADR-003-pern-technology-stack.md) | PERN Technology Stack Selection | Accepted | 2025-12-02 |

## ADR Summary

### ADR-001: Containerization Strategy

**Decision:** Use Docker and Docker Compose for containerization and orchestration.

**Key Points:**

- PostgreSQL, API Server, and Nginx run as separate containers
- Docker Compose manages dependencies and networking
- Volumes persist database data and uploads
- Multi-stage builds for optimized images

### ADR-002: PostgreSQL as Primary Database

**Decision:** Use PostgreSQL 18 as the primary relational database.

**Key Points:**

- UUID support via uuid-ossp extension
- JSONB for flexible data storage (categories, audit logs)
- ENUM types for status fields
- Connection pooling with node-postgres (pg)
- 3-year data retention with backup strategy

### ADR-003: PERN Technology Stack

**Decision:** Use PERN stack (PostgreSQL, Express.js, React, Node.js) as the core technology.

**Key Points:**

- Single language (JavaScript/TypeScript) across full stack
- Node.js 24.11 LTS with Express.js 5.1 for backend
- React 19.2 with Vite 5.0 for frontend
- PM2 for process management and clustering
- Nginx as reverse proxy with SSL termination

## ADR Template

When creating new ADRs, use the following template:

```markdown
# ADR-NNN: [Title]

**Date:** YYYY-MM-DD  
**Status:** [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]  
**Deciders:** [Team/Person names]  
**Relates to:** [References to SRS, other ADRs, etc.]

---

## Context

[What is the issue that we're seeing that is motivating this decision?]

---

## Decision

[What is the change we're proposing and/or doing?]

---

## Consequences

### Positive Consequences
[What becomes easier or possible as a result?]

### Negative Consequences
[What becomes more difficult or impossible as a result?]

---

## Alternatives Considered

[What other options were considered and why were they rejected?]

---

## References

[Links to relevant documents, SRS sections, external resources]
```

## Related Documents

- [Software Requirements Specification v1.2](/reqeng/Software_Requirements_Specification_v1.2.md)
- [C4 Architecture](/docs/architecture/C4_Architecture.md)
- [User Stories](/reqeng/user_stories.md)
- [Test Cases v1.1](/reqeng/Test_Cases_v1.1.md)

## ADR Status Definitions

| Status | Description |
| ------ | ----------- |
| **Proposed** | Decision is under discussion and not yet accepted |
| **Accepted** | Decision has been approved and is in effect |
| **Deprecated** | Decision is no longer relevant or recommended |
| **Superseded** | Decision has been replaced by a newer ADR |
