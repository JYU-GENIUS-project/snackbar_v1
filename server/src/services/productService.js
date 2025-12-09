const db = require('../utils/database');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog, AuditActions, EntityTypes } = require('./auditService');

const ALLOWED_STATUSES = new Set(['draft', 'active', 'archived']);

const runQuery = (client, text, params) => {
  if (client && typeof client.query === 'function') {
    return client.query(text, params);
  }
  return db.query(text, params);
};

const mapProductRow = (row) => {
  const categories = Array.isArray(row.categories) ? row.categories : [];
  const categoryIds = Array.isArray(row.category_ids) ? row.category_ids : [];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price !== null ? Number(row.price) : null,
    currency: row.currency,
    status: row.status,
    stockQuantity: row.stock_quantity,
    purchaseLimit: row.purchase_limit,
    lowStockThreshold: row.low_stock_threshold,
    allergens: row.allergens,
    imageAlt: row.image_alt,
    metadata: row.metadata || {},
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    categoryId: categoryIds.length > 0 ? categoryIds[0] : row.category_id,
    categoryIds,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      displayOrder: category.display_order,
      isActive: category.is_active
    })),
    media: []
  };
};

const productSelectBase = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.price,
    p.currency,
    p.status,
    p.stock_quantity,
    p.purchase_limit,
    p.low_stock_threshold,
    p.allergens,
    p.image_alt,
    p.metadata,
    p.display_order,
    p.is_active,
    p.created_at,
    p.updated_at,
    p.deleted_at,
    p.category_id,
    COALESCE(
      json_agg(
        DISTINCT jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'description', c.description,
          'display_order', c.display_order,
          'is_active', c.is_active
        )
      ) FILTER (WHERE c.id IS NOT NULL),
      '[]'
    ) AS categories,
    COALESCE(array_agg(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL), '{}') AS category_ids
  FROM products p
  LEFT JOIN product_category_assignments pca ON p.id = pca.product_id
  LEFT JOIN categories c ON pca.category_id = c.id
`;

const getProductById = async (id, { includeArchived = true, client = null } = {}) => {
  const params = [id];
  let whereClause = 'WHERE p.id = $1';

  if (!includeArchived) {
    params.push('active');
    whereClause += ` AND p.deleted_at IS NULL AND p.status <> $${params.length}`;
  }

  const result = await runQuery(
    client,
    `${productSelectBase}
     ${whereClause}
     GROUP BY p.id`,
    params
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapProductRow(result.rows[0]);
};

const normalizeMetadata = (metadata) => {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }

  if (typeof metadata === 'string') {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      throw new ApiError(400, 'Metadata must be valid JSON');
    }
  }

  throw new ApiError(400, 'Metadata must be valid JSON');
};

const toNumber = (value, { field, allowNull = false }) => {
  if (value === null || value === undefined || value === '') {
    if (allowNull) {
      return null;
    }
    throw new ApiError(400, `${field} is required`);
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    throw new ApiError(400, `${field} must be a numeric value`);
  }

  return numeric;
};

const toInteger = (value, { defaultValue = 0, min = null, max = null }) => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  const numeric = parseInt(value, 10);
  if (Number.isNaN(numeric)) {
    return defaultValue;
  }

  if (min !== null && numeric < min) {
    throw new ApiError(400, `Value must be greater than or equal to ${min}`);
  }

  if (max !== null && numeric > max) {
    throw new ApiError(400, `Value must be less than or equal to ${max}`);
  }

  return numeric;
};

const normalizeProductInput = (payload) => {
  const name = payload.name?.trim();
  if (!name) {
    throw new ApiError(400, 'Product name is required');
  }

  const status = (payload.status || 'draft').toLowerCase();
  if (!ALLOWED_STATUSES.has(status)) {
    throw new ApiError(400, 'Invalid product status');
  }

  const categoryIds = Array.isArray(payload.categoryIds)
    ? Array.from(new Set(payload.categoryIds.filter(Boolean)))
    : payload.categoryId
      ? [payload.categoryId]
      : [];

  const primaryCategoryId = categoryIds[0] || payload.categoryId || null;

  return {
    name,
    description: payload.description?.trim() || null,
    price: toNumber(payload.price, { field: 'Price' }),
    currency: (payload.currency || 'EUR').toUpperCase(),
    status,
    stockQuantity: toInteger(payload.stockQuantity, { defaultValue: 0, min: 0 }),
    purchaseLimit: toInteger(payload.purchaseLimit, { defaultValue: 50, min: 1, max: 50 }),
    lowStockThreshold: toInteger(payload.lowStockThreshold, { defaultValue: 10, min: 0 }),
    allergens: payload.allergens?.trim() || null,
    imageAlt: payload.imageAlt?.trim() || null,
    metadata: normalizeMetadata(payload.metadata),
    displayOrder: toInteger(payload.displayOrder, { defaultValue: 0, min: 0 }),
    isActive: payload.isActive !== false,
    categoryIds,
    categoryId: primaryCategoryId
  };
};

const validateCategoryIds = async (client, categoryIds) => {
  if (!categoryIds.length) {
    return;
  }

  const result = await runQuery(
    client,
    'SELECT id FROM categories WHERE id = ANY($1::uuid[])',
    [categoryIds]
  );

  if (result.rows.length !== categoryIds.length) {
    throw new ApiError(400, 'One or more categories do not exist');
  }
};

const syncCategoryAssignments = async (client, productId, categoryIds) => {
  if (!categoryIds.length) {
    await runQuery(client, 'DELETE FROM product_category_assignments WHERE product_id = $1', [productId]);
    return;
  }

  await runQuery(
    client,
    `DELETE FROM product_category_assignments
     WHERE product_id = $1 AND NOT (category_id = ANY($2::uuid[]))`,
    [productId, categoryIds]
  );

  for (const categoryId of categoryIds) {
    await runQuery(
      client,
      `INSERT INTO product_category_assignments (product_id, category_id)
       VALUES ($1, $2)
       ON CONFLICT (product_id, category_id) DO NOTHING`,
      [productId, categoryId]
    );
  }
};

const listProducts = async ({ includeArchived = false, search = '', limit = 50, offset = 0 } = {}) => {
  const filters = [];
  const params = [];
  let index = 1;

  if (!includeArchived) {
    filters.push('p.deleted_at IS NULL');
    filters.push("p.status <> 'archived'");
  }

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    const nameIdx = index++;
    const descIdx = index++;
    filters.push(`(p.name ILIKE $${nameIdx} OR p.description ILIKE $${descIdx})`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const queryParams = [...params, limit, offset];
  const limitIndex = params.length + 1;
  const offsetIndex = params.length + 2;

  const dataResult = await db.query(
    `${productSelectBase}
     ${whereClause}
     GROUP BY p.id
     ORDER BY p.updated_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    queryParams
  );

  const countResult = await db.query(
    `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  return {
    data: dataResult.rows.map(mapProductRow),
    meta: {
      total,
      limit,
      offset
    }
  };
};

const createProduct = async (payload, actor) => {
  const normalized = normalizeProductInput(payload);

  return db.transaction(async (client) => {
    await validateCategoryIds(client, normalized.categoryIds);

    const insertResult = await runQuery(
      client,
      `INSERT INTO products (
         name,
         description,
         price,
         currency,
         status,
         stock_quantity,
         purchase_limit,
         low_stock_threshold,
         allergens,
         image_alt,
         metadata,
         display_order,
         is_active,
         category_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
       )
       RETURNING id`,
      [
        normalized.name,
        normalized.description,
        normalized.price,
        normalized.currency,
        normalized.status,
        normalized.stockQuantity,
        normalized.purchaseLimit,
        normalized.lowStockThreshold,
        normalized.allergens,
        normalized.imageAlt,
        normalized.metadata,
        normalized.displayOrder,
        normalized.isActive,
        normalized.categoryId
      ]
    );

    const productId = insertResult.rows[0].id;

    await syncCategoryAssignments(client, productId, normalized.categoryIds);

    const created = await getProductById(productId, { client });

    await createAuditLog({
      adminId: actor.id,
      adminUsername: actor.username,
      action: AuditActions.PRODUCT_CREATED,
      entityType: EntityTypes.PRODUCT,
      entityId: created.id,
      newValues: created
    });

    return created;
  });
};

const updateProduct = async (id, payload, actor) => {
  const existing = await getProductById(id);
  if (!existing) {
    throw new ApiError(404, 'Product not found');
  }

  const normalized = normalizeProductInput(payload);

  return db.transaction(async (client) => {
    await validateCategoryIds(client, normalized.categoryIds);

    const updates = [
      'name = $1',
      'description = $2',
      'price = $3',
      'currency = $4',
      'status = $5',
      'stock_quantity = $6',
      'purchase_limit = $7',
      'low_stock_threshold = $8',
      'allergens = $9',
      'image_alt = $10',
      'metadata = $11',
      'display_order = $12',
      'is_active = $13',
      'category_id = $14'
    ];

    await runQuery(
      client,
      `UPDATE products
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $15`,
      [
        normalized.name,
        normalized.description,
        normalized.price,
        normalized.currency,
        normalized.status,
        normalized.stockQuantity,
        normalized.purchaseLimit,
        normalized.lowStockThreshold,
        normalized.allergens,
        normalized.imageAlt,
        normalized.metadata,
        normalized.displayOrder,
        normalized.isActive,
        normalized.categoryId,
        id
      ]
    );

    await syncCategoryAssignments(client, id, normalized.categoryIds);

    const updated = await getProductById(id, { client });

    await createAuditLog({
      adminId: actor.id,
      adminUsername: actor.username,
      action: AuditActions.PRODUCT_UPDATED,
      entityType: EntityTypes.PRODUCT,
      entityId: id,
      oldValues: existing,
      newValues: updated
    });

    return updated;
  });
};

const archiveProduct = async (id, actor) => {
  const existing = await getProductById(id);
  if (!existing) {
    throw new ApiError(404, 'Product not found');
  }

  await db.query(
    `UPDATE products
     SET status = 'archived', is_active = FALSE, deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  const updated = await getProductById(id);

  await createAuditLog({
    adminId: actor.id,
    adminUsername: actor.username,
    action: AuditActions.PRODUCT_DELETED,
    entityType: EntityTypes.PRODUCT,
    entityId: id,
    oldValues: existing,
    newValues: updated
  });

  return updated;
};

module.exports = {
  listProducts,
  createProduct,
  updateProduct,
  archiveProduct,
  getProductById
};
