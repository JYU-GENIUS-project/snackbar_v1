import db from '../utils/database';

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type AuditLogParams = {
    adminId: string | null;
    adminUsername: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
};

type AuditLogRecord = Record<string, unknown>;

type AuditLogFilters = {
    adminId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
};

const database = db as unknown as DbClient;

/**
 * Audit action types
 */
const AuditActions = {
    // Authentication
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',

    // Admin management
    ADMIN_CREATED: 'ADMIN_CREATED',
    ADMIN_UPDATED: 'ADMIN_UPDATED',
    ADMIN_DELETED: 'ADMIN_DELETED',
    ADMIN_DEACTIVATED: 'ADMIN_DEACTIVATED',
    ADMIN_ACTIVATED: 'ADMIN_ACTIVATED',

    // Product management
    PRODUCT_CREATED: 'PRODUCT_CREATED',
    PRODUCT_UPDATED: 'PRODUCT_UPDATED',
    PRODUCT_DELETED: 'PRODUCT_DELETED',
    PRODUCT_MEDIA_UPLOADED: 'PRODUCT_MEDIA_UPLOADED',
    PRODUCT_MEDIA_PRIMARY_SET: 'PRODUCT_MEDIA_PRIMARY_SET',
    PRODUCT_MEDIA_DELETED: 'PRODUCT_MEDIA_DELETED',

    // Category management
    CATEGORY_CREATED: 'CATEGORY_CREATED',
    CATEGORY_UPDATED: 'CATEGORY_UPDATED',
    CATEGORY_DELETED: 'CATEGORY_DELETED',

    // Inventory
    INVENTORY_UPDATED: 'INVENTORY_UPDATED',

    // Cart session events
    CART_ITEM_ADDED: 'CART_ITEM_ADDED',
    CART_ITEM_REMOVED: 'CART_ITEM_REMOVED',
    CART_CLEARED: 'CART_CLEARED',
    CART_TIMEOUT: 'CART_TIMEOUT',

    // Configuration
    CONFIG_UPDATED: 'CONFIG_UPDATED',

    // Transaction confirmation
    TRANSACTION_CREATED: 'TRANSACTION_CREATED',
    TRANSACTION_CONFIRMATION_ATTEMPTED: 'TRANSACTION_CONFIRMATION_ATTEMPTED',
    TRANSACTION_CONFIRMED: 'TRANSACTION_CONFIRMED',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    TRANSACTION_MARKED_UNCERTAIN: 'TRANSACTION_MARKED_UNCERTAIN',
    TRANSACTION_RECONCILED_CONFIRMED: 'TRANSACTION_RECONCILED_CONFIRMED',
    TRANSACTION_RECONCILED_REFUNDED: 'TRANSACTION_RECONCILED_REFUNDED',
    CONFIRMATION_SERVICE_UNAVAILABLE: 'CONFIRMATION_SERVICE_UNAVAILABLE'
} as const;

/**
 * Entity types for audit logs
 */
const EntityTypes = {
    ADMIN: 'ADMIN',
    PRODUCT: 'PRODUCT',
    CATEGORY: 'CATEGORY',
    INVENTORY: 'INVENTORY',
    CART_SESSION: 'CART_SESSION',
    CONFIG: 'CONFIG',
    SESSION: 'SESSION',
    TRANSACTION: 'TRANSACTION',
    CONFIRMATION_SERVICE: 'CONFIRMATION_SERVICE'
} as const;

const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

/**
 * Create an audit log entry
 */
const createAuditLog = async ({
    adminId,
    adminUsername,
    action,
    entityType,
    entityId = null,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null
}: AuditLogParams): Promise<AuditLogRecord> => {
    const result = (await database.query(
        `INSERT INTO audit_logs 
     (admin_id, admin_username, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
        [
            adminId,
            adminUsername,
            action,
            entityType,
            entityId,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            ipAddress,
            userAgent
        ]
    )) as DbQueryResult<AuditLogRecord>;

    return result.rows[0] || {};
};

const createAuditLogWithRetry = async (
    params: AuditLogParams,
    {
        retryScheduleMs = [1000, 2000, 4000],
        maxAttempts = 1 + retryScheduleMs.length
    }: {
        retryScheduleMs?: number[];
        maxAttempts?: number;
    } = {}
) => {
    const attemptTimestamps: string[] = [];
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        attemptTimestamps.push(new Date().toISOString());
        try {
            const record = await createAuditLog(params);
            return {
                record,
                attempts: attempt,
                timestamps: attemptTimestamps,
                succeeded: true
            };
        } catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                const delay = retryScheduleMs[Math.min(attempt - 1, retryScheduleMs.length - 1)] ?? 0;
                if (delay > 0) {
                    await sleep(delay);
                }
            }
        }
    }

    return {
        record: null,
        attempts: attemptTimestamps.length,
        timestamps: attemptTimestamps,
        succeeded: false,
        error: lastError
    };
};

/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogs = async (filters: AuditLogFilters = {}) => {
    const {
        adminId,
        action,
        entityType,
        startDate,
        endDate,
        limit = 50,
        offset = 0
    } = filters;

    const whereClause: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (adminId) {
        whereClause.push(`admin_id = $${paramIndex++}`);
        params.push(adminId);
    }

    if (action) {
        whereClause.push(`action = $${paramIndex++}`);
        params.push(action);
    }

    if (entityType) {
        whereClause.push(`entity_type = $${paramIndex++}`);
        params.push(entityType);
    }

    if (startDate) {
        whereClause.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
    }

    if (endDate) {
        whereClause.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
    }

    const whereString = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

    const countResult = (await database.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereString}`,
        params
    )) as DbQueryResult<{ total: string }>;

    const dataResult = (await database.query(
        `SELECT * FROM audit_logs 
     ${whereString}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
    )) as DbQueryResult<AuditLogRecord>;

    return {
        logs: dataResult.rows,
        total: parseInt(countResult.rows[0]?.total || '0', 10),
        limit,
        offset
    };
};

const auditService = {
    AuditActions,
    EntityTypes,
    createAuditLog,
    createAuditLogWithRetry,
    getAuditLogs
};

export {
    AuditActions,
    EntityTypes,
    createAuditLog,
    createAuditLogWithRetry,
    getAuditLogs
};
export default auditService;
