const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const inventoryService = require('../services/inventoryService');
const inventoryEvents = require('../services/inventoryEvents');

const router = express.Router();

const SORTABLE_FIELDS = ['name', 'stock', 'threshold', 'updated', 'discrepancy'];

const inventoryListValidation = [
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be zero or greater'),
    query('sortBy').optional().isIn(SORTABLE_FIELDS).withMessage('Invalid sortBy value'),
    query('sortDirection').optional().isIn(['asc', 'desc']).withMessage('sortDirection must be asc or desc'),
    query('includeInactive').optional().isBoolean().withMessage('includeInactive must be a boolean')
];

const productIdParam = [param('productId').isUUID().withMessage('Invalid product ID')];

router.use(authenticate);

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
                adminId: req.user?.id || null,
                username: req.user?.username || null
            }
        });

        const cleanup = () => inventoryEvents.removeClient(clientId);
        req.on('close', cleanup);
        req.on('end', cleanup);
    } catch (error) {
        next(error);
    }
});

router.get('/tracking', async (req, res, next) => {
    try {
        const enabled = await inventoryService.getInventoryTrackingState();

        res.status(200).json({
            success: true,
            data: { enabled }
        });
    } catch (error) {
        next(error);
    }
});

router.patch('/tracking', [body('enabled').isBoolean().withMessage('enabled must be a boolean')], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', errors.array());
        }

        const enabled = req.body.enabled === true || req.body.enabled === 'true';
        const result = await inventoryService.setInventoryTrackingState(enabled, req.user);

        res.status(200).json({
            success: true,
            message: 'Inventory tracking state updated',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

router.get('/', inventoryListValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', errors.array());
        }

        const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === true;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        const sortBy = req.query.sortBy || 'name';
        const sortDirection = req.query.sortDirection || 'asc';
        const search = req.query.search || '';

        const result = await inventoryService.listInventorySnapshot({
            includeInactive,
            limit,
            offset,
            sortBy,
            sortDirection,
            search
        });

        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    } catch (error) {
        next(error);
    }
});

router.get('/discrepancies', async (req, res, next) => {
    try {
        const records = await inventoryService.listDiscrepancies();

        res.status(200).json({
            success: true,
            data: records
        });
    } catch (error) {
        next(error);
    }
});

router.get('/:productId', productIdParam, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', errors.array());
        }

        const record = await inventoryService.getInventoryItemByProductId(req.params.productId);

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        next(error);
    }
});

router.patch(
    '/:productId/stock',
    [
        ...productIdParam,
        body('quantity').notEmpty().withMessage('quantity is required'),
        body('reason').optional().isString().withMessage('reason must be a string')
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ApiError(400, 'Validation failed', errors.array());
            }

            const result = await inventoryService.recordManualStockUpdate({
                productId: req.params.productId,
                quantity: req.body.quantity,
                reason: req.body.reason,
                actor: req.user
            });

            res.status(200).json({
                success: true,
                message: 'Stock quantity updated',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

router.post(
    '/:productId/adjustments',
    [
        ...productIdParam,
        body('newQuantity').notEmpty().withMessage('newQuantity is required'),
        body('reason').optional().isString().withMessage('reason must be a string')
    ],
    async (req, res, next) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                throw new ApiError(400, 'Validation failed', errors.array());
            }

            const result = await inventoryService.recordInventoryAdjustment({
                productId: req.params.productId,
                newQuantity: req.body.newQuantity,
                reason: req.body.reason,
                actor: req.user
            });

            res.status(200).json({
                success: true,
                message: 'Inventory adjusted',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
