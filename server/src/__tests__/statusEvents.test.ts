"use strict";

import type { Response } from 'express';

jest.mock('../services/statusService', () => ({
    getKioskStatus: jest.fn(),
    statusHasChanged: jest.fn()
}));

jest.mock('crypto', () => ({
    randomUUID: jest.fn()
}));

type ResponseMock = {
    write: jest.Mock<void, [string]>;
    end: jest.Mock<void, []>;
    writableEnded: boolean;
};

const flushAsync = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const createResponseMock = (): ResponseMock => {
    const response: ResponseMock = {
        write: jest.fn<void, [string]>(),
        end: jest.fn<void, []>(() => {
            response.writableEnded = true;
        }),
        writableEnded: false
    };

    return response;
};

const parseEvents = (res: ResponseMock): Array<{ event: string; data: unknown }> => {
    return res.write.mock.calls
        .map(([chunk]) => {
            const trimmed = typeof chunk === 'string' ? chunk.trim() : '';
            if (!trimmed.startsWith('event:')) {
                return null;
            }
            const lines = trimmed.split('\n');
            const eventLine = lines.find((line) => line.startsWith('event:'));
            const dataLine = lines.find((line) => line.startsWith('data:'));
            if (!eventLine || !dataLine) {
                return null;
            }
            const event = eventLine.replace('event: ', '').trim();
            const data = JSON.parse(dataLine.replace('data: ', '')) as unknown;
            return { event, data };
        })
        .filter((event): event is { event: string; data: unknown } => Boolean(event));
};

describe('statusEvents', () => {
    let statusEvents: typeof import('../services/statusEvents');
    let statusService: { getKioskStatus: jest.Mock; statusHasChanged: jest.Mock };
    let randomUUID: jest.Mock<string, []>;

    beforeEach(async () => {
        jest.resetModules();

        const statusServiceModule = await import('../services/statusService');
        statusService = statusServiceModule.default as unknown as { getKioskStatus: jest.Mock; statusHasChanged: jest.Mock };
        statusService.getKioskStatus.mockReset();
        statusService.statusHasChanged.mockReset();
        statusService.getKioskStatus.mockResolvedValue({
            status: 'open',
            message: 'Open for business'
        });
        statusService.statusHasChanged.mockReturnValue(false);

        const cryptoModule = (await import('crypto')) as unknown as { randomUUID: jest.Mock<string, []> };
        randomUUID = cryptoModule.randomUUID;
        randomUUID.mockReset();
        let counter = 0;
        randomUUID.mockImplementation(() => {
            counter += 1;
            return `client-${counter}`;
        });

        const statusEventsModule = await import('../services/statusEvents');
        statusEvents = statusEventsModule as unknown as typeof import('../services/statusEvents');
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    it('sends the latest kiosk status to newly registered clients', async () => {
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response as unknown as Response });

        expect(clientId).toBe('client-1');
        const events = parseEvents(response);
        expect(events).toHaveLength(1);
        const [firstEvent] = events;
        expect(firstEvent?.event).toBe('status:init');
        expect(firstEvent?.data).toMatchObject({ status: 'open', message: 'Open for business' });

        statusEvents.removeClient(clientId);
    });

    it('replays cached tracking and inventory updates to new clients', async () => {
        const firstClient = createResponseMock();
        const firstClientId = await statusEvents.registerClient({ res: firstClient as unknown as Response });
        statusEvents.broadcastTrackingState({ enabled: true, emittedAt: '2025-05-05T10:00:00.000Z' });
        statusEvents.broadcastInventoryAvailability({
            productId: 'sku-123'
        } as Parameters<typeof statusEvents.broadcastInventoryAvailability>[0]);

        const secondClient = createResponseMock();
        const secondClientId = await statusEvents.registerClient({ res: secondClient as unknown as Response });

        const events = parseEvents(secondClient);
        expect(events).toHaveLength(3);
        const [initEvent, trackingEvent, inventoryEvent] = events;
        expect(initEvent?.event).toBe('status:init');
        expect(trackingEvent?.event).toBe('inventory:tracking');
        expect(trackingEvent?.data).toEqual({ enabled: true, emittedAt: '2025-05-05T10:00:00.000Z' });
        expect(inventoryEvent?.event).toBe('inventory:update');
        expect(inventoryEvent?.data).toMatchObject({
            productId: 'sku-123',
            stockStatus: 'unavailable',
            available: false
        });

        statusEvents.removeClient(firstClientId);
        statusEvents.removeClient(secondClientId);
    });

    it('normalizes inventory payloads before broadcasting to subscribers', async () => {
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response as unknown as Response });
        response.write.mockClear();

        statusEvents.broadcastInventoryAvailability({
            productId: 'sku-321',
            stockQuantity: '5',
            lowStockThreshold: null,
            isLowStock: 'yes',
            isOutOfStock: 1,
            stockStatus: ' ',
            available: undefined
        } as unknown as Parameters<typeof statusEvents.broadcastInventoryAvailability>[0]);

        const events = parseEvents(response);
        expect(events).toHaveLength(1);
        const [inventoryEvent] = events;
        expect(inventoryEvent?.event).toBe('inventory:update');

        const payload = inventoryEvent?.data as {
            productId: string;
            stockQuantity: number | null;
            lowStockThreshold: number | null;
            isLowStock: boolean;
            isOutOfStock: boolean;
            stockStatus: string;
            available: boolean;
            emittedAt: string;
        };
        expect(payload.productId).toBe('sku-321');
        expect(payload.stockQuantity).toBeNull();
        expect(payload.lowStockThreshold).toBeNull();
        expect(payload.isLowStock).toBe(true);
        expect(payload.isOutOfStock).toBe(true);
        expect(payload.stockStatus).toBe('unavailable');
        expect(payload.available).toBe(false);
        expect(typeof payload.emittedAt).toBe('string');
        expect(Number.isNaN(Date.parse(payload.emittedAt))).toBe(false);

        statusEvents.removeClient(clientId);
    });

    it('triggers an immediate status broadcast when requested', async () => {
        const initialStatus = { status: 'open', message: 'Initial' };
        const updatedStatus = { status: 'closed', message: 'Closed for the day' };

        statusService.getKioskStatus.mockResolvedValueOnce(initialStatus);
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response as unknown as Response });
        response.write.mockClear();

        statusService.getKioskStatus.mockResolvedValueOnce(updatedStatus);
        statusEvents.triggerImmediateRefresh();
        await flushAsync();

        const events = parseEvents(response);
        expect(events).toHaveLength(1);
        const [updateEvent] = events;
        expect(updateEvent?.event).toBe('status:update');
        expect(updateEvent?.data).toEqual(updatedStatus);

        statusEvents.removeClient(clientId);
    });

    it('closes the underlying response when removing a client', async () => {
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response as unknown as Response });

        statusEvents.removeClient(clientId);

        expect(response.end).toHaveBeenCalledTimes(1);
        expect(response.writableEnded).toBe(true);
    });
});
