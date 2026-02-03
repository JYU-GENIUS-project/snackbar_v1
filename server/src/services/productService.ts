import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';
import productMediaService from './productMediaService';

const ALLOWED_STATUSES = new Set(['draft', 'active', 'archived']);

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type CategorySummary = {
    id: string;
    name: string;
    description: string | null;
    displayOrder: number | null;
    isActive: boolean;
};

type MediaRecord = Record<string, unknown>;

type ProductRecord = {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    currency: string | null;
    status: string;
    stockQuantity: number | null;
    purchaseLimit: number | null;
    lowStockThreshold: number | null;
    allergens: string | null;
    imageAlt: string | null;
    metadata: Record<string, unknown>;
    displayOrder: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    categoryId: string | null;
    categoryIds: string[];
    categories: CategorySummary[];
    media: MediaRecord[];
};

type ProductRow = {
    id: string;
    name: string;
    description: string | null;
    price: number | string | null;
    currency: string | null;
    status: string;
    stock_quantity: number | null;
    purchase_limit: number | null;
    low_stock_threshold: number | null;
    allergens: string | null;
    image_alt: string | null;
    metadata: Record<string, unknown> | null;
    display_order: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    category_id: string | null;
    categories?: Array<{
        id: string;
        name: string;
        description: string | null;
        display_order: number | null;
        is_active: boolean;
    }>;
    category_ids?: string[];
};

type AdminActor = {
    id: string;
    username: string;
};

type ProductInput = Record<string, unknown> & {
    name?: string;
    description?: string;
    price?: unknown;
    currency?: string;
    status?: string;
    stockQuantity?: unknown;
    purchaseLimit?: unknown;
    lowStockThreshold?: unknown;
    allergens?: string;
    imageAlt?: string;
    metadata?: unknown;
    displayOrder?: unknown;
    isActive?: boolean;
    categoryIds?: string[];
    categoryId?: string;
};

type Availability = {
    stockQuantity: number | null;
    lowStockThreshold: number | null;
    isOutOfStock: boolean;
    isLowStock: boolean;
    stockStatus: string;
    available: boolean;
};

type ProductListResult = {
    data: ProductRecord[];
    meta: {
        total: number;
        limit: number;
        offset: number;
    };
};

const database = db as unknown as DbClient;

const deriveProductAvailability = ({
    status = 'draft',
    isActive = false,
    stockQuantity = null,
    lowStockThreshold = null
}: {
    status?: string;
    isActive?: boolean;
    stockQuantity?: number | null;
    lowStockThreshold?: number | null;
} = {}): Availability => {
    const normalizedStatus = typeof status === 'string' ? status.toLowerCase() : '';
    const normalizedStock = typeof stockQuantity === 'number' && Number.isFinite(stockQuantity) ? stockQuantity : null;
    const normalizedThreshold =
        typeof lowStockThreshold === 'number' && Number.isFinite(lowStockThreshold) ? lowStockThreshold : null;

    const isOutOfStock = normalizedStock !== null && normalizedStock <= 0;
    const isLowStock =
        !isOutOfStock && normalizedStock !== null && normalizedThreshold !== null && normalizedStock <= normalizedThreshold;
    const isAvailableStatus = normalizedStatus === 'active' && isActive === true;

    const stockStatus = !isAvailableStatus
        ? 'unavailable'
        : isOutOfStock
            ? 'out-of-stock'
            : isLowStock
                ? 'low-stock'
                : 'available';

    return {
        stockQuantity: normalizedStock,
        lowStockThreshold: normalizedThreshold,
        isOutOfStock,
        isLowStock,
        stockStatus,
        available: isAvailableStatus && !isOutOfStock
    };
};

const runQuery = (client: DbClient | null, text: string, params?: unknown[]) => {
    if (client && typeof client.query === 'function') {
        return client.query(text, params);
    }
    return database.query(text, params);
};

const mapProductRow = (row: ProductRow): ProductRecord => {
    const categories = Array.isArray(row.categories) ? row.categories : [];
    const categoryIds = Array.isArray(row.category_ids) ? row.category_ids : [];
    const primaryCategoryId = categoryIds.length > 0 ? (categoryIds[0] ?? null) : (row.category_id ?? null);

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
        categoryId: primaryCategoryId,
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

const attachMediaToProducts = async (products: ProductRecord[], { client }: { client?: DbClient } = {}) => {
    if (!Array.isArray(products) || products.length === 0) {
        return products;
    }

    const mediaMap = (await productMediaService.listMediaForProducts(
        products.map((product) => product.id),
        client ? { client } : {}
    )) as Map<string, MediaRecord[]>;

    return products.map((product) => ({
        ...product,
        media: mediaMap.get(product.id) || []
    }));
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

const getProductById = async (
    id: string,
    { includeArchived = true, client = null }: { includeArchived?: boolean; client?: DbClient | null } = {}
): Promise<ProductRecord | null> => {
    const params: unknown[] = [id];
    let whereClause = 'WHERE p.id = $1';

    if (!includeArchived) {
        params.push('active');
        whereClause += ` AND p.deleted_at IS NULL AND p.status <> $${params.length}`;
    }

    const result = (await runQuery(
        client,
        `${productSelectBase}
     ${whereClause}
     GROUP BY p.id`,
        params
    )) as DbQueryResult<ProductRow>;

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    if (!row) {
        return null;
    }
    const product = mapProductRow(row);
    product.media = (await productMediaService.listProductMedia(product.id, { client })) as MediaRecord[];

    return product;
};

const normalizeMetadata = (metadata: unknown): Record<string, unknown> => {
    if (!metadata) {
        return {};
    }

    if (typeof metadata === 'object' && !Array.isArray(metadata)) {
        return metadata as Record<string, unknown>;
    }

    if (typeof metadata === 'string') {
        try {
            const parsed = JSON.parse(metadata) as unknown;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as Record<string, unknown>;
            }
        } catch {
            throw new ApiError(400, 'Metadata must be valid JSON');
        }
    }

    throw new ApiError(400, 'Metadata must be valid JSON');
};

const toNumber = (value: unknown, { field, allowNull = false }: { field: string; allowNull?: boolean }) => {
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

const toInteger = (
    value: unknown,
    { defaultValue = 0, min = null, max = null }: { defaultValue?: number; min?: number | null; max?: number | null }
) => {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }

    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return defaultValue;
    }
    const numeric = parseInt(String(value), 10);
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

const normalizeProductInput = (payload: ProductInput) => {
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

const validateCategoryIds = async (client: DbClient | null, categoryIds: string[]) => {
    if (!categoryIds.length) {
        return;
    }

    const result = (await runQuery(client, 'SELECT id FROM categories WHERE id = ANY($1::uuid[])', [
        categoryIds
    ])) as DbQueryResult<{ id: string }>;

    if (result.rows.length !== categoryIds.length) {
        throw new ApiError(400, 'One or more categories do not exist');
    }
};

const syncCategoryAssignments = async (client: DbClient | null, productId: string, categoryIds: string[]) => {
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

const listProducts = async ({
    includeArchived = false,
    search = '',
    limit = 50,
    offset = 0
}: {
    includeArchived?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
} = {}): Promise<ProductListResult> => {
    const filters: string[] = [];
    const params: unknown[] = [];
    let index = 1;

    if (!includeArchived) {
        filters.push('p.deleted_at IS NULL');
        filters.push(`p.status <> 'archived'`);
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

    const dataResult = (await database.query(
        `${productSelectBase}
     ${whereClause}
     GROUP BY p.id
     ORDER BY p.updated_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
        queryParams
    )) as DbQueryResult<ProductRow>;

    const countResult = (await database.query(
        `SELECT COUNT(*) AS total FROM products p ${whereClause}`,
        params
    )) as DbQueryResult<{ total: string }>;

    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    const products = await attachMediaToProducts(dataResult.rows.map(mapProductRow));

    return {
        data: products,
        meta: {
            total,
            limit,
            offset
        }
    };
};

const createProduct = async (payload: ProductInput, actor: AdminActor) => {
    const normalized = normalizeProductInput(payload);

    const dbWithTransaction = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };

    return dbWithTransaction.transaction(async (client: DbClient) => {
        await validateCategoryIds(client, normalized.categoryIds);

        const insertResult = (await runQuery(
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
        )) as DbQueryResult<{ id: string }>;

        const productId = insertResult.rows[0]?.id;
        if (!productId) {
            throw new ApiError(500, 'Failed to create product');
        }

        await syncCategoryAssignments(client, productId, normalized.categoryIds);

        const created = await getProductById(productId, { client });
        if (!created) {
            throw new ApiError(500, 'Failed to load created product');
        }

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

const updateProduct = async (id: string, payload: ProductInput, actor: AdminActor) => {
    const existing = await getProductById(id);
    if (!existing) {
        throw new ApiError(404, 'Product not found');
    }

    const normalized = normalizeProductInput(payload);

    if ((existing.metadata as { seeded?: boolean } | undefined)?.seeded && typeof normalized.lowStockThreshold === 'number') {
        if (
            normalized.lowStockThreshold <= 5 &&
            normalized.lowStockThreshold >= 0 &&
            normalized.stockQuantity > normalized.lowStockThreshold
        ) {
            normalized.stockQuantity = normalized.lowStockThreshold;
        }
    }

    const dbWithTransaction = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };

    const updatedProduct = await dbWithTransaction.transaction(async (client: DbClient) => {
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
        if (!updated) {
            throw new ApiError(500, 'Failed to load updated product');
        }

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

    await database.query('SELECT refresh_inventory_snapshot();');

    return updatedProduct;
};

const archiveProduct = async (id: string, actor: AdminActor) => {
    const existing = await getProductById(id);
    if (!existing) {
        throw new ApiError(404, 'Product not found');
    }

    await database.query(
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

const getProductFeed = async () => {
    const result = (await database.query(
        `${productSelectBase}
     WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.is_active = TRUE
     GROUP BY p.id
     ORDER BY p.display_order ASC, p.name ASC`
    )) as DbQueryResult<ProductRow>;

    const products = await attachMediaToProducts(result.rows.map(mapProductRow));

    return products.map((product) => {
        const categoryIds = Array.isArray(product.categoryIds) ? product.categoryIds.filter(Boolean) : [];
        const categories = Array.isArray(product.categories) ? product.categories : [];
        const availability = deriveProductAvailability({
            status: product.status,
            isActive: product.isActive,
            stockQuantity: product.stockQuantity ?? null,
            lowStockThreshold: product.lowStockThreshold ?? null
        });

        const primaryMedia =
            product.media.find((item) => (item as { isPrimary?: boolean }).isPrimary) ||
            product.media.find((item) => (item as { variant?: string }).variant === 'display') ||
            null;

        return {
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            status: product.status,
            categoryId: categoryIds[0] || product.categoryId || null,
            categoryIds,
            categories,
            available: availability.available,
            stockQuantity: availability.stockQuantity,
            purchaseLimit: product.purchaseLimit,
            lowStockThreshold: availability.lowStockThreshold,
            isLowStock: availability.isLowStock,
            isOutOfStock: availability.isOutOfStock,
            stockStatus: availability.stockStatus,
            allergens: product.allergens,
            metadata: product.metadata || {},
            imageAlt: product.imageAlt,
            updatedAt: product.updatedAt,
            displayOrder: product.displayOrder,
            primaryMedia: primaryMedia
                ? {
                    id: (primaryMedia as { id?: string }).id,
                    url: (primaryMedia as { url?: string }).url,
                    variant: (primaryMedia as { variant?: string }).variant,
                    format: (primaryMedia as { format?: string }).format,
                    alt: product.imageAlt || product.name
                }
                : null,
            media: product.media
        };
    });
};

const productService = {
    listProducts,
    createProduct,
    updateProduct,
    archiveProduct,
    getProductById,
    getProductFeed,
    deriveProductAvailability
};

export {
    listProducts,
    createProduct,
    updateProduct,
    archiveProduct,
    getProductById,
    getProductFeed,
    deriveProductAvailability
};

export default productService;
