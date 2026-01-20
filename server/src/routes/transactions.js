const express = require('express');
const { body, validationResult } = require('express-validator');
const { ApiError } = require('../middleware/errorHandler');
const transactionService = require('../services/transactionService');

const router = express.Router();

const transactionValidation = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('items must be a non-empty array'),
    body('items.*.productId').isUUID().withMessage('productId must be a UUID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be a positive integer'),
    body('paymentStatus')
        .optional()
        .isString()
        .withMessage('paymentStatus must be a string'),
    body('paymentMethod')
        .optional()
        .isString()
        .withMessage('paymentMethod must be a string'),
    body('mobilepayPaymentId')
        .optional({ nullable: true })
        .isString()
        .withMessage('mobilepayPaymentId must be a string'),
    body('mobilepayQrCode')
        .optional({ nullable: true })
        .isString()
        .withMessage('mobilepayQrCode must be a string')
];

router.post('/', transactionValidation, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', errors.array());
        }

        const result = await transactionService.createTransaction({
            items: req.body.items,
            paymentStatus: req.body.paymentStatus,
            paymentMethod: req.body.paymentMethod,
            mobilepayPaymentId: req.body.mobilepayPaymentId,
            mobilepayQrCode: req.body.mobilepayQrCode
        });

        res.status(201).json({
            success: true,
            message: 'Transaction recorded successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
