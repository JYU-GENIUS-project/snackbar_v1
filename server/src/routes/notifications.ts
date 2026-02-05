import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import { query, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import notificationService from '../services/notificationService';

const router = Router();

type NotificationLogResult = {
    data: Record<string, unknown>[];
    meta: Record<string, unknown>;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler = authenticate as unknown as RequestHandler;

const VALID_STATUSES = ['pending', 'sent', 'failed'] as const;

type NotificationStatus = (typeof VALID_STATUSES)[number];

router.use(authenticateHandler);

router.get(
    '/logs',
    [
        query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
        query('offset').optional().isInt({ min: 0 }).withMessage('offset must be zero or greater'),
        query('status').optional().isIn(VALID_STATUSES).withMessage('status must be pending, sent, or failed')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
        const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
        const status = typeof req.query.status === 'string' ? (req.query.status as NotificationStatus) : null;

        const getNotificationLog = notificationService.getNotificationLog as (params: {
            limit: number;
            offset: number;
            status: NotificationStatus | null;
        }) => Promise<NotificationLogResult>;
        const result = await getNotificationLog({ limit, offset, status });

        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    })
);

export default router;
