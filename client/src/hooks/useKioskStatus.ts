import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, API_BASE_URL } from '../services/apiClient.js';
import { readOfflineProductSnapshot, saveOfflineProductSnapshot, type OfflineStatusPayload } from '../utils/offlineCache.js';

const STATUS_QUERY_KEY = ['kiosk-status'];

export type KioskStatusPayload = Partial<OfflineStatusPayload>;

export type InventoryAvailabilityEntry = {
    productId: string;
    stockQuantity: number | null;
    lowStockThreshold: number | null;
    isLowStock: boolean;
    isOutOfStock: boolean;
    stockStatus: string;
    available: boolean;
    emittedAt: string;
};

export type UseKioskStatusOptions = {
    enabled?: boolean;
    sse?: boolean;
    refetchInterval?: number | false;
    staleTime?: number;
    retry?: number;
    reconnectDelayBase?: number;
};

type OfflineState = {
    status: KioskStatusPayload | null;
    statusFingerprint: string | null;
    inventoryTrackingEnabled: boolean;
    lastUpdatedAt: string | null;
    availabilityByProduct: Map<string, InventoryAvailabilityEntry>;
};

type StatusEventPayload = KioskStatusPayload & { generatedAt?: string | null };

type TrackingEventPayload = { enabled?: boolean };

type InventoryEventPayload = {
    productId: string;
    stockQuantity?: number;
    lowStockThreshold?: number;
    isLowStock?: boolean | number;
    isOutOfStock?: boolean | number;
    stockStatus?: string;
    available?: boolean;
    emittedAt?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const computeFingerprint = (payload?: KioskStatusPayload | null): string | null => {
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

const readOfflineState = (): OfflineState => {
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
        status: (snapshot.status as KioskStatusPayload) || null,
        statusFingerprint: snapshot.statusFingerprint || null,
        inventoryTrackingEnabled:
            typeof snapshot.inventoryTrackingEnabled === 'boolean'
                ? snapshot.inventoryTrackingEnabled
                : true,
        lastUpdatedAt: snapshot.lastUpdatedAt || snapshot.generatedAt || null,
        availabilityByProduct: new Map()
    };
};

const persistSnapshot = ({ status, statusFingerprint, inventoryTrackingEnabled }: { status: KioskStatusPayload | null; statusFingerprint?: string | null; inventoryTrackingEnabled: boolean; }) => {
    try {
        const existing = readOfflineProductSnapshot();
        const safeInventoryTracking =
            typeof inventoryTrackingEnabled === 'boolean'
                ? inventoryTrackingEnabled
                : typeof existing?.inventoryTrackingEnabled === 'boolean'
                    ? existing.inventoryTrackingEnabled
                    : true;

        saveOfflineProductSnapshot({
            products: existing?.products || [],
            generatedAt: existing?.generatedAt || new Date().toISOString(),
            source: existing?.source || 'offline',
            inventoryTrackingEnabled: safeInventoryTracking,
            status: (status ?? null) as OfflineStatusPayload | null,
            statusFingerprint:
                statusFingerprint ?? existing?.statusFingerprint ?? null
        });
    } catch (error) {
        console.warn('Unable to persist kiosk status snapshot', error);
    }
};

const buildStatusEventsUrl = (): string | null => {
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

const parseEventPayload = (event: MessageEvent<string>): unknown => {
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

const extractApiPayload = (response: unknown): KioskStatusPayload | null => {
    if (!isRecord(response)) {
        return response as KioskStatusPayload | null;
    }

    if (response.success === true && 'data' in response) {
        return response.data as KioskStatusPayload | null;
    }

    if ('data' in response) {
        const data = response.data;
        if (isRecord(data) || data === null) {
            return data as KioskStatusPayload | null;
        }
    }

    return response as KioskStatusPayload | null;
};

export const useKioskStatus = (options: UseKioskStatusOptions = {}) => {
    const offlineState = useMemo(() => readOfflineState(), []);
    const [status, setStatus] = useState<KioskStatusPayload | null>(offlineState.status);
    const [statusFingerprint, setStatusFingerprint] = useState<string | null>(offlineState.statusFingerprint);
    const [inventoryTrackingEnabled, setInventoryTrackingEnabled] = useState(offlineState.inventoryTrackingEnabled);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(offlineState.lastUpdatedAt);
    const availabilityRef = useRef(offlineState.availabilityByProduct);
    const [availabilityVersion, setAvailabilityVersion] = useState(0);
    const [connectionState, setConnectionState] = useState('idle');
    const reconnectTimerRef = useRef<number | null>(null);
    const retryAttemptRef = useRef(0);
    const eventSourceRef = useRef<EventSource | null>(null);

    const applyStatusPayload = useCallback((payload: StatusEventPayload | null, source = 'poll') => {
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
    }, [inventoryTrackingEnabled, statusFingerprint]);

    const applyTrackingPayload = useCallback((payload: TrackingEventPayload | null) => {
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
    }, [status, statusFingerprint]);

    const applyInventoryAvailability = useCallback((payload: InventoryEventPayload | null) => {
        if (!payload || !payload.productId) {
            return;
        }
        const current = availabilityRef.current instanceof Map ? availabilityRef.current : new Map();
        const nextEntry: InventoryAvailabilityEntry = {
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
    }, []);

    const reconnectDelayBase = options.reconnectDelayBase ?? 2000;

    const startEventStream = useCallback(() => {
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

        const handleStatusEvent = (event: MessageEvent<string>) => {
            const payload = parseEventPayload(event) as StatusEventPayload | null;
            if (payload) {
                applyStatusPayload(payload, 'sse');
            }
        };

        const handleTrackingEvent = (event: MessageEvent<string>) => {
            const payload = parseEventPayload(event) as TrackingEventPayload | null;
            if (payload) {
                applyTrackingPayload(payload);
            }
        };

        const handleInventoryEvent = (event: MessageEvent<string>) => {
            const payload = parseEventPayload(event) as InventoryEventPayload | null;
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
            const delay = Math.min(30000, reconnectDelayBase * attempt);
            reconnectTimerRef.current = window.setTimeout(() => {
                reconnectTimerRef.current = null;
                startEventStream();
            }, delay);
        };
    }, [applyInventoryAvailability, applyStatusPayload, applyTrackingPayload, reconnectDelayBase]);

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
    }, [options.sse, startEventStream]);

    const fetchStatus = async ({ signal }: { signal?: AbortSignal }) => {
        const response = await apiRequest<unknown>({ path: '/status/kiosk', method: 'GET', signal });
        return extractApiPayload(response);
    };

    const statusQuery = useQuery<KioskStatusPayload | null>({
        queryKey: STATUS_QUERY_KEY,
        queryFn: ({ signal }) => fetchStatus({ signal }),
        enabled: options.enabled !== false,
        refetchInterval: options.refetchInterval ?? 45000,
        staleTime: options.staleTime ?? 30000,
        retry: options.retry ?? 1,
        initialData: offlineState.status ?? null
    });

    useEffect(() => {
        if (statusQuery.data) {
            applyStatusPayload(statusQuery.data as StatusEventPayload | null, 'poll');
        }
    }, [applyStatusPayload, statusQuery.data]);

    const inventoryAvailability = useMemo(() => {
        const source = availabilityRef.current instanceof Map ? availabilityRef.current : null;
        if (!source || source.size === 0) {
            return {} as Record<string, InventoryAvailabilityEntry>;
        }
        const snapshot: Record<string, InventoryAvailabilityEntry> = {};
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
