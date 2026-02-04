import { Router, type NextFunction, type Request, type Response, type RequestHandler } from 'express';
import crypto from 'crypto';

import productService from '../services/productService';
import inventoryService from '../services/inventoryService';
import statusService from '../services/statusService';

const router = Router();

type ProductFeedItem = {
    updatedAt?: string;
} & Record<string, unknown>;

type KioskStatusPayload = Awaited<ReturnType<typeof statusService.getKioskStatus>>;

type FeedPayload = {
    generatedAt: string;
    products: ProductFeedItem[];
    inventoryTrackingEnabled: boolean;
    status: KioskStatusPayload;
    statusFingerprint: string;
};

const asyncHandler = (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        void handler(req, res, next).catch(next);
    };
};

const buildEtag = (content: string) => {
    return `"${crypto.createHash('sha1').update(content).digest('base64')}"`;
};

const computeLastModified = (products: ProductFeedItem[]) => {
    const latest = products.reduce((acc, product) => {
        const timestamp = product.updatedAt ? new Date(product.updatedAt).getTime() : 0;
        return Number.isNaN(timestamp) ? acc : Math.max(acc, timestamp);
    }, 0);

    return new Date(latest || Date.now()).toUTCString();
};

router.get(
    '/products',
    asyncHandler(async (req, res) => {
        const [products, inventoryTrackingEnabled, kioskStatus] = (await Promise.all([
            productService.getProductFeed(),
            inventoryService.getInventoryTrackingState(),
            statusService.getKioskStatus()
        ])) as [ProductFeedItem[], boolean, KioskStatusPayload];

        const statusFingerprint = statusService.buildStatusFingerprint(kioskStatus) as string;
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
            res.end();
            return;
        }

        const payload: FeedPayload = {
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
    })
);

export default router;
