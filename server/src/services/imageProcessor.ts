// =============================================================================
// Image Processing Worker
// =============================================================================
// Generates optimized image renditions (WebP/JPEG) for product media uploads.
// Utilizes Sharp for resizing, compression, and EXIF stripping before delegating
// persistence to the media storage utility.
// =============================================================================

import { ApiError } from '../middleware/errorHandler';
import mediaStorageDefault from '../utils/mediaStorage';

type ResizeOptions = {
    width: number;
    height: number;
    fit: string;
    withoutEnlargement?: boolean;
};

type VariantProfile = {
    resize: ResizeOptions;
    formats: Record<string, Record<string, unknown>>;
};

type ProcessorInput = {
    productId: string;
    buffer: Buffer;
    mimeType: string;
    originalFilename: string;
};

type PersistedMedia = {
    storagePath: string;
    storageDisk: string;
    format: string;
    originalFilename: string;
    mimeType: string;
};

type StoredVariant = PersistedMedia & {
    variant: string;
    format: string;
    width?: number;
    height?: number;
    sizeBytes: number;
};

type StorageAdapter = {
    persistMedia: (params: {
        productId: string;
        buffer: Buffer;
        mimeType: string;
        originalFilename: string;
        variant: string;
    }) => Promise<PersistedMedia>;
    deleteMedia: (storagePath: string) => Promise<void>;
    ALLOWED_FORMATS: Record<string, string>;
};

type SharpPipeline = {
    rotate: () => SharpPipeline;
    resize: (options: ResizeOptions) => SharpPipeline;
    removeAlpha: () => SharpPipeline;
    toFormat: (format: string, options?: Record<string, unknown>) => SharpPipeline;
    toBuffer: (options: { resolveWithObject: true }) => Promise<{ data: Buffer; info: { width?: number; height?: number } }>;
};

type SharpFactory = (input: Buffer, options?: Record<string, unknown>) => SharpPipeline;

type CreateImageProcessorParams = {
    sharpLib?: SharpFactory;
    storage?: StorageAdapter;
};

const VARIANT_PROFILE: Record<string, VariantProfile> = Object.freeze({
    display: {
        resize: { width: 1024, height: 768, fit: 'inside', withoutEnlargement: true },
        formats: {
            webp: { quality: 80, effort: 4 },
            jpeg: { quality: 82, mozjpeg: true, progressive: true }
        }
    },
    thumbnail: {
        resize: { width: 320, height: 240, fit: 'cover' },
        formats: {
            webp: { quality: 75, effort: 4 },
            jpeg: { quality: 78, mozjpeg: true, progressive: true }
        }
    }
});

const DEFAULT_SHARP_OPTIONS = Object.freeze({ failOnError: false });

let cachedSharpFactory: SharpFactory | undefined;

const loadSharpFactory = async (): Promise<SharpFactory> => {
    if (cachedSharpFactory) {
        return cachedSharpFactory;
    }

    const module = (await import('sharp')) as unknown as { default: SharpFactory };
    cachedSharpFactory = module.default;
    return cachedSharpFactory;
};

const createImageProcessor = ({ sharpLib, storage }: CreateImageProcessorParams = {}) => {
    const mediaStorage = (storage ?? mediaStorageDefault) as StorageAdapter;

    const validateInput = ({ productId, buffer }: { productId: string; buffer: Buffer }) => {
        if (!productId) {
            throw new ApiError(400, 'Product identifier is required for media processing');
        }

        if (!buffer || !Buffer.isBuffer(buffer)) {
            throw new ApiError(400, 'Product media payload must be a binary buffer');
        }
    };

    const buildPipeline = async (inputBuffer: Buffer, resizeOptions: ResizeOptions) => {
        const sharp = sharpLib ?? (await loadSharpFactory());
        return sharp(inputBuffer, DEFAULT_SHARP_OPTIONS)
            .rotate()
            .resize(resizeOptions)
            .removeAlpha();
    };

    const processVariant = async ({
        buffer,
        productId,
        originalFilename,
        sourceMime,
        variantKey,
        formatKey,
        resizeOptions,
        formatOptions,
        onPersist
    }: {
        buffer: Buffer;
        productId: string;
        originalFilename: string;
        sourceMime: string;
        variantKey: string;
        formatKey: string;
        resizeOptions: ResizeOptions;
        formatOptions: Record<string, unknown>;
        onPersist?: (record: StoredVariant) => void;
    }) => {
        const pipeline = await buildPipeline(buffer, resizeOptions);

        const { data, info } = await pipeline
            .toFormat(formatKey, formatOptions)
            .toBuffer({ resolveWithObject: true });

        const persisted = await mediaStorage.persistMedia({
            productId,
            buffer: data,
            mimeType: mediaStorage.ALLOWED_FORMATS[formatKey] || sourceMime,
            originalFilename,
            variant: variantKey
        });

        const record: StoredVariant = {
            ...persisted,
            variant: variantKey,
            format: formatKey,
            sizeBytes: data.length
        };
        if (info.width !== undefined) {
            record.width = info.width;
        }
        if (info.height !== undefined) {
            record.height = info.height;
        }

        if (onPersist) {
            onPersist(record);
        }

        return record;
    };

    const processProductImage = async ({ productId, buffer, mimeType, originalFilename }: ProcessorInput) => {
        validateInput({ productId, buffer });

        const persistedFiles: StoredVariant[] = [];
        const recordPersist = (record: StoredVariant) => {
            persistedFiles.push(record);
            return record;
        };

        try {
            // Store original payload for audit and rollback safety.
            const source = await mediaStorage.persistMedia({
                productId,
                buffer,
                mimeType,
                originalFilename,
                variant: 'source'
            });
            recordPersist({ ...source, variant: 'source', format: source.format, sizeBytes: buffer.length });

            const tasks: Array<Promise<StoredVariant>> = [];

            Object.entries(VARIANT_PROFILE).forEach(([variantKey, profile]) => {
                Object.entries(profile.formats).forEach(([formatKey, formatOptions]) => {
                    tasks.push(
                        processVariant({
                            buffer,
                            productId,
                            originalFilename,
                            sourceMime: mimeType,
                            variantKey,
                            formatKey,
                            resizeOptions: profile.resize,
                            formatOptions,
                            onPersist: recordPersist
                        })
                    );
                });
            });

            await Promise.all(tasks);

            return {
                productId,
                files: persistedFiles
            };
        } catch (error) {
            // Clean up any stored assets on failure to keep filesystem consistent.
            await Promise.all(
                persistedFiles.map((file) => mediaStorage.deleteMedia(file.storagePath).catch(() => undefined))
            );

            throw error;
        }
    };

    return {
        processProductImage,
        variantProfile: VARIANT_PROFILE
    };
};

let defaultProcessor: ReturnType<typeof createImageProcessor> | undefined;

const getDefaultProcessor = () => {
    if (!defaultProcessor) {
        defaultProcessor = createImageProcessor();
    }

    return defaultProcessor;
};

const processProductImage = (...args: Parameters<ReturnType<typeof createImageProcessor>['processProductImage']>) =>
    getDefaultProcessor().processProductImage(...args);

const imageProcessor = {
    createImageProcessor,
    variantProfile: VARIANT_PROFILE,
    processProductImage
};

export { createImageProcessor, VARIANT_PROFILE as variantProfile, processProductImage };
export default imageProcessor;
