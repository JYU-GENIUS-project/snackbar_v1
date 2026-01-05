// =============================================================================
// Image Processing Worker
// =============================================================================
// Generates optimized image renditions (WebP/JPEG) for product media uploads.
// Utilizes Sharp for resizing, compression, and EXIF stripping before delegating
// persistence to the media storage utility.
// =============================================================================

const { ApiError } = require('../middleware/errorHandler');
const mediaStorageDefault = require('../utils/mediaStorage');

const VARIANT_PROFILE = Object.freeze({
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

const createImageProcessor = ({ sharpLib, storage } = {}) => {
  // Lazy load sharp so tests can inject a mock without having the native dependency.
  const sharp = sharpLib || require('sharp');
  const mediaStorage = storage || mediaStorageDefault;

  const validateInput = ({ productId, buffer }) => {
    if (!productId) {
      throw new ApiError(400, 'Product identifier is required for media processing');
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new ApiError(400, 'Product media payload must be a binary buffer');
    }
  };

  const buildPipeline = (inputBuffer, resizeOptions) => {
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
  }) => {
    const pipeline = buildPipeline(buffer, resizeOptions);

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

    const record = {
      ...persisted,
      variant: variantKey,
      format: formatKey,
      width: info.width,
      height: info.height,
      sizeBytes: data.length
    };

    if (onPersist) {
      onPersist(record);
    }

    return record;
  };

  const processProductImage = async ({ productId, buffer, mimeType, originalFilename }) => {
    validateInput({ productId, buffer });

    const persistedFiles = [];
    const recordPersist = (record) => {
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
      recordPersist({ ...source, variant: 'source', format: source.format });

      const tasks = [];

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
        persistedFiles.map((file) =>
          mediaStorage.deleteMedia(file.storagePath).catch(() => undefined)
        )
      );

      throw error;
    }
  };

  return {
    processProductImage,
    variantProfile: VARIANT_PROFILE
  };
};

let defaultProcessor;

const getDefaultProcessor = () => {
  if (!defaultProcessor) {
    defaultProcessor = createImageProcessor();
  }

  return defaultProcessor;
};

const processProductImage = (...args) =>
  getDefaultProcessor().processProductImage(...args);

module.exports = {
  createImageProcessor,
  variantProfile: VARIANT_PROFILE,
  processProductImage
};
