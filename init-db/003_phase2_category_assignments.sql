-- =============================================================================
-- PostgreSQL Schema Migration: 003_phase2_category_assignments
-- =============================================================================
-- Introduces many-to-many category mapping for products and backfills existing
-- assignments from the legacy products.category_id column.
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_category_assignments (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (product_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_product_category_assignments_category
    ON product_category_assignments (category_id);

CREATE INDEX IF NOT EXISTS idx_product_category_assignments_product
    ON product_category_assignments (product_id);

-- Backfill assignments for existing products referencing a single category
INSERT INTO product_category_assignments (product_id, category_id)
SELECT id, category_id
FROM products
WHERE category_id IS NOT NULL
ON CONFLICT (product_id, category_id) DO NOTHING;

-- Track schema version
INSERT INTO schema_migrations (version) VALUES ('003_phase2_category_assignments')
ON CONFLICT (version) DO NOTHING;
