const express = require('express');
const multer = require('multer');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const productService = require('../services/productService');
const productMediaService = require('../services/productMediaService');
const mediaStorage = require('../utils/mediaStorage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: mediaStorage.MAX_SIZE_BYTES
  }
});

const paginationValidation = [
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
  query('offset').optional().isInt({ min: 0 }).withMessage('offset must be zero or a positive integer'),
  query('includeArchived').optional().isBoolean().withMessage('includeArchived must be a boolean')
];

const productPayloadValidation = [
  body('name').optional().isString().withMessage('Product name must be a string'),
  body('price').optional().notEmpty().withMessage('Price is required'),
  body('status').optional().isString().withMessage('Status must be a string'),
  body('categoryIds')
    .optional({ nullable: true })
    .isArray().withMessage('categoryIds must be an array')
    .custom((value) => value.every((id) => typeof id === 'string')),
  body('categoryId')
    .optional({ nullable: true })
    .isString().withMessage('categoryId must be a string'),
  body('metadata')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === undefined) {
        return true;
      }
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          return true;
        } catch {
          throw new Error('Metadata must be valid JSON');
        }
      }
      if (typeof value === 'object' && !Array.isArray(value)) {
        return true;
      }
      throw new Error('Metadata must be an object');
    })
];

router.use(authenticate);

router.get('/', paginationValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === true;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    const search = req.query.search || '';

    const result = await productService.listProducts({ includeArchived, search, limit, offset });

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', productPayloadValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const product = await productService.createProduct(req.body, req.user);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', [param('id').isUUID().withMessage('Invalid product ID'), ...productPayloadValidation], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const product = await productService.updateProduct(req.params.id, req.body, req.user);

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', [param('id').isUUID().withMessage('Invalid product ID')], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const product = await productService.archiveProduct(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: product
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id/media', [param('id').isUUID().withMessage('Invalid product ID')], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const media = await productMediaService.listProductMedia(req.params.id);

    res.status(200).json({
      success: true,
      data: media
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/:id/media',
  [param('id').isUUID().withMessage('Invalid product ID')],
  upload.single('file'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      if (!req.file) {
        throw new ApiError(400, 'Media file is required');
      }

      const media = await productMediaService.uploadProductMedia({
        productId: req.params.id,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalFilename: req.file.originalname,
        actor: req.user
      });

      res.status(201).json({
        success: true,
        message: 'Media uploaded successfully',
        data: media
      });
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  '/:id/media/:mediaId/primary',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    param('mediaId').isUUID().withMessage('Invalid media ID')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const media = await productMediaService.setPrimaryMedia({
        productId: req.params.id,
        mediaId: req.params.mediaId,
        actor: req.user
      });

      res.status(200).json({
        success: true,
        message: 'Primary media updated',
        data: media
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id/media/:mediaId',
  [
    param('id').isUUID().withMessage('Invalid product ID'),
    param('mediaId').isUUID().withMessage('Invalid media ID')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const media = await productMediaService.deleteProductMedia({
        productId: req.params.id,
        mediaId: req.params.mediaId,
        actor: req.user
      });

      res.status(200).json({
        success: true,
        message: 'Media asset removed',
        data: media
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
