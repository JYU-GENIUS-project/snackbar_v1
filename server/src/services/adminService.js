// =============================================================================
// Admin Service
// =============================================================================
// CRUD operations for admin accounts
// Based on SRS FR-5.2 (Multiple admin accounts) and US-021
// =============================================================================

const db = require('../utils/database');
const authService = require('./authService');
const { createAuditLog, AuditActions, EntityTypes } = require('./auditService');

const MAX_ADMIN_ACCOUNTS = 10;

/**
 * Get all admin accounts
 * @returns {Promise<Array>} List of admins (without password hashes)
 */
const getAllAdmins = async () => {
  const result = await db.query(
    `SELECT id, username, email, is_primary, is_active, last_login_at, created_at, updated_at
     FROM admins
     ORDER BY is_primary DESC, created_at ASC`
  );
  return result.rows;
};

/**
 * Get admin by ID
 * @param {string} id - Admin UUID
 * @returns {Promise<Object|null>} Admin data or null
 */
const getAdminById = async (id) => {
  const result = await db.query(
    `SELECT id, username, email, is_primary, is_active, last_login_at, created_at, updated_at
     FROM admins
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/**
 * Get admin by username (includes password hash for authentication)
 * @param {string} username - Admin username
 * @returns {Promise<Object|null>} Admin data with password hash
 */
const getAdminByUsername = async (username) => {
  const result = await db.query(
    'SELECT * FROM admins WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
};

/**
 * Get count of admin accounts
 * @returns {Promise<number>} Number of admins
 */
const getAdminCount = async () => {
  const result = await db.query('SELECT COUNT(*) as count FROM admins');
  return parseInt(result.rows[0].count, 10);
};

/**
 * Create a new admin account
 * @param {Object} adminData - Admin data
 * @param {string} adminData.username - Username
 * @param {string} adminData.email - Email (optional)
 * @param {string} adminData.password - Plain text password
 * @param {boolean} adminData.isPrimary - Is primary admin
 * @param {Object} createdBy - Admin creating this account
 * @returns {Promise<Object>} Created admin
 */
const createAdmin = async (adminData, createdBy) => {
  // Check max admin limit
  const count = await getAdminCount();
  if (count >= MAX_ADMIN_ACCOUNTS) {
    const error = new Error('Maximum 10 admin accounts allowed');
    error.statusCode = 400;
    throw error;
  }

  // Hash password
  const passwordHash = await authService.hashPassword(adminData.password);

  const result = await db.query(
    `INSERT INTO admins (username, email, password_hash, is_primary)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, is_primary, is_active, created_at`,
    [adminData.username, adminData.email || null, passwordHash, adminData.isPrimary || false]
  );

  const newAdmin = result.rows[0];

  // Add to password history
  await authService.addToPasswordHistory(newAdmin.id, passwordHash);

  // Create audit log
  await createAuditLog({
    adminId: createdBy.id,
    adminUsername: createdBy.username,
    action: AuditActions.ADMIN_CREATED,
    entityType: EntityTypes.ADMIN,
    entityId: newAdmin.id,
    newValues: { username: newAdmin.username, email: newAdmin.email, isPrimary: newAdmin.is_primary }
  });

  return newAdmin;
};

/**
 * Update admin account
 * @param {string} id - Admin UUID
 * @param {Object} updates - Fields to update
 * @param {Object} updatedBy - Admin making the update
 * @returns {Promise<Object>} Updated admin
 */
const updateAdmin = async (id, updates, updatedBy) => {
  // Get current admin data for audit
  const currentAdmin = await getAdminById(id);
  if (!currentAdmin) {
    const error = new Error('Admin not found');
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = ['username', 'email', 'is_active'];
  const setClause = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }
  }

  if (setClause.length === 0) {
    return currentAdmin;
  }

  values.push(id);

  const result = await db.query(
    `UPDATE admins 
     SET ${setClause.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, username, email, is_primary, is_active, created_at, updated_at`,
    values
  );

  const updatedAdmin = result.rows[0];

  // Create audit log
  await createAuditLog({
    adminId: updatedBy.id,
    adminUsername: updatedBy.username,
    action: AuditActions.ADMIN_UPDATED,
    entityType: EntityTypes.ADMIN,
    entityId: id,
    oldValues: currentAdmin,
    newValues: updatedAdmin
  });

  return updatedAdmin;
};

/**
 * Change admin password
 * @param {string} id - Admin UUID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @param {Object} changedBy - Admin making the change
 * @returns {Promise<boolean>} Success status
 */
const changePassword = async (id, currentPassword, newPassword, changedBy) => {
  // Get admin with password hash
  const result = await db.query('SELECT * FROM admins WHERE id = $1', [id]);
  const admin = result.rows[0];

  if (!admin) {
    const error = new Error('Admin not found');
    error.statusCode = 404;
    throw error;
  }

  // Verify current password
  const isValid = await authService.verifyPassword(currentPassword, admin.password_hash);
  if (!isValid) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  // Check password history (prevent reuse of last 5 passwords)
  const wasUsed = await authService.checkPasswordHistory(id, newPassword);
  if (wasUsed) {
    const error = new Error('Password has been used recently. Please choose a different password.');
    error.statusCode = 400;
    throw error;
  }

  // Hash new password
  const newPasswordHash = await authService.hashPassword(newPassword);

  // Update password
  await db.query(
    `UPDATE admins 
     SET password_hash = $1, password_changed_at = NOW()
     WHERE id = $2`,
    [newPasswordHash, id]
  );

  // Add to password history
  await authService.addToPasswordHistory(id, newPasswordHash);

  // Invalidate all existing sessions
  await authService.invalidateAllSessions(id);

  // Create audit log
  await createAuditLog({
    adminId: changedBy.id,
    adminUsername: changedBy.username,
    action: AuditActions.PASSWORD_CHANGED,
    entityType: EntityTypes.ADMIN,
    entityId: id
  });

  return true;
};

/**
 * Delete admin account
 * Primary admin cannot be deleted
 * @param {string} id - Admin UUID
 * @param {Object} deletedBy - Admin making the deletion
 * @returns {Promise<boolean>} Success status
 */
const deleteAdmin = async (id, deletedBy) => {
  // Check if admin exists
  const admin = await getAdminById(id);
  if (!admin) {
    const error = new Error('Admin not found');
    error.statusCode = 404;
    throw error;
  }

  // Cannot delete primary admin
  if (admin.is_primary) {
    const error = new Error('Cannot delete primary admin account');
    error.statusCode = 400;
    throw error;
  }

  // Cannot delete self
  if (id === deletedBy.id) {
    const error = new Error('Cannot delete your own account');
    error.statusCode = 400;
    throw error;
  }

  // Invalidate all sessions for this admin
  await authService.invalidateAllSessions(id);

  // Delete admin
  await db.query('DELETE FROM admins WHERE id = $1', [id]);

  // Create audit log
  await createAuditLog({
    adminId: deletedBy.id,
    adminUsername: deletedBy.username,
    action: AuditActions.ADMIN_DELETED,
    entityType: EntityTypes.ADMIN,
    entityId: id,
    oldValues: { username: admin.username, email: admin.email }
  });

  return true;
};

/**
 * Seed primary admin account
 * Used for initial setup
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} email - Email (optional)
 * @returns {Promise<Object>} Created admin
 */
const seedPrimaryAdmin = async (username, password, email = null) => {
  // Check if any admin exists
  const count = await getAdminCount();
  if (count > 0) {
    console.log('Admin accounts already exist. Skipping seed.');
    return null;
  }

  const passwordHash = await authService.hashPassword(password);

  const result = await db.query(
    `INSERT INTO admins (username, email, password_hash, is_primary)
     VALUES ($1, $2, $3, true)
     RETURNING id, username, email, is_primary, is_active, created_at`,
    [username, email, passwordHash]
  );

  const admin = result.rows[0];

  // Add to password history
  await authService.addToPasswordHistory(admin.id, passwordHash);

  // Create audit log
  await createAuditLog({
    adminId: admin.id,
    adminUsername: admin.username,
    action: AuditActions.ADMIN_CREATED,
    entityType: EntityTypes.ADMIN,
    entityId: admin.id,
    newValues: { username: admin.username, isPrimary: true, note: 'Initial seed' }
  });

  console.log(`Primary admin account created: ${username}`);
  return admin;
};

module.exports = {
  getAllAdmins,
  getAdminById,
  getAdminByUsername,
  getAdminCount,
  createAdmin,
  updateAdmin,
  changePassword,
  deleteAdmin,
  seedPrimaryAdmin,
  MAX_ADMIN_ACCOUNTS
};
