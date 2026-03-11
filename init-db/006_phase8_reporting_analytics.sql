-- =============================================================================
-- PostgreSQL Schema Migration: 006_phase8_reporting_analytics
-- =============================================================================
-- Adds reporting/analytics indexes and materialized views for Phase 8.
-- Optimized for transaction history filtering and statistics aggregation.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Transaction history indexes for filtering/sorting
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_status_created_at
    ON transactions (payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_total_amount
    ON transactions (total_amount DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_number
    ON transactions (transaction_number);

CREATE INDEX IF NOT EXISTS idx_transactions_confirmation_reference
    ON transactions (confirmation_reference);

CREATE INDEX IF NOT EXISTS idx_transactions_created_at_amount
    ON transactions (created_at DESC, total_amount DESC);

-- -----------------------------------------------------------------------------
-- Transaction item indexes for product-based filters/search
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id
    ON transaction_items (product_id);

CREATE INDEX IF NOT EXISTS idx_transaction_items_product_name_lower
    ON transaction_items (LOWER(product_name));

CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_product
    ON transaction_items (transaction_id, product_id);

-- -----------------------------------------------------------------------------
-- Analytics materialized views
-- -----------------------------------------------------------------------------
DROP MATERIALIZED VIEW IF EXISTS analytics_revenue_daily;
DROP MATERIALIZED VIEW IF EXISTS analytics_revenue_weekly;
DROP MATERIALIZED VIEW IF EXISTS analytics_revenue_monthly;
DROP MATERIALIZED VIEW IF EXISTS analytics_top_products;

CREATE MATERIALIZED VIEW analytics_revenue_daily AS
SELECT
    DATE_TRUNC('day', COALESCE(completed_at, created_at)) AS period_start,
    COUNT(*) FILTER (WHERE payment_status = 'COMPLETED') AS transaction_count,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'COMPLETED'), 0) AS total_revenue
FROM transactions
GROUP BY 1
ORDER BY 1;

CREATE MATERIALIZED VIEW analytics_revenue_weekly AS
SELECT
    DATE_TRUNC('week', COALESCE(completed_at, created_at)) AS period_start,
    COUNT(*) FILTER (WHERE payment_status = 'COMPLETED') AS transaction_count,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'COMPLETED'), 0) AS total_revenue
FROM transactions
GROUP BY 1
ORDER BY 1;

CREATE MATERIALIZED VIEW analytics_revenue_monthly AS
SELECT
    DATE_TRUNC('month', COALESCE(completed_at, created_at)) AS period_start,
    COUNT(*) FILTER (WHERE payment_status = 'COMPLETED') AS transaction_count,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'COMPLETED'), 0) AS total_revenue
FROM transactions
GROUP BY 1
ORDER BY 1;

CREATE MATERIALIZED VIEW analytics_top_products AS
SELECT
    ti.product_id,
    ti.product_name,
    SUM(ti.quantity) AS quantity_sold,
    COALESCE(SUM(ti.subtotal), 0) AS total_revenue
FROM transaction_items ti
JOIN transactions t ON t.id = ti.transaction_id
WHERE t.payment_status = 'COMPLETED'
GROUP BY ti.product_id, ti.product_name
ORDER BY quantity_sold DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_revenue_daily_period
    ON analytics_revenue_daily (period_start);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_revenue_weekly_period
    ON analytics_revenue_weekly (period_start);

CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_revenue_monthly_period
    ON analytics_revenue_monthly (period_start);

CREATE INDEX IF NOT EXISTS idx_analytics_top_products_quantity
    ON analytics_top_products (quantity_sold DESC);

-- -----------------------------------------------------------------------------
-- Refresh helper for analytics views
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_revenue_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_revenue_weekly;
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_revenue_monthly;
    REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_top_products;
END;
$$ LANGUAGE plpgsql;

-- Initial refresh to populate analytics views
REFRESH MATERIALIZED VIEW analytics_revenue_daily;
REFRESH MATERIALIZED VIEW analytics_revenue_weekly;
REFRESH MATERIALIZED VIEW analytics_revenue_monthly;
REFRESH MATERIALIZED VIEW analytics_top_products;

-- -----------------------------------------------------------------------------
-- Register migration version
-- -----------------------------------------------------------------------------
INSERT INTO schema_migrations (version) VALUES ('006_phase8_reporting_analytics')
ON CONFLICT (version) DO NOTHING;

COMMIT;
