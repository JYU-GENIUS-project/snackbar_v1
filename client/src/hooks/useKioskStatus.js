import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, API_BASE_URL } from '../services/apiClient.js';
import { readOfflineProductSnapshot, saveOfflineProductSnapshot } from '../utils/offlineCache.js';

const STATUS_QUERY_KEY = ['kiosk-status'];

const computeFingerprint = (payload) => {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    try {
        return JSON.stringify([
            payload.status,
            payload.reason,
            payload.message,
            payload.nextOpen,
            payload.nextClose,
            payload?.maintenance?.enabled,
            payload?.maintenance?.message
        ]);
    } catch (error) {
        console.warn('Failed to compute status fingerprint', error);
        return null;
    }
};

const readOfflineState = () => {
    const snapshot = readOfflineProductSnapshot();
    if (!snapshot) {
        return {
            status: null,
            statusFingerprint: null,
            inventoryTrackingEnabled: true,
            lastUpdatedAt: null,
            availabilityByProduct: new Map()
        };
    }

    return {
        status: snapshot.status || null,
        statusFingerprint: snapshot.statusFingerprint || null,
        inventoryTrackingEnabled:
            typeof snapshot.inventoryTrackingEnabled === 'boolean'
                ? snapshot.inventoryTrackingEnabled
                : true,
        lastUpdatedAt: snapshot.lastUpdatedAt || snapshot.generatedAt || null,
        availabilityByProduct: new Map()
    };
};

const persistSnapshot = ({ status, statusFingerprint, inventoryTrackingEnabled }) => {
    try {
        const existing = readOfflineProductSnapshot();
        saveOfflineProductSnapshot({
            products: existing?.products || [],
            generatedAt: existing?.generatedAt || new Date().toISOString(),
            source: existing?.source || 'offline',
            inventoryTrackingEnabled:
                typeof inventoryTrackingEnabled === 'boolean'
                    ? inventoryTrackingEnabled
                    : existing?.inventoryTrackingEnabled,
            status,
            statusFingerprint:
                statusFingerprint !== undefined ? statusFingerprint : existing?.statusFingerprint
        });
    } catch (error) {
        console.warn('Unable to persist kiosk status snapshot', error);
    }
};

const buildStatusEventsUrl = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const base = API_BASE_URL || '/api';
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const path = `${normalizedBase}/status/events`;
    if (/^https?:/i.test(normalizedBase)) {
        return path;
    }
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
};

const parseEventPayload = (event) => {
    if (!event?.data) {
        return null;
    }
    try {
        return JSON.parse(event.data);
    } catch (error) {
        console.warn('Unable to parse kiosk status SSE payload', error);
        return null;
    }
};

export const useKioskStatus = (options = {}) => {
    const offlineState = useMemo(() => readOfflineState(), []);
    const [status, setStatus] = useState(offlineState.status);
    const [statusFingerprint, setStatusFingerprint] = useState(offlineState.statusFingerprint);
    const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(
        offlineState.inventoryTrackingEnabled
    );
    const [lastUpdatedAt, setLastUpdatedAt] = useState(offlineState.lastUpdatedAt);
    const availabilityRef = useRef(offlineState.availabilityByProduct);
    const [availabilityVersion, setAvailabilityVersion] = useState(0);
    const [connectionState, setConnectionState] = useState('idle');
    const reconnectTimerRef = useRef(null);
    const retryAttemptRef = useRef(0);
    const eventSourceRef = useRef(null);

    const applyStatusPayload = (payload, source = 'poll') => {
        if (!payload || typeof payload !== 'object') {
            return;
        }
        setStatus(payload);
        const nextFingerprint = computeFingerprint(payload);
        if (nextFingerprint) {
            setStatusFingerprint(nextFingerprint);
        }
        setLastUpdatedAt(payload.generatedAt || new Date().toISOString());
        persistSnapshot({
            status: payload,
            statusFingerprint: nextFingerprint || statusFingerprint,
            inventoryTrackingEnabled
        });
        if (source === 'sse') {
            retryAttemptRef.current = 0;
        }
    };

    const applyTrackingPayload = (payload) => {
        if (!payload || typeof payload !== 'object') {
            return;
        }
        const enabled = payload.enabled !== false;
        setInventoryTrackingEnabled(enabled);
        persistSnapshot({
            status,
            statusFingerprint,
            inventoryTrackingEnabled: enabled
        });
    };

    const applyInventoryAvailability = (payload) => {
        if (!payload || !payload.productId) {
            return;
        }
        const current = availabilityRef.current instanceof Map ? availabilityRef.current : new Map();
        const nextEntry = {
            productId: payload.productId,
            stockQuantity:
                typeof payload.stockQuantity === 'number' && Number.isFinite(payload.stockQuantity)
                    ? payload.stockQuantity
                    : null,
            lowStockThreshold:
                typeof payload.lowStockThreshold === 'number' && Number.isFinite(payload.lowStockThreshold)
                    ? payload.lowStockThreshold
                    : null,
            isLowStock: Boolean(payload.isLowStock),
            isOutOfStock: Boolean(payload.isOutOfStock),
            stockStatus:
                typeof payload.stockStatus === 'string' && payload.stockStatus.trim()
                    ? payload.stockStatus
                    : 'unavailable',
            available: payload.available !== undefined ? Boolean(payload.available) : !payload.isOutOfStock,
            emittedAt: payload.emittedAt || new Date().toISOString()
        };
        current.set(payload.productId, nextEntry);
        availabilityRef.current = current;
        setAvailabilityVersion((version) => version + 1);
    };

    const startEventStream = () => {
        if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
            setConnectionState('unsupported');
            return;
        }
        const eventsUrl = buildStatusEventsUrl();
        if (!eventsUrl) {
            setConnectionState('unsupported');
            return;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        setConnectionState('connecting');
        const eventSource = new EventSource(eventsUrl, { withCredentials: true });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setConnectionState('connected');
            retryAttemptRef.current = 0;
        };

        const handleStatusEvent = (event) => {
            const payload = parseEventPayload(event);
            if (payload) {
                applyStatusPayload(payload, 'sse');
            }
        };

        const handleTrackingEvent = (event) => {
            const payload = parseEventPayload(event);
            if (payload) {
                applyTrackingPayload(payload);
            }
        };

        const handleInventoryEvent = (event) => {
            const payload = parseEventPayload(event);
            if (payload) {
                applyInventoryAvailability(payload);
            }
        };

        eventSource.addEventListener('status:init', handleStatusEvent);
        eventSource.addEventListener('status:update', handleStatusEvent);
        eventSource.addEventListener('inventory:tracking', handleTrackingEvent);
        eventSource.addEventListener('inventory:update', handleInventoryEvent);

        eventSource.onerror = () => {
            setConnectionState('disconnected');
            eventSource.close();
            eventSourceRef.current = null;
            const attempt = retryAttemptRef.current + 1;
            retryAttemptRef.current = attempt;
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
            }
            const delay = Math.min(30000, (options.reconnectDelayBase || 2000) * attempt);
            reconnectTimerRef.current = window.setTimeout(() => {
                reconnectTimerRef.current = null;
                startEventStream();
            }, delay);
        };
    };

    useEffect(() => {
        if (options.sse !== false) {
            startEventStream();
        }
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (reconnectTimerRef.current) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };
        // intentionally omit dependencies to avoid re-creating stream unnecessarily
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStatus = async ({ signal }) => {
        const response = await apiRequest({ path: '/status/kiosk', method: 'GET', signal });
        return response?.success ? response.data : response;
    };

    const statusQuery = useQuery({
        queryKey: STATUS_QUERY_KEY,
        queryFn: ({ signal }) => fetchStatus({ signal }),
        enabled: options.enabled !== false,
        refetchInterval: options.refetchInterval ?? 45000,
        staleTime: options.staleTime ?? 30000,
        retry: options.retry ?? 1,
        onSuccess: (payload) => applyStatusPayload(payload, 'poll'),
        initialData: offlineState.status || undefined
    });

    const inventoryAvailability = useMemo(() => {
        const version = availabilityVersion;
        const source = availabilityRef.current instanceof Map ? availabilityRef.current : null;
        if (!source || source.size === 0) {
            return version > 0 ? {} : {};
        }
        const snapshot = {};
        source.forEach((value, key) => {
            snapshot[key] = value;
        });
        return snapshot;
    }, [availabilityVersion]);

    return {
        status,
        statusFingerprint,
        inventoryTrackingEnabled,
        inventoryAvailability,
        lastUpdatedAt,
        connectionState,
        isLoading: statusQuery.isLoading && !status,
        isFetching: statusQuery.isFetching,
        error: statusQuery.error,
        refetch: statusQuery.refetch
    };
};

export default useKioskStatus;
