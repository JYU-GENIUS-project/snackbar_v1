import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import { query, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import analyticsService from '../services/analyticsService';

const router = Router();

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const dateRangeValidation = [
    query('startDate').optional().isISO8601().withMessage('startDate must be ISO 8601'),
    query('endDate').optional().isISO8601().withMessage('endDate must be ISO 8601')
];

const summaryValidation = [...dateRangeValidation];

const topProductsValidation = [
    ...dateRangeValidation,
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50')
];

const revenueValidation = [
    ...dateRangeValidation,
    query('period')
        .optional()
        .isIn(['daily', 'weekly', 'monthly'])
        .withMessage('period must be daily, weekly, or monthly')
];

router.use(authenticate as unknown as RequestHandler);

router.get(
    '/summary',
    summaryValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const result = await analyticsService.getSummary({
            startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
            endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined
        });

        res.status(200).json({
            success: true,
            message: 'Analytics summary retrieved',
            data: result
        });
    })
);

router.get(
    '/top-products',
    topProductsValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;

        const result = await analyticsService.getTopProducts({
            startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
            endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
            limit
        });

        res.status(200).json({
            success: true,
            message: 'Top products retrieved',
            data: result
        });
    })
);

router.get(
    '/revenue',
    revenueValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const result = await analyticsService.getRevenueSeries({
            startDate: typeof req.query.startDate === 'string' ? req.query.startDate : undefined,
            endDate: typeof req.query.endDate === 'string' ? req.query.endDate : undefined,
            period: typeof req.query.period === 'string'
                ? (req.query.period as 'daily' | 'weekly' | 'monthly')
                : undefined
        });

        res.status(200).json({
            success: true,
            message: 'Revenue series retrieved',
            data: result
        });
    })
);

export default router;
