const express = require('express');
const crypto = require('crypto');
const productService = require('../services/productService');
const inventoryService = require('../services/inventoryService');
const statusService = require('../services/statusService');

const router = express.Router();

const buildEtag = (content) => {
  return `"${crypto.createHash('sha1').update(content).digest('base64')}"`;
};

const computeLastModified = (products) => {
  const latest = products.reduce((acc, product) => {
    const timestamp = product.updatedAt ? new Date(product.updatedAt).getTime() : 0;
    return Number.isNaN(timestamp) ? acc : Math.max(acc, timestamp);
  }, 0);

  return new Date(latest || Date.now()).toUTCString();
};

router.get('/products', async (req, res, next) => {
  try {
    const [products, inventoryTrackingEnabled, kioskStatus] = await Promise.all([
      productService.getProductFeed(),
      inventoryService.getInventoryTrackingState(),
      statusService.getKioskStatus()
    ]);

    const statusFingerprint = statusService.buildStatusFingerprint(kioskStatus);
    const serializedPayload = JSON.stringify({
      products,
      inventoryTrackingEnabled,
      statusFingerprint
    });
    const etag = buildEtag(serializedPayload);

    const lastModified = computeLastModified(products);

    if (req.headers['if-none-match'] === etag) {
      res.status(304).set({
        ETag: etag,
        'Cache-Control': 'public, max-age=5',
        'Last-Modified': lastModified
      });
      return res.end();
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      products,
      inventoryTrackingEnabled,
      status: kioskStatus,
      statusFingerprint
    };

    res.set({
      ETag: etag,
      'Cache-Control': 'public, max-age=5',
      'Last-Modified': lastModified
    });

    res.status(200).json({
      success: true,
      data: payload
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
