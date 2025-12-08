const { createImageProcessor, variantProfile } = require('../services/imageProcessor');

const createSharpMock = (buffers) => {
  const queue = [...buffers];

  return jest.fn().mockImplementation(() => {
    const response = queue.shift() || {
      data: Buffer.from('default'),
      info: { width: 100, height: 100 }
    };

    return {
      rotate: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      removeAlpha: jest.fn().mockReturnThis(),
      toFormat: jest.fn().mockImplementation((format) => ({
        toBuffer: jest.fn().mockResolvedValue({
          data: response.data || Buffer.from(`${format}-buffer`),
          info: response.info || { width: 100, height: 100 }
        })
      }))
    };
  });
};

const createStorageMock = () => {
  const persistMedia = jest.fn().mockImplementation(async ({ variant, mimeType }) => ({
    storagePath: `${variant}/${mimeType}`,
    variant,
    format: mimeType && mimeType.includes('webp') ? 'webp' : 'jpeg',
    checksum: 'checksum'
  }));

  const deleteMedia = jest.fn().mockResolvedValue();

  return {
    persistMedia,
    deleteMedia,
    ALLOWED_FORMATS: { webp: 'image/webp', jpeg: 'image/jpeg', png: 'image/png' }
  };
};

describe('imageProcessor service', () => {
  it('generates renditions for each variant and format', async () => {
    const storageMock = createStorageMock();
    const buffers = Array.from({ length: Object.keys(variantProfile).length * 2 }, (_, idx) => ({
      data: Buffer.from(`mock-${idx}`),
      info: { width: 800 - idx * 10, height: 600 - idx * 10 }
    }));

    const sharpMock = createSharpMock(buffers);
    const processor = createImageProcessor({ sharpLib: sharpMock, storage: storageMock });

    const productId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
    const payload = Buffer.from('original-image');

    const result = await processor.processProductImage({
      productId,
      buffer: payload,
      mimeType: 'image/png',
      originalFilename: 'example.png'
    });

    const expectedPersistCalls = 1 + Object.keys(variantProfile).length * 2; // source + each format
    expect(storageMock.persistMedia).toHaveBeenCalledTimes(expectedPersistCalls);

    const variants = result.files.filter((file) => file.variant !== 'source');
    expect(variants).toHaveLength(expectedPersistCalls - 1);
    variants.forEach((variant) => {
      expect(['display', 'thumbnail']).toContain(variant.variant);
      expect(['webp', 'jpeg']).toContain(variant.format);
      expect(variant.width).toBeGreaterThan(0);
      expect(variant.height).toBeGreaterThan(0);
    });

    expect(storageMock.deleteMedia).not.toHaveBeenCalled();
  });

  it('cleans up persisted media when processing fails', async () => {
    const storageMock = createStorageMock();
    storageMock.persistMedia
      .mockResolvedValueOnce({ storagePath: 'source/path', variant: 'source', format: 'png' })
      .mockResolvedValueOnce({ storagePath: 'display/webp', variant: 'display', format: 'webp' })
      .mockImplementationOnce(() => {
        throw new Error('write failure');
      });

    const sharpMock = createSharpMock([
      { data: Buffer.from('display-webp'), info: { width: 800, height: 600 } },
      { data: Buffer.from('display-jpeg'), info: { width: 800, height: 600 } }
    ]);

    const processor = createImageProcessor({ sharpLib: sharpMock, storage: storageMock });

    await expect(
      processor.processProductImage({
        productId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        buffer: Buffer.from('original-image'),
        mimeType: 'image/png',
        originalFilename: 'example.png'
      })
    ).rejects.toThrow('write failure');

    expect(storageMock.deleteMedia).toHaveBeenCalledWith('source/path');
    expect(storageMock.deleteMedia).toHaveBeenCalledWith('display/webp');
  });
});
