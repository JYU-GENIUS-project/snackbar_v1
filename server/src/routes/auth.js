// =============================================================================
// Authentication Routes
// =============================================================================
// Login, logout, and session management endpoints
// Based on SRS FR-5.1 and US-019 through US-021
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const authService = require('../services/authService');
const adminService = require('../services/adminService');
const { createAuditLog, AuditActions, EntityTypes } = require('../services/auditService');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const { rateLimiters } = require('../middleware/rateLimiter');

// =============================================================================
// Validation Rules
// =============================================================================

const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 255 }).withMessage('Username must be 3-255 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/auth/login
 * Authenticate admin and create session
 * Has stricter rate limiting (5 attempts per hour per IP)
 */
router.post('/login', rateLimiters.login, loginValidation, async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { username, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Get admin by username
    const admin = await adminService.getAdminByUsername(username);

    if (!admin) {
      // Log failed attempt (generic message to prevent user enumeration)
      await createAuditLog({
        adminId: null,
        adminUsername: username,
        action: AuditActions.LOGIN_FAILED,
        entityType: EntityTypes.SESSION,
        newValues: { reason: 'Invalid username' },
        ipAddress,
        userAgent
      });

      throw new ApiError(401, 'Invalid username or password');
    }

    // Check if account is locked
    if (await authService.isAccountLocked(admin.id)) {
      await createAuditLog({
        adminId: admin.id,
        adminUsername: username,
        action: AuditActions.LOGIN_FAILED,
        entityType: EntityTypes.SESSION,
        newValues: { reason: 'Account locked' },
        ipAddress,
        userAgent
      });

      throw new ApiError(401, 'Account is temporarily locked. Please try again later.');
    }

    // Check if account is active
    if (!admin.is_active) {
      throw new ApiError(401, 'Account is deactivated');
    }

    // Verify password
    const isValidPassword = await authService.verifyPassword(password, admin.password_hash);

    if (!isValidPassword) {
      // Record failed attempt
      await authService.recordFailedLogin(admin.id);

      await createAuditLog({
        adminId: admin.id,
        adminUsername: username,
        action: AuditActions.LOGIN_FAILED,
        entityType: EntityTypes.SESSION,
        newValues: { reason: 'Invalid password' },
        ipAddress,
        userAgent
      });

      throw new ApiError(401, 'Invalid username or password');
    }

    // Reset failed login attempts
    await authService.resetFailedLogins(admin.id);

    // Create session
    const session = await authService.createSession(admin.id, ipAddress, userAgent);

    // Create audit log
    await createAuditLog({
      adminId: admin.id,
      adminUsername: username,
      action: AuditActions.LOGIN,
      entityType: EntityTypes.SESSION,
      entityId: session.sessionId,
      ipAddress,
      userAgent
    });

    // Return token and user info
    res.status(200).json({
      success: true,
      data: {
        token: session.token,
        expiresAt: session.expiresAt,
        user: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          isPrimary: admin.is_primary
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current session
 */
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { sessionId, username, id } = req.user;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    // Invalidate session
    await authService.invalidateSession(sessionId);

    // Create audit log
    await createAuditLog({
      adminId: id,
      adminUsername: username,
      action: AuditActions.LOGOUT,
      entityType: EntityTypes.SESSION,
      entityId: sessionId,
      ipAddress,
      userAgent
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout-all
 * Invalidate all sessions for current user
 */
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    const { id, username } = req.user;

    await authService.invalidateAllSessions(id);

    await createAuditLog({
      adminId: id,
      adminUsername: username,
      action: AuditActions.LOGOUT,
      entityType: EntityTypes.SESSION,
      newValues: { scope: 'all_sessions' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'All sessions invalidated'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const admin = await adminService.getAdminById(req.user.id);

    if (!admin) {
      throw new ApiError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/change-password
 * Change password for current user
 */
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { currentPassword, newPassword } = req.body;

    await adminService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again.'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
