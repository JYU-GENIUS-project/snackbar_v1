import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import configService from '../services/configService';
import statusEvents from '../services/statusEvents';

const router = Router();

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler = authenticate as unknown as RequestHandler;

router.use(authenticateHandler);

router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const config = await configService.getSystemConfig();
        res.status(200).json({
            success: true,
            data: config
        });
    })
);

router.put(
    '/operating-hours',
    [
        body('timezone').optional().isString().withMessage('timezone must be a string'),
        body('start').optional().matches(/^([0-2]\d):([0-5]\d)$/).withMessage('start must be HH:MM'),
        body('end').optional().matches(/^([0-2]\d):([0-5]\d)$/).withMessage('end must be HH:MM'),
        body('windows').optional().isArray().withMessage('windows must be an array'),
        body('days').optional().isArray().withMessage('days must be an array')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        const payload = req.body as unknown as {
            timezone?: string;
            windows?: Array<{ start?: string; end?: string; days?: Array<number | string> }>;
            start?: string;
            end?: string;
            days?: Array<number | string>;
            breaks?: Array<{ start: string; end: string; days?: Array<number | string> }>;
            holidays?: Array<{ date: string; name?: string; start?: string; end?: string; closed?: boolean }>;
            enable247?: boolean;
            copyMondayToWeekdays?: boolean;
        };

        const context = {
            ...(req.ip ? { ip: req.ip } : {}),
            ...(req.get('User-Agent') ? { ua: req.get('User-Agent') as string } : {})
        };

        const updated = await configService.updateOperatingHours(payload, req.user, context);

        statusEvents.triggerImmediateRefresh();

        res.status(200).json({
            success: true,
            message: 'Operating hours updated',
            data: updated
        });
    })
);

router.put(
    '/maintenance',
    [
        body('enabled').isBoolean().withMessage('enabled must be a boolean'),
        body('message').optional().isString().withMessage('message must be a string')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        const payload = req.body as unknown as { enabled: boolean; message?: string | null; since?: string | null };

        const context = {
            ...(req.ip ? { ip: req.ip } : {}),
            ...(req.get('User-Agent') ? { ua: req.get('User-Agent') as string } : {})
        };

        const updated = await configService.updateMaintenanceState(payload, req.user, context);

        statusEvents.triggerImmediateRefresh();

        res.status(200).json({
            success: true,
            message: 'Maintenance configuration updated',
            data: updated
        });
    })
);

router.put(
    '/maintenance-schedule',
    [body().isObject().withMessage('schedule payload must be an object')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        const payload = req.body as Record<string, unknown>;

        const context = {
            ...(req.ip ? { ip: req.ip } : {}),
            ...(req.get('User-Agent') ? { ua: req.get('User-Agent') as string } : {})
        };

        const schedule = await configService.updateMaintenanceSchedule(payload, req.user, context);

        res.status(200).json({
            success: true,
            message: 'Maintenance schedule updated',
            data: schedule
        });
    })
);

router.get(
    '/notifications/recipients',
    [query('alertType').optional().isString().withMessage('alertType must be a string')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const alertType = typeof req.query.alertType === 'string' ? req.query.alertType : undefined;
        const recipients = await configService.listNotificationRecipients(alertType);

        res.status(200).json({
            success: true,
            data: recipients
        });
    })
);

router.post(
    '/notifications/recipients',
    [
        body('alertType').notEmpty().withMessage('alertType is required'),
        body('email').isEmail().withMessage('Invalid email format'),
        body('isPrimary').optional().isBoolean().withMessage('isPrimary must be a boolean')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        const payload = req.body as unknown as { alertType: string; email: string; isPrimary?: boolean };

        const recipientInput = {
            alertType: payload.alertType,
            email: payload.email,
            ...(payload.isPrimary !== undefined ? { isPrimary: payload.isPrimary } : {})
        };
        const context = {
            ...(req.ip ? { ip: req.ip } : {}),
            ...(req.get('User-Agent') ? { ua: req.get('User-Agent') as string } : {})
        };

        const created = await configService.addNotificationRecipient(recipientInput, req.user, context);

        res.status(201).json({
            success: true,
            message: 'Notification recipient added',
            data: created
        });
    })
);

router.put(
    '/notifications/recipients/:id/primary',
    [param('id').isUUID().withMessage('Invalid recipient id')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        const recipientId = req.params.id as string;
        const context = {
            ...(req.ip ? { ip: req.ip } : {}),
            ...(req.get('User-Agent') ? { ua: req.get('User-Agent') as string } : {})
        };

        await configService.setNotificationPrimary(recipientId, req.user, context);

        res.status(200).json({
            success: true,
            message: 'Primary recipient updated'
        });
    })
);

router.post(
    '/notifications/recipients/verify',
    [body('token').notEmpty().withMessage('token is required')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const payload = req.body as unknown as { token: string };
        const result = await configService.verifyNotificationRecipient(payload.token, req.user ?? null);

        res.status(200).json({
            success: true,
            message: 'Recipient verified',
            data: result
        });
    })
);

router.delete(
    '/notifications/recipients/:id',
    [param('id').isUUID().withMessage('Invalid recipient id')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.user) {
            throw new ApiError(401, 'Unauthorized');
        }

        const recipientId = req.params.id as string;
        const context = {
            ...(req.ip ? { ip: req.ip } : {}),
            ...(req.get('User-Agent') ? { ua: req.get('User-Agent') as string } : {})
        };

        await configService.removeNotificationRecipient(recipientId, req.user, context);

        res.status(200).json({
            success: true,
            message: 'Recipient removed'
        });
    })
);

export default router;
