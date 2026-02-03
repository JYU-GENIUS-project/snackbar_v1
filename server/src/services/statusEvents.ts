'use strict';

import { randomUUID } from 'crypto';
import type { Response } from 'express';

import statusService from './statusService';

type ClientContext = {
    adminId?: string | null;
    username?: string | null;
};

type ClientEntry = {
    res: Response;
    context?: ClientContext;
};

type InventoryAvailabilityPayload = {
    productId?: string;
    stockQuantity?: number | null;
    lowStockThreshold?: number | null;
    isLowStock?: boolean;
    isOutOfStock?: boolean;
    stockStatus?: string;
    available?: boolean;
    emittedAt?: string;
};

type TrackingStatePayload = {
    enabled?: boolean;
    emittedAt?: string;
};

type StatusPayload = Record<string, unknown> | null;

type TrackingState = {
    enabled: boolean;
    emittedAt: string;
};

type InventorySnapshot = {
    productId: string;
    stockQuantity: number | null;
    lowStockThreshold: number | null;
    isLowStock: boolean;
    isOutOfStock: boolean;
    stockStatus: string;
    available: boolean;
    emittedAt: string;
};

const EVENT_TYPES = {
    STATUS_INIT: 'status:init',
    STATUS_UPDATE: 'status:update',
    INVENTORY_UPDATE: 'inventory:update',
    TRACKING_UPDATE: 'inventory:tracking'
} as const;

const POLL_INTERVAL_MS = 5000;
const KEEP_ALIVE_INTERVAL_MS = 15000;

const clients = new Map<string, ClientEntry>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let latestStatus: StatusPayload = null;
let latestTrackingState: TrackingState | null = null;
const latestInventorySnapshots = new Map<string, InventorySnapshot>();
let evaluating = false;

const writeEvent = (res: Response, type: string, payload?: unknown) => {
    const data = payload === undefined ? {} : payload;
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
};

const removeClient = (id: string) => {
    const client = clients.get(id);
    if (client && client.res && !client.res.writableEnded) {
        try {
            client.res.end();
        } catch (error) {
            console.error('[StatusEvents] Error while closing SSE connection', { id, error });
        }
    }
    clients.delete(id);

    if (!clients.size) {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
        }
    }
};

const broadcastToClients = (type: string, payload?: unknown) => {
    const serialized = JSON.stringify(payload === undefined ? {} : payload);
    for (const [id, client] of clients.entries()) {
        try {
            client.res.write(`event: ${type}\ndata: ${serialized}\n\n`);
        } catch (error) {
            console.error('[StatusEvents] Failed to notify client, removing subscription', { id, error });
            removeClient(id);
        }
    }
};

const broadcastStatus = (status: StatusPayload) => {
    latestStatus = status;
    broadcastToClients(EVENT_TYPES.STATUS_UPDATE, status);
};

const broadcastInventoryAvailability = (payload: InventoryAvailabilityPayload) => {
    if (!payload || !payload.productId) {
        return;
    }

    const normalized: InventorySnapshot = {
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
        stockStatus: typeof payload.stockStatus === 'string' && payload.stockStatus.trim() ? payload.stockStatus : 'unavailable',
        available: payload.available !== undefined ? Boolean(payload.available) : false,
        emittedAt: payload.emittedAt || new Date().toISOString()
    };

    latestInventorySnapshots.set(normalized.productId, normalized);
    broadcastToClients(EVENT_TYPES.INVENTORY_UPDATE, normalized);
};

const broadcastTrackingState = (payload: TrackingStatePayload) => {
    const state: TrackingState = {
        enabled: Boolean(payload?.enabled),
        emittedAt: payload?.emittedAt || new Date().toISOString()
    };

    latestTrackingState = state;
    broadcastToClients(EVENT_TYPES.TRACKING_UPDATE, state);
};

const evaluateAndBroadcast = async (force = false) => {
    if (evaluating) {
        return;
    }

    evaluating = true;
    try {
        const status = await statusService.getKioskStatus();
        if (force || statusService.statusHasChanged(latestStatus as never, status as never)) {
            broadcastStatus(status as StatusPayload);
        }
    } catch (error) {
        console.error('[StatusEvents] Failed to evaluate kiosk status', error);
    } finally {
        evaluating = false;
    }
};

const ensurePollTimer = () => {
    if (pollTimer || clients.size === 0) {
        return;
    }

    pollTimer = setInterval(() => {
        void evaluateAndBroadcast(false);
    }, POLL_INTERVAL_MS);

    if (typeof pollTimer.unref === 'function') {
        pollTimer.unref();
    }
};

const ensureKeepAlive = () => {
    if (keepAliveTimer || clients.size === 0) {
        return;
    }

    keepAliveTimer = setInterval(() => {
        for (const [id, client] of clients.entries()) {
            try {
                client.res.write(': keep-alive\n\n');
            } catch (error) {
                console.error('[StatusEvents] Failed to send keep-alive, removing client', { id, error });
                removeClient(id);
            }
        }

        if (clients.size === 0) {
            if (keepAliveTimer) {
                clearInterval(keepAliveTimer);
                keepAliveTimer = null;
            }
            if (pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        }
    }, KEEP_ALIVE_INTERVAL_MS);

    if (typeof keepAliveTimer.unref === 'function') {
        keepAliveTimer.unref();
    }
};

const registerClient = async ({ res }: { res: Response }) => {
    const id = randomUUID();
    clients.set(id, { res });

    try {
        const status = (latestStatus || (await statusService.getKioskStatus())) as StatusPayload;
        latestStatus = status;
        writeEvent(res, EVENT_TYPES.STATUS_INIT, status);
        if (latestTrackingState) {
            writeEvent(res, EVENT_TYPES.TRACKING_UPDATE, latestTrackingState);
        }
        for (const snapshot of latestInventorySnapshots.values()) {
            writeEvent(res, EVENT_TYPES.INVENTORY_UPDATE, snapshot);
        }
    } catch (error) {
        console.error('[StatusEvents] Failed to send initial status payload', error);
    }

    ensurePollTimer();
    ensureKeepAlive();
    return id;
};

const triggerImmediateRefresh = () => {
    void evaluateAndBroadcast(true);
};

const statusEvents = {
    EVENT_TYPES,
    registerClient,
    removeClient,
    triggerImmediateRefresh,
    broadcastInventoryAvailability,
    broadcastTrackingState
};

export = statusEvents;
