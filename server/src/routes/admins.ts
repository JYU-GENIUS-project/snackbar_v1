import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import { body, param, validationResult } from 'express-validator';

import adminService from '../services/adminService';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';

// =============================================================================
// Admin Management Routes
// =============================================================================
// CRUD endpoints for admin account management
// Based on SRS FR-5.2 and US-021
// =============================================================================

const router = Router();

type AdminActor = {
    id: string;
    username: string;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler = authenticate as unknown as RequestHandler;

// =============================================================================
// Validation Rules
// =============================================================================

const createAdminValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Username must be 3-255 characters'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 12 })
        .withMessage('Password must be at least 12 characters')
        .matches(/[a-z]/)
        .withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain a number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/)
        .withMessage('Password must contain a special character')
];

const updateAdminValidation = [
    param('id').isUUID().withMessage('Invalid admin ID'),
    body('username').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Username must be 3-255 characters'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
];

// =============================================================================
// Routes
// =============================================================================

// All routes require authentication
router.use(authenticateHandler);

/**
 * GET /api/admins
 * List all admin accounts
 */
router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const admins = await adminService.getAllAdmins();

        res.status(200).json({
            success: true,
            data: admins,
            count: admins.length,
            maxAllowed: adminService.MAX_ADMIN_ACCOUNTS
        });
    })
);

/**
 * GET /api/admins/count
 * Get count of admin accounts
 */
router.get(
    '/count',
    asyncHandler(async (_req, res) => {
        const count = await adminService.getAdminCount();

        res.status(200).json({
            success: true,
            data: {
                count,
                maxAllowed: adminService.MAX_ADMIN_ACCOUNTS,
                remaining: adminService.MAX_ADMIN_ACCOUNTS - count
            }
        });
    })
);

/**
 * GET /api/admins/:id
 * Get admin by ID
 */
router.get(
    '/:id',
    [param('id').isUUID().withMessage('Invalid admin ID')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const adminId = req.params.id;
        if (!adminId) {
            throw new ApiError(400, 'Admin id is required');
        }

        const admin = await adminService.getAdminById(adminId);

        if (!admin) {
            throw new ApiError(404, 'Admin not found');
        }

        res.status(200).json({
            success: true,
            data: admin
        });
    })
);

/**
 * POST /api/admins
 * Create new admin account
 */
router.post(
    '/',
    createAdminValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const { username, email, password } = req.body as {
            username?: string;
            email?: string;
            password?: string;
        };

        if (!username || !password) {
            throw new ApiError(400, 'Username and password are required');
        }

        const actor = req.user as AdminActor;
        const adminPayload = { username, email, password, isPrimary: false } as {
            username: string;
            email: string;
            password: string;
            isPrimary: boolean;
        };
        const admin = await adminService.createAdmin(adminPayload, actor);

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: admin
        });
    })
);

/**
 * PUT /api/admins/:id
 * Update admin account
 */
router.put(
    '/:id',
    updateAdminValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const { username, email, is_active } = req.body as {
            username?: string;
            email?: string;
            is_active?: boolean;
        };

        const adminId = req.params.id;
        if (!adminId) {
            throw new ApiError(400, 'Admin id is required');
        }

        const actor = req.user as AdminActor;
        const admin = await adminService.updateAdmin(adminId, { username, email, is_active }, actor);

        res.status(200).json({
            success: true,
            message: 'Admin account updated successfully',
            data: admin
        });
    })
);

/**
 * DELETE /api/admins/:id
 * Delete admin account
 */
router.delete(
    '/:id',
    [param('id').isUUID().withMessage('Invalid admin ID')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const adminId = req.params.id;
        if (!adminId) {
            throw new ApiError(400, 'Admin id is required');
        }

        const actor = req.user as AdminActor;
        await adminService.deleteAdmin(adminId, actor);

        res.status(200).json({
            success: true,
            message: 'Admin account deleted successfully'
        });
    })
);

export default router;
