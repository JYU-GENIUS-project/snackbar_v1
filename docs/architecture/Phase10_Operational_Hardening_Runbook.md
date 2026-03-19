<!-- markdownlint-disable MD013 MD036 -->
# Phase 10 Operational Hardening Runbook (Logs, Backups, DR)

## Purpose

Define operational hardening steps for log rotation, backup retention, and disaster recovery in alignment with Phase 9 monitoring and the containerized deployment model.

## Scope

- PM2 and Nginx log rotation policies
- Backup retention and restore drills
- Disaster recovery (DR) runbook for Docker Compose deployment

## Log Rotation Policy

### PM2 Logs

- Source: `/app/logs` mounted to `logs` volume
- Rotation mechanism: PM2 log rotation module or filesystem rotation policy
- Retention target: 90 days (aligns with Phase 9 log cleanup)
- Access: Admin-only via Phase 9 log viewer

### Nginx Logs

- Source: `/var/log/nginx` (container)
- Rotation mechanism: Nginx logrotate in container or host rotation policy
- Retention target: 90 days
- Access: Admin-only via Phase 9 log viewer integration

### Verification Checklist

- Log files rotate without service interruption
- Disk usage remains within configured thresholds
- Log viewer remains functional post-rotation

## Backup Retention & Restore Drill

### Retention

- Retain daily backups for 30 days
- Retain weekly backups for 12 weeks
- Retain monthly backups for 12 months

### Restore Drill Procedure

1. Select a backup snapshot with known checksum.
2. Restore to staging database (isolated container).
3. Validate schema integrity and key business data (products, transactions, config).
4. Record restore time and success/failure notes.
5. Capture audit log entry for the drill.

### Acceptance Mapping

- US-057–US-058 (admin monitoring and troubleshooting)

## Disaster Recovery Runbook

### Preconditions

- Docker Compose deployment per ADR-001
- Environment variables and secrets available from secure store

### Recovery Steps

1. Provision replacement host and install Docker + Docker Compose.
2. Pull repository and environment configuration.
3. Restore database from latest verified backup.
4. Start services with `docker-compose up -d`.
5. Verify health checks (`/api/health`) and kiosk/admin UI availability.
6. Validate monitoring dashboard and alert routing.

### RPO/RTO Targets

- RPO: 24 hours (daily backups)
- RTO: 4 hours (single kiosk deployment)

## Status

**In progress:** Runbook defined; execution validation to be recorded in Phase 10.3 completion notes.

<!-- markdownlint-enable MD013 MD036 -->
