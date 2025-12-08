const path = require('path');
const fsp = require('fs/promises');

describe('mediaStorage utility', () => {
  const tmpRoot = path.join(__dirname, '__tmp_storage');
  let mediaStorage;

  const samplePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAHElEQVQoU2NkYGD4z0AEYBxVSFUBqWakAQCQrBqJqFMB9wAAAABJRU5ErkJggg==',
    'base64'
  );

  beforeAll(async () => {
    process.env.UPLOADS_DIR = tmpRoot;
    process.env.UPLOAD_MIN_SIZE_BYTES = '10';
    jest.resetModules();
    mediaStorage = require('../utils/mediaStorage');
    mediaStorage.ensureStorageStructure();
  });

  afterAll(async () => {
    await fsp.rm(tmpRoot, { recursive: true, force: true });
    delete process.env.UPLOADS_DIR;
    delete process.env.UPLOAD_MIN_SIZE_BYTES;
  });

  it('creates segregated variant directories', async () => {
    for (const variant of mediaStorage.VARIANTS) {
      const variantDir = path.join(tmpRoot, variant);
      const stat = await fsp.stat(variantDir);
      expect(stat.isDirectory()).toBe(true);
    }
  });

  it('persists media with sanitized filenames and checksum metadata', async () => {
    const productId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

    const result = await mediaStorage.persistMedia({
      productId,
      buffer: samplePng,
      mimeType: 'image/png',
      originalFilename: 'Red Bull!!.PNG',
      variant: 'source'
    });

    expect(result.storagePath).toMatch(`source/${productId}`);
    expect(result.mimeType).toBe('image/png');
    expect(result.sanitizedFilename).toMatch(/source-3fa85f64/);
    expect(result.checksum).toHaveLength(64);

    const absolutePath = mediaStorage.buildAbsolutePath(result.storagePath);
    const fileStat = await fsp.stat(absolutePath);
    expect(fileStat.size).toBe(samplePng.length);

    // Clean up file explicitly to keep temp directory small
    await mediaStorage.deleteMedia(result.storagePath);
  });

  it('rejects unsupported variants', async () => {
    const productId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

    await expect(
      mediaStorage.persistMedia({
        productId,
        buffer: samplePng,
        variant: 'preview'
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
