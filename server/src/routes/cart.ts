import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import { body, param, validationResult } from 'express-validator';

import { ApiError } from '../middleware/errorHandler';
import cartService from '../services/cartService';

const router = Router();

type CartResponse = Record<string, unknown>;

type CartItemPayload = {
    sessionKey?: string;
    productId?: string;
    quantity?: number;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const getSessionKey = (req: Request): string | null => {
    const header = req.header('x-kiosk-session');
    if (header) {
        return header;
    }
    const queryKey = req.query.sessionKey;
    if (typeof queryKey === 'string' && queryKey.trim()) {
        return queryKey.trim();
    }
    const bodyKey = (req.body as CartItemPayload | undefined)?.sessionKey;
    if (typeof bodyKey === 'string' && bodyKey.trim()) {
        return bodyKey.trim();
    }
    return null;
};

const sessionKeyValidation = [
    body('sessionKey').optional().isString().withMessage('sessionKey must be a string'),
    param('productId').optional().isUUID().withMessage('productId must be a UUID')
];

const cartItemValidation = [
    body('sessionKey').optional().isString().withMessage('sessionKey must be a string'),
    body('productId').isUUID().withMessage('productId must be a UUID'),
    body('quantity').isNumeric().withMessage('quantity must be a number')
];

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const sessionKey = getSessionKey(req);
        if (!sessionKey) {
            throw new ApiError(400, 'sessionKey is required');
        }

        const cart = (await cartService.getCart(sessionKey)) as CartResponse;
        res.status(200).json({
            success: true,
            data: cart
        });
    })
);

router.post(
    '/items',
    cartItemValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Invalid cart payload', { errors: errors.array() });
        }

        const sessionKey = getSessionKey(req);
        if (!sessionKey) {
            throw new ApiError(400, 'sessionKey is required');
        }

        const { productId, quantity } = req.body as CartItemPayload;
        if (!productId) {
            throw new ApiError(400, 'productId is required');
        }

        const cart = (await cartService.setCartItemQuantity(sessionKey, productId, Number(quantity))) as CartResponse;
        res.status(200).json({
            success: true,
            data: cart
        });
    })
);

router.delete(
    '/items/:productId',
    sessionKeyValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Invalid cart payload', { errors: errors.array() });
        }

        const sessionKey = getSessionKey(req);
        if (!sessionKey) {
            throw new ApiError(400, 'sessionKey is required');
        }

        const { productId } = req.params;
        if (!productId) {
            throw new ApiError(400, 'productId is required');
        }
        const cart = (await cartService.removeCartItem(sessionKey, productId)) as CartResponse;
        res.status(200).json({
            success: true,
            data: cart
        });
    })
);

router.post(
    '/clear',
    sessionKeyValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Invalid cart payload', { errors: errors.array() });
        }

        const sessionKey = getSessionKey(req);
        if (!sessionKey) {
            throw new ApiError(400, 'sessionKey is required');
        }

        const cart = (await cartService.clearCart(sessionKey)) as CartResponse;
        res.status(200).json({
            success: true,
            data: cart
        });
    })
);

export default router;
