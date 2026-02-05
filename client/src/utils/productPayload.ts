export type ProductCategory = {
  id?: string | null | undefined;
  name?: string | null | undefined;
};

export type ProductMedia = {
  url?: string | null;
  previewUrl?: string | null;
  localPath?: string | null;
  alt?: string | null;
  description?: string | null;
  isPrimary?: boolean;
  deletedAt?: string | null;
};

export type ProductRecord = {
  id?: string | undefined;
  name?: string | undefined;
  description?: string | null;
  categoryId?: string | null | undefined;
  categoryIds?: string[] | undefined;
  categories?: ProductCategory[];
  price?: number | string | null;
  currency?: string | null | undefined;
  status?: string | null | undefined;
  stockQuantity?: number | string | null;
  purchaseLimit?: number | string | null;
  lowStockThreshold?: number | string | null;
  allergens?: string | null;
  imageAlt?: string | null | undefined;
  metadata?: Record<string, unknown> | string | null;
  displayOrder?: number | string | null;
  isActive?: boolean;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
  deletedAt?: string | null | undefined;
  media?: ProductMedia[];
};

export type ProductFormState = {
  name: string;
  description: string;
  categoryId: string;
  categoryIds: string[];
  price: number | string;
  currency: string;
  status: string;
  stockQuantity: number;
  purchaseLimit: number;
  lowStockThreshold: number;
  allergens: string;
  imageAlt: string;
  metadata: string;
  displayOrder: number;
  isActive: boolean;
  imagePreviewUrl: string;
};

export type NormalizedProductPayload = {
  name?: string | undefined;
  description: string | null;
  categoryIds: string[];
  categoryId: string | null;
  price: number | null;
  currency: string;
  status: string;
  stockQuantity: number;
  purchaseLimit: number;
  lowStockThreshold: number;
  allergens: string | null;
  imageAlt: string | null;
  metadata: Record<string, unknown>;
  displayOrder: number;
  isActive: boolean;
};

const numberOrNull = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const intOrNull = (value: unknown): number | null => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const numeric = parseInt(String(value), 10);
  return Number.isNaN(numeric) ? null : numeric;
};

const parseMetadata = (value: unknown): Record<string, unknown> => {
  if (value === '' || value === null || value === undefined) {
    return {};
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  try {
    return JSON.parse(String(value)) as Record<string, unknown>;
  } catch {
    throw new Error('Metadata must be valid JSON');
  }
};

const extractPrimaryImageUrl = (product?: ProductRecord | null): string => {
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

export const normalizeProductPayload = (formValues: Partial<ProductFormState> & Record<string, unknown>): NormalizedProductPayload => {
  const metadata = parseMetadata(formValues.metadata);
  const normalizedCategoryIds = Array.isArray(formValues.categoryIds)
    ? Array.from(new Set(formValues.categoryIds.filter((id): id is string => Boolean(id))))
    : [];

  return {
    name: typeof formValues.name === 'string' ? formValues.name.trim() : undefined,
    description: typeof formValues.description === 'string' && formValues.description.trim()
      ? formValues.description.trim()
      : null,
    categoryIds: normalizedCategoryIds,
    categoryId: normalizedCategoryIds[0] || (typeof formValues.categoryId === 'string' ? formValues.categoryId : null) || null,
    price: numberOrNull(formValues.price),
    currency: typeof formValues.currency === 'string' && formValues.currency ? formValues.currency : 'EUR',
    status: typeof formValues.status === 'string' && formValues.status ? formValues.status : 'draft',
    stockQuantity: intOrNull(formValues.stockQuantity) ?? 0,
    purchaseLimit: intOrNull(formValues.purchaseLimit) ?? 50,
    lowStockThreshold: intOrNull(formValues.lowStockThreshold) ?? 10,
    allergens: typeof formValues.allergens === 'string' && formValues.allergens.trim() ? formValues.allergens.trim() : null,
    imageAlt: typeof formValues.imageAlt === 'string' && formValues.imageAlt.trim() ? formValues.imageAlt.trim() : null,
    metadata,
    displayOrder: intOrNull(formValues.displayOrder) ?? 0,
    isActive: Boolean(formValues.isActive)
  };
};

export const productToFormState = (product?: ProductRecord | null): ProductFormState => {
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
      imagePreviewUrl: '',
      categoryIds: []
    };
  }

  const existingCategoryIds = Array.isArray(product.categoryIds)
    ? product.categoryIds.filter((id): id is string => Boolean(id))
    : Array.isArray(product.categories)
      ? product.categories.map((category) => category.id).filter((id): id is string => Boolean(id))
      : [];

  return {
    name: product.name || '',
    description: product.description || '',
    categoryId: existingCategoryIds[0] || product.categoryId || '',
    categoryIds: existingCategoryIds,
    price: product.price ?? '',
    currency: product.currency || 'EUR',
    status: product.status || 'draft',
    stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : intOrNull(product.stockQuantity) ?? 0,
    purchaseLimit: typeof product.purchaseLimit === 'number' ? product.purchaseLimit : intOrNull(product.purchaseLimit) ?? 50,
    lowStockThreshold: typeof product.lowStockThreshold === 'number'
      ? product.lowStockThreshold
      : intOrNull(product.lowStockThreshold) ?? 10,
    allergens: product.allergens || '',
    imageAlt: product.imageAlt || '',
    metadata: JSON.stringify(product.metadata || {}, null, 2),
    displayOrder: typeof product.displayOrder === 'number' ? product.displayOrder : intOrNull(product.displayOrder) ?? 0,
    isActive: product.isActive !== false,
    imagePreviewUrl: extractPrimaryImageUrl(product)
  };
};

export const ensureMinimumProductShape = (product: ProductRecord): ProductRecord => {
  const categoryIds = Array.isArray(product.categoryIds)
    ? product.categoryIds.filter((id): id is string => Boolean(id))
    : product.categoryId
      ? [product.categoryId]
      : [];
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? null,
    categoryId: product.categoryId ?? categoryIds[0] ?? null,
    categoryIds,
    categories: Array.isArray(product.categories)
      ? product.categories.map((category) => ({
          id: category.id,
          name: category.name
        }))
      : categoryIds.map((id) => ({ id, name: null })),
    price: typeof product.price === 'number' ? product.price : numberOrNull(product.price),
    currency: product.currency || 'EUR',
    status: product.status || 'draft',
    stockQuantity: typeof product.stockQuantity === 'number' ? product.stockQuantity : intOrNull(product.stockQuantity) ?? 0,
    purchaseLimit: typeof product.purchaseLimit === 'number' ? product.purchaseLimit : intOrNull(product.purchaseLimit) ?? 50,
    lowStockThreshold: typeof product.lowStockThreshold === 'number'
      ? product.lowStockThreshold
      : intOrNull(product.lowStockThreshold) ?? 10,
    allergens: product.allergens ?? null,
    imageAlt: product.imageAlt ?? null,
    metadata: typeof product.metadata === 'object' && product.metadata !== null ? product.metadata : {},
    displayOrder: typeof product.displayOrder === 'number' ? product.displayOrder : intOrNull(product.displayOrder) ?? 0,
    isActive: product.isActive !== false,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
    deletedAt: product.deletedAt ?? null,
    media: Array.isArray(product.media) ? product.media : []
  };
};
