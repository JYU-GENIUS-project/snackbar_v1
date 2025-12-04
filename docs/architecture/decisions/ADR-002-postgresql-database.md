# ADR-002: PostgreSQL as Primary Database

**Date:** 2025-12-02  
**Status:** Accepted  
**Deciders:** Architecture Team  
**Relates to:** SRS v1.2 Section 8 (Data Requirements), Section 16.1.1 (Database Layer)

---

## Context

The Self-Service Snack Bar Kiosk System requires a robust, reliable database to store:

- Product catalog with categories and images
- Transaction history (50-100 transactions/day, 3-year retention)
- Inventory quantities with negative stock tracking
- Administrator accounts and audit logs
- System configuration and error logs

Key requirements from the SRS influencing this decision:

1. **SRS Section 2.4:** Technology Stack specifies PostgreSQL 18 as the database
2. **SRS Section 8:** Detailed PostgreSQL-specific data types and schemas
3. **FR-9.3:** Transaction history retention for minimum 3 years
4. **NFR-6:** Transaction data persisted within 1 second
5. **NFR-7:** Daily automated backups with integrity verification
6. **FR-10.1.3:** Statistics queries return within 2 seconds for 10,000 transactions
7. **SRS Section 5.3.1:** PostgreSQL connection pooling with node-postgres (pg)

### Data Volume Estimates (from SRS 8.2.3)

- **Annual transaction volume:** 18,000-25,000 transactions
- **Database size estimate:** ~250MB/year
- **Recommended storage:** Minimum 10GB (40 years capacity)
- **Products:** ~50 products with images

---

## Decision

We will use **PostgreSQL version 18** as the primary relational database for the Snack Bar Kiosk System.

### Database Configuration

1. **Version:** PostgreSQL 18 (latest stable)
2. **Connection:** node-postgres (pg) version 8.11.x with connection pooling
3. **Deployment:** Docker container (`postgres:18` official image)

### PostgreSQL-Specific Features to Utilize

| Feature | Use Case | SRS Reference |
|---------|----------|---------------|
| **UUID (uuid-ossp)** | Primary keys for all entities | Section 8.1 |
| **DECIMAL(5,2)** | Monetary values (prices 0.01-999.99 EUR) | FR-6.1.1 |
| **TIMESTAMP WITH TIME ZONE** | Accurate datetime handling | Section 8.1.3 |
| **JSONB** | Flexible category arrays, audit log values | Section 8.1.1 |
| **ENUM types** | Payment status, log levels | Section 8.1.3 |
| **INET** | IP address storage for audit logs | Section 8.1.7 |
| **Partial indexes** | Performance optimization for active records | Section 8.1.1 |
| **GIN indexes** | JSONB column indexing | Section 8.1.1 |

### Connection Pool Configuration

```
POOL_MIN=2      # Minimum connections
POOL_MAX=10     # Maximum connections
POOL_IDLE_TIMEOUT=30000  # 30 seconds idle timeout
```

### Database Schema Overview

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `Product` | Product catalog | UUID PK, JSONB categories, soft delete |
| `Category` | Product categories | Unique names, display ordering |
| `Transaction` | Purchase records | ENUM status, MobilePay reference |
| `TransactionItem` | Line items | Snapshot pricing, quantity tracking |
| `SystemConfiguration` | System settings | Operating hours, maintenance mode |
| `Admin` | Administrator accounts | bcrypt password hash |
| `AuditLog` | Change tracking | JSONB old/new values |
| `ErrorLog` | System logs | ENUM log levels |

### PostgreSQL Server Configuration (Production)

```
max_connections: 100
shared_buffers: 512MB (25% of RAM)
effective_cache_size: 1.5GB (50-75% of RAM)
work_mem: 16MB
maintenance_work_mem: 128MB
```

---

## Consequences

### Positive Consequences

1. **Data Integrity:**
   - ACID compliance ensures transaction reliability
   - Foreign key constraints maintain referential integrity
   - CHECK constraints enforce business rules (price ranges, quantity limits)

2. **Advanced Features:**
   - Native UUID support eliminates need for external ID generation
   - JSONB enables flexible data storage without schema changes
   - ENUM types provide type-safe status values
   - Partial indexes optimize queries for common filters (active products)

3. **Performance:**
   - Connection pooling reduces connection overhead
   - Indexing strategy supports sub-2-second query performance
   - Prepared statements improve repeated query efficiency
   - GIN indexes enable fast JSONB searches

4. **Security:**
   - Parameterized queries prevent SQL injection
   - Role-based access control available
   - SSL/TLS encrypted connections
   - Credentials stored in environment variables

5. **Reliability:**
   - Proven technology with 30+ years of development
   - Excellent backup and recovery options (pg_dump, pg_basebackup)
   - Point-in-time recovery capability
   - Strong community support

6. **PERN Stack Alignment:**
   - Native integration with Node.js via node-postgres
   - Well-documented patterns for Express.js applications
   - Extensive ecosystem of tools and ORMs

7. **Scalability:**
   - Read replicas possible for future scaling
   - Supports table partitioning for large datasets
   - Connection pooling handles concurrent requests

### Negative Consequences

1. **Operational Complexity:**
   - Requires database administration knowledge
   - Backup and recovery procedures must be implemented
   - Performance tuning may be needed as data grows

2. **Resource Requirements:**
   - Minimum 2GB RAM recommended for PostgreSQL
   - Disk space for WAL (Write-Ahead Log) files
   - Connection pool resources

3. **Schema Management:**
   - Schema migrations needed for changes
   - Downtime possible for major schema alterations
   - Version control for schema required

4. **Single Point of Failure:**
   - Database availability critical for entire system
   - Requires monitoring and alerting
   - Backup strategy essential

### Mitigation Strategies

- Implement automated daily backups at 02:00 (NFR-7)
- Set up 80% storage capacity alerts (FR-9.3)
- Use connection pooling to handle connection limits
- Monitor query performance and add indexes as needed
- Document backup and recovery procedures

---

## Alternatives Considered

### 1. MySQL/MariaDB (Rejected)
- **Description:** Popular open-source relational database
- **Pros:** Wide adoption, good performance, familiar to many developers
- **Cons:** Less advanced JSON support, no native UUID type, ENUM limitations
- **Rejection Reason:** SRS explicitly specifies PostgreSQL; PostgreSQL offers superior JSONB and UUID support needed for this project

### 2. MongoDB (Rejected)
- **Description:** Document-oriented NoSQL database
- **Pros:** Flexible schema, native JSON storage, horizontal scaling
- **Cons:** Weaker ACID guarantees, less suited for relational data, no native transactions across collections
- **Rejection Reason:** System has clear relational data model (products, transactions, line items); ACID transactions required for payment processing

### 3. SQLite (Rejected)
- **Description:** Embedded file-based database
- **Pros:** Zero configuration, no server process, portable
- **Cons:** Limited concurrency, file-based (harder to backup), no network access
- **Rejection Reason:** Does not meet production reliability requirements; limited to single-writer scenarios

### 4. Cloud-Managed Database (Deferred)
- **Description:** AWS RDS, Google Cloud SQL, or Azure Database for PostgreSQL
- **Pros:** Managed backups, automatic failover, scaling options
- **Cons:** Ongoing costs, internet dependency, vendor lock-in
- **Rejection Reason:** Self-hosted PostgreSQL in Docker meets v1.0 requirements; cloud migration can be considered for future versions

---

## Implementation Notes

### Database Initialization

1. Create database: `snackbar_prod`
2. Enable UUID extension: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
3. Create ENUM types for `payment_status_enum` and `log_level_enum`
4. Execute schema creation scripts
5. Insert default categories (Drinks, Snacks, Hot Drinks, Cold Drinks)
6. Create initial admin account

### Node.js Connection Example

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false,
  min: parseInt(process.env.POOL_MIN) || 2,
  max: parseInt(process.env.POOL_MAX) || 10,
  idleTimeoutMillis: parseInt(process.env.POOL_IDLE_TIMEOUT) || 30000,
});

// Parameterized query example (SQL injection safe)
const result = await pool.query(
  'SELECT * FROM Product WHERE ProductID = $1',
  [productId]
);
```

### Backup Strategy

```bash
# Daily backup (cron job at 02:00)
pg_dump -h localhost -U snackbar_app -d snackbar_prod -F c -f backup_$(date +%Y%m%d).dump

# Verify backup integrity
pg_restore --list backup_$(date +%Y%m%d).dump

# Restore from backup
pg_restore -h localhost -U snackbar_app -d snackbar_prod -c backup_$(date +%Y%m%d).dump
```

### Docker Volume for Data Persistence

```yaml
volumes:
  postgres_data:
    driver: local

services:
  postgres:
    image: postgres:18
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## References

- [SRS v1.2 - Section 8: Data Requirements](/reqeng/Software_Requirements_Specification_v1.2.md)
- [SRS v1.2 - Section 5.3.1: PostgreSQL Database Interface](/reqeng/Software_Requirements_Specification_v1.2.md)
- [SRS v1.2 - Section 16.1.1: Database Layer](/reqeng/Software_Requirements_Specification_v1.2.md)
- [C4 Architecture - Container Diagram](/docs/architecture/C4_Architecture.md)
- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)
- [node-postgres Documentation](https://node-postgres.com/)
