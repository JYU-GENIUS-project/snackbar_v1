// =============================================================================
// Media Storage Utility
// =============================================================================
// Handles secure media persistence for product assets, including
// directory initialization, filename sanitization, validation, and checksum
// calculation. Designed to support subsequent image processing pipelines.
// =============================================================================

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { validate: validateUuid } = require('uuid');

const { ApiError } = require('../middleware/errorHandler');

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_BASE_DIR = path.resolve(
  process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads')
);

const VARIANTS = Object.freeze(['source', 'display', 'thumbnail']);

const MAX_SIZE_BYTES = parseInt(process.env.UPLOAD_MAX_SIZE_BYTES, 10) || (5 * 1024 * 1024);
const MIN_SIZE_BYTES = parseInt(process.env.UPLOAD_MIN_SIZE_BYTES, 10) || 1024;

const ALLOWED_FORMATS = Object.freeze({
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
});

const MIME_TO_FORMAT = Object.fromEntries(
  Object.entries(ALLOWED_FORMATS).map(([format, mime]) => [mime, format])
);

// =============================================================================
// Helper Functions
// =============================================================================

const getBaseDirectory = () => DEFAULT_BASE_DIR;

const getVariantDirectory = (variant) => path.join(getBaseDirectory(), variant);

const ensureDirectoryExists = (directoryPath) => {
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

const sanitizeFilename = (filename) => {
  const base = path.parse(filename ?? '').name || 'asset';
  return base
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'asset';
};

const computeChecksum = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

const detectImageFormat = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

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

const assertValidVariant = (variant) => {
  if (!VARIANTS.includes(variant)) {
    throw new ApiError(400, `Unsupported media variant: ${variant}`);
  }
};

const assertValidProductId = (productId) => {
  if (!validateUuid(productId)) {
    throw new ApiError(400, 'Invalid product identifier');
  }
};

const assertValidBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new ApiError(400, 'Uploaded payload must be a binary buffer');
  }

  if (buffer.length < MIN_SIZE_BYTES) {
    throw new ApiError(400, `File size must be at least ${MIN_SIZE_BYTES} bytes`);
  }

  if (buffer.length > MAX_SIZE_BYTES) {
    throw new ApiError(400, `File size must not exceed ${MAX_SIZE_BYTES} bytes`);
  }
};

const buildFilename = ({ productId, variant, format, sanitizedBase, checksum }) => {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const checksumPrefix = checksum.slice(0, 12);
  return `${variant}-${productId}-${timestamp}-${checksumPrefix}-${sanitizedBase}.${format}`;
};

const toRelativeStoragePath = (absolutePath) => {
  const relative = path.relative(getBaseDirectory(), absolutePath);
  return relative.split(path.sep).join('/');
};

// =============================================================================
// Public API
// =============================================================================

const persistMedia = async ({
  productId,
  buffer,
  mimeType,
  originalFilename,
  variant = 'source'
}) => {
  assertValidProductId(productId);
  assertValidVariant(variant);
  assertValidBuffer(buffer);

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
    if (error.code !== 'EEXIST') {
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

const deleteMedia = async (storagePath) => {
  if (!storagePath) return;

  const absolutePath = path.join(getBaseDirectory(), storagePath);
  try {
    await fsp.rm(absolutePath, { force: true });
  } catch (error) {
    console.warn('[MediaStorage] Failed to delete media asset', {
      storagePath,
      error: error.message
    });
  }
};

const buildAbsolutePath = (storagePath) => path.join(getBaseDirectory(), storagePath);

module.exports = {
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
