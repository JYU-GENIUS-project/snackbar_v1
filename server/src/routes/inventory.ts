import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import inventoryService from '../services/inventoryService';
import inventoryEvents from '../services/inventoryEvents';

const router = Router();

type AdminActor = {
    id: string;
    username: string;
};

type InventoryListResult = {
    data: Record<string, unknown>[];
    meta: Record<string, unknown>;
};

type InventoryEventClient = {
    res: Response;
    context: {
        adminId: string | null;
        username: string | null;
    };
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler = authenticate as unknown as RequestHandler;

const SORTABLE_FIELDS = [
    'name',
    'stock',
    'threshold',
    'updated',
    'discrepancy',
    'current_stock',
    'low_stock_threshold',
    'last_activity_at',
    'ledger_balance'
];

const inventoryListValidation = [
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be zero or greater'),
    query('sortBy').optional().isIn(SORTABLE_FIELDS).withMessage('Invalid sortBy value'),
    query('sortDirection').optional().isIn(['asc', 'desc']).withMessage('sortDirection must be asc or desc'),
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be a boolean')
];

const productIdParam = [param('productId').isUUID().withMessage('Invalid product ID')];

router.use(authenticateHandler);

router.get('/events', (req, res, next) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }

        res.write(': connected\n\n');
        res.write(`event: inventory:init\ndata: ${JSON.stringify({ connectedAt: new Date().toISOString() })}\n\n`);

        const clientId = inventoryEvents.registerClient({
            res,
            context: {
                adminId: req.user?.id ?? null,
                username: req.user?.username ?? null
            }
        } as InventoryEventClient) as string;

        const cleanup = () => inventoryEvents.removeClient(clientId);
        req.on('close', cleanup);
        req.on('end', cleanup);
    } catch (error) {
        next(error);
    }
});

router.get(
    '/tracking',
    asyncHandler(async (_req, res) => {
        const enabled = await inventoryService.getInventoryTrackingState();

        res.status(200).json({
            success: true,
            data: { enabled }
        });
    })
);

router.patch(
    '/tracking',
    [body('enabled').isBoolean().withMessage('enabled must be a boolean')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const { enabled: enabledValue } = req.body as { enabled?: boolean | string };
        const enabled = enabledValue === true || enabledValue === 'true';
        const actor = req.user as AdminActor;
        const setTrackingState = inventoryService.setInventoryTrackingState as (
            enabled: boolean,
            actor: AdminActor | null
        ) => Promise<Record<string, unknown>>;
        const result = await setTrackingState(enabled, actor);

        res.status(200).json({
            success: true,
            message: 'Inventory tracking state updated',
            data: result
        });
    })
);

router.get(
    '/',
    inventoryListValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const includeInactiveValue = req.query.includeInactive;
        const includeInactive = Array.isArray(includeInactiveValue)
            ? includeInactiveValue.includes('true')
            : includeInactiveValue === 'true';
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
        const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
        const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'name';
        const sortDirection = typeof req.query.sortDirection === 'string' ? req.query.sortDirection : 'asc';
        const search = typeof req.query.search === 'string' ? req.query.search : '';

        const result = (await inventoryService.listInventorySnapshot({
            includeInactive,
            limit,
            offset,
            sortBy,
            sortDirection,
            search
        })) as InventoryListResult;

        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    })
);

router.get(
    '/discrepancies',
    asyncHandler(async (_req, res) => {
        const records = (await inventoryService.listDiscrepancies()) as Record<string, unknown>[];

        res.status(200).json({
            success: true,
            data: records
        });
    })
);

router.get(
    '/:productId',
    productIdParam,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.productId;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const record = (await inventoryService.getInventoryItemByProductId(productId)) as Record<string, unknown>;

        res.status(200).json({
            success: true,
            data: record
        });
    })
);

router.patch(
    '/:productId/stock',
    [
        ...productIdParam,
        body('quantity').notEmpty().withMessage('quantity is required'),
        body('reason').optional().isString().withMessage('reason must be a string')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.productId;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const actor = req.user as AdminActor;
        const { quantity, reason } = req.body as { quantity: unknown; reason?: string };
        const result = (await inventoryService.recordManualStockUpdate({
            productId,
            quantity,
            reason,
            actor
        })) as Record<string, unknown>;

        res.status(200).json({
            success: true,
            message: 'Stock quantity updated',
            data: result
        });
    })
);

router.post(
    '/:productId/adjustments',
    [
        ...productIdParam,
        body('newQuantity').notEmpty().withMessage('newQuantity is required'),
        body('reason').optional().isString().withMessage('reason must be a string')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.productId;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const actor = req.user as AdminActor;
        const { newQuantity, reason } = req.body as { newQuantity: unknown; reason?: string };
        const result = (await inventoryService.recordInventoryAdjustment({
            productId,
            newQuantity,
            reason,
            actor
        })) as Record<string, unknown>;

        res.status(200).json({
            success: true,
            message: 'Inventory adjusted',
            data: result
        });
    })
);

export default router;
