export type KioskEventPayload = Record<string, unknown>;

export type KioskEvent = {
    name: string;
    payload: KioskEventPayload;
    timestamp: string;
    channel: 'kiosk';
};

declare global {
    interface Window {
        __SNACKBAR_KIOSK_EVENTS__?: KioskEvent[];
    }
}

const GLOBAL_EVENT_BUFFER_KEY = '__SNACKBAR_KIOSK_EVENTS__';

const buildEvent = (eventName: string, payload?: KioskEventPayload): KioskEvent => ({
    name: eventName,
    payload: payload || {},
    timestamp: new Date().toISOString(),
    channel: 'kiosk'
});

const pushToBuffer = (event: KioskEvent): boolean => {
    if (typeof window === 'undefined') {
        return false;
    }

    const existing = Array.isArray(window[GLOBAL_EVENT_BUFFER_KEY]) ? window[GLOBAL_EVENT_BUFFER_KEY] : [];
    existing.push(event);
    window[GLOBAL_EVENT_BUFFER_KEY] = existing;
    return true;
};

export const logKioskEvent = (eventName?: string, payload?: KioskEventPayload): void => {
    if (!eventName) {
        return;
    }

    try {
        const event = buildEvent(eventName, payload);
        const endpoint = import.meta?.env?.VITE_KIOSK_ANALYTICS_ENDPOINT;

        if (endpoint && typeof navigator !== 'undefined') {
            const body = JSON.stringify(event);
            if (typeof navigator.sendBeacon === 'function') {
                const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
                if (sent) {
                    return;
                }
            } else if (typeof fetch === 'function' && typeof AbortController === 'function') {
                const controller = new AbortController();
                const timeoutId = typeof window !== 'undefined'
                    ? window.setTimeout(() => controller.abort(), 1500)
                    : undefined;
                fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    keepalive: true,
                    signal: controller.signal
                }).finally(() => {
                    if (typeof window !== 'undefined' && timeoutId) {
                        window.clearTimeout(timeoutId);
                    }
                });
                return;
            }
        }

        pushToBuffer(event);

        if (import.meta?.env?.DEV) {
            console.info('[kiosk-event]', event);
        }
    } catch (error) {
        if (import.meta?.env?.DEV) {
            console.warn('Failed to log kiosk event', error);
        }
    }
};
