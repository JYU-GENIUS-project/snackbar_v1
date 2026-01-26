const OFFLINE_FEED_STORAGE_KEY = 'snackbar-offline-products';

const sanitizeBoolean = (value, fallback = true) => {
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

const sanitizeStatusPayload = (input) => {
    if (!input || typeof input !== 'object') {
        return null;
    }

    const statusValue = typeof input.status === 'string' && input.status.trim() ? input.status.trim() : 'unknown';
    return {
        status: statusValue,
        reason: typeof input.reason === 'string' ? input.reason : null,
        message: typeof input.message === 'string' ? input.message : null,
        nextOpen: typeof input.nextOpen === 'string' ? input.nextOpen : null,
        nextClose: typeof input.nextClose === 'string' ? input.nextClose : null,
        maintenance: {
            enabled: sanitizeBoolean(input?.maintenance?.enabled, false),
            message: typeof input?.maintenance?.message === 'string' ? input.maintenance.message : null,
            since: typeof input?.maintenance?.since === 'string' ? input.maintenance.since : null
        },
        timezone: typeof input.timezone === 'string' ? input.timezone : null,
        generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : new Date().toISOString(),
        windows: Array.isArray(input.windows) ? input.windows : []
    };
};

export const saveOfflineProductSnapshot = (snapshot) => {
    try {
        if (typeof window === 'undefined' || !window?.localStorage) {
            return;
        }
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }
        const payload = {
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

export const readOfflineProductSnapshot = () => {
    try {
        if (typeof window === 'undefined' || !window?.localStorage) {
            return null;
        }
        const raw = window.localStorage.getItem(OFFLINE_FEED_STORAGE_KEY);
        if (!raw) {
            return null;
        }
        const parsed = JSON.parse(raw);
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

export const clearOfflineProductSnapshot = () => {
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
