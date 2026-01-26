'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../services/productService', () => ({
  getProductFeed: jest.fn()
}));

jest.mock('../services/inventoryService', () => ({
  getInventoryTrackingState: jest.fn()
}));

jest.mock('../services/statusService', () => ({
  getKioskStatus: jest.fn(),
  buildStatusFingerprint: jest.fn()
}));

const productService = require('../services/productService');
const inventoryService = require('../services/inventoryService');
const statusService = require('../services/statusService');
const feedRouter = require('../routes/feed');

describe('GET /products feed route', () => {
  let app;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-05T10:00:00Z'));

    productService.getProductFeed.mockReset();
    inventoryService.getInventoryTrackingState.mockReset();
    statusService.getKioskStatus.mockReset();
    statusService.buildStatusFingerprint.mockReset();

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
    };

    productService.getProductFeed.mockResolvedValue(products);
    inventoryService.getInventoryTrackingState.mockResolvedValue(true);
    statusService.getKioskStatus.mockResolvedValue(kioskStatus);
    statusService.buildStatusFingerprint.mockReturnValue('fingerprint-open');

    const response = await request(app).get('/api/feed/products');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=5');
    expect(response.headers).toHaveProperty('etag');
    expect(response.headers).toHaveProperty('last-modified');

    expect(response.body.success).toBe(true);
    const payload = response.body.data;
    expect(payload.inventoryTrackingEnabled).toBe(true);
    expect(payload.status).toEqual(kioskStatus);
    expect(payload.statusFingerprint).toBe('fingerprint-open');
    expect(Array.isArray(payload.products)).toBe(true);
    expect(payload.products[0].id).toBe('prod-1');

    expect(statusService.buildStatusFingerprint).toHaveBeenCalledWith(kioskStatus);
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
    };

    productService.getProductFeed.mockResolvedValue(products);
    inventoryService.getInventoryTrackingState.mockResolvedValue(true);
    statusService.getKioskStatus.mockResolvedValue(kioskStatus);
    statusService.buildStatusFingerprint.mockReturnValue('fingerprint-open');

    const firstResponse = await request(app).get('/api/feed/products');
    const etag = firstResponse.headers.etag;

    const secondResponse = await request(app)
      .get('/api/feed/products')
      .set('If-None-Match', etag);

    expect(secondResponse.status).toBe(304);
    expect(secondResponse.body).toEqual({});
  });
});
