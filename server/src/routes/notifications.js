const express = require('express');
const { query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const notificationService = require('../services/notificationService');

const router = express.Router();

const VALID_STATUSES = ['pending', 'sent', 'failed'];

router.use(authenticate);

router.get(
  '/logs',
  [
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be zero or greater'),
    query('status').optional().isIn(VALID_STATUSES).withMessage('status must be pending, sent, or failed')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const status = req.query.status || null;

      const result = await notificationService.getNotificationLog({ limit, offset, status });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
