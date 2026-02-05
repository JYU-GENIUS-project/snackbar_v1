import { randomUUID } from 'crypto';
import type { Response } from 'express';

type ClientContext = {
    adminId?: string | null;
    username?: string | null;
};

type ClientEntry = {
    res: Response;
    context?: ClientContext;
};

type InventorySnapshotPayload = Record<string, unknown>;

type InventoryBroadcastPayload = {
    snapshot: InventorySnapshotPayload;
    context?: ClientContext;
};

type TrackingBroadcastPayload = {
    enabled: boolean;
    actor?: { id: string; username: string } | null;
};

const EVENT_TYPES = {
    INVENTORY_CHANGED: 'inventory:update',
    TRACKING_CHANGED: 'inventory:tracking'
} as const;

const KEEP_ALIVE_INTERVAL_MS = 15000;

const clients = new Map<string, ClientEntry>();
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

const ensureKeepAliveTimer = () => {
    if (keepAliveTimer) {
        return;
    }

    keepAliveTimer = setInterval(() => {
        for (const client of clients.values()) {
            try {
                client.res.write(': keep-alive\n\n');
            } catch (error) {
                console.error('[InventoryEvents] Failed to send keep-alive', error);
            }
        }
    }, KEEP_ALIVE_INTERVAL_MS);

    if (typeof keepAliveTimer.unref === 'function') {
        keepAliveTimer.unref();
    }
};

const registerClient = ({ res, context }: { res: Response; context?: ClientContext }) => {
    const id = randomUUID();
    if (context) {
        clients.set(id, { res, context });
    } else {
        clients.set(id, { res });
    }
    ensureKeepAliveTimer();
    return id;
};

const removeClient = (id: string) => {
    const client = clients.get(id);
    if (client && client.res && !client.res.writableEnded) {
        try {
            client.res.end();
        } catch (error) {
            console.error('[InventoryEvents] Failed to close SSE response', error);
        }
    }
    clients.delete(id);

    if (clients.size === 0 && keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
    }
};

const broadcast = ({ type, data }: { type: string; data: unknown }) => {
    const payload = JSON.stringify(data ?? {});
    for (const [id, client] of clients.entries()) {
        try {
            client.res.write(`event: ${type}\ndata: ${payload}\n\n`);
        } catch (error) {
            console.error('[InventoryEvents] Failed to write event, removing client', { id, error });
            removeClient(id);
        }
    }
};

const broadcastInventoryChange = ({ snapshot, context }: InventoryBroadcastPayload) => {
    broadcast({
        type: EVENT_TYPES.INVENTORY_CHANGED,
        data: {
            snapshot,
            context,
            emittedAt: new Date().toISOString()
        }
    });
};

const broadcastTrackingChange = ({ enabled, actor }: TrackingBroadcastPayload) => {
    broadcast({
        type: EVENT_TYPES.TRACKING_CHANGED,
        data: {
            enabled,
            actor: actor ? { id: actor.id, username: actor.username } : null,
            emittedAt: new Date().toISOString()
        }
    });
};

const inventoryEvents = {
    EVENT_TYPES,
    registerClient,
    removeClient,
    broadcastInventoryChange,
    broadcastTrackingChange
};

export = inventoryEvents;
