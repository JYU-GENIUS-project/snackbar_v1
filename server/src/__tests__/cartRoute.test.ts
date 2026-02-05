'use strict';

import express from 'express';
import request from 'supertest';

import cartRouter from '../routes/cart';
import cartService from '../services/cartService';
import { errorHandler } from '../middleware/errorHandler';

jest.mock('../services/cartService', () => ({
    __esModule: true,
    default: {
        getCart: jest.fn(),
        setCartItemQuantity: jest.fn(),
        removeCartItem: jest.fn(),
        clearCart: jest.fn()
    }
}));

const mockedCartService = cartService as jest.Mocked<typeof cartService>;

type CartResponse = Awaited<ReturnType<typeof cartService.getCart>>;

type TestResponse = {
    status: number;
    body: unknown;
};

type PostChain = {
    set: (header: string, value: string) => PostChain;
    send: (body: unknown) => Promise<TestResponse>;
};

type Requester = {
    get: (path: string) => Promise<TestResponse>;
    post: (path: string) => PostChain;
};

describe('cart routes', () => {
    let app: express.Express;
    let requester: Requester;

    beforeEach(() => {
        mockedCartService.getCart.mockReset();
        mockedCartService.setCartItemQuantity.mockReset();
        mockedCartService.removeCartItem.mockReset();
        mockedCartService.clearCart.mockReset();

        app = express();
        app.use(express.json());
        app.use('/api/cart', cartRouter);
        app.use(errorHandler);
        requester = request(app) as unknown as Requester;
    });

    it('returns 400 when session key is missing', async () => {
        const response = await requester.get('/api/cart');
        const body = response.body as { error?: { message?: string } };
        expect(response.status).toBe(400);
        expect(body.error?.message).toBe('sessionKey is required');
    });

    it('returns cart payload when session key is provided', async () => {
        const payload: CartResponse = {
            sessionKey: 'test-session',
            status: 'active',
            lastActivityAt: new Date().toISOString(),
            expiresAt: null,
            items: [],
            total: 0
        };

        mockedCartService.getCart.mockResolvedValue(payload);

        const response = await requester.get('/api/cart?sessionKey=test-session');
        const body = response.body as { success: boolean; data: CartResponse };

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(payload);
        expect(mockedCartService.getCart).toHaveBeenCalledWith('test-session');
    });

    it('validates cart item payload on add', async () => {
        const response = await requester
            .post('/api/cart/items')
            .set('x-kiosk-session', 'test-session')
            .send({ quantity: 2 });
        const body = response.body as { error?: { message?: string } };

        expect(response.status).toBe(400);
        expect(body.error?.message).toBe('Invalid cart payload');
    });

    it('adds or updates cart item quantity', async () => {
        const payload: CartResponse = {
            sessionKey: 'test-session',
            status: 'active',
            lastActivityAt: new Date().toISOString(),
            expiresAt: null,
            items: [],
            total: 0
        };

        mockedCartService.setCartItemQuantity.mockResolvedValue(payload);

        const response = await requester
            .post('/api/cart/items')
            .set('x-kiosk-session', 'test-session')
            .send({ productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', quantity: 1 });
        const body = response.body as { success: boolean };

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(mockedCartService.setCartItemQuantity).toHaveBeenCalledWith(
            'test-session',
            '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            1
        );
    });
});
