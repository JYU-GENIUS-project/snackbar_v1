-- =============================================================================
-- PostgreSQL Schema Migration: 002_phase2_products_media
-- =============================================================================
-- Introduces product lifecycle metadata and product media management tables that
-- support secure image handling for the admin product catalog.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Create ENUM types for product and media state if they do not yet exist.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
        CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_media_variant') THEN
        CREATE TYPE product_media_variant AS ENUM ('source', 'display', 'thumbnail');
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_media_format') THEN
        CREATE TYPE product_media_format AS ENUM ('jpeg', 'webp', 'png');
    END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Update products table with lifecycle fields and stronger validation.
-- -----------------------------------------------------------------------------
ALTER TABLE products
    DROP COLUMN IF EXISTS image_url,
    ADD COLUMN IF NOT EXISTS status product_status NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS currency CHAR(3) NOT NULL DEFAULT 'EUR',
    ADD COLUMN IF NOT EXISTS image_alt TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Ensure currency uses ISO 4217 style formatting (three uppercase letters)
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_currency_format;

ALTER TABLE products
    ADD CONSTRAINT products_currency_format
        CHECK (currency ~ '^[A-Z]{3}$');

-- Tighten price validation to keep values within expected kiosk ranges
ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_price_check;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_price_range;

ALTER TABLE products
    ADD CONSTRAINT products_price_range
        CHECK (price >= 0 AND price <= 999.99);

-- Maintain uniqueness of active product names to avoid kiosk collisions
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_active_name
    ON products (LOWER(name))
    WHERE deleted_at IS NULL;

-- Helpful index for active kiosk listings
CREATE INDEX IF NOT EXISTS idx_products_active_status
    ON products (status)
    WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- Create product_media table for storing processed and source assets.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant product_media_variant NOT NULL,
    format product_media_format NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    storage_disk VARCHAR(50) NOT NULL DEFAULT 'local',
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1024 AND 5242880),
    width INTEGER CHECK (width > 0),
    height INTEGER CHECK (height > 0),
    checksum CHAR(64) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enforce deterministic uniqueness for primary display assets
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_media_primary
    ON product_media (product_id)
    WHERE is_primary AND deleted_at IS NULL;

-- Prevent duplicate renditions for the same variant/format pairing
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_media_renditions
    ON product_media (product_id, variant, format)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_media_product
    ON product_media (product_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_media_checksum
    ON product_media (checksum)
    WHERE deleted_at IS NULL;

-- Updated_at trigger for product_media
CREATE OR REPLACE FUNCTION set_product_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_media_updated_at ON product_media;

CREATE TRIGGER update_product_media_updated_at
    BEFORE UPDATE ON product_media
    FOR EACH ROW
    EXECUTE FUNCTION set_product_media_updated_at();

-- Register migration version
INSERT INTO schema_migrations (version) VALUES ('002_phase2_products_media')
ON CONFLICT (version) DO NOTHING;
