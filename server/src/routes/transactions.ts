import {
    Router,
    type NextFunction,
    type Request,
    type Response,
    type RequestHandler,
} from 'express';
import { body, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import transactionService from '../services/transactionService';

const router = Router();

type TransactionItem = {
    productId: string;
    quantity: number;
};

type TransactionPayload = {
    items?: TransactionItem[];
    paymentStatus?: string;
    paymentMethod?: string;
    confirmationChannel?: string | null;
    confirmationReference?: string | null;
    confirmationMetadata?: Record<string, unknown> | null;
};

type TransactionConfirmationPayload = {
    declaredOutcome: string;
    declaredTender?: string | null;
    confirmationChannel?: string | null;
    confirmationReference?: string | null;
    confirmationMetadata?: Record<string, unknown> | null;
};

type TransactionReconcilePayload = {
    action: string;
    notes?: string | null;
    metadata?: Record<string, unknown> | null;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler: RequestHandler = (req, res, next) => {
    void authenticate(req, res, next);
};

const transactionValidation = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('items must be a non-empty array'),
    body('items.*.productId').isUUID().withMessage('productId must be a UUID'),
    body('items.*.quantity')
        .isInt({ min: 1 })
        .withMessage('quantity must be a positive integer'),
    body('paymentStatus')
        .optional()
        .isString()
        .withMessage('paymentStatus must be a string'),
    body('paymentMethod')
        .optional()
        .isString()
        .withMessage('paymentMethod must be a string'),
    body('confirmationChannel')
        .optional({ nullable: true })
        .isString()
        .withMessage('confirmationChannel must be a string'),
    body('confirmationReference')
        .optional({ nullable: true })
        .isString()
        .withMessage('confirmationReference must be a string'),
    body('confirmationMetadata')
        .optional({ nullable: true })
        .isObject()
        .withMessage('confirmationMetadata must be an object'),
];

const confirmValidation = [
    body('declaredOutcome')
        .isString()
        .withMessage('declaredOutcome must be a string'),
    body('declaredTender')
        .optional({ nullable: true })
        .isString()
        .withMessage('declaredTender must be a string'),
    body('confirmationChannel')
        .optional({ nullable: true })
        .isString()
        .withMessage('confirmationChannel must be a string'),
    body('confirmationReference')
        .optional({ nullable: true })
        .isString()
        .withMessage('confirmationReference must be a string'),
    body('confirmationMetadata')
        .optional({ nullable: true })
        .isObject()
        .withMessage('confirmationMetadata must be an object'),
];

const reconcileValidation = [
    body('action')
        .isIn(['CONFIRMED', 'REFUNDED'])
        .withMessage('action must be CONFIRMED or REFUNDED'),
    body('notes')
        .isString()
        .withMessage('notes must be a string')
        .isLength({ min: 10 })
        .withMessage('Minimum 10 characters required'),
    body('metadata')
        .optional({ nullable: true })
        .isObject()
        .withMessage('metadata must be an object'),
];

router.post(
    '/',
    transactionValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', {
                errors: errors.array(),
            });
        }

        const payload = req.body as TransactionPayload;
        const items = payload.items ?? [];

        const createTransaction = transactionService.createTransaction;
        const requestPayload: {
            items: TransactionItem[];
            paymentStatus?: string;
            paymentMethod?: string;
            confirmationChannel?: string | null;
            confirmationReference?: string | null;
            confirmationMetadata?: Record<string, unknown> | null;
        } = { items };

        if (payload.paymentStatus !== undefined) {
            requestPayload.paymentStatus = payload.paymentStatus;
        }

        if (payload.paymentMethod !== undefined) {
            requestPayload.paymentMethod = payload.paymentMethod;
        }

        if (payload.confirmationChannel !== undefined) {
            requestPayload.confirmationChannel = payload.confirmationChannel;
        }

        if (payload.confirmationReference !== undefined) {
            requestPayload.confirmationReference =
                payload.confirmationReference;
        }

        if (payload.confirmationMetadata !== undefined) {
            requestPayload.confirmationMetadata = payload.confirmationMetadata;
        }

        const result = await createTransaction(requestPayload);

        res.status(201).json({
            success: true,
            message: 'Transaction recorded successfully',
            data: result,
        });
    }),
);

router.post(
    '/:id/confirm',
    confirmValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', {
                errors: errors.array(),
            });
        }

        const transactionId = req.params.id;
        if (!transactionId) {
            throw new ApiError(400, 'Transaction id is required');
        }
        const payload = req.body as TransactionConfirmationPayload;

        const confirmTransaction = transactionService.confirmTransaction;

        const result = await confirmTransaction({
            transactionId,
            declaredOutcome: payload.declaredOutcome,
            declaredTender: payload.declaredTender ?? null,
            confirmationChannel: payload.confirmationChannel ?? null,
            confirmationReference: payload.confirmationReference ?? null,
            confirmationMetadata: payload.confirmationMetadata ?? null,
        });

        res.status(202).json({
            success: true,
            message: 'Confirmation received',
            data: result,
        });
    }),
);

router.get(
    '/',
    authenticateHandler,
    asyncHandler(async (req, res) => {
        const listTransactions = transactionService.listTransactions;

        const listPayload: {
            status?: string;
            page?: number;
            pageSize?: number;
            startDate?: string;
            endDate?: string;
            reference?: string;
            kioskSessionId?: string;
            productId?: string;
            productName?: string;
            amountMin?: number;
            amountMax?: number;
            sortBy?: 'date' | 'amount' | 'status';
            sortDirection?: 'asc' | 'desc';
            search?: string;
        } = {};

        if (typeof req.query.status === 'string') {
            listPayload.status = req.query.status;
        }
        if (typeof req.query.page === 'string') {
            listPayload.page = Number(req.query.page);
        }
        if (typeof req.query.pageSize === 'string') {
            listPayload.pageSize = Number(req.query.pageSize);
        }
        if (typeof req.query.startDate === 'string') {
            listPayload.startDate = req.query.startDate;
        }
        if (typeof req.query.endDate === 'string') {
            listPayload.endDate = req.query.endDate;
        }
        if (typeof req.query.reference === 'string') {
            listPayload.reference = req.query.reference;
        }
        if (typeof req.query.kioskSessionId === 'string') {
            listPayload.kioskSessionId = req.query.kioskSessionId;
        }
        if (typeof req.query.productId === 'string') {
            listPayload.productId = req.query.productId;
        }
        if (typeof req.query.productName === 'string') {
            listPayload.productName = req.query.productName;
        }
        if (typeof req.query.amountMin === 'string') {
            const parsed = Number(req.query.amountMin);
            if (Number.isFinite(parsed)) {
                listPayload.amountMin = parsed;
            }
        }
        if (typeof req.query.amountMax === 'string') {
            const parsed = Number(req.query.amountMax);
            if (Number.isFinite(parsed)) {
                listPayload.amountMax = parsed;
            }
        }
        if (typeof req.query.sortBy === 'string') {
            const sortBy = req.query.sortBy.toLowerCase();
            if (sortBy === 'date' || sortBy === 'amount' || sortBy === 'status') {
                listPayload.sortBy = sortBy;
            }
        }
        if (typeof req.query.sortDirection === 'string') {
            const direction = req.query.sortDirection.toLowerCase();
            if (direction === 'asc' || direction === 'desc') {
                listPayload.sortDirection = direction;
            }
        }
        if (typeof req.query.search === 'string') {
            listPayload.search = req.query.search;
        }

        const result = await listTransactions(listPayload);

        res.status(200).json({
            success: true,
            message: 'Transactions retrieved',
            data: result,
        });
    }),
);

router.get(
    '/:id/audit',
    authenticateHandler,
    asyncHandler(async (req, res) => {
        const transactionId = req.params.id;
        if (!transactionId) {
            throw new ApiError(400, 'Transaction id is required');
        }
        const getAudit = transactionService.getTransactionAudit;

        const result = await getAudit({ transactionId });

        res.status(200).json({
            success: true,
            message: 'Transaction audit retrieved',
            data: result,
        });
    }),
);

router.get(
    '/export',
    authenticateHandler,
    asyncHandler(async (req, res) => {
        const exportTransactions = transactionService.exportTransactions;

        const exportPayload: {
            status?: string;
            startDate?: string;
            endDate?: string;
            reference?: string;
            kioskSessionId?: string;
            productId?: string;
            productName?: string;
            amountMin?: number;
            amountMax?: number;
            sortBy?: 'date' | 'amount' | 'status';
            sortDirection?: 'asc' | 'desc';
            search?: string;
        } = {};

        if (typeof req.query.status === 'string') {
            exportPayload.status = req.query.status;
        }
        if (typeof req.query.startDate === 'string') {
            exportPayload.startDate = req.query.startDate;
        }
        if (typeof req.query.endDate === 'string') {
            exportPayload.endDate = req.query.endDate;
        }
        if (typeof req.query.reference === 'string') {
            exportPayload.reference = req.query.reference;
        }
        if (typeof req.query.kioskSessionId === 'string') {
            exportPayload.kioskSessionId = req.query.kioskSessionId;
        }
        if (typeof req.query.productId === 'string') {
            exportPayload.productId = req.query.productId;
        }
        if (typeof req.query.productName === 'string') {
            exportPayload.productName = req.query.productName;
        }
        if (typeof req.query.amountMin === 'string') {
            const parsed = Number(req.query.amountMin);
            if (Number.isFinite(parsed)) {
                exportPayload.amountMin = parsed;
            }
        }
        if (typeof req.query.amountMax === 'string') {
            const parsed = Number(req.query.amountMax);
            if (Number.isFinite(parsed)) {
                exportPayload.amountMax = parsed;
            }
        }
        if (typeof req.query.sortBy === 'string') {
            const sortBy = req.query.sortBy.toLowerCase();
            if (sortBy === 'date' || sortBy === 'amount' || sortBy === 'status') {
                exportPayload.sortBy = sortBy;
            }
        }
        if (typeof req.query.sortDirection === 'string') {
            const direction = req.query.sortDirection.toLowerCase();
            if (direction === 'asc' || direction === 'desc') {
                exportPayload.sortDirection = direction;
            }
        }
        if (typeof req.query.search === 'string') {
            exportPayload.search = req.query.search;
        }

        const rows = await exportTransactions(exportPayload);

        const formatDateForFilename = (value?: string) => {
            if (!value) {
                return new Date().toISOString().slice(0, 10);
            }
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) {
                return new Date().toISOString().slice(0, 10);
            }
            return parsed.toISOString().slice(0, 10);
        };

        const startLabel = formatDateForFilename(exportPayload.startDate);
        const endLabel = formatDateForFilename(exportPayload.endDate ?? exportPayload.startDate);
        const filename = `transactions_${startLabel}_to_${endLabel}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const filterEntries = Object.entries(exportPayload).filter(([, value]) => value !== undefined && value !== '');
        if (filterEntries.length > 0) {
            const filterText = filterEntries
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
            res.write(`Filters: ${filterText}\n`);
        }

        res.write('Transaction ID,Date,Time,Items,Quantities,Total Amount,Payment Status\n');
        rows.forEach((row) => {
            const record = row as {
                transaction_id?: string;
                transaction_number?: string;
                timestamp?: string;
                items?: string | null;
                quantities?: string | null;
                total_amount?: number | string;
                payment_status?: string;
            };
            const timestamp = record.timestamp ?? '';
            const [datePart, timePart] = timestamp.split(' ');
            const csvRow = [
                record.transaction_number ?? record.transaction_id ?? '',
                datePart ?? '',
                timePart ?? '',
                record.items ?? '',
                record.quantities ?? '',
                Number(record.total_amount ?? 0).toFixed(2),
                record.payment_status ?? ''
            ]
                .map((value) => `"${String(value).replace(/"/g, '""')}"`)
                .join(',');
            res.write(`${csvRow}\n`);
        });

        res.end();
    }),
);

router.post(
    '/:id/reconcile',
    authenticateHandler,
    reconcileValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', {
                errors: errors.array(),
            });
        }

        const transactionId = req.params.id;
        if (!transactionId) {
            throw new ApiError(400, 'Transaction id is required');
        }
        const payload = req.body as TransactionReconcilePayload;

        const reconcileTransaction = transactionService.reconcileTransaction;

        const actor = req.user;
        if (!actor) {
            throw new ApiError(401, 'Authentication required');
        }

        const result = await reconcileTransaction({
            transactionId,
            action: payload.action,
            notes: payload.notes ?? null,
            metadata: payload.metadata ?? null,
            actor,
        });

        res.status(200).json({
            success: true,
            message: 'Transaction reconciled',
            data: result,
        });
    }),
);

export default router;
