-- =============================================================================
-- PostgreSQL Schema Migration: 007_phase9_configuration_monitoring
-- =============================================================================
-- Adds configuration storage and monitoring tables for Phase 9.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Notification recipient registry (per alert type with verification state).
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_recipient_status') THEN
        CREATE TYPE notification_recipient_status AS ENUM ('pending', 'verified', 'expired', 'disabled');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS notification_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50) NOT NULL,
    email TEXT NOT NULL,
    status notification_recipient_status NOT NULL DEFAULT 'pending',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(120),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (alert_type, email)
);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_alert
    ON notification_recipients (alert_type, status);

CREATE INDEX IF NOT EXISTS idx_notification_recipients_email
    ON notification_recipients (email);

DROP TRIGGER IF EXISTS update_notification_recipients_updated_at ON notification_recipients;

CREATE TRIGGER update_notification_recipients_updated_at
    BEFORE UPDATE ON notification_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Extend email notification log with rate limiting and acknowledgment metadata.
-- -----------------------------------------------------------------------------
ALTER TABLE email_notification_log
    ADD COLUMN IF NOT EXISTS grouped_key VARCHAR(120),
    ADD COLUMN IF NOT EXISTS occurrence_count INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS first_occurred_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_occurred_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_email_notification_grouped_key
    ON email_notification_log (grouped_key);

CREATE INDEX IF NOT EXISTS idx_email_notification_acknowledged_at
    ON email_notification_log (acknowledged_at);

-- -----------------------------------------------------------------------------
-- Kiosk status history table (online/offline/maintenance snapshots).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kiosk_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL,
    reason TEXT,
    message TEXT,
    maintenance_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    heartbeat_at TIMESTAMPTZ,
    uptime_percent NUMERIC(5, 2),
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kiosk_status_history_recorded_at
    ON kiosk_status_history (recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_status_history_status
    ON kiosk_status_history (status);

-- -----------------------------------------------------------------------------
-- System metrics snapshot table for dashboard trends.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_metrics_snapshot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_snapshot_recorded_at
    ON system_metrics_snapshot (recorded_at DESC);

-- -----------------------------------------------------------------------------
-- Seed configuration defaults for Phase 9 configuration features.
-- -----------------------------------------------------------------------------
INSERT INTO system_config (key, value, description) VALUES
    ('maintenance_mode', '{"enabled": false, "message": "🔧 System Under Maintenance - Check back soon", "since": null}', 'Maintenance mode configuration payload.'),
    ('maintenance_schedule', '{"windows": []}', 'Scheduled maintenance windows.'),
    ('operating_hours_schedule', '{"timezone": "Europe/Helsinki", "windows": [], "breaks": [], "holidays": [], "enable247": false}', 'Extended operating hours configuration with breaks/holidays.'),
    ('notification_recipient_policies', '{"maxRecipientsPerType": 10, "verificationExpiryHours": 48}', 'Policy settings for notification recipients.'),
    ('system_flags', '{"enable247": false}', 'System-level feature flags.')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Register migration version.
-- -----------------------------------------------------------------------------
INSERT INTO schema_migrations (version) VALUES ('007_phase9_configuration_monitoring')
ON CONFLICT (version) DO NOTHING;

COMMIT;
