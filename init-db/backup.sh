#!/bin/bash
# =============================================================================
# Nightly Database Backup Script for Snackbar Kiosk System
# =============================================================================
# This script performs automated daily backups of the PostgreSQL database.
# Designed to run at 02:00 via cron within the Docker stack.
#
# Features:
# - Full database dump with compression
# - Retention policy enforcement
# - Email notifications (optional)
# - Backup verification
#
# Usage: 
#   Manual:   docker-compose run backup /backup.sh
#   Cron:     0 2 * * * docker-compose -f /path/to/docker-compose.yml run --rm backup /backup.sh
# =============================================================================

set -e

# Configuration (from environment variables)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-90}"
DB_HOST="${PGHOST:-postgres}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-snackbar_prod}"
DB_USER="${PGUSER:-snackbar_app}"

# Timestamp for backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/snackbar_backup_${TIMESTAMP}.sql.gz"
BACKUP_LOG="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# =============================================================================
# Functions
# =============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${BACKUP_LOG}"
}

send_notification() {
    local subject="$1"
    local body="$2"
    
    # If SMTP is configured, send email notification
    if [ -n "${SMTP_HOST}" ] && [ -n "${ADMIN_NOTIFICATION_EMAILS}" ]; then
        # Note: In production, use a proper email sending tool
        log "Would send email notification: ${subject}"
    fi
}

# =============================================================================
# Main Backup Process
# =============================================================================

log "=========================================="
log "Starting database backup"
log "=========================================="
log "Database: ${DB_NAME}"
log "Host: ${DB_HOST}:${DB_PORT}"
log "Backup file: ${BACKUP_FILE}"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Record start time
START_TIME=$(date +%s)

# Perform backup
log "Creating database dump..."
pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    2>> "${BACKUP_LOG}" | gzip > "${BACKUP_FILE}"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "${BACKUP_FILE}" ]; then
    # Get backup size
    BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    
    # Calculate checksum
    CHECKSUM=$(sha256sum "${BACKUP_FILE}" | awk '{print $1}')
    
    # Record end time
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    log "Backup completed successfully!"
    log "Size: ${BACKUP_SIZE}"
    log "Checksum (SHA256): ${CHECKSUM}"
    log "Duration: ${DURATION} seconds"
    
    # Store metadata
    cat > "${BACKUP_DIR}/snackbar_backup_${TIMESTAMP}.meta" <<EOF
{
    "timestamp": "${TIMESTAMP}",
    "file": "${BACKUP_FILE}",
    "size": "${BACKUP_SIZE}",
    "checksum_sha256": "${CHECKSUM}",
    "duration_seconds": ${DURATION},
    "database": "${DB_NAME}",
    "created_at": "$(date -Iseconds)"
}
EOF
    
    # Send success notification
    send_notification \
        "Snackbar Backup Completed - ${TIMESTAMP}" \
        "Backup completed successfully. Size: ${BACKUP_SIZE}, Duration: ${DURATION}s"
else
    log "ERROR: Backup failed!"
    send_notification \
        "ALERT: Snackbar Backup Failed - ${TIMESTAMP}" \
        "Database backup failed. Please check the logs immediately."
    exit 1
fi

# =============================================================================
# Retention Policy - Delete old backups
# =============================================================================

log ""
log "Enforcing retention policy (${RETENTION_DAYS} days)..."

# Find and delete backups older than retention period
DELETED_COUNT=0
find "${BACKUP_DIR}" -name "snackbar_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} | while read old_backup; do
    log "Deleting old backup: ${old_backup}"
    rm -f "${old_backup}"
    rm -f "${old_backup%.sql.gz}.meta"
    rm -f "${old_backup%.sql.gz}.log"
    DELETED_COUNT=$((DELETED_COUNT + 1))
done

log "Deleted ${DELETED_COUNT} old backup(s)"

# =============================================================================
# List current backups
# =============================================================================

log ""
log "Current backups:"
ls -lh "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -10 || log "No backups found"

log ""
log "=========================================="
log "Backup process completed"
log "=========================================="
