const db = require('../utils/database');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog, AuditActions, EntityTypes } = require('./auditService');

const mapCategoryRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  displayOrder: row.display_order,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const listCategories = async () => {
  const result = await db.query(
    `SELECT id, name, description, display_order, is_active, created_at, updated_at
     FROM categories
     ORDER BY display_order ASC, name ASC`
  );

  return result.rows.map(mapCategoryRow);
};

const getCategoryById = async (id) => {
  const result = await db.query(
    `SELECT id, name, description, display_order, is_active, created_at, updated_at
     FROM categories
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ? mapCategoryRow(result.rows[0]) : null;
};

const categoryNameExists = async (name, excludeId = null) => {
  const params = [name];
  let query = 'SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1)';

  if (excludeId) {
    params.push(excludeId);
    query += ' AND id <> $2';
  }

  const result = await db.query(query, params);
  return result.rows.length > 0;
};

const getNextDisplayOrder = async () => {
  const result = await db.query('SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM categories');
  return result.rows[0]?.next_order || 1;
};

const createCategory = async ({ name, description, displayOrder }, actor) => {
  const trimmedName = name.trim();

  if (await categoryNameExists(trimmedName)) {
    throw new ApiError(409, 'Category name already exists');
  }

  const nextOrder = typeof displayOrder === 'number' ? displayOrder : await getNextDisplayOrder();

  const result = await db.query(
    `INSERT INTO categories (name, description, display_order)
     VALUES ($1, $2, $3)
     RETURNING id, name, description, display_order, is_active, created_at, updated_at`,
    [trimmedName, description?.trim() || null, nextOrder]
  );

  const category = mapCategoryRow(result.rows[0]);

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

const updateCategory = async (id, { name, description, displayOrder, isActive }, actor) => {
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new ApiError(404, 'Category not found');
  }

  const updates = [];
  const values = [];
  let index = 1;

  if (name !== undefined) {
    const trimmed = name.trim();
    if (await categoryNameExists(trimmed, id)) {
      throw new ApiError(409, 'Category name already exists');
    }
    updates.push(`name = $${index++}`);
    values.push(trimmed);
  }

  if (description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(description?.trim() || null);
  }

  if (displayOrder !== undefined) {
    updates.push(`display_order = $${index++}`);
    values.push(displayOrder);
  }

  if (isActive !== undefined) {
    updates.push(`is_active = $${index++}`);
    values.push(Boolean(isActive));
  }

  if (updates.length === 0) {
    return existing;
  }

  values.push(id);

  const result = await db.query(
    `UPDATE categories
     SET ${updates.join(', ')}
     WHERE id = $${index}
     RETURNING id, name, description, display_order, is_active, created_at, updated_at`,
    values
  );

  const updated = mapCategoryRow(result.rows[0]);

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

const categoryHasAssignments = async (id) => {
  const assignmentResult = await db.query(
    `SELECT COUNT(*) AS count
     FROM product_category_assignments
     WHERE category_id = $1`,
    [id]
  );

  const legacyResult = await db.query(
    `SELECT COUNT(*) AS count
     FROM products
     WHERE category_id = $1 AND deleted_at IS NULL`,
    [id]
  );

  const assignmentCount = parseInt(assignmentResult.rows[0]?.count || '0', 10);
  const legacyCount = parseInt(legacyResult.rows[0]?.count || '0', 10);

  return assignmentCount + legacyCount > 0;
};

const deleteCategory = async (id, actor) => {
  const existing = await getCategoryById(id);
  if (!existing) {
    throw new ApiError(404, 'Category not found');
  }

  if (await categoryHasAssignments(id)) {
    throw new ApiError(400, 'Cannot delete category with assigned products', {
      advice: 'Please reassign or delete products first'
    });
  }

  await db.query('DELETE FROM categories WHERE id = $1', [id]);

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

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryById
};
