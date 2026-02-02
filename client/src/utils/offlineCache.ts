export type OfflineStatusPayload = {
    status: string;
    reason: string | null;
    message: string | null;
    nextOpen: string | null;
    nextClose: string | null;
    maintenance: {
        enabled: boolean;
        message: string | null;
        since: string | null;
    };
    timezone: string | null;
    generatedAt: string;
    windows: unknown[];
};

export type OfflineProductSnapshot = {
    products: unknown[];
    generatedAt: string;
    source: string;
    inventoryTrackingEnabled: boolean;
    statusFingerprint: string | null;
    status: OfflineStatusPayload | null;
    lastUpdatedAt: string;
};

const OFFLINE_FEED_STORAGE_KEY = 'snackbar-offline-products';

const sanitizeBoolean = (value: unknown, fallback = true): boolean => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.toLowerCase() === 'true') {
            return true;
        }
        if (value.toLowerCase() === 'false') {
            return false;
        }
    }
    if (typeof value === 'number') {
        return value !== 0;
    }
    return fallback;
};

const sanitizeStatusPayload = (input: unknown): OfflineStatusPayload | null => {
    if (!input || typeof input !== 'object') {
        return null;
    }

    const candidate = input as Record<string, any>;
    const statusValue = typeof candidate.status === 'string' && candidate.status.trim() ? candidate.status.trim() : 'unknown';
    return {
        status: statusValue,
        reason: typeof candidate.reason === 'string' ? candidate.reason : null,
        message: typeof candidate.message === 'string' ? candidate.message : null,
        nextOpen: typeof candidate.nextOpen === 'string' ? candidate.nextOpen : null,
        nextClose: typeof candidate.nextClose === 'string' ? candidate.nextClose : null,
        maintenance: {
            enabled: sanitizeBoolean(candidate?.maintenance?.enabled, false),
            message: typeof candidate?.maintenance?.message === 'string' ? candidate.maintenance.message : null,
            since: typeof candidate?.maintenance?.since === 'string' ? candidate.maintenance.since : null
        },
        timezone: typeof candidate.timezone === 'string' ? candidate.timezone : null,
        generatedAt: typeof candidate.generatedAt === 'string' ? candidate.generatedAt : new Date().toISOString(),
        windows: Array.isArray(candidate.windows) ? candidate.windows : []
    };
};

export const saveOfflineProductSnapshot = (snapshot: Partial<OfflineProductSnapshot> | null | undefined): void => {
    try {
        if (typeof window === 'undefined' || !window?.localStorage) {
            return;
        }
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }
        const payload: OfflineProductSnapshot = {
            products: Array.isArray(snapshot.products) ? snapshot.products : [],
            generatedAt: typeof snapshot.generatedAt === 'string' ? snapshot.generatedAt : new Date().toISOString(),
            source: snapshot.source || 'offline',
            inventoryTrackingEnabled: sanitizeBoolean(snapshot.inventoryTrackingEnabled, true),
            statusFingerprint: typeof snapshot.statusFingerprint === 'string' ? snapshot.statusFingerprint : null,
            status: sanitizeStatusPayload(snapshot.status),
            lastUpdatedAt: new Date().toISOString()
        };
        window.localStorage.setItem(OFFLINE_FEED_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('Unable to persist offline product snapshot', error);
    }
};

export const readOfflineProductSnapshot = (): OfflineProductSnapshot | null => {
    try {
        if (typeof window === 'undefined' || !window?.localStorage) {
            return null;
        }
        const raw = window.localStorage.getItem(OFFLINE_FEED_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw) as OfflineProductSnapshot | null;
        if (!parsed || !Array.isArray(parsed.products)) {
            return null;
        }
        return {
            ...parsed,
            inventoryTrackingEnabled: sanitizeBoolean(parsed.inventoryTrackingEnabled, true),
            statusFingerprint: typeof parsed.statusFingerprint === 'string' ? parsed.statusFingerprint : null,
            status: sanitizeStatusPayload(parsed.status)
        };
    } catch (error) {
        console.warn('Unable to read offline product snapshot', error);
        return null;
    }
};

export const clearOfflineProductSnapshot = (): void => {
    try {
        if (typeof window === 'undefined' || !window?.localStorage) {
            return;
        }
        window.localStorage.removeItem(OFFLINE_FEED_STORAGE_KEY);
    } catch (error) {
        console.warn('Unable to clear offline product snapshot', error);
    }
};

export { OFFLINE_FEED_STORAGE_KEY };
