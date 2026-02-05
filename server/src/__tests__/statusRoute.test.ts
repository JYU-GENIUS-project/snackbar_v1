'use strict';

import express from 'express';
import request from 'supertest';

import statusRouter from '../routes/status';
import statusEvents from '../services/statusEvents';
import statusService from '../services/statusService';

jest.mock('../services/statusService', () => ({
    __esModule: true,
    default: {
        getKioskStatus: jest.fn()
    }
}));

jest.mock('../services/statusEvents', () => ({
    __esModule: true,
    default: {
        registerClient: jest.fn(),
        removeClient: jest.fn()
    }
}));

const mockedStatusService = statusService as jest.Mocked<typeof statusService>;
const mockedStatusEvents = statusEvents as jest.Mocked<typeof statusEvents>;

type KioskStatus = Awaited<ReturnType<typeof statusService.getKioskStatus>>;

describe('status routes', () => {
    let app: express.Express;

    beforeEach(() => {
        mockedStatusService.getKioskStatus.mockReset();
        mockedStatusEvents.registerClient.mockReset();
        mockedStatusEvents.removeClient.mockReset();

        app = express();
        app.use('/api/status', statusRouter);
    });

    it('returns kiosk status payload from service layer', async () => {
        const kioskStatus = {
            status: 'open',
            reason: 'operational',
            message: '🟢 Open - Closes at 18:00',
            nextClose: '2025-05-05T18:00:00.000Z',
            nextOpen: null,
            timezone: 'UTC'
        } as KioskStatus;

        mockedStatusService.getKioskStatus.mockResolvedValue(kioskStatus);

        const response = await request(app).get('/api/status/kiosk');
        const body = response.body as { success: boolean; data: KioskStatus };

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toEqual(kioskStatus);
        expect(mockedStatusService.getKioskStatus).toHaveBeenCalledWith({});
    });

    it('initializes an SSE stream and registers the client', async () => {
        mockedStatusEvents.registerClient.mockImplementation(({ res }: { res: { write: (chunk: string) => void; end: () => void } }) => {
            res.write('event: status:init\ndata: {}\n\n');
            res.end();
            return Promise.resolve('3fa85f64-5717-4562-b3fc-2c963f66afa6');
        });

        const response = await request(app).get('/api/status/events');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/event-stream');
        expect(response.headers['cache-control']).toBe('no-cache');
        expect(response.headers.connection).toBe('keep-alive');
        expect(response.text).toContain(': connected');
        expect(response.text).toContain('event: status:init');

        expect(mockedStatusEvents.registerClient).toHaveBeenCalledTimes(1);
        const [call] = mockedStatusEvents.registerClient.mock.calls;
        expect(call).toBeDefined();
        const args = call?.[0];
        if (!args) {
            throw new Error('Expected registerClient to be called');
        }
        expect(args).toHaveProperty('res');
        expect(typeof args.res.write).toBe('function');
    });
});
