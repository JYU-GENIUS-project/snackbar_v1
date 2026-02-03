import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import multer from 'multer';
import { body, param, query, validationResult } from 'express-validator';

import { authenticate } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import productService from '../services/productService';
import productMediaService from '../services/productMediaService';
import mediaStorage from '../utils/mediaStorage';

const router = Router();

type AdminActor = {
    id: string;
    username: string;
};

type ProductRecord = Record<string, unknown>;
type ProductMediaRecord = Record<string, unknown>;
type ProductListMeta = Record<string, unknown>;
type ProductListResult = {
    data: ProductRecord[];
    meta: ProductListMeta;
};

type ProductPayload = {
    name?: string;
    price?: unknown;
    status?: string;
    categoryIds?: string[] | null;
    categoryId?: string | null;
    metadata?: Record<string, unknown> | string | null;
};

type ProductMediaUpload = {
    productId: string;
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
    actor: AdminActor;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const authenticateHandler = authenticate as unknown as RequestHandler;

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
        .isArray()
        .withMessage('categoryIds must be an array')
        .custom((value: unknown) => {
            if (!Array.isArray(value)) {
                return false;
            }
            return value.every((id) => typeof id === 'string');
        }),
    body('categoryId').optional({ nullable: true }).isString().withMessage('categoryId must be a string'),
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

router.use(authenticateHandler);

router.get(
    '/',
    paginationValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const includeArchivedValue = req.query.includeArchived;
        const includeArchived = Array.isArray(includeArchivedValue)
            ? includeArchivedValue.includes('true')
            : includeArchivedValue === 'true';
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 50;
        const offset = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : 0;
        const search = typeof req.query.search === 'string' ? req.query.search : '';

        const result = (await productService.listProducts({ includeArchived, search, limit, offset })) as ProductListResult;

        res.status(200).json({
            success: true,
            data: result.data,
            meta: result.meta
        });
    })
);

router.post(
    '/',
    productPayloadValidation,
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const payload = req.body as ProductPayload;
        const actor = req.user as AdminActor;
        const product = (await productService.createProduct(payload, actor)) as ProductRecord;

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    })
);

router.put(
    '/:id',
    [param('id').isUUID().withMessage('Invalid product ID'), ...productPayloadValidation],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.id;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const payload = req.body as ProductPayload;
        const actor = req.user as AdminActor;
        const product = (await productService.updateProduct(productId, payload, actor)) as ProductRecord;

        res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            data: product
        });
    })
);

router.delete(
    '/:id',
    [param('id').isUUID().withMessage('Invalid product ID')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.id;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const actor = req.user as AdminActor;
        const product = (await productService.archiveProduct(productId, actor)) as ProductRecord;

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
            data: product
        });
    })
);

router.get(
    '/:id/media',
    [param('id').isUUID().withMessage('Invalid product ID')],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.id;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const media = (await productMediaService.listProductMedia(productId)) as ProductMediaRecord[];

        res.status(200).json({
            success: true,
            data: media
        });
    })
);

router.post(
    '/:id/media',
    [param('id').isUUID().withMessage('Invalid product ID')],
    upload.single('file'),
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        if (!req.file) {
            throw new ApiError(400, 'Media file is required');
        }

        const productId = req.params.id;
        if (!productId) {
            throw new ApiError(400, 'Product id is required');
        }

        const actor = req.user as AdminActor;
        const uploadRequest: ProductMediaUpload = {
            productId,
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            originalFilename: req.file.originalname,
            actor
        };

        const media = (await productMediaService.uploadProductMedia(uploadRequest)) as ProductMediaRecord;

        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            data: media
        });
    })
);

router.patch(
    '/:id/media/:mediaId/primary',
    [
        param('id').isUUID().withMessage('Invalid product ID'),
        param('mediaId').isUUID().withMessage('Invalid media ID')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.id;
        const mediaId = req.params.mediaId;
        if (!productId || !mediaId) {
            throw new ApiError(400, 'Product id and media id are required');
        }

        const actor = req.user as AdminActor;
        const media = (await productMediaService.setPrimaryMedia({
            productId,
            mediaId,
            actor
        })) as ProductMediaRecord;

        res.status(200).json({
            success: true,
            message: 'Primary media updated',
            data: media
        });
    })
);

router.delete(
    '/:id/media/:mediaId',
    [
        param('id').isUUID().withMessage('Invalid product ID'),
        param('mediaId').isUUID().withMessage('Invalid media ID')
    ],
    asyncHandler(async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            throw new ApiError(400, 'Validation failed', { errors: errors.array() });
        }

        const productId = req.params.id;
        const mediaId = req.params.mediaId;
        if (!productId || !mediaId) {
            throw new ApiError(400, 'Product id and media id are required');
        }

        const actor = req.user as AdminActor;
        const media = (await productMediaService.deleteProductMedia({
            productId,
            mediaId,
            actor
        })) as ProductMediaRecord;

        res.status(200).json({
            success: true,
            message: 'Media asset removed',
            data: media
        });
    })
);

export default router;
