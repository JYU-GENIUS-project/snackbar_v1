'use strict';

jest.mock('../utils/database', () => ({
  query: jest.fn()
}));

const db = require('../utils/database');

process.env.KIOSK_TIMEZONE = 'UTC';
const statusService = require('../services/statusService');

const mockOperatingHours = (value) => {
  return {
    rows: [
      {
        value: JSON.stringify(value)
      }
    ]
  };
};

const mockMaintenance = (value) => {
  return {
    rows: [
      {
        value: JSON.stringify(value)
      }
    ]
  };
};

const mockQueryImplementation = ({ operatingHours, maintenance }) => {
  db.query.mockImplementation((text, params) => {
    if (params[0] === 'operating_hours') {
      if (operatingHours) {
        return Promise.resolve(mockOperatingHours(operatingHours));
      }
      return Promise.resolve({ rows: [] });
    }

    if (params[0] === 'maintenance_mode') {
      if (maintenance !== undefined) {
        return Promise.resolve(mockMaintenance(maintenance));
      }
      return Promise.resolve({ rows: [] });
    }

    return Promise.resolve({ rows: [] });
  });
};

const DEFAULT_OPERATING = {
  start: '08:00',
  end: '18:00',
  days: [1, 2, 3, 4, 5]
};

describe('statusService.getKioskStatus', () => {
  const originalEnv = process.env.KIOSK_TIMEZONE;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-05-05T10:00:00Z'));
    db.query.mockReset();
    process.env.KIOSK_TIMEZONE = 'UTC';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    process.env.KIOSK_TIMEZONE = originalEnv;
  });

  it('returns maintenance status when maintenance mode is enabled', async () => {
    mockQueryImplementation({
      operatingHours: DEFAULT_OPERATING,
      maintenance: {
        enabled: true,
        message: 'Maintenance in progress'
      }
    });

    const status = await statusService.getKioskStatus();

    expect(status.status).toBe('maintenance');
    expect(status.message).toContain('Maintenance');
    expect(status.nextOpen).toBeNull();
  });

  it('returns open status during configured operating hours', async () => {
    mockQueryImplementation({
      operatingHours: DEFAULT_OPERATING,
      maintenance: {
        enabled: false
      }
    });

    const status = await statusService.getKioskStatus();

    expect(status.status).toBe('open');
    expect(status.reason).toBe('operational');
    expect(status.nextClose).toBe('2025-05-05T18:00:00.000Z');
  });

  it('returns closed status before opening time with next open timestamp', async () => {
    jest.setSystemTime(new Date('2025-05-05T06:30:00Z'));
    mockQueryImplementation({
      operatingHours: DEFAULT_OPERATING,
      maintenance: {
        enabled: false
      }
    });

    const status = await statusService.getKioskStatus();

    expect(status.status).toBe('closed');
    expect(status.reason).toBe('outside-operating-hours');
    expect(status.message).toContain('Closed');
    expect(status.nextOpen).toBe('2025-05-05T08:00:00.000Z');
  });
});
