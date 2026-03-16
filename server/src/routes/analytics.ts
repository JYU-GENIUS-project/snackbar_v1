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

        const summaryPayload: { startDate?: string; endDate?: string } = {};
        if (typeof req.query.startDate === 'string') {
            summaryPayload.startDate = req.query.startDate;
        }
        if (typeof req.query.endDate === 'string') {
            summaryPayload.endDate = req.query.endDate;
        }

        const result = await analyticsService.getSummary(summaryPayload);

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

        const topProductsPayload: { startDate?: string; endDate?: string; limit?: number } = {};
        if (typeof req.query.startDate === 'string') {
            topProductsPayload.startDate = req.query.startDate;
        }
        if (typeof req.query.endDate === 'string') {
            topProductsPayload.endDate = req.query.endDate;
        }
        if (typeof req.query.limit === 'string') {
            const limit = Number(req.query.limit);
            if (Number.isFinite(limit)) {
                topProductsPayload.limit = limit;
            }
        }

        const result = await analyticsService.getTopProducts(topProductsPayload);

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

        const revenuePayload: {
            startDate?: string;
            endDate?: string;
            period?: 'daily' | 'weekly' | 'monthly';
        } = {};
        if (typeof req.query.startDate === 'string') {
            revenuePayload.startDate = req.query.startDate;
        }
        if (typeof req.query.endDate === 'string') {
            revenuePayload.endDate = req.query.endDate;
        }
        if (typeof req.query.period === 'string') {
            const period = req.query.period.toLowerCase();
            if (period === 'daily' || period === 'weekly' || period === 'monthly') {
                revenuePayload.period = period;
            }
        }

        const result = await analyticsService.getRevenueSeries(revenuePayload);

        res.status(200).json({
            success: true,
            message: 'Revenue series retrieved',
            data: result
        });
    })
);

export default router;
