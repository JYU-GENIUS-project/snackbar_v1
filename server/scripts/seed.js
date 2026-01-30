#!/usr/bin/env node
// =============================================================================
// Database Seed Script
// =============================================================================
// Seeds the primary admin account for initial setup
// Usage: node scripts/seed.js
// =============================================================================

require('dotenv').config();

const db = require('../src/utils/database');
const adminService = require('../src/services/adminService');
const categoryService = require('../src/services/categoryService');
const productService = require('../src/services/productService');

const DEFAULT_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'SecurePass123!';
const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@snackbar.local';

const BLOCKING_CATEGORY_NAMES = [
  'Energy Drinks',
  'Drinks',
  'Chilled Drinks',
  'A',
  '12345678901234567890123456789012345678901234567890'
];

const REQUIRED_CATEGORIES = [
  { name: 'Beverages', description: 'Mixed beverage offerings kept for admin workflows.' },
  { name: 'Cold Beverages', description: 'Chilled drinks displayed on the kiosk cold shelf.' },
  { name: 'Cold Drinks', description: 'Grab-and-go cold beverages for kiosk filtering.' },
  { name: 'Soft Drinks', description: 'Carbonated refreshments highlighted in customer filters.' },
  { name: 'Hot Drinks', description: 'Steaming beverage options for kiosk filtering tests.' },
  { name: 'Healthy Snacks', description: 'Better-for-you snack items for wellness minded customers.' },
  { name: 'Snacks', description: 'Popular snack aisle staples for vending flows.' },
  { name: 'Candy', description: 'Confectionery treats showcased in sweet selections.' },
  { name: 'Bakery', description: 'Fresh baked goods including pastries and breads.' },
  { name: 'Breakfast', description: 'Morning-focused grab-and-go items.' },
  { name: 'Desserts', description: 'Sweet treats and indulgent options.' },
  { name: 'Salads', description: 'Prepared salads and light meals.' },
  { name: 'Gourmet Sandwiches', description: 'Premium sandwiches prepared daily.' },
  { name: 'Seasonal Specials', description: 'Limited-time offerings tied to promotions.' }
];

const PRODUCT_FIXTURES = [
  {
    name: 'Red Bull',
    description: 'Energy drink 250ml can.',
    price: 2.99,
    status: 'active',
    stockQuantity: 0,
    purchaseLimit: 4,
    lowStockThreshold: 20,
    categoryNames: ['Cold Drinks'],
    displayOrder: 0
  },
  {
    name: 'Coca-Cola',
    description: 'Classic cola 330ml can.',
    price: 1.8,
    status: 'active',
    stockQuantity: 5,
    purchaseLimit: 6,
    lowStockThreshold: 5,
    categoryNames: ['Cold Beverages', 'Cold Drinks', 'Soft Drinks'],
    allergens: 'Caramel color, Caffeine',
    displayOrder: 1
  },
  {
    name: 'Pepsi',
    description: 'Pepsi cola 330ml can.',
    price: 1.75,
    status: 'active',
    stockQuantity: 160,
    purchaseLimit: 6,
    lowStockThreshold: 25,
    categoryNames: ['Cold Beverages', 'Cold Drinks', 'Soft Drinks'],
    displayOrder: 2
  },
  {
    name: 'Sprite',
    description: 'Lemon-lime soda 330ml can.',
    price: 1.7,
    status: 'active',
    stockQuantity: 150,
    purchaseLimit: 6,
    lowStockThreshold: 25,
    categoryNames: ['Cold Beverages'],
    displayOrder: 3
  },
  {
    name: 'Iced Tea',
    description: 'Brewed iced tea with lemon.',
    price: 2.2,
    status: 'active',
    stockQuantity: 110,
    purchaseLimit: 5,
    lowStockThreshold: 20,
    categoryNames: ['Cold Beverages'],
    displayOrder: 4
  },
  {
    name: 'Sparkling Water',
    description: 'Unsweetened sparkling mineral water.',
    price: 1.5,
    status: 'active',
    stockQuantity: 140,
    purchaseLimit: 8,
    lowStockThreshold: 20,
    categoryNames: ['Cold Beverages'],
    displayOrder: 5
  },
  {
    name: 'Cold Brew Coffee',
    description: 'House cold brew coffee bottle.',
    price: 3.1,
    status: 'active',
    stockQuantity: 90,
    purchaseLimit: 4,
    lowStockThreshold: 15,
    categoryNames: ['Cold Beverages'],
    displayOrder: 6
  },
  {
    name: 'Chocolate Bar',
    description: 'Milk chocolate bar 45g.',
    price: 1.2,
    status: 'active',
    stockQuantity: 180,
    purchaseLimit: 8,
    lowStockThreshold: 25,
    categoryNames: ['Snacks', 'Candy'],
    allergens: 'Milk',
    displayOrder: 7
  },
  {
    name: 'Trail Mix',
    description: 'Nut and dried fruit mix.',
    price: 2.5,
    status: 'active',
    stockQuantity: 130,
    purchaseLimit: 6,
    lowStockThreshold: 20,
    categoryNames: ['Snacks', 'Healthy Snacks'],
    allergens: 'Peanuts, Tree nuts',
    displayOrder: 8
  }
];

const CUSTOMER_BROWSING_ORDER = [
  'Red Bull',
  'Coca-Cola',
  'Pepsi',
  'Sprite',
  'Iced Tea',
  'Sparkling Water',
  'Cold Brew Coffee',
  'Chocolate Bar',
  'Trail Mix'
];

const buildProductPayload = (fixture, categoryIds) => ({
  name: fixture.name,
  description: fixture.description,
  price: fixture.price,
  currency: 'EUR',
  status: fixture.status,
  stockQuantity: fixture.stockQuantity,
  purchaseLimit: fixture.purchaseLimit,
  lowStockThreshold: fixture.lowStockThreshold,
  allergens: fixture.allergens ?? null,
  imageAlt: null,
  metadata: { seeded: true },
  displayOrder: fixture.displayOrder ?? 0,
  isActive: true,
  categoryIds,
  categoryId: categoryIds[0]
});

const removeBlockingCategories = async () => {
  for (const name of BLOCKING_CATEGORY_NAMES) {
    const { rows } = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [name]);
    if (rows.length === 0) {
      continue;
    }
    const ids = rows.map((row) => row.id);
    await db.query('DELETE FROM product_category_assignments WHERE category_id = ANY($1::uuid[])', [ids]);
    await db.query('UPDATE products SET category_id = NULL WHERE category_id = ANY($1::uuid[])', [ids]);
    await db.query('DELETE FROM categories WHERE id = ANY($1::uuid[])', [ids]);
    console.log(`Removed blocking category: ${name}`);
  }
};

const ensureReferenceCategories = async (actor) => {
  await removeBlockingCategories();
  console.log('\nSeeding reference categories...');

  for (const category of REQUIRED_CATEGORIES) {
    const { rows } = await db.query('SELECT id FROM categories WHERE LOWER(name) = LOWER($1)', [category.name]);

    if (rows.length > 0) {
      console.log(`  Category already present: ${category.name}`);
      continue;
    }

    const created = await categoryService.createCategory({ name: category.name, description: category.description }, actor);
    console.log(`  Created category: ${created.name}`);
  }

  const categories = await categoryService.listCategories();
  const categoryMap = new Map(categories.map((category) => [category.name.toLowerCase(), category]));
  return categoryMap;
};

const ensureReferenceProducts = async (actor, categoryMap) => {
  console.log('\nSeeding reference products...');

  for (const fixture of PRODUCT_FIXTURES) {
    const categoryIds = fixture.categoryNames
      .map((name) => categoryMap.get(name.toLowerCase()))
      .filter(Boolean)
      .map((category) => category.id);

    if (categoryIds.length === 0) {
      console.warn(`  Skipping product ${fixture.name} because categories are missing.`);
      continue;
    }

    const { rows } = await db.query(
      'SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
      [fixture.name]
    );

    const payload = buildProductPayload(fixture, categoryIds);

    if (rows.length === 0) {
      await productService.createProduct(payload, actor);
      console.log(`  Created product: ${fixture.name}`);
      continue;
    }

    await productService.updateProduct(rows[0].id, payload, actor);
    console.log(`  Updated product: ${fixture.name}`);
  }
};

const applyCustomerBrowsingFixtures = async () => {
  console.log('\nConfiguring customer browsing fixtures...');

  await db.query(
    `WITH ordering AS (
       SELECT LOWER(value) AS name, ord - 1 AS position
       FROM UNNEST($1::text[]) WITH ORDINALITY AS listed(value, ord)
     )
     UPDATE products AS p
     SET display_order = ordering.position
     FROM ordering
     WHERE LOWER(p.name) = ordering.name`,
    [CUSTOMER_BROWSING_ORDER]
  );

  await db.query(
    `UPDATE products AS p
     SET allergens = data.allergens
     FROM (VALUES
       ('red bull', NULL),
       ('chocolate bar', 'Milk'),
       ('trail mix', 'Peanuts, Tree nuts')
     ) AS data(name, allergens)
     WHERE LOWER(p.name) = data.name`
  );
};

const ensureInventoryFixtures = async (actor) => {
  console.log('\nEnsuring inventory ledger fixtures...');

  await db.query(
    `DELETE FROM inventory_ledger
     WHERE product_id IN (
       SELECT id
       FROM products
       WHERE LOWER(name) = ANY($1::text[])
     )`,
    [['coca-cola', 'trail mix', 'red bull']]
  );
  console.log('  Reset ledger history for Coca-Cola, Trail Mix, and Red Bull.');

  const discrepancyDelta = -3;
  const discrepancyTag = 'inventory-discrepancy-trailmix';

  const discrepancyResult = await db.query(
    `WITH target_product AS (
        SELECT id, stock_quantity
        FROM products
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
    )
    INSERT INTO inventory_ledger (
        product_id,
        delta,
        resulting_quantity,
        source,
        reason,
        admin_id,
        metadata
    )
    SELECT
        tp.id,
        $2::integer,
        GREATEST(tp.stock_quantity + $2::integer, 0),
        'manual_adjustment',
        'Seeded discrepancy for acceptance tests',
        $3::uuid,
        jsonb_build_object('seedTag', $4::text)
    FROM target_product tp
    WHERE tp.id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM inventory_ledger l
        WHERE l.product_id = tp.id AND l.metadata ->> 'seedTag' = $4::text
    );`,
    ['Trail Mix', discrepancyDelta, actor?.id || null, discrepancyTag]
  );

  if (discrepancyResult.rowCount > 0) {
    console.log('  Seeded Trail Mix ledger discrepancy (3 units).');
  } else {
    console.log('  Trail Mix ledger discrepancy already present.');
  }

  const redBullResult = await db.query(
    `WITH target_product AS (
        SELECT id
        FROM products
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
    )
    UPDATE products AS p
    SET stock_quantity = 0
    FROM target_product tp
    WHERE p.id = tp.id
    RETURNING tp.id`,
    ['Red Bull']
  );

  if (redBullResult.rows.length > 0) {
    const productId = redBullResult.rows[0].id;
    console.log('  Seeding Red Bull zero stock ledger entry...');
    await db.query(
      `INSERT INTO inventory_ledger (
         product_id,
         delta,
         resulting_quantity,
         source,
         reason,
         admin_id,
         metadata
       ) VALUES (
         $1::uuid,
         0,
         0,
         'manual_adjustment',
         'Seeded zero stock for acceptance tests',
         $2::uuid,
         '{"seedTag":"inventory-seed-red-bull-zero-stock"}'::jsonb
       )`,
      [productId, actor?.id || null]
    );
    console.log('  Seeded Red Bull zero stock ledger entry.');
  } else {
    console.log('  Skipped Red Bull zero stock seed; product missing.');
  }

  await db.query('SELECT refresh_inventory_snapshot();');
};

async function seed() {
  console.log('='.repeat(60));
  console.log('Snackbar Kiosk System - Database Seed');
  console.log('='.repeat(60));

  try {
    // Check database connection
    console.log('\nChecking database connection...');
    const dbStatus = await db.checkConnection();

    if (!dbStatus.healthy) {
      console.error('Database connection failed:', dbStatus.error);
      process.exit(1);
    }

    console.log('Database connected successfully.');

    // Seed primary admin
    console.log('\nSeeding primary admin account...');
    const admin = await adminService.seedPrimaryAdmin(
      DEFAULT_ADMIN_USERNAME,
      DEFAULT_ADMIN_PASSWORD,
      DEFAULT_ADMIN_EMAIL
    );

    const adminActor = admin || (await adminService.getAdminByUsername(DEFAULT_ADMIN_USERNAME));

    if (adminActor) {
      if (admin) {
        console.log('\n✓ Primary admin created:');
        console.log(`  Username: ${admin.username}`);
        console.log(`  Email:    ${admin.email}`);
        console.log(`  ID:       ${admin.id}`);
        console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
      } else {
        console.log('Admin accounts already exist. Using existing primary admin.');
      }
    } else {
      throw new Error('Primary admin account is missing.');
    }

    const categoryMap = await ensureReferenceCategories(adminActor);
    await ensureReferenceProducts(adminActor, categoryMap);
    await applyCustomerBrowsingFixtures();
    await ensureInventoryFixtures(adminActor);

    console.log('\n' + '='.repeat(60));
    console.log('Seed completed successfully');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('\nSeed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seed();
