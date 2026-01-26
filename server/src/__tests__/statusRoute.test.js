'use strict';

const express = require('express');
const request = require('supertest');

jest.mock('../services/statusService', () => ({
  getKioskStatus: jest.fn()
}));

jest.mock('../services/statusEvents', () => ({
  registerClient: jest.fn()
}));

const statusService = require('../services/statusService');
const statusEvents = require('../services/statusEvents');
const statusRouter = require('../routes/status');

describe('status routes', () => {
  let app;

  beforeEach(() => {
    statusService.getKioskStatus.mockReset();
    statusEvents.registerClient.mockReset();

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
    };

    statusService.getKioskStatus.mockResolvedValue(kioskStatus);

    const response = await request(app).get('/api/status/kiosk');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(kioskStatus);
    expect(statusService.getKioskStatus).toHaveBeenCalledWith({});
  });

  it('initializes an SSE stream and registers the client', async () => {
    statusEvents.registerClient.mockImplementation(async ({ res }) => {
      res.write('event: status:init\ndata: {}\n\n');
      res.end();
      return 'client-1';
    });

    const response = await request(app).get('/api/status/events');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers.connection).toBe('keep-alive');
    expect(response.text).toContain(': connected');
    expect(response.text).toContain('event: status:init');

    expect(statusEvents.registerClient).toHaveBeenCalledTimes(1);
    const args = statusEvents.registerClient.mock.calls[0][0];
    expect(args).toHaveProperty('res');
    expect(typeof args.res.write).toBe('function');
  });
});
