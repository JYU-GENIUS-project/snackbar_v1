const OFFLINE_FEED_STORAGE_KEY = 'snackbar-offline-products';

export const saveOfflineProductSnapshot = (snapshot) => {
    try {
        if (typeof window === 'undefined' || !window?.localStorage) {
            return;
        }
        if (!snapshot || typeof snapshot !== 'object') {
            return;
        }
        window.localStorage.setItem(OFFLINE_FEED_STORAGE_KEY, JSON.stringify(snapshot));
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
        return parsed;
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
