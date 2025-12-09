const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { ApiError } = require('../middleware/errorHandler');
const categoryService = require('../services/categoryService');

const router = express.Router();

const nameValidation = body('name')
  .exists().withMessage('Category name is required')
  .bail()
  .trim()
  .notEmpty().withMessage('Category name is required')
  .isLength({ min: 1, max: 50 }).withMessage('Maximum 50 characters')
  .matches(/^[A-Za-z0-9\- ]+$/).withMessage('Only letters, numbers, spaces and hyphens allowed');

const descriptionValidation = body('description')
  .optional({ nullable: true })
  .isLength({ max: 255 }).withMessage('Description must be 255 characters or fewer');

const displayOrderValidation = body('displayOrder')
  .optional({ nullable: true })
  .isInt({ min: 0 }).withMessage('Display order must be a positive integer');

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const categories = await categoryService.listCategories();
    res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', [nameValidation, descriptionValidation, displayOrderValidation], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    const category = await categoryService.createCategory(req.body, req.user);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
});

router.put(
  '/:id',
  [
    param('id').isUUID().withMessage('Invalid category ID'),
    nameValidation.optional({ nullable: true }),
    descriptionValidation,
    displayOrderValidation,
    body('isActive').optional({ nullable: true }).isBoolean().withMessage('isActive must be a boolean')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Validation failed', errors.array());
      }

      const category = await categoryService.updateCategory(req.params.id, req.body, req.user);

      res.status(200).json({
        success: true,
        message: 'Category updated successfully',
        data: category
      });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/:id', [param('id').isUUID().withMessage('Invalid category ID')], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError(400, 'Validation failed', errors.array());
    }

    await categoryService.deleteCategory(req.params.id, req.user);

    res.status(200).json({
      success: true,
      message: 'Category deleted'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
