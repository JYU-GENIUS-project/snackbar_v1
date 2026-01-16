const db = require('../utils/database');
const { ApiError } = require('../middleware/errorHandler');
const { createAuditLog, AuditActions, EntityTypes } = require('./auditService');
const notificationService = require('./notificationService');
const inventoryEvents = require('./inventoryEvents');

const INVENTORY_TRACKING_CONFIG_KEY = 'inventory_tracking_enabled';
const INVENTORY_TRACKING_DESCRIPTION = 'Toggle that controls whether automated inventory deductions are applied.';

const INVENTORY_EVENT_SOURCE = {
  PURCHASE: 'purchase',
  MANUAL: 'manual_adjustment',
  RECONCILIATION: 'reconciliation',
  SYSTEM: 'system'
};

const SORT_COLUMNS = {
  name: 'name',
  stock: 'current_stock',
  threshold: 'low_stock_threshold',
  updated: 'last_activity_at',
  discrepancy: 'ledger_balance'
};

const runQuery = (client, text, params = []) => {
  if (client && typeof client.query === 'function') {
    return client.query(text, params);
  }
  return db.query(text, params);
};

const parseConfigValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const toInteger = (value, { field, min = null, max = null }) => {
  const parsed = Number.isInteger(value) ? value : parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new ApiError(400, `${field} must be an integer value`);
  }

  if (min !== null && parsed < min) {
    throw new ApiError(400, `${field} must be greater than or equal to ${min}`);
  }

  if (max !== null && parsed > max) {
    throw new ApiError(400, `${field} must be less than or equal to ${max}`);
  }

  return parsed;
};

const mapSnapshotRow = (row) => ({
  productId: row.product_id,
  name: row.name,
  currentStock: Number(row.current_stock ?? 0),
  lowStockThreshold: Number(row.low_stock_threshold ?? 0),
  lowStock: Boolean(row.low_stock_flag),
  negativeStock: Boolean(row.negative_flag),
  discrepancyTotal: Number(row.ledger_balance ?? 0),
  lastActivityAt: row.last_activity_at,
  isActive: row.is_active,
  deletedAt: row.deleted_at
});

const notifyLowStockChange = async ({ snapshot, context }) => {
  try {
    await notificationService.evaluateLowStockState({ snapshot, context });
  } catch (error) {
    console.error('[Inventory] Failed to evaluate low stock state', error);
  }
};

const refreshInventorySnapshot = async () => {
  try {
    await db.query('SELECT refresh_inventory_snapshot();');
  } catch (error) {
    console.warn('[Inventory] Failed to refresh inventory_snapshot view', error);
  }
};

const finalizeInventoryChange = async ({ productId, context }) => {
  await refreshInventorySnapshot();
  const snapshot = await getInventoryItemByProductId(productId, { skipRefresh: true });
  await notifyLowStockChange({ snapshot, context });
  inventoryEvents.broadcastInventoryChange({ snapshot, context });
  return snapshot;
};

const fetchProductForUpdate = async (client, productId) => {
  const result = await runQuery(
    client,
    `SELECT id, name, stock_quantity, low_stock_threshold, is_active, metadata
     FROM products
     WHERE id = $1
     FOR UPDATE`,
    [productId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Product not found');
  }

  return result.rows[0];
};

const insertLedgerEntry = async (client, {
  productId,
  delta,
  resultingQuantity,
  source,
  reason = null,
  adminId = null,
  transactionId = null,
  metadata = {}
}) => runQuery(
  client,
  `INSERT INTO inventory_ledger (
     product_id,
     delta,
     resulting_quantity,
     source,
     reason,
     admin_id,
     transaction_id,
     metadata
   ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [productId, delta, resultingQuantity, source, reason, adminId, transactionId, metadata]
);

const getInventoryTrackingState = async ({ client = null } = {}) => {
  const result = await runQuery(
    client,
    'SELECT value FROM system_config WHERE key = $1 LIMIT 1',
    [INVENTORY_TRACKING_CONFIG_KEY]
  );

  if (result.rows.length === 0) {
    return true;
  }

  const value = parseConfigValue(result.rows[0].value);
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return Boolean(value);
};

const setInventoryTrackingState = async (enabled, actor = null) => {
  const normalized = Boolean(enabled);
  const previous = await getInventoryTrackingState();

  const result = await db.transaction(async (client) => {
    await runQuery(
      client,
      `INSERT INTO system_config (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP`,
      [INVENTORY_TRACKING_CONFIG_KEY, JSON.stringify(normalized), INVENTORY_TRACKING_DESCRIPTION]
    );

    if (actor && actor.id) {
      await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: null,
        oldValues: {
          configKey: INVENTORY_TRACKING_CONFIG_KEY,
          enabled: previous
        },
        newValues: {
          configKey: INVENTORY_TRACKING_CONFIG_KEY,
          enabled: normalized
        }
      });
    }

    return normalized;
  });

  inventoryEvents.broadcastTrackingChange({ enabled: result, actor });

  return { enabled: result, previous };
};

const listInventorySnapshot = async ({
  search = '',
  limit = 50,
  offset = 0,
  sortBy = 'name',
  sortDirection = 'asc',
  includeInactive = false
} = {}) => {
  await refreshInventorySnapshot();

  const conditions = ['deleted_at IS NULL'];
  const params = [];
  let index = 1;

  if (!includeInactive) {
    conditions.push('is_active = TRUE');
  }

  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    const paramIndex = index++;
    conditions.push(`LOWER(name) LIKE $${paramIndex}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortColumn = SORT_COLUMNS[sortBy] || SORT_COLUMNS.name;
  const direction = sortDirection && sortDirection.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const dataParams = [...params, limit, offset];
  const limitIndex = index++;
  const offsetIndex = index;

  const dataResult = await db.query(
    `SELECT product_id,
            name,
            current_stock,
            low_stock_threshold,
            low_stock_flag,
            negative_flag,
            ledger_balance,
            last_activity_at,
            is_active,
            deleted_at
     FROM inventory_snapshot
     ${whereClause}
     ORDER BY ${sortColumn} ${direction}
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    dataParams
  );

  const countResult = await db.query(
    `SELECT COUNT(*) AS total
     FROM inventory_snapshot
     ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0]?.total || '0', 10);

  return {
    data: dataResult.rows.map(mapSnapshotRow),
    meta: {
      total,
      limit,
      offset,
      sortBy,
      sortDirection: direction.toLowerCase()
    }
  };
};

const getInventoryItemByProductId = async (productId, { skipRefresh = false } = {}) => {
  if (!skipRefresh) {
    await refreshInventorySnapshot();
  }
  const result = await db.query(
    `SELECT product_id,
            name,
            current_stock,
            low_stock_threshold,
            low_stock_flag,
            negative_flag,
            ledger_balance,
            last_activity_at,
            is_active,
            deleted_at
     FROM inventory_snapshot
     WHERE product_id = $1
     LIMIT 1`,
    [productId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, 'Inventory record not found');
  }

  return mapSnapshotRow(result.rows[0]);
};

const recordManualStockUpdate = async ({
  productId,
  quantity,
  reason = 'Manual stock update',
  actor
}) => {
  const newQuantity = toInteger(quantity, { field: 'Quantity', min: 0 });

  const updated = await db.transaction(async (client) => {
    const product = await fetchProductForUpdate(client, productId);
    const delta = newQuantity - product.stock_quantity;

    if (delta === 0) {
      return {
        productId: product.id,
        name: product.name,
        currentStock: product.stock_quantity,
        delta
      };
    }

    await runQuery(
      client,
      `UPDATE products
       SET stock_quantity = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [newQuantity, productId]
    );

    const isSeededProduct = Boolean(product.metadata?.seeded);

    if (!isSeededProduct) {
      await insertLedgerEntry(client, {
        productId,
        delta,
        resultingQuantity: newQuantity,
        source: INVENTORY_EVENT_SOURCE.MANUAL,
        reason,
        adminId: actor?.id || null,
        transactionId: null,
        metadata: {
          adminUsername: actor?.username || null
        }
      });
    }

    if (actor && actor.id) {
      await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.INVENTORY_UPDATED,
        entityType: EntityTypes.INVENTORY,
        entityId: productId,
        oldValues: { stockQuantity: product.stock_quantity },
        newValues: { stockQuantity: newQuantity, reason }
      });
    }

    return {
      productId: product.id,
      name: product.name,
      currentStock: newQuantity,
      delta
    };
  });

  const snapshot = await finalizeInventoryChange({
    productId,
    context: {
      source: 'manual_update',
      actorId: actor?.id || null,
      delta: updated.delta,
      reason
    }
  });

  return {
    ...snapshot,
    delta: updated.delta,
    reason
  };
};

const recordInventoryAdjustment = async ({
  productId,
  newQuantity,
  reason,
  actor
}) => recordManualStockUpdate({
  productId,
  quantity: newQuantity,
  reason: reason || 'Inventory adjustment',
  actor
});

const applyPurchaseDeduction = async ({ client, productId, quantity, transactionId = null, metadata = {} }) => {
  const trackingEnabled = await getInventoryTrackingState({ client });
  if (!trackingEnabled) {
    return {
      trackingEnabled: false,
      productId,
      quantity: Number(quantity)
    };
  }

  const units = toInteger(quantity, { field: 'Quantity', min: 1 });
  const product = await fetchProductForUpdate(client, productId);
  const requestedDelta = -Math.abs(units);
  const unclampedResult = product.stock_quantity + requestedDelta;
  const resultingQuantity = Math.max(unclampedResult, 0);
  const appliedDelta = resultingQuantity - product.stock_quantity;
  const shortfall = unclampedResult < 0 ? Math.abs(unclampedResult) : 0;

  await runQuery(
    client,
    `UPDATE products
       SET stock_quantity = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
    [resultingQuantity, productId]
  );

  await insertLedgerEntry(client, {
    productId,
    delta: appliedDelta,
    resultingQuantity,
    source: INVENTORY_EVENT_SOURCE.PURCHASE,
    reason: 'Automatic purchase deduction',
    adminId: null,
    transactionId,
    metadata: {
      ...metadata,
      requestedQuantity: units,
      appliedQuantity: Math.abs(appliedDelta),
      shortfall
    }
  });

  return {
    productId,
    currentStock: resultingQuantity,
    delta: appliedDelta,
    trackingEnabled: true,
    shortfall
  };
};

const recordPurchaseDeduction = async ({
  productId,
  quantity,
  transactionId = null,
  metadata = {},
  client = null,
  deferPostProcessing = false
}) => {
  const executor = async (activeClient) => applyPurchaseDeduction({
    client: activeClient,
    productId,
    quantity,
    transactionId,
    metadata
  });

  const result = client ? await executor(client) : await db.transaction(executor);

  if (!result.trackingEnabled) {
    return result;
  }

  if (deferPostProcessing) {
    return result;
  }

  const snapshot = await finalizeInventoryChange({
    productId,
    context: {
      source: 'purchase',
      transactionId,
      shortfall: result.shortfall,
      delta: result.delta
    }
  });

  return {
    ...result,
    snapshot
  };
};

const finalizeInventoryPostProcessing = async ({ productId, context }) => finalizeInventoryChange({ productId, context });

const listDiscrepancies = async () => {
  await refreshInventorySnapshot();
  const result = await db.query(
    `SELECT product_id,
            name,
            current_stock,
            low_stock_threshold,
            low_stock_flag,
            negative_flag,
            ledger_balance,
            last_activity_at,
            is_active,
            deleted_at
     FROM inventory_snapshot
     WHERE negative_flag = TRUE OR ledger_balance < 0
     ORDER BY last_activity_at DESC`
  );

  return result.rows.map(mapSnapshotRow);
};

module.exports = {
  getInventoryTrackingState,
  setInventoryTrackingState,
  listInventorySnapshot,
  getInventoryItemByProductId,
  recordManualStockUpdate,
  recordInventoryAdjustment,
  recordPurchaseDeduction,
  finalizeInventoryPostProcessing,
  listDiscrepancies
};
