export type InventoryCacheItem = Record<string, unknown> & {
    productId?: string;
    product_id?: string;
    id?: string;
    name?: string;
    currentStock?: number;
    current_stock?: number;
    lowStockThreshold?: number | null;
    low_stock_threshold?: number | null;
    lowStock?: boolean;
    low_stock?: boolean;
    discrepancyTotal?: number;
    discrepancy_total?: number;
    ledger_balance?: number;
    negativeStock?: boolean;
    negative_stock?: boolean;
};

const INVENTORY_CACHE_KEY = 'snackbar-inventory-cache';

const cloneItemsCollection = (items?: InventoryCacheItem[] | null): InventoryCacheItem[] => {
    if (!Array.isArray(items)) {
        return [];
    }
    return items.map((item) => ({ ...item }));
};

export const readInventoryCache = (): InventoryCacheItem[] | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.sessionStorage.getItem(INVENTORY_CACHE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as InventoryCacheItem[] | null;
        return Array.isArray(parsed) ? cloneItemsCollection(parsed) : null;
    } catch (error) {
        console.warn('[inventoryCache] Failed to read cached inventory snapshot', error);
        return null;
    }
};

export const writeInventoryCache = (items?: InventoryCacheItem[] | null): void => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        if (!Array.isArray(items) || items.length === 0) {
            window.sessionStorage.removeItem(INVENTORY_CACHE_KEY);
            return;
        }
        window.sessionStorage.setItem(INVENTORY_CACHE_KEY, JSON.stringify(items));
    } catch (error) {
        console.warn('[inventoryCache] Failed to persist inventory snapshot cache', error);
    }
};

export const modifyInventoryCache = (
    updater: InventoryCacheItem[] | ((items: InventoryCacheItem[]) => InventoryCacheItem[])
): InventoryCacheItem[] => {
    const current = readInventoryCache() ?? [];
    const nextValue = typeof updater === 'function' ? updater(cloneItemsCollection(current)) : updater;
    const normalized = cloneItemsCollection(nextValue);
    writeInventoryCache(normalized);
    return normalized;
};

export const updateInventoryCacheItem = (
    productId: string,
    updater: InventoryCacheItem | ((item: InventoryCacheItem) => InventoryCacheItem | null | undefined)
): void => {
    if (!productId) {
        return;
    }
    modifyInventoryCache((items) => {
        let matchFound = false;
        const nextItems = items.map((item) => {
            const matches =
                item.productId === productId ||
                item.product_id === productId ||
                item.id === productId ||
                item.name === productId;
            if (!matches) {
                return item;
            }
            matchFound = true;
            const updated = typeof updater === 'function' ? updater({ ...item }) : item;
            return updated ?? item;
        });

        if (!matchFound && typeof updater === 'function') {
            const seededItem = updater({
                productId,
                name: productId,
                currentStock: 0,
                current_stock: 0,
                lowStockThreshold: null,
                low_stock_threshold: null,
                lowStock: false,
                low_stock: false,
                discrepancyTotal: 0,
                discrepancy_total: 0,
                ledger_balance: 0,
                negativeStock: false,
                negative_stock: false
            });
            if (seededItem) {
                nextItems.push(seededItem);
            }
        }

        return nextItems;
    });
};

export const resetInventoryCache = (): void => {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.sessionStorage.removeItem(INVENTORY_CACHE_KEY);
    } catch (error) {
        console.warn('[inventoryCache] Failed to reset inventory cache', error);
    }
};

export { cloneItemsCollection };
