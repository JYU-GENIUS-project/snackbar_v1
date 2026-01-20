-- =============================================================================
-- PostgreSQL Schema Migration: 004_phase4_inventory_backbone
-- =============================================================================
-- Introduces inventory ledger infrastructure, notification logging, and
-- supporting configuration entries required for Phase 4.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Relax stock quantity constraint to allow negative values for discrepancy flags.
-- -----------------------------------------------------------------------------
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_stock_quantity_check;

-- -----------------------------------------------------------------------------
-- Enumerations required for inventory ledger metadata.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_change_source') THEN
        CREATE TYPE inventory_change_source AS ENUM (
            'purchase',
            'manual_adjustment',
            'reconciliation',
            'system'
        );
    END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Inventory ledger table captures every stock mutation event.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    delta INTEGER NOT NULL,
    resulting_quantity INTEGER,
    source inventory_change_source NOT NULL,
    reason TEXT,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_product_time
    ON inventory_ledger (product_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_ledger_source
    ON inventory_ledger (source);

-- -----------------------------------------------------------------------------
-- Materialized view exposes aggregated inventory snapshot for UI queries.
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS inventory_snapshot;

CREATE MATERIALIZED VIEW inventory_snapshot AS
SELECT
    p.id AS product_id,
    p.name,
    p.stock_quantity AS current_stock,
    p.low_stock_threshold,
    (p.stock_quantity <= p.low_stock_threshold) AS low_stock_flag,
    (p.stock_quantity < 0) AS negative_flag,
    COALESCE((SELECT SUM(l.delta) FROM inventory_ledger l WHERE l.product_id = p.id), 0) AS ledger_balance,
    COALESCE((SELECT MAX(l.recorded_at) FROM inventory_ledger l WHERE l.product_id = p.id), p.updated_at) AS last_activity_at,
    p.is_active,
    p.deleted_at
FROM products p
WHERE p.deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_snapshot_product
    ON inventory_snapshot (product_id);

-- Helper function for downstream services to refresh the snapshot after mutations.
CREATE OR REPLACE FUNCTION refresh_inventory_snapshot()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY inventory_snapshot;
END;
$$ LANGUAGE plpgsql;

-- Initial refresh to populate snapshot with current data.
REFRESH MATERIALIZED VIEW inventory_snapshot;

-- -----------------------------------------------------------------------------
-- Notification logging table supports retry orchestration (FR-11.2.1).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_notification_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type VARCHAR(50) NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ,
    locked_by VARCHAR(100),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_notification_next_attempt
    ON email_notification_log (next_attempt_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_email_notification_status
    ON email_notification_log (status);

-- Reuse generic updated_at trigger for log table.
DROP TRIGGER IF EXISTS update_email_notification_log_updated_at ON email_notification_log;

CREATE TRIGGER update_email_notification_log_updated_at
    BEFORE UPDATE ON email_notification_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Seed configuration defaults for inventory tracking and notification recipients.
-- -----------------------------------------------------------------------------
INSERT INTO system_config (key, value, description) VALUES
    ('inventory_tracking_enabled', 'true', 'Toggle that controls whether automated inventory deductions are applied.'),
    ('notification_recipients', '[]', 'List of admin email addresses that receive system alerts (JSON array).')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Register migration version.
-- -----------------------------------------------------------------------------
INSERT INTO schema_migrations (version) VALUES ('004_phase4_inventory_backbone')
ON CONFLICT (version) DO NOTHING;

COMMIT;
