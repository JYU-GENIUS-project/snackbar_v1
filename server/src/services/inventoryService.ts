import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';
import notificationService from './notificationService';
import inventoryEvents from './inventoryEvents';
import statusEvents from './statusEvents';
import { deriveProductAvailability } from './productService';

const INVENTORY_TRACKING_CONFIG_KEY = 'inventory_tracking_enabled';
const INVENTORY_TRACKING_DESCRIPTION = 'Toggle that controls whether automated inventory deductions are applied.';

const INVENTORY_EVENT_SOURCE = {
    PURCHASE: 'purchase',
    MANUAL: 'manual_adjustment',
    RECONCILIATION: 'reconciliation',
    SYSTEM: 'system'
} as const;

const SORT_COLUMNS: Record<string, string> = {
    name: 'name',
    stock: 'current_stock',
    threshold: 'low_stock_threshold',
    updated: 'last_activity_at',
    discrepancy: 'ledger_balance'
};

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type InventorySnapshotRow = {
    product_id: string;
    name: string;
    current_stock: number | null;
    low_stock_threshold: number | null;
    low_stock_flag: boolean;
    negative_flag: boolean;
    ledger_balance: number | null;
    last_activity_at: string | null;
    is_active: boolean;
    deleted_at: string | null;
};

type InventorySnapshot = {
    productId: string;
    name: string;
    currentStock: number;
    lowStockThreshold: number;
    lowStock: boolean;
    negativeStock: boolean;
    discrepancyTotal: number;
    lastActivityAt: string | null;
    isActive: boolean;
    deletedAt: string | null;
};

type InventoryContext = Record<string, unknown>;

type AdminActor = {
    id: string;
    username: string;
};

const database = db as unknown as DbClient;

const runQuery = (client: DbClient | null, text: string, params: unknown[] = []) => {
    if (client && typeof client.query === 'function') {
        return client.query(text, params);
    }
    return database.query(text, params);
};

const parseConfigValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as unknown;
        } catch {
            return value;
        }
    }

    return value;
};

const toInteger = (value: unknown, { field, min = null, max = null }: { field: string; min?: number | null; max?: number | null }) => {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new ApiError(400, `${field} must be an integer value`);
    }

    const parsed = Number.isInteger(value) ? Number(value) : parseInt(String(value), 10);
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

const mapSnapshotRow = (row: InventorySnapshotRow): InventorySnapshot => ({
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

const notifyLowStockChange = async ({ snapshot, context }: { snapshot: InventorySnapshot; context?: InventoryContext }) => {
    try {
        const payload = context ? { snapshot, context } : { snapshot };
        await notificationService.evaluateLowStockState(payload);
    } catch (error) {
        console.error('[Inventory] Failed to evaluate low stock state', error);
    }
};

const refreshInventorySnapshot = async () => {
    try {
        await database.query('SELECT refresh_inventory_snapshot();');
    } catch (error) {
        console.warn('[Inventory] Failed to refresh inventory_snapshot view', error);
    }
};

const finalizeInventoryChange = async ({ productId, context }: { productId: string; context: InventoryContext }) => {
    await refreshInventorySnapshot();
    const snapshot = await getInventoryItemByProductId(productId, { skipRefresh: true });
    await notifyLowStockChange({ snapshot, context });
    inventoryEvents.broadcastInventoryChange({ snapshot, context });
    try {
        const availability = deriveProductAvailability({
            status: snapshot.deletedAt ? 'archived' : 'active',
            isActive: snapshot.isActive && !snapshot.deletedAt,
            stockQuantity: snapshot.currentStock,
            lowStockThreshold: snapshot.lowStockThreshold
        });

        statusEvents.broadcastInventoryAvailability({
            productId,
            emittedAt: new Date().toISOString(),
            ...availability
        });
    } catch (error) {
        console.error('[Inventory] Failed to broadcast kiosk availability change', error);
    }
    return snapshot;
};

const fetchProductForUpdate = async (client: DbClient, productId: string) => {
    const result = (await runQuery(
        client,
        `SELECT id, name, stock_quantity, low_stock_threshold, is_active, metadata
     FROM products
     WHERE id = $1
     FOR UPDATE`,
        [productId]
    )) as DbQueryResult<Record<string, unknown>>;

    if (result.rows.length === 0) {
        throw new ApiError(404, 'Product not found');
    }

    return result.rows[0] as {
        id: string;
        name: string;
        stock_quantity: number;
        low_stock_threshold: number | null;
        is_active: boolean;
        metadata?: { seeded?: boolean };
    };
};

const insertLedgerEntry = async (
    client: DbClient,
    {
        productId,
        delta,
        resultingQuantity,
        source,
        reason = null,
        adminId = null,
        transactionId = null,
        metadata = {}
    }: {
        productId: string;
        delta: number;
        resultingQuantity: number;
        source: string;
        reason?: string | null;
        adminId?: string | null;
        transactionId?: string | null;
        metadata?: Record<string, unknown>;
    }
) =>
    runQuery(
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

const getInventoryTrackingState = async ({ client = null }: { client?: DbClient | null } = {}) => {
    const result = (await runQuery(
        client,
        'SELECT value FROM system_config WHERE key = $1 LIMIT 1',
        [INVENTORY_TRACKING_CONFIG_KEY]
    )) as DbQueryResult<{ value: unknown }>;

    if (result.rows.length === 0) {
        return true;
    }

    const value = parseConfigValue(result.rows[0]?.value);
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

const setInventoryTrackingState = async (enabled: boolean, actor: AdminActor | null = null) => {
    const normalized = Boolean(enabled);
    const previous = await getInventoryTrackingState();

    const dbWithTransaction = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };

    const result = await dbWithTransaction.transaction(async (client: DbClient) => {
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
    try {
        statusEvents.broadcastTrackingState({
            enabled: result,
            emittedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Inventory] Failed to broadcast kiosk tracking state', error);
    }

    return { enabled: result, previous };
};

const listInventorySnapshot = async ({
    search = '',
    limit = 50,
    offset = 0,
    sortBy = 'name',
    sortDirection = 'asc',
    includeInactive = false
}: {
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: string;
    includeInactive?: boolean;
} = {}) => {
    await refreshInventorySnapshot();

    const conditions = ['deleted_at IS NULL'];
    const params: unknown[] = [];
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

    const dataResult = (await database.query(
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
    )) as DbQueryResult<InventorySnapshotRow>;

    const countResult = (await database.query(
        `SELECT COUNT(*) AS total
     FROM inventory_snapshot
     ${whereClause}`,
        params
    )) as DbQueryResult<{ total: string }>;

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

const getInventoryItemByProductId = async (
    productId: string,
    { skipRefresh = false }: { skipRefresh?: boolean } = {}
): Promise<InventorySnapshot> => {
    if (!skipRefresh) {
        await refreshInventorySnapshot();
    }
    const result = (await database.query(
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
    )) as DbQueryResult<InventorySnapshotRow>;

    if (result.rows.length === 0) {
        throw new ApiError(404, 'Inventory record not found');
    }

    const row = result.rows[0];
    if (!row) {
        throw new ApiError(404, 'Inventory record not found');
    }
    return mapSnapshotRow(row);
};

const recordManualStockUpdate = async ({
    productId,
    quantity,
    reason = 'Manual stock update',
    actor
}: {
    productId: string;
    quantity: unknown;
    reason?: string;
    actor?: AdminActor | null;
}) => {
    const newQuantity = toInteger(quantity, { field: 'Quantity', min: 0 });

    const dbWithTransaction = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };

    const updated = await dbWithTransaction.transaction(async (client: DbClient) => {
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
}: {
    productId: string;
    newQuantity: unknown;
    reason?: string;
    actor?: AdminActor | null;
}) =>
    recordManualStockUpdate({
        productId,
        quantity: newQuantity,
        reason: reason || 'Inventory adjustment',
        ...(actor !== undefined ? { actor } : {})
    });

const applyPurchaseDeduction = async ({
    client,
    productId,
    quantity,
    transactionId = null,
    metadata = {}
}: {
    client: DbClient;
    productId: string;
    quantity: unknown;
    transactionId?: string | null;
    metadata?: Record<string, unknown>;
}) => {
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
}: {
    productId: string;
    quantity: unknown;
    transactionId?: string | null;
    metadata?: Record<string, unknown>;
    client?: DbClient | null;
    deferPostProcessing?: boolean;
}) => {
    const executor = async (activeClient: DbClient) =>
        applyPurchaseDeduction({
            client: activeClient,
            productId,
            quantity,
            transactionId,
            metadata
        });

    const dbWithTransaction = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };
    const result = client ? await executor(client) : await dbWithTransaction.transaction(executor);

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

const finalizeInventoryPostProcessing = async ({ productId, context }: { productId: string; context: InventoryContext }) =>
    finalizeInventoryChange({ productId, context });

const listDiscrepancies = async () => {
    await refreshInventorySnapshot();
    const result = (await database.query(
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
    )) as DbQueryResult<InventorySnapshotRow>;

    return result.rows.map(mapSnapshotRow);
};

const inventoryService = {
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

export {
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

export default inventoryService;
