'use strict';

jest.mock('../services/statusService', () => ({
    getKioskStatus: jest.fn(),
    statusHasChanged: jest.fn()
}));

jest.mock('crypto', () => ({
    randomUUID: jest.fn()
}));

const flushAsync = () => new Promise((resolve) => setImmediate(resolve));

const createResponseMock = () => {
    const response = {
        write: jest.fn(),
        end: jest.fn(() => {
            response.writableEnded = true;
        }),
        writableEnded: false
    };

    return response;
};

const parseEvents = (res) => {
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
            const data = JSON.parse(dataLine.replace('data: ', ''));
            return { event, data };
        })
        .filter(Boolean);
};

describe('statusEvents', () => {
    let statusEvents;
    let statusService;
    let randomUUID;

    beforeEach(() => {
        jest.resetModules();

        statusService = require('../services/statusService');
        statusService.getKioskStatus.mockReset();
        statusService.statusHasChanged.mockReset();
        statusService.getKioskStatus.mockResolvedValue({
            status: 'open',
            message: 'Open for business'
        });
        statusService.statusHasChanged.mockReturnValue(false);

        ({ randomUUID } = require('crypto'));
        randomUUID.mockReset();
        let counter = 0;
        randomUUID.mockImplementation(() => {
            counter += 1;
            return `client-${counter}`;
        });

        statusEvents = require('../services/statusEvents');
    });

    afterEach(() => {
        jest.clearAllTimers();
    });

    it('sends the latest kiosk status to newly registered clients', async () => {
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response });

        expect(clientId).toBe('client-1');
        const events = parseEvents(response);
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe('status:init');
        expect(events[0].data).toMatchObject({ status: 'open', message: 'Open for business' });

        statusEvents.removeClient(clientId);
    });

    it('replays cached tracking and inventory updates to new clients', async () => {
        const firstClient = createResponseMock();
        const firstClientId = await statusEvents.registerClient({ res: firstClient });
        statusEvents.broadcastTrackingState({ enabled: true, emittedAt: '2025-05-05T10:00:00.000Z' });
        statusEvents.broadcastInventoryAvailability({
            productId: 'sku-123'
        });

        const secondClient = createResponseMock();
        const secondClientId = await statusEvents.registerClient({ res: secondClient });

        const events = parseEvents(secondClient);
        expect(events).toHaveLength(3);
        expect(events[0].event).toBe('status:init');
        expect(events[1].event).toBe('inventory:tracking');
        expect(events[1].data).toEqual({ enabled: true, emittedAt: '2025-05-05T10:00:00.000Z' });
        expect(events[2].event).toBe('inventory:update');
        expect(events[2].data).toMatchObject({
            productId: 'sku-123',
            stockStatus: 'unavailable',
            available: false
        });

        statusEvents.removeClient(firstClientId);
        statusEvents.removeClient(secondClientId);
    });

    it('normalizes inventory payloads before broadcasting to subscribers', async () => {
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response });
        response.write.mockClear();

        statusEvents.broadcastInventoryAvailability({
            productId: 'sku-321',
            stockQuantity: '5',
            lowStockThreshold: null,
            isLowStock: 'yes',
            isOutOfStock: 1,
            stockStatus: ' ',
            available: undefined
        });

        const events = parseEvents(response);
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe('inventory:update');

        const payload = events[0].data;
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
        const clientId = await statusEvents.registerClient({ res: response });
        response.write.mockClear();

        statusService.getKioskStatus.mockResolvedValueOnce(updatedStatus);
        statusEvents.triggerImmediateRefresh();
        await flushAsync();

        const events = parseEvents(response);
        expect(events).toHaveLength(1);
        expect(events[0].event).toBe('status:update');
        expect(events[0].data).toEqual(updatedStatus);

        statusEvents.removeClient(clientId);
    });

    it('closes the underlying response when removing a client', async () => {
        const response = createResponseMock();
        const clientId = await statusEvents.registerClient({ res: response });

        statusEvents.removeClient(clientId);

        expect(response.end).toHaveBeenCalledTimes(1);
        expect(response.writableEnded).toBe(true);
    });
});
