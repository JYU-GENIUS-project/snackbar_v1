import {
    Router,
    type NextFunction,
    type Request,
    type Response,
    type RequestHandler,
} from 'express';
import { body, validationResult } from 'express-validator';

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

type TransactionResult = Record<string, unknown>;

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
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

        const createTransaction =
            transactionService.createTransaction as (params: {
                items: TransactionItem[];
                paymentStatus?: string;
                paymentMethod?: string;
                confirmationChannel?: string | null;
                confirmationReference?: string | null;
                confirmationMetadata?: Record<string, unknown> | null;
            }) => Promise<TransactionResult>;
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

export default router;
