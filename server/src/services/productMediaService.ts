import db from '../utils/database';
import { ApiError } from '../middleware/errorHandler';
import mediaStorageDefault from '../utils/mediaStorage';
import { processProductImage } from './imageProcessor';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';

type AdminActor = {
    id: string;
    username: string;
};

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type MediaRow = {
    id: string;
    product_id: string;
    variant: string;
    format: string;
    storage_path: string;
    storage_disk: string;
    original_filename: string | null;
    mime_type: string;
    size_bytes: number;
    width: number | null;
    height: number | null;
    checksum: string;
    is_primary: boolean;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
};

type MediaRecord = {
    id: string;
    productId: string;
    variant: string;
    format: string;
    url: string | null;
    storagePath: string;
    storageDisk: string;
    originalFilename: string | null;
    mimeType: string;
    sizeBytes: number;
    width: number | null;
    height: number | null;
    checksum: string;
    isPrimary: boolean;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

type StoredFile = {
    variant: string;
    format: string;
    storagePath: string;
    storageDisk: string;
    originalFilename: string | null;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    checksum?: string;
};

type MediaStorage = {
    deleteMedia: (storagePath: string) => Promise<void>;
    ALLOWED_FORMATS: Record<string, string>;
};

const MEDIA_PUBLIC_BASE_URL = (process.env.MEDIA_PUBLIC_BASE_URL || '/uploads').replace(/\/$/, '');

const runQuery = async (client: DbClient | null, text: string, params: unknown[]) => {
    if (client && typeof client.query === 'function') {
        return client.query(text, params);
    }
    const database = db as unknown as DbClient;
    return database.query(text, params);
};

const buildPublicUrl = (storagePath: string | null) => {
    if (!storagePath) {
        return null;
    }

    const base = MEDIA_PUBLIC_BASE_URL.endsWith('/') ? MEDIA_PUBLIC_BASE_URL.slice(0, -1) : MEDIA_PUBLIC_BASE_URL;
    const normalizedPath = storagePath.startsWith('/') ? storagePath.slice(1) : storagePath;

    return `${base}/${normalizedPath}`;
};

const mapMediaRow = (row: MediaRow): MediaRecord => ({
    id: row.id,
    productId: row.product_id,
    variant: row.variant,
    format: row.format,
    url: buildPublicUrl(row.storage_path),
    storagePath: row.storage_path,
    storageDisk: row.storage_disk,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    checksum: row.checksum,
    isPrimary: row.is_primary,
    metadata: row.metadata || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
});

const ensureProductExists = async (client: DbClient | null, productId: string) => {
    const result = await runQuery(
        client,
        'SELECT id FROM products WHERE id = $1 AND deleted_at IS NULL',
        [productId]
    );

    if ((result.rowCount ?? 0) === 0) {
        throw new ApiError(404, 'Product not found');
    }
};

const listProductMedia = async (
    productId: string,
    { includeDeleted = false, client = null }: { includeDeleted?: boolean; client?: DbClient | null } = {}
) => {
    const conditions = ['product_id = $1'];
    if (!includeDeleted) {
        conditions.push('deleted_at IS NULL');
    }

    const result = (await runQuery(
        client ?? null,
        `SELECT *
     FROM product_media
     WHERE ${conditions.join(' AND ')}
     ORDER BY variant ASC, is_primary DESC, created_at DESC`,
        [productId]
    )) as DbQueryResult<MediaRow>;

    return result.rows.map(mapMediaRow);
};

const listMediaForProducts = async (
    productIds: string[],
    { includeDeleted = false, client = null }: { includeDeleted?: boolean; client?: DbClient | null } = {}
) => {
    if (!Array.isArray(productIds) || productIds.length === 0) {
        return new Map<string, MediaRecord[]>();
    }

    const conditions = ['product_id = ANY($1::uuid[])'];
    if (!includeDeleted) {
        conditions.push('deleted_at IS NULL');
    }

    const result = (await runQuery(
        client ?? null,
        `SELECT *
     FROM product_media
     WHERE ${conditions.join(' AND ')}
     ORDER BY product_id, variant ASC, is_primary DESC, created_at DESC`,
        [productIds]
    )) as DbQueryResult<MediaRow>;

    const mediaMap = new Map<string, MediaRecord[]>();
    for (const row of result.rows) {
        const media = mapMediaRow(row);
        if (!mediaMap.has(media.productId)) {
            mediaMap.set(media.productId, []);
        }
        mediaMap.get(media.productId)?.push(media);
    }

    return mediaMap;
};

const uploadProductMedia = async ({
    productId,
    buffer,
    mimeType,
    originalFilename,
    actor
}: {
    productId: string;
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
    actor: AdminActor;
}) => {
    if (!buffer || !Buffer.isBuffer(buffer)) {
        throw new ApiError(400, 'Media payload is required');
    }

    const database = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };
    const mediaStorage = mediaStorageDefault as MediaStorage;

    return database.transaction(async (client: DbClient) => {
        await ensureProductExists(client, productId);

        const processed = (await processProductImage({
            productId,
            buffer,
            mimeType,
            originalFilename
        })) as unknown as { files?: StoredFile[] };

        const storedFiles = processed.files || [];

        try {
            const inserted: MediaRow[] = [];
            for (const file of storedFiles) {
                const result = (await runQuery(
                    client,
                    `INSERT INTO product_media (
             product_id,
             variant,
             format,
             storage_path,
             storage_disk,
             original_filename,
             mime_type,
             size_bytes,
             width,
             height,
             checksum,
             is_primary
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE
           )
           RETURNING *`,
                    [
                        productId,
                        file.variant,
                        file.format,
                        file.storagePath,
                        file.storageDisk,
                        file.originalFilename,
                        file.mimeType,
                        file.sizeBytes,
                        file.width ?? null,
                        file.height ?? null,
                        file.checksum
                    ]
                )) as DbQueryResult<MediaRow>;
                if (result.rows[0]) {
                    inserted.push(result.rows[0]);
                }
            }

            const hasPrimary = await runQuery(
                client,
                `SELECT id
         FROM product_media
         WHERE product_id = $1 AND is_primary = TRUE AND deleted_at IS NULL
         LIMIT 1`,
                [productId]
            );

            if ((hasPrimary.rowCount ?? 0) === 0 && inserted.length > 0) {
                const preferred =
                    inserted.find((row) => row.variant === 'display' && row.format === 'webp') ||
                    inserted.find((row) => row.variant === 'display') ||
                    inserted[0];

                if (preferred) {
                    await runQuery(client, 'UPDATE product_media SET is_primary = TRUE WHERE id = $1', [preferred.id]);
                }
            }

            await runQuery(client, 'UPDATE products SET updated_at = NOW() WHERE id = $1', [productId]);

            const media = await listProductMedia(productId, { client });

            await createAuditLog({
                adminId: actor.id,
                adminUsername: actor.username,
                action: AuditActions.PRODUCT_MEDIA_UPLOADED,
                entityType: EntityTypes.PRODUCT,
                entityId: productId,
                newValues: {
                    mediaIds: inserted.map((row) => row.id)
                }
            });

            return media;
        } catch (error) {
            await Promise.all(storedFiles.map((file) => mediaStorage.deleteMedia(file.storagePath).catch(() => undefined)));
            throw error;
        }
    });
};

const setPrimaryMedia = async ({ productId, mediaId, actor }: { productId: string; mediaId: string; actor: AdminActor }) => {
    const database = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };

    return database.transaction(async (client: DbClient) => {
        await ensureProductExists(client, productId);

        const mediaResult = (await runQuery(
            client,
            `SELECT *
       FROM product_media
       WHERE id = $1 AND product_id = $2 AND deleted_at IS NULL`,
            [mediaId, productId]
        )) as DbQueryResult<MediaRow>;

        if ((mediaResult.rowCount ?? 0) === 0 || !mediaResult.rows[0]) {
            throw new ApiError(404, 'Media asset not found');
        }

        const mediaRow = mediaResult.rows[0];

        if (mediaRow.variant !== 'display') {
            throw new ApiError(400, 'Only display variants can be set as primary');
        }

        const previousPrimary = (await runQuery(
            client,
            `SELECT id
       FROM product_media
       WHERE product_id = $1 AND is_primary = TRUE AND deleted_at IS NULL`,
            [productId]
        )) as DbQueryResult<{ id: string }>;

        await runQuery(client, 'UPDATE product_media SET is_primary = FALSE WHERE product_id = $1', [productId]);

        await runQuery(client, 'UPDATE product_media SET is_primary = TRUE, updated_at = NOW() WHERE id = $1', [mediaId]);

        await runQuery(client, 'UPDATE products SET updated_at = NOW() WHERE id = $1', [productId]);

        const media = await listProductMedia(productId, { client });

        await createAuditLog({
            adminId: actor.id,
            adminUsername: actor.username,
            action: AuditActions.PRODUCT_MEDIA_PRIMARY_SET,
            entityType: EntityTypes.PRODUCT,
            entityId: productId,
            oldValues: {
                primaryMediaId: previousPrimary.rows[0]?.id || null
            },
            newValues: {
                primaryMediaId: mediaId
            }
        });

        return media;
    });
};

const deleteProductMedia = async ({
    productId,
    mediaId,
    actor
}: {
    productId: string;
    mediaId: string;
    actor: AdminActor;
}) => {
    const database = db as unknown as { transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T> };
    const mediaStorage = mediaStorageDefault as MediaStorage;

    return database.transaction(async (client: DbClient) => {
        await ensureProductExists(client, productId);

        const mediaResult = (await runQuery(
            client,
            `SELECT *
       FROM product_media
       WHERE id = $1 AND product_id = $2 AND deleted_at IS NULL`,
            [mediaId, productId]
        )) as DbQueryResult<MediaRow>;

        if ((mediaResult.rowCount ?? 0) === 0 || !mediaResult.rows[0]) {
            throw new ApiError(404, 'Media asset not found');
        }

        const mediaRow = mediaResult.rows[0];

        await runQuery(
            client,
            `UPDATE product_media
       SET deleted_at = NOW(), is_primary = FALSE, updated_at = NOW()
       WHERE id = $1`,
            [mediaId]
        );

        if (mediaRow.is_primary) {
            const fallback = (await runQuery(
                client,
                `SELECT id
         FROM product_media
         WHERE product_id = $1 AND variant = 'display' AND deleted_at IS NULL
         ORDER BY is_primary DESC, created_at DESC
         LIMIT 1`,
                [productId]
            )) as DbQueryResult<{ id: string }>;

            if ((fallback.rowCount ?? 0) > 0) {
                const fallbackId = fallback.rows[0]?.id;
                if (fallbackId) {
                    await runQuery(
                        client,
                        'UPDATE product_media SET is_primary = TRUE, updated_at = NOW() WHERE id = $1',
                        [fallbackId]
                    );
                }
            }
        }

        await runQuery(client, 'UPDATE products SET updated_at = NOW() WHERE id = $1', [productId]);

        await mediaStorage.deleteMedia(mediaRow.storage_path).catch(() => undefined);

        const media = await listProductMedia(productId, { client });

        await createAuditLog({
            adminId: actor.id,
            adminUsername: actor.username,
            action: AuditActions.PRODUCT_MEDIA_DELETED,
            entityType: EntityTypes.PRODUCT,
            entityId: productId,
            oldValues: {
                mediaId,
                variant: mediaRow.variant,
                format: mediaRow.format
            }
        });

        return media;
    });
};

const productMediaService = {
    listProductMedia,
    listMediaForProducts,
    uploadProductMedia,
    setPrimaryMedia,
    deleteProductMedia
};

export {
    listProductMedia,
    listMediaForProducts,
    uploadProductMedia,
    setPrimaryMedia,
    deleteProductMedia
};

export default productMediaService;
