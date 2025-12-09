const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const intOrNull = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const numeric = parseInt(value, 10);
  return Number.isNaN(numeric) ? null : numeric;
};

const parseMetadata = (value) => {
  if (value === '' || value === null || value === undefined) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error('Metadata must be valid JSON');
  }
};

const extractPrimaryImageUrl = (product) => {
  if (!product || !Array.isArray(product.media)) {
    return '';
  }

  const activeMedia = product.media.filter((item) => !item.deletedAt);
  const primary = activeMedia.find((item) => item.isPrimary && item.url);
  if (primary?.url) {
    return primary.url;
  }

  const fallback = activeMedia.find((item) => item.url);
  return fallback?.url || '';
};

export const normalizeProductPayload = (formValues) => {
  const metadata = parseMetadata(formValues.metadata);

  return {
    name: formValues.name?.trim(),
    description: formValues.description?.trim() || null,
    categoryId: formValues.categoryId || null,
    price: numberOrNull(formValues.price),
    currency: formValues.currency || 'EUR',
    status: formValues.status || 'draft',
    stockQuantity: intOrNull(formValues.stockQuantity) ?? 0,
    purchaseLimit: intOrNull(formValues.purchaseLimit) ?? 50,
    lowStockThreshold: intOrNull(formValues.lowStockThreshold) ?? 10,
    allergens: formValues.allergens?.trim() || null,
    imageAlt: formValues.imageAlt?.trim() || null,
    metadata,
    displayOrder: intOrNull(formValues.displayOrder) ?? 0,
    isActive: Boolean(formValues.isActive)
  };
};

export const productToFormState = (product) => {
  if (!product) {
    return {
      name: '',
      description: '',
      categoryId: '',
      price: '',
      currency: 'EUR',
      status: 'draft',
      stockQuantity: 0,
      purchaseLimit: 50,
      lowStockThreshold: 10,
      allergens: '',
      imageAlt: '',
      metadata: '{}',
      displayOrder: 0,
      isActive: true,
      imagePreviewUrl: ''
    };
  }

  return {
    name: product.name || '',
    description: product.description || '',
    categoryId: product.categoryId || '',
    price: product.price ?? '',
    currency: product.currency || 'EUR',
    status: product.status || 'draft',
    stockQuantity: product.stockQuantity ?? 0,
    purchaseLimit: product.purchaseLimit ?? 50,
    lowStockThreshold: product.lowStockThreshold ?? 10,
    allergens: product.allergens || '',
    imageAlt: product.imageAlt || '',
    metadata: JSON.stringify(product.metadata || {}, null, 2),
    displayOrder: product.displayOrder ?? 0,
    isActive: product.isActive !== false,
    imagePreviewUrl: extractPrimaryImageUrl(product)
  };
};

export const ensureMinimumProductShape = (product) => {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    categoryId: product.categoryId ?? null,
    price: typeof product.price === 'number' ? product.price : numberOrNull(product.price),
    currency: product.currency || 'EUR',
    status: product.status || 'draft',
    stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : intOrNull(product.stockQuantity) ?? 0,
    purchaseLimit: typeof product.purchaseLimit === 'number' ? product.purchaseLimit : intOrNull(product.purchaseLimit) ?? 50,
    lowStockThreshold: typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : intOrNull(product.lowStockThreshold) ?? 10,
    allergens: product.allergens ?? null,
    imageAlt: product.imageAlt ?? null,
    metadata: product.metadata || {},
    displayOrder: typeof product.displayOrder === 'number' ? product.displayOrder : intOrNull(product.displayOrder) ?? 0,
    isActive: product.isActive !== false,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
    deletedAt: product.deletedAt ?? null,
    media: Array.isArray(product.media) ? product.media : []
  };
};
