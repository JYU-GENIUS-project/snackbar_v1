import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';

import authService from '../services/authService';
import adminService from '../services/adminService';
import { createAuditLog, AuditActions, EntityTypes } from '../services/auditService';
import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import { rateLimiters } from '../middleware/rateLimiter';

// =============================================================================
// Authentication Routes
// =============================================================================
// Login, logout, and session management endpoints
// Based on SRS FR-5.1 and US-019 through US-021
// =============================================================================

const router = Router();

type AdminRecord = {
    id: string;
    username: string;
    email: string | null;
    is_primary: boolean;
    is_active: boolean;
    password_hash: string;
};

type SessionRecord = {
    sessionId: string;
    token: string;
    expiresAt: string;
};

const authenticateHandler = authenticate as unknown as RequestHandler;

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const resolveClientIdentifier = (req: Request) => {
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
        const [first] = forwarded.split(',');
        if (first) {
            return first.trim();
        }
    }

    return req.ip || req.connection?.remoteAddress || 'unknown';
};

// =============================================================================
// Validation Rules
// =============================================================================

const loginValidation = [
    body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Username must be 3-255 characters'),
    body('password').notEmpty().withMessage('Password is required')
];

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/auth/login
 * Authenticate admin and create session
 * Has stricter rate limiting (5 attempts per hour per IP)
 */
router.post(
    '/login',
    rateLimiters.login as RequestHandler,
    loginValidation,
    asyncHandler(async (req, res) => {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const { username, password } = req.body as { username: string; password: string };
        const ipAddress = req.ip ?? 'unknown';
        const userAgent = req.get('User-Agent') ?? 'unknown';

        // Get admin by username
        const admin = (await adminService.getAdminByUsername(username)) as AdminRecord | null;

        if (!admin) {
            // Log failed attempt (generic message to prevent user enumeration)
            await createAuditLog({
                adminId: null as unknown as string,
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

        const adminId: string =
            admin.id ??
            (() => {
                throw new ApiError(500, 'Admin account is missing an id');
            })();

        // Reset failed login attempts
        await authService.resetFailedLogins(adminId);

        // Create session
        const session = (await authService.createSession(adminId, ipAddress, userAgent)) as SessionRecord;

        // Create audit log
        await createAuditLog({
            adminId: adminId,
            adminUsername: username,
            action: AuditActions.LOGIN,
            entityType: EntityTypes.SESSION,
            entityId: session.sessionId,
            ipAddress,
            userAgent
        });

        if (typeof rateLimiters.reset === 'function') {
            const limiterIdentifier = req.rateLimitState?.login?.identifier || resolveClientIdentifier(req);
            if (limiterIdentifier) {
                rateLimiters.reset('login', limiterIdentifier);
            }
        }

        // Return token and user info
        res.status(200).json({
            success: true,
            data: {
                token: session.token,
                expiresAt: session.expiresAt,
                user: {
                    id: adminId,
                    username: admin.username,
                    email: admin.email,
                    isPrimary: admin.is_primary
                }
            }
        });
    })
);

/**
 * POST /api/auth/logout
 * Invalidate current session
 */
router.post(
    '/logout',
    authenticateHandler,
    asyncHandler(async (req, res) => {
        if (!req.user) {
            throw new ApiError(401, 'No active session');
        }

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
    })
);

/**
 * POST /api/auth/logout-all
 * Invalidate all sessions for current user
 */
router.post(
    '/logout-all',
    authenticateHandler,
    asyncHandler(async (req, res) => {
        if (!req.user) {
            throw new ApiError(401, 'No active session');
        }

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
    })
);

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get(
    '/me',
    authenticateHandler,
    asyncHandler(async (req, res) => {
        if (!req.user) {
            throw new ApiError(401, 'No active session');
        }

        const admin = (await adminService.getAdminById(req.user.id)) as AdminRecord | null;

        if (!admin) {
            throw new ApiError(404, 'User not found');
        }

        res.status(200).json({
            success: true,
            data: admin
        });
    })
);

/**
 * POST /api/auth/change-password
 * Change password for current user
 */
router.post(
    '/change-password',
    authenticateHandler,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword')
            .notEmpty()
            .withMessage('New password is required')
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
    ],
    asyncHandler(async (req, res) => {
        if (!req.user) {
            throw new ApiError(401, 'No active session');
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

        await adminService.changePassword(req.user.id, currentPassword, newPassword, req.user);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully. Please log in again.'
        });
    })
);

export default router;
