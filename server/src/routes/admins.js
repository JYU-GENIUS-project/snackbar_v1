// =============================================================================
// Admin Management Routes
// =============================================================================
// CRUD endpoints for admin account management
// Based on SRS FR-5.2 and US-021
// =============================================================================

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

const adminService = require('../services/adminService');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');

// =============================================================================
// Validation Rules
// =============================================================================

const createAdminValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 255 }).withMessage('Username must be 3-255 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character')
];

const updateAdminValidation = [
  param('id').isUUID().withMessage('Invalid admin ID'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Username must be 3-255 characters'),
  body('email')
    .optional()
    .isEmail().withMessage('Invalid email format'),
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean')
];

// =============================================================================
// Routes
// =============================================================================

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/admins
 * List all admin accounts
 */
router.get('/', async (req, res, next) => {
  try {
    const admins = await adminService.getAllAdmins();

    res.status(200).json({
      success: true,
      data: admins,
      count: admins.length,
      maxAllowed: adminService.MAX_ADMIN_ACCOUNTS
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admins/count
 * Get count of admin accounts
 */
router.get('/count', async (req, res, next) => {
  try {
    const count = await adminService.getAdminCount();

    res.status(200).json({
      success: true,
      data: {
        count,
        maxAllowed: adminService.MAX_ADMIN_ACCOUNTS,
        remaining: adminService.MAX_ADMIN_ACCOUNTS - count
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admins/:id
 * Get admin by ID
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid admin ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const admin = await adminService.getAdminById(req.params.id);

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
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
 * POST /api/admins
 * Create new admin account
 */
router.post('/', createAdminValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { username, email, password } = req.body;

    const admin = await adminService.createAdmin(
      { username, email, password },
      req.user
    );

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: admin
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admins/:id
 * Update admin account
 */
router.put('/:id', updateAdminValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const { username, email, is_active } = req.body;

    const admin = await adminService.updateAdmin(
      req.params.id,
      { username, email, is_active },
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Admin account updated successfully',
      data: admin
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admins/:id
 * Delete admin account
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('Invalid admin ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    await adminService.deleteAdmin(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: 'Admin account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
