// Shared domain contracts used by client and server.

export type SnackbarEntityId = string;

export type CurrencyCode = string;

export type ProductStatus = 'draft' | 'active' | 'archived';

export type InventoryStockStatus = 'available' | 'low-stock' | 'unavailable' | 'unknown';

export type AdminUser = {
    id: SnackbarEntityId;
    username: string;
    email?: string | null;
    isPrimary?: boolean;
    isActive?: boolean;
    lastLoginAt?: string | null;
    createdAt?: string;
    updatedAt?: string | null;
};

export type Category = {
    id: SnackbarEntityId;
    name: string;
    description: string | null;
    displayOrder: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    productCount?: number;
};

export type CategorySummary = Pick<Category, 'id' | 'name' | 'description' | 'displayOrder' | 'isActive'>;

export type ProductMedia = {
    id?: SnackbarEntityId;
    productId?: SnackbarEntityId;
    variant?: string;
    format?: string;
    storageDisk?: string;
    storagePath?: string;
    originalFilename?: string | null;
    sanitizedFilename?: string;
    mimeType?: string;
    sizeBytes?: number;
    checksum?: string;
    width?: number | null;
    height?: number | null;
    createdAt?: string;
    updatedAt?: string | null;
};

export type Product = {
    id: SnackbarEntityId;
    name: string;
    description: string | null;
    price: number | null;
    currency: CurrencyCode | null;
    status: ProductStatus;
    stockQuantity: number | null;
    purchaseLimit: number | null;
    lowStockThreshold: number | null;
    allergens: string | null;
    imageAlt: string | null;
    metadata: Record<string, unknown>;
    displayOrder: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    categoryId: SnackbarEntityId | null;
    categoryIds: SnackbarEntityId[];
    categories: CategorySummary[];
    media: ProductMedia[];
};

export type ProductFeedItem = Omit<Product, 'createdAt' | 'deletedAt'> & {
    available: boolean;
    isLowStock: boolean;
    isOutOfStock: boolean;
    stockStatus: InventoryStockStatus;
    updatedAt: string;
    primaryMedia?: ProductMedia | null;
};

export type InventorySnapshot = {
    productId: SnackbarEntityId;
    name: string;
    currentStock: number;
    lowStockThreshold: number;
    lowStock: boolean;
    negativeStock: boolean;
    discrepancyTotal: number;
    lastActivityAt: string | null;
    isActive: boolean;
    deletedAt: string | null;
};

export type InventoryTrackingState = {
    enabled: boolean;
    emittedAt: string;
};

export type KioskStatus = {
    status: string;
    reason?: string | null;
    message?: string | null;
    nextOpen?: string | null;
    nextClose?: string | null;
    timezone?: string | null;
    maintenance?: {
        enabled: boolean;
        message?: string | null;
        since?: string | null;
    };
    operatingWindow?: {
        start: string;
        end: string;
        days: number[];
    } | null;
    windows?: Array<{
        start: string;
        end: string;
        days: number[];
    }>;
    generatedAt?: string;
};
