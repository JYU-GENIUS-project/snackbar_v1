// =============================================================================
// Authentication Service
// =============================================================================
// Handles password hashing, JWT token management, and session handling
// Based on SRS FR-5.1 (Authentication), US-061 (bcrypt hashing)
// =============================================================================

const bcrypt = require('@node-rs/bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../utils/database');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h';

// =============================================================================
// Password Hashing
// =============================================================================

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Verify a password against a hash
 * Uses constant-time comparison to prevent timing attacks
 * @param {string} password - Plain text password
 * @param {string} hash - bcrypt hash
 * @returns {Promise<boolean>} Match result
 */
const verifyPassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Check if password has been used before
 * @param {string} adminId - Admin UUID
 * @param {string} password - Plain text password
 * @returns {Promise<boolean>} True if password was used before
 */
const checkPasswordHistory = async (adminId, password) => {
  const result = await db.query(
    `SELECT password_hash FROM password_history 
     WHERE admin_id = $1 
     ORDER BY created_at DESC 
     LIMIT 5`,
    [adminId]
  );

  for (const row of result.rows) {
    if (await verifyPassword(password, row.password_hash)) {
      return true; // Password was used before
    }
  }

  return false;
};

/**
 * Add password to history
 * @param {string} adminId - Admin UUID
 * @param {string} passwordHash - bcrypt hash
 */
const addToPasswordHistory = async (adminId, passwordHash) => {
  await db.query(
    'INSERT INTO password_history (admin_id, password_hash) VALUES ($1, $2)',
    [adminId, passwordHash]
  );
};

// =============================================================================
// JWT Token Management
// =============================================================================

/**
 * Generate JWT token with session ID
 * @param {string} userId - Admin UUID
 * @param {string} sessionId - Session UUID
 * @returns {string} JWT token
 */
const generateToken = (userId, sessionId) => {
  return jwt.sign(
    {
      userId,
      sessionId,
      type: 'access'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRATION }
  );
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// =============================================================================
// Session Management
// =============================================================================

/**
 * Create a new session for admin
 * @param {string} adminId - Admin UUID
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Promise<Object>} Session data with token
 */
const createSession = async (adminId, ipAddress, userAgent) => {
  const sessionId = uuidv4();
  const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.query(
    `INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, adminId, tokenHash, expiresAt, ipAddress, userAgent]
  );

  const token = generateToken(adminId, sessionId);

  return {
    sessionId,
    token,
    expiresAt
  };
};

/**
 * Invalidate a session
 * @param {string} sessionId - Session UUID
 */
const invalidateSession = async (sessionId) => {
  await db.query('DELETE FROM admin_sessions WHERE id = $1', [sessionId]);
};

/**
 * Invalidate all sessions for an admin
 * @param {string} adminId - Admin UUID
 */
const invalidateAllSessions = async (adminId) => {
  await db.query('DELETE FROM admin_sessions WHERE admin_id = $1', [adminId]);
};

// =============================================================================
// Login Attempt Tracking
// =============================================================================

/**
 * Record a failed login attempt
 * @param {string} adminId - Admin UUID
 */
const recordFailedLogin = async (adminId) => {
  await db.query(
    `UPDATE admins 
     SET failed_login_attempts = failed_login_attempts + 1,
         locked_until = CASE 
           WHEN failed_login_attempts >= 4 THEN NOW() + INTERVAL '15 minutes'
           ELSE locked_until
         END
     WHERE id = $1`,
    [adminId]
  );
};

/**
 * Reset failed login attempts on successful login
 * @param {string} adminId - Admin UUID
 */
const resetFailedLogins = async (adminId) => {
  await db.query(
    `UPDATE admins 
     SET failed_login_attempts = 0, 
         locked_until = NULL, 
         last_login_at = NOW()
     WHERE id = $1`,
    [adminId]
  );
};

/**
 * Check if account is locked
 * @param {string} adminId - Admin UUID
 * @returns {Promise<boolean>} True if locked
 */
const isAccountLocked = async (adminId) => {
  const result = await db.query(
    'SELECT locked_until FROM admins WHERE id = $1',
    [adminId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  const lockedUntil = result.rows[0].locked_until;
  return lockedUntil && new Date(lockedUntil) > new Date();
};

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  hashPassword,
  verifyPassword,
  checkPasswordHistory,
  addToPasswordHistory,
  generateToken,
  verifyToken,
  createSession,
  invalidateSession,
  invalidateAllSessions,
  recordFailedLogin,
  resetFailedLogins,
  isAccountLocked
};
