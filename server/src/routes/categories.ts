import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import { body, param, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import categoryService from '../services/categoryService';

const router = Router();

type AdminActor = {
    id: string;
    username: string;
};

type CategoryRecord = {
    id: string;
    name: string;
    description: string | null;
    displayOrder: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    productCount: number;
};

type CategoryCreatePayload = {
    name?: string;
    description?: string | null;
    displayOrder?: number | null;
};

type CategoryUpdatePayload = {
    name?: string;
    description?: string | null;
    displayOrder?: number | null;
    isActive?: boolean;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler = authenticate as unknown as RequestHandler;

const nameValidation = body('name')
    .exists()
    .withMessage('Category name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Maximum 50 characters')
    .matches(/^[A-Za-z0-9\- ]+$/)
    .withMessage('Only letters, numbers, spaces and hyphens allowed');

const descriptionValidation = body('description')
    .optional({ nullable: true })
    .isLength({ max: 255 })
    .withMessage('Description must be 255 characters or fewer');

const displayOrderValidation = body('displayOrder')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('Display order must be a positive integer');

router.use(authenticateHandler);

router.get(
    '/',
    asyncHandler(async (_req, res) => {
        const categories = (await categoryService.listCategories()) as CategoryRecord[];
        res.status(200).json({
            success: true,
            data: categories
        });
    })
);

router.post(
    '/',
    [nameValidation, descriptionValidation, displayOrderValidation],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const payload = req.body as CategoryCreatePayload;
        if (!payload.name) {
            throw new ApiError(400, 'Category name is required');
        }
        const actor = req.user as AdminActor;
        const category = await categoryService.createCategory(payload as { name: string; description: string | null; displayOrder: number | null }, actor);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: category
        });
    })
);

router.put(
    '/:id',
    [
        param('id').isUUID().withMessage('Invalid category ID'),
        nameValidation.optional({ nullable: true }),
        descriptionValidation,
        displayOrderValidation,
        body('isActive').optional({ nullable: true }).isBoolean().withMessage('isActive must be a boolean')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const categoryId = req.params.id;
        if (!categoryId) {
            throw new ApiError(400, 'Category id is required');
        }

        const payload = req.body as CategoryUpdatePayload;
        const actor = req.user as AdminActor;
        const updates: CategoryUpdatePayload = {};
        if (payload.name !== undefined) {
            updates.name = payload.name;
        }
        if (payload.description !== undefined) {
            updates.description = payload.description;
        }
        if (payload.displayOrder !== undefined) {
            updates.displayOrder = payload.displayOrder;
        }
        if (typeof payload.isActive === 'boolean') {
            updates.isActive = payload.isActive;
        }
        const category = await categoryService.updateCategory(categoryId, updates, actor);

        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            data: category
        });
    })
);

router.delete(
    '/:id',
    [param('id').isUUID().withMessage('Invalid category ID')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const categoryId = req.params.id;
        if (!categoryId) {
            throw new ApiError(400, 'Category id is required');
        }

        const actor = req.user as AdminActor;
        await categoryService.deleteCategory(categoryId, actor);

        res.status(200).json({
            success: true,
            message: 'Category deleted'
        });
    })
);

export default router;
