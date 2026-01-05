// =============================================================================
// Audit Service
// =============================================================================
// Handles audit log entries for admin actions
// Based on SRS FR-5.3 (Audit Trail) and US-022
// =============================================================================

const db = require('../utils/database');

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

  // Configuration
  CONFIG_UPDATED: 'CONFIG_UPDATED'
};

/**
 * Entity types for audit logs
 */
const EntityTypes = {
  ADMIN: 'ADMIN',
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  INVENTORY: 'INVENTORY',
  CONFIG: 'CONFIG',
  SESSION: 'SESSION'
};

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.adminId - Admin UUID (can be null for failed logins)
 * @param {string} params.adminUsername - Admin username
 * @param {string} params.action - Action type from AuditActions
 * @param {string} params.entityType - Entity type from EntityTypes
 * @param {string} [params.entityId] - UUID of affected entity
 * @param {Object} [params.oldValues] - Previous values (for updates)
 * @param {Object} [params.newValues] - New values
 * @param {string} [params.ipAddress] - Client IP address
 * @param {string} [params.userAgent] - Client user agent
 * @returns {Promise<Object>} Created audit log entry
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
}) => {
  const result = await db.query(
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
  );

  return result.rows[0];
};

/**
 * Get audit logs with filtering and pagination
 * @param {Object} filters - Query filters
 * @param {string} [filters.adminId] - Filter by admin
 * @param {string} [filters.action] - Filter by action type
 * @param {string} [filters.entityType] - Filter by entity type
 * @param {Date} [filters.startDate] - Filter from date
 * @param {Date} [filters.endDate] - Filter to date
 * @param {number} [filters.limit=50] - Results per page
 * @param {number} [filters.offset=0] - Pagination offset
 * @returns {Promise<Object>} Audit logs and count
 */
const getAuditLogs = async (filters = {}) => {
  const {
    adminId,
    action,
    entityType,
    startDate,
    endDate,
    limit = 50,
    offset = 0
  } = filters;

  let whereClause = [];
  let params = [];
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

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM audit_logs ${whereString}`,
    params
  );

  // Get paginated results
  const dataResult = await db.query(
    `SELECT * FROM audit_logs 
     ${whereString}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  return {
    logs: dataResult.rows,
    total: parseInt(countResult.rows[0].total, 10),
    limit,
    offset
  };
};

module.exports = {
  AuditActions,
  EntityTypes,
  createAuditLog,
  getAuditLogs
};
