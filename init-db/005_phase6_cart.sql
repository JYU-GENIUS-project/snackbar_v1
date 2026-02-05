-- =============================================================================
-- PostgreSQL Schema Migration: 005_phase6_cart
-- =============================================================================
-- Adds cart session persistence and kiosk event logging to support Phase 6
-- shopping cart experience. Aligns with SRS FR-2.1 to FR-2.5.
--
-- Tables created:
-- - cart_sessions: kiosk session-level cart state
-- - cart_items: items within a cart session
-- - kiosk_event_logs: kiosk-side audit/event trail for cart/session events
-- =============================================================================

-- =============================================================================
-- Cart Sessions Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS cart_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_sessions_status ON cart_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_last_activity_at ON cart_sessions(last_activity_at DESC);

-- =============================================================================
-- Cart Items Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_session_id UUID NOT NULL REFERENCES cart_sessions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    purchase_limit INTEGER CHECK (purchase_limit IS NULL OR purchase_limit BETWEEN 1 AND 50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(cart_session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_session_product
    ON cart_items(cart_session_id, product_id);

-- =============================================================================
-- Kiosk Event Logs Table
-- =============================================================================
CREATE TABLE IF NOT EXISTS kiosk_event_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_key VARCHAR(128),
    event_name VARCHAR(100) NOT NULL,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kiosk_event_logs_session_key ON kiosk_event_logs(session_key);
CREATE INDEX IF NOT EXISTS idx_kiosk_event_logs_event_name ON kiosk_event_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_kiosk_event_logs_created_at ON kiosk_event_logs(created_at DESC);

-- =============================================================================
-- updated_at triggers
-- =============================================================================
CREATE TRIGGER update_cart_sessions_updated_at
    BEFORE UPDATE ON cart_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
