'use strict';

import express from 'express';
import request from 'supertest';

import feedRouter from '../routes/feed';
import inventoryService from '../services/inventoryService';
import productService from '../services/productService';
import statusService from '../services/statusService';

jest.mock('../services/productService', () => ({
    __esModule: true,
    default: {
        getProductFeed: jest.fn()
    }
}));

jest.mock('../services/inventoryService', () => ({
    __esModule: true,
    default: {
        getInventoryTrackingState: jest.fn()
    }
}));

jest.mock('../services/statusService', () => ({
    __esModule: true,
    default: {
        getKioskStatus: jest.fn(),
        buildStatusFingerprint: jest.fn()
    }
}));

const mockedProductService = productService as jest.Mocked<typeof productService>;
const mockedInventoryService = inventoryService as jest.Mocked<typeof inventoryService>;
const mockedStatusService = statusService as jest.Mocked<typeof statusService>;

type KioskStatus = Awaited<ReturnType<typeof statusService.getKioskStatus>>;

describe('GET /products feed route', () => {
    let app: express.Express;

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-05-05T10:00:00Z'));

        mockedProductService.getProductFeed.mockReset();
        mockedInventoryService.getInventoryTrackingState.mockReset();
        mockedStatusService.getKioskStatus.mockReset();
        mockedStatusService.buildStatusFingerprint.mockReset();

        app = express();
        app.use('/api/feed', feedRouter);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('returns products with status metadata and caching headers', async () => {
        const products = [
            {
                id: 'prod-1',
                name: 'Blueberry Muffin',
                description: 'Fresh muffin',
                price: 3.5,
                currency: 'EUR',
                status: 'active',
                categoryId: null,
                categoryIds: [],
                categories: [],
                available: true,
                stockQuantity: 6,
                purchaseLimit: 2,
                lowStockThreshold: 3,
                isLowStock: false,
                isOutOfStock: false,
                stockStatus: 'available',
                allergens: 'gluten',
                metadata: {},
                imageAlt: null,
                updatedAt: '2025-05-04T12:00:00.000Z',
                displayOrder: 1,
                primaryMedia: null,
                media: []
            }
        ];

        const kioskStatus = {
            status: 'open',
            message: 'Open for business',
            nextOpen: null,
            nextClose: '2025-05-05T18:00:00.000Z'
        } as KioskStatus;

        mockedProductService.getProductFeed.mockResolvedValue(products);
        mockedInventoryService.getInventoryTrackingState.mockResolvedValue(true);
        mockedStatusService.getKioskStatus.mockResolvedValue(kioskStatus);
        mockedStatusService.buildStatusFingerprint.mockReturnValue('fingerprint-open');

        const response = await request(app).get('/api/feed/products');
        const body = response.body as {
            success: boolean;
            data: {
                inventoryTrackingEnabled: boolean;
                status: KioskStatus;
                statusFingerprint: string;
                products: Array<{ id: string }>;
            };
        };

        expect(response.status).toBe(200);
        expect(response.headers['cache-control']).toBe('public, max-age=5');
        expect(response.headers).toHaveProperty('etag');
        expect(response.headers).toHaveProperty('last-modified');

        expect(body.success).toBe(true);
        const payload = body.data;
        expect(payload.inventoryTrackingEnabled).toBe(true);
        expect(payload.status).toEqual(kioskStatus);
        expect(payload.statusFingerprint).toBe('fingerprint-open');
        expect(Array.isArray(payload.products)).toBe(true);
        expect(payload.products).toHaveLength(1);
        const [firstProduct] = payload.products;
        expect(firstProduct?.id).toBe('prod-1');

        expect(mockedStatusService.buildStatusFingerprint).toHaveBeenCalledWith(kioskStatus);
    });

    it('responds with 304 when ETag matches', async () => {
        const products = [
            {
                id: 'prod-1',
                name: 'Blueberry Muffin',
                description: 'Fresh muffin',
                price: 3.5,
                currency: 'EUR',
                status: 'active',
                categoryId: null,
                categoryIds: [],
                categories: [],
                available: true,
                stockQuantity: 6,
                purchaseLimit: 2,
                lowStockThreshold: 3,
                isLowStock: false,
                isOutOfStock: false,
                stockStatus: 'available',
                allergens: 'gluten',
                metadata: {},
                imageAlt: null,
                updatedAt: '2025-05-04T12:00:00.000Z',
                displayOrder: 1,
                primaryMedia: null,
                media: []
            }
        ];

        const kioskStatus = {
            status: 'open',
            message: 'Open for business',
            nextOpen: null,
            nextClose: '2025-05-05T18:00:00.000Z'
        } as KioskStatus;

        mockedProductService.getProductFeed.mockResolvedValue(products);
        mockedInventoryService.getInventoryTrackingState.mockResolvedValue(true);
        mockedStatusService.getKioskStatus.mockResolvedValue(kioskStatus);
        mockedStatusService.buildStatusFingerprint.mockReturnValue('fingerprint-open');

        const firstResponse = await request(app).get('/api/feed/products');
        const etag = Array.isArray(firstResponse.headers.etag)
            ? firstResponse.headers.etag[0]
            : firstResponse.headers.etag;

        const secondResponse = await request(app)
            .get('/api/feed/products')
            .set('If-None-Match', etag ?? '');

        expect(secondResponse.status).toBe(304);
        expect(secondResponse.body).toEqual({});
    });
});
