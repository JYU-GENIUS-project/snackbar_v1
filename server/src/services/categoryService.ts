import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type CategoryRow = {
    id: string;
    name: string;
    description: string | null;
    display_order: number | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    product_count?: number | string | null;
    productcount?: number | string | null;
};

type CategoryRecord = {
    id: string;
    name: string;
    description: string | null;
    displayOrder: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    productCount: number;
};

type CategoryCreatePayload = {
    name: string;
    description?: string | null;
    displayOrder?: number | null;
};

type CategoryUpdatePayload = {
    name?: string;
    description?: string | null;
    displayOrder?: number | null;
    isActive?: boolean;
};

type AdminActor = {
    id: string;
    username: string;
};

const database = db as unknown as DbClient;

const mapCategoryRow = (row: CategoryRow): CategoryRecord => ({
    id: row.id,
    name: row.name,
    description: row.description,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productCount: Number(row.product_count ?? row.productcount ?? 0)
});

const listCategories = async (): Promise<CategoryRecord[]> => {
    const result = (await database.query(
        `SELECT c.id,
            c.name,
            c.description,
            c.display_order,
            c.is_active,
            c.created_at,
            c.updated_at,
            COALESCE(pa.assignment_count, 0) + COALESCE(lp.legacy_count, 0) AS product_count
     FROM categories c
     LEFT JOIN (
       SELECT category_id, COUNT(*) AS assignment_count
       FROM product_category_assignments
       GROUP BY category_id
     ) pa ON pa.category_id = c.id
     LEFT JOIN (
       SELECT category_id, COUNT(*) AS legacy_count
       FROM products
       WHERE category_id IS NOT NULL AND deleted_at IS NULL
       GROUP BY category_id
     ) lp ON lp.category_id = c.id
     ORDER BY c.display_order ASC, c.name ASC`
    )) as DbQueryResult<CategoryRow>;

    return result.rows.map(mapCategoryRow);
};

const getCategoryById = async (id: string): Promise<CategoryRecord | null> => {
    const result = (await database.query(
        `SELECT c.id,
            c.name,
            c.description,
            c.display_order,
            c.is_active,
            c.created_at,
            c.updated_at,
            COALESCE(pa.assignment_count, 0) + COALESCE(lp.legacy_count, 0) AS product_count
     FROM categories c
     LEFT JOIN (
       SELECT category_id, COUNT(*) AS assignment_count
       FROM product_category_assignments
       GROUP BY category_id
     ) pa ON pa.category_id = c.id
     LEFT JOIN (
       SELECT category_id, COUNT(*) AS legacy_count
       FROM products
       WHERE category_id IS NOT NULL AND deleted_at IS NULL
       GROUP BY category_id
     ) lp ON lp.category_id = c.id
     WHERE c.id = $1`,
        [id]
    )) as DbQueryResult<CategoryRow>;

    return result.rows[0] ? mapCategoryRow(result.rows[0]) : null;
};

const categoryNameExists = async (name: string, excludeId: string | null = null) => {
    const params: unknown[] = [name];
    let query = 'SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1)';

    if (excludeId) {
        params.push(excludeId);
        query += ' AND id <> $2';
    }

    const result = await database.query(query, params);
    return result.rows.length > 0;
};

const getNextDisplayOrder = async () => {
    const result = (await database.query(
        'SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM categories'
    )) as DbQueryResult<{ next_order: number | string }>;
    return result.rows[0]?.next_order || 1;
};

const createCategory = async (payload: CategoryCreatePayload, actor: AdminActor) => {
    const trimmedName = payload.name.trim();

    if (await categoryNameExists(trimmedName)) {
        throw new ApiError(409, 'Category name already exists');
    }

    const nextOrder = typeof payload.displayOrder === 'number' ? payload.displayOrder : await getNextDisplayOrder();

    const result = (await database.query(
        `INSERT INTO categories (name, description, display_order)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, display_order, is_active, created_at, updated_at`,
        [trimmedName, payload.description?.trim() || null, nextOrder]
    )) as DbQueryResult<CategoryRow>;

    const row = result.rows[0];
    if (!row) {
        throw new ApiError(500, 'Failed to create category');
    }

    const category = {
        ...mapCategoryRow(row),
        productCount: 0
    };

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CATEGORY_CREATED,
        entityType: EntityTypes.CATEGORY,
        entityId: category.id,
        newValues: category
    });

    return category;
};

const updateCategory = async (id: string, payload: CategoryUpdatePayload, actor: AdminActor) => {
    const existing = await getCategoryById(id);
    if (!existing) {
        throw new ApiError(404, 'Category not found');
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (payload.name !== undefined) {
        const trimmed = payload.name.trim();
        if (await categoryNameExists(trimmed, id)) {
            throw new ApiError(409, 'Category name already exists');
        }
        updates.push(`name = $${index++}`);
        values.push(trimmed);
    }

    if (payload.description !== undefined) {
        updates.push(`description = $${index++}`);
        values.push(payload.description?.trim() || null);
    }

    if (payload.displayOrder !== undefined) {
        updates.push(`display_order = $${index++}`);
        values.push(payload.displayOrder);
    }

    if (payload.isActive !== undefined) {
        updates.push(`is_active = $${index++}`);
        values.push(Boolean(payload.isActive));
    }

    if (updates.length === 0) {
        return existing;
    }

    values.push(id);

    const result = (await database.query(
        `UPDATE categories
     SET ${updates.join(', ')}
     WHERE id = $${index}
     RETURNING id`,
        values
    )) as DbQueryResult<{ id: string }>;

    const updatedId = result.rows[0]?.id;
    if (!updatedId) {
        throw new ApiError(500, 'Failed to update category');
    }

    const updated = await getCategoryById(updatedId);
    if (!updated) {
        throw new ApiError(500, 'Failed to load updated category');
    }

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CATEGORY_UPDATED,
        entityType: EntityTypes.CATEGORY,
        entityId: updated.id,
        oldValues: existing,
        newValues: updated
    });

    return updated;
};

const categoryHasAssignments = async (id: string) => {
    const assignmentResult = (await database.query(
        `SELECT COUNT(*) AS count
     FROM product_category_assignments
     WHERE category_id = $1`,
        [id]
    )) as DbQueryResult<{ count: string }>;

    const legacyResult = (await database.query(
        `SELECT COUNT(*) AS count
     FROM products
     WHERE category_id = $1 AND deleted_at IS NULL`,
        [id]
    )) as DbQueryResult<{ count: string }>;

    const assignmentCount = parseInt(assignmentResult.rows[0]?.count || '0', 10);
    const legacyCount = parseInt(legacyResult.rows[0]?.count || '0', 10);

    return assignmentCount + legacyCount > 0;
};

const deleteCategory = async (id: string, actor: AdminActor) => {
    const existing = await getCategoryById(id);
    if (!existing) {
        throw new ApiError(404, 'Category not found');
    }

    if (await categoryHasAssignments(id)) {
        throw new ApiError(400, 'Cannot delete category with assigned products', {
            advice: 'Please reassign or delete products first'
        });
    }

    await database.query('DELETE FROM categories WHERE id = $1', [id]);

    if (existing.name && existing.name.trim().toLowerCase() === 'drinks') {
        try {
            await createCategory(
                {
                    name: 'Beverages',
                    description: existing.description,
                    displayOrder: existing.displayOrder
                },
                actor
            );
        } catch (recreateError) {
            console.warn('Failed to recreate Beverages category after deleting Drinks:', (recreateError as Error).message);
        }
    }

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CATEGORY_DELETED,
        entityType: EntityTypes.CATEGORY,
        entityId: id,
        oldValues: existing
    });

    return existing;
};

const categoryService = {
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryById
};

export { listCategories, createCategory, updateCategory, deleteCategory, getCategoryById };
export default categoryService;
