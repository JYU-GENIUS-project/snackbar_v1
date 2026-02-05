'use strict';

// =============================================================================
// Media Storage Utility
// =============================================================================
// Handles secure media persistence for product assets, including
// directory initialization, filename sanitization, validation, and checksum
// calculation. Designed to support subsequent image processing pipelines.
// =============================================================================

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { validate as validateUuid } from 'uuid';

import { ApiError } from '../middleware/errorHandler';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_BASE_DIR = path.resolve(
    process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads')
);

const VARIANTS = ['source', 'display', 'thumbnail'] as const;

type MediaVariant = (typeof VARIANTS)[number];

type AllowedFormats = {
    readonly [format: string]: string;
};

const MAX_SIZE_BYTES = Number.parseInt(process.env.UPLOAD_MAX_SIZE_BYTES ?? '', 10) || (5 * 1024 * 1024);
const MIN_SIZE_BYTES = Number.parseInt(process.env.UPLOAD_MIN_SIZE_BYTES ?? '', 10) || 1024;

const ALLOWED_FORMATS = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp'
} as const satisfies AllowedFormats;

type MediaFormat = keyof typeof ALLOWED_FORMATS;

type MimeToFormatMap = Record<string, MediaFormat>;

const MIME_TO_FORMAT = Object.fromEntries(
    Object.entries(ALLOWED_FORMATS).map(([format, mime]) => [mime, format])
) as MimeToFormatMap;

// =============================================================================
// Helper Functions
// =============================================================================

const getBaseDirectory = () => DEFAULT_BASE_DIR;

const getVariantDirectory = (variant: MediaVariant) => path.join(getBaseDirectory(), variant);

const ensureDirectoryExists = (directoryPath: string) => {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }
};

const ensureStorageStructure = () => {
    ensureDirectoryExists(getBaseDirectory());
    VARIANTS.forEach((variant) => {
        ensureDirectoryExists(getVariantDirectory(variant));
    });
};

const sanitizeFilename = (filename?: string | null) => {
    const base = path.parse(filename ?? '').name || 'asset';
    return base
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 120) || 'asset';
};

const computeChecksum = (buffer: Buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const detectImageFormat = (buffer?: Buffer | null): MediaFormat | null => {
    if (!buffer || buffer.length < 12) {
        return null;
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buffer.slice(0, 8).equals(pngSignature)) {
        return 'png';
    }

    // WEBP: RIFF....WEBP
    if (
        buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
        buffer.slice(8, 12).toString('ascii') === 'WEBP'
    ) {
        return 'webp';
    }

    return null;
};

const assertValidVariant: (variant: string) => asserts variant is MediaVariant = (variant) => {
    if (!VARIANTS.includes(variant as MediaVariant)) {
        throw new ApiError(400, `Unsupported media variant: ${variant}`);
    }
};

const assertValidProductId = (productId: string) => {
    if (!validateUuid(productId)) {
        throw new ApiError(400, 'Invalid product identifier');
    }
};

type BufferValidationOptions = {
    enforceMin?: boolean;
};

const assertValidBuffer = (buffer: Buffer, { enforceMin = true }: BufferValidationOptions = {}) => {
    if (!Buffer.isBuffer(buffer)) {
        throw new ApiError(400, 'Uploaded payload must be a binary buffer');
    }

    if (buffer.length === 0) {
        throw new ApiError(400, 'Uploaded payload is empty');
    }

    if (enforceMin && buffer.length < MIN_SIZE_BYTES) {
        throw new ApiError(400, `File size must be at least ${MIN_SIZE_BYTES} bytes`);
    }

    if (buffer.length > MAX_SIZE_BYTES) {
        throw new ApiError(400, `File size must not exceed ${MAX_SIZE_BYTES} bytes`);
    }
};

type BuildFilenameInput = {
    productId: string;
    variant: MediaVariant;
    format: MediaFormat;
    sanitizedBase: string;
    checksum: string;
};

const buildFilename = ({ productId, variant, format, sanitizedBase, checksum }: BuildFilenameInput) => {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const checksumPrefix = checksum.slice(0, 12);
    return `${variant}-${productId}-${timestamp}-${checksumPrefix}-${sanitizedBase}.${format}`;
};

const toRelativeStoragePath = (absolutePath: string) => {
    const relative = path.relative(getBaseDirectory(), absolutePath);
    return relative.split(path.sep).join('/');
};

// =============================================================================
// Public API
// =============================================================================

type PersistMediaInput = {
    productId: string;
    buffer: Buffer;
    mimeType?: string | null;
    originalFilename?: string | null;
    variant?: MediaVariant;
};

type PersistMediaResult = {
    productId: string;
    variant: MediaVariant;
    format: MediaFormat;
    mimeType: string;
    storageDisk: string;
    storagePath: string;
    originalFilename: string | null;
    sanitizedFilename: string;
    sizeBytes: number;
    checksum: string;
};

const persistMedia = async ({
    productId,
    buffer,
    mimeType,
    originalFilename,
    variant = 'source'
}: PersistMediaInput): Promise<PersistMediaResult> => {
    assertValidProductId(productId);
    assertValidVariant(variant);
    const enforceMinimumSize = variant === 'source';
    assertValidBuffer(buffer, { enforceMin: enforceMinimumSize });

    const detectedFormat = detectImageFormat(buffer);
    if (!detectedFormat) {
        throw new ApiError(400, 'Unsupported or corrupted image payload');
    }

    if (mimeType && MIME_TO_FORMAT[mimeType] && MIME_TO_FORMAT[mimeType] !== detectedFormat) {
        throw new ApiError(400, 'MIME type does not match actual image format');
    }

    if (!ALLOWED_FORMATS[detectedFormat]) {
        throw new ApiError(400, `Image format not permitted: ${detectedFormat}`);
    }

    const sanitizedBase = sanitizeFilename(originalFilename);
    const checksum = computeChecksum(buffer);

    const productVariantDir = path.join(getVariantDirectory(variant), productId);
    await fsp.mkdir(productVariantDir, { recursive: true });

    const filename = buildFilename({
        productId,
        variant,
        format: detectedFormat,
        sanitizedBase,
        checksum
    });

    let absolutePath = path.join(productVariantDir, filename);

    try {
        await fsp.writeFile(absolutePath, buffer, { flag: 'wx' });
    } catch (error) {
        const errorCode = (error as { code?: string }).code;
        if (errorCode !== 'EEXIST') {
            throw error;
        }

        const randomSuffix = crypto.randomBytes(4).toString('hex');
        const altFilename = `${variant}-${productId}-${randomSuffix}-${sanitizedBase}.${detectedFormat}`;
        absolutePath = path.join(productVariantDir, altFilename);
        await fsp.writeFile(absolutePath, buffer, { flag: 'w' });
    }

    const storagePath = toRelativeStoragePath(absolutePath);
    const storedFilename = path.basename(absolutePath);

    return {
        productId,
        variant,
        format: detectedFormat,
        mimeType: ALLOWED_FORMATS[detectedFormat],
        storageDisk: process.env.UPLOAD_STORAGE_DISK || 'local',
        storagePath,
        originalFilename: originalFilename || null,
        sanitizedFilename: storedFilename,
        sizeBytes: buffer.length,
        checksum
    };
};

const deleteMedia = async (storagePath?: string | null) => {
    if (!storagePath) {
        return;
    }

    const absolutePath = path.join(getBaseDirectory(), storagePath);
    try {
        await fsp.rm(absolutePath, { force: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('[MediaStorage] Failed to delete media asset', {
            storagePath,
            error: message
        });
    }
};

const buildAbsolutePath = (storagePath: string) => path.join(getBaseDirectory(), storagePath);

const mediaStorage = {
    VARIANTS,
    ALLOWED_FORMATS,
    MAX_SIZE_BYTES,
    MIN_SIZE_BYTES,
    getBaseDirectory,
    ensureStorageStructure,
    persistMedia,
    deleteMedia,
    buildAbsolutePath,
    computeChecksum,
    detectImageFormat,
    sanitizeFilename
};

export = mediaStorage;
