# ADR-001: Containerization Strategy with Docker and Docker Compose

**Date:** 2025-12-02  
**Status:** Accepted  
**Deciders:** Architecture Team  
**Relates to:** SRS v1.2 Section 15 (Deployment Requirements), C4 Architecture

---

## Context

The Self-Service Snack Bar Kiosk System requires a reliable, reproducible, and scalable deployment strategy. The system consists of multiple components including:

- **Frontend applications:** Kiosk Web Application and Admin Web Portal (React 19.2)
- **Backend API:** Node.js 24.11 LTS with Express.js 5.1
- **Database:** PostgreSQL 18
- **Reverse Proxy:** Nginx 1.24+
- **Process Manager:** PM2 2.5+

Key requirements from the SRS that influence this decision:

1. **NFR-4.1:** Target uptime during operating hours: 99%
2. **NFR-19.1:** Architecture should support future multi-kiosk expansion
3. **SRS Section 15.1:** Docker containerization listed as optional but recommended for easier deployment
4. **SRS Section 16.6.3:** Explicit mention of Docker and Docker Compose for containerization

The development team needs to ensure:

- Consistent environments across development, staging, and production
- Easy onboarding for new developers
- Simplified deployment and rollback processes
- Resource isolation between system components
- Future scalability support

---

## Decision

We will adopt **Docker** as the containerization platform and **Docker Compose** for multi-container orchestration.

### Containerization Approach

1. **Each major component will be containerized:**
   - PostgreSQL database container (based on `postgres:18` official image)
   - Node.js API server container (custom image based on `node:24.11-alpine`)
   - Nginx reverse proxy container (based on `nginx:1.24-alpine`)

2. **Docker Compose will orchestrate the containers:**
   - Define service dependencies (API depends on database health)
   - Configure networking between containers via bridge network
   - Manage persistent data volumes for database and uploads
   - Enable health checks for service reliability

3. **Container Configuration:**
   - Use multi-stage Docker builds for optimized API server images
   - Implement health checks for all critical services
   - Run containers with non-root users for security
   - Use environment variables for configuration (never hardcode secrets)

### Docker Compose Services

| Service | Image/Build | Purpose | Ports |
|---------|-------------|---------|-------|
| `postgres` | `postgres:18` | Primary database | 5432 |
| `api` | Custom Dockerfile | Node.js API server | 3000 |
| `nginx` | `nginx:1.24-alpine` | Reverse proxy, SSL termination | 80, 443 |

### Volume Strategy

| Volume | Purpose | Mount Point |
|--------|---------|-------------|
| `postgres_data` | Database persistence | `/var/lib/postgresql/data` |
| `uploads` | Product images | `/app/uploads` (API), `/usr/share/nginx/uploads` (Nginx) |
| `logs` | Application logs | `/app/logs` |

---

## Consequences

### Positive Consequences

1. **Environment Consistency:**
   - Identical environments across development, staging, and production
   - "Works on my machine" issues eliminated
   - Simplified debugging and troubleshooting

2. **Simplified Deployment:**
   - Single `docker-compose up -d` command to start entire system
   - Easy rollback via image versioning
   - Declarative infrastructure as code

3. **Resource Isolation:**
   - Each service runs in isolated container
   - Memory and CPU limits can be configured per container
   - Failures in one container don't directly crash others

4. **Developer Experience:**
   - New developers can start working with minimal setup
   - No need to install PostgreSQL, Node.js, or Nginx locally
   - Consistent tooling across team

5. **Scalability Foundation:**
   - Architecture prepared for future Docker Swarm or Kubernetes migration
   - Stateless API design enables horizontal scaling
   - Database container can be replaced with managed service when needed

6. **Security:**
   - Containers run with non-root users
   - Network isolation between services
   - Secrets managed via environment variables
   - Minimal base images (Alpine) reduce attack surface

### Negative Consequences

1. **Added Complexity:**
   - Team needs Docker and Docker Compose knowledge
   - Additional layer of abstraction to understand
   - Debugging may require container-specific tools

2. **Resource Overhead:**
   - Docker daemon consumes additional system resources
   - Container orchestration adds memory overhead (~100-200MB)
   - Disk space required for images (~500MB-1GB total)

3. **Learning Curve:**
   - Developers unfamiliar with Docker need training
   - Debugging containerized applications requires different approach
   - Log management requires volume mounts or logging drivers

4. **Local Development:**
   - Docker Desktop required on development machines
   - Build times for custom images (mitigated by caching)
   - Volume permissions may differ between host OS and container

### Mitigation Strategies

- Provide documentation for common Docker commands and troubleshooting
- Use Docker Compose `depends_on` with health checks to ensure proper startup order
- Implement comprehensive logging strategy with volume mounts
- Create development-specific Docker Compose overrides for faster iteration

---

## Alternatives Considered

### 1. Traditional Server Deployment (Rejected)

- **Description:** Install all components directly on bare metal or VM
- **Pros:** No containerization overhead, simpler for single-server deployment
- **Cons:** Environment inconsistency, difficult rollbacks, manual configuration management
- **Rejection Reason:** Does not meet scalability and consistency requirements

### 2. Kubernetes (Deferred)

- **Description:** Use Kubernetes for container orchestration
- **Pros:** Auto-scaling, self-healing, production-grade orchestration
- **Cons:** Significant operational complexity, overkill for single-kiosk deployment
- **Rejection Reason:** Too complex for v1.0; may reconsider for multi-kiosk expansion in v1.2+

### 3. Serverless/FaaS (Rejected)

- **Description:** Deploy API as serverless functions (AWS Lambda, Google Cloud Functions)
- **Pros:** Auto-scaling, pay-per-use, minimal infrastructure management
- **Cons:** Cold start latency issues, vendor lock-in, complex local development
- **Rejection Reason:** QR code generation latency requirement (< 1 second) makes cold starts problematic

---

## Implementation Notes

### Required Files

1. **`docker-compose.yml`** - Main orchestration file (see C4_Architecture.md Section 4.2)
2. **`server/Dockerfile`** - API server container definition (see C4_Architecture.md Section 4.3)
3. **`nginx/nginx.conf`** - Nginx configuration (see C4_Architecture.md Section 4.5)
4. **`server/ecosystem.config.json`** - PM2 configuration for clustering
5. **`.env.example`** - Template for environment variables

### Commands Reference

```bash
# Development
docker-compose up -d              # Start all services
docker-compose logs -f api        # Follow API logs
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Health check
docker-compose ps                 # Check service status
docker-compose exec api curl http://localhost:3000/api/health
```

---

## References

- [SRS v1.2 - Section 15: Deployment Requirements](/reqeng/Software_Requirements_Specification_v1.2.md)
- [SRS v1.2 - Section 16.6.3: Containerization](/reqeng/Software_Requirements_Specification_v1.2.md)
- [C4 Architecture - Section 4: Docker Deployment Configuration](/docs/architecture/C4_Architecture.md)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
