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

describe('statusService.getOperatingHoursConfig', () => {
    beforeEach(() => {
        db.query.mockReset();
        process.env.KIOSK_TIMEZONE = 'UTC';
    });

    it('falls back to default timezone when configuration provides an invalid zone', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        db.query.mockResolvedValueOnce(
            mockOperatingHours({
                timezone: 'Mars/OlympusMons',
                start: '09:00',
                end: '17:00',
                days: [1, 2, 3, 4, 5]
            })
        );

        const config = await statusService.getOperatingHoursConfig();

        expect(config.timezone).toBe('UTC');
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('sanitizes malformed operating windows back to defaults', async () => {
        db.query.mockResolvedValueOnce(
            mockOperatingHours({
                start: '27:90',
                end: 'aa:bb',
                days: ['foo'],
                windows: [
                    {
                        start: '99:00',
                        end: '10:61',
                        days: [0, 8]
                    }
                ]
            })
        );

        const config = await statusService.getOperatingHoursConfig();

        expect(config.windows).toHaveLength(1);
        expect(config.windows[0].start).toBe('08:00');
        expect(config.windows[0].end).toBe('18:00');
        expect(config.windows[0].days).toEqual([1, 2, 3, 4, 5]);
    });
});

describe('statusService.getMaintenanceState', () => {
    beforeEach(() => {
        db.query.mockReset();
    });

    it('returns defaults when no maintenance configuration is stored', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const maintenance = await statusService.getMaintenanceState();

        expect(maintenance.enabled).toBe(false);
        expect(maintenance.message).toContain('System Under Maintenance');
        expect(maintenance.since).toBeNull();
    });
});

describe('statusService.statusHasChanged', () => {
    it('compares status fingerprints to detect meaningful changes', () => {
        const baseStatus = {
            status: 'open',
            reason: 'operational',
            message: 'Open',
            nextOpen: null,
            nextClose: '2025-05-05T18:00:00.000Z',
            maintenance: {
                enabled: false,
                message: 'All good'
            }
        };

        expect(statusService.statusHasChanged(baseStatus, { ...baseStatus })).toBe(false);

        const updated = {
            ...baseStatus,
            message: 'Closing soon'
        };

        expect(statusService.statusHasChanged(baseStatus, updated)).toBe(true);
    });
});

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

    it('treats overnight operating windows as a continuous open period', async () => {
        jest.setSystemTime(new Date('2025-05-05T23:30:00Z'));
        mockQueryImplementation({
            operatingHours: {
                timezone: 'UTC',
                windows: [
                    {
                        start: '22:00',
                        end: '02:00',
                        days: [1, 2, 3, 4, 5]
                    }
                ]
            },
            maintenance: {
                enabled: false
            }
        });

        const status = await statusService.getKioskStatus();

        expect(status.status).toBe('open');
        expect(status.nextClose).toBe('2025-05-06T02:00:00.000Z');
        expect(status.message).toContain('Closes at');
    });

    it('looks ahead to the next operating day when closed for the weekend', async () => {
        jest.setSystemTime(new Date('2025-05-10T10:00:00Z'));
        mockQueryImplementation({
            operatingHours: {
                timezone: 'UTC',
                windows: [
                    {
                        start: '08:00',
                        end: '18:00',
                        days: [1, 2, 3, 4, 5]
                    }
                ]
            },
            maintenance: {
                enabled: false
            }
        });

        const status = await statusService.getKioskStatus();

        expect(status.status).toBe('closed');
        expect(status.nextOpen).toBe('2025-05-12T08:00:00.000Z');
        expect(status.message).toContain('Opens');
    });
});
