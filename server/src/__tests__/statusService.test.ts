'use strict';


jest.mock('../utils/database', () => ({
    __esModule: true,
    default: {
        query: jest.fn()
    }
}));

let mockedDb: { query: jest.Mock };

type StatusService = typeof import('../services/statusService').default;

const loadStatusService = async (): Promise<StatusService> => {
    const module = await import('../services/statusService');
    return module.default;
};

const loadDbMock = async (): Promise<{ query: jest.Mock }> => {
    const module = await import('../utils/database');
    return (module.default ?? module) as unknown as { query: jest.Mock };
};

let statusService: StatusService;

process.env.KIOSK_TIMEZONE = 'UTC';

type MockQueryInput = {
    operatingHours?: unknown;
    maintenance?: unknown;
};

const mockOperatingHours = (value: unknown) => {
    return {
        rows: [
            {
                value: JSON.stringify(value)
            }
        ]
    };
};

const mockMaintenance = (value: unknown) => {
    return {
        rows: [
            {
                value: JSON.stringify(value)
            }
        ]
    };
};

const mockQueryImplementation = ({ operatingHours, maintenance }: MockQueryInput) => {
    mockedDb.query.mockImplementation((text: string, params: unknown[] = []) => {
        const [paramKey] = params;
        if (paramKey === 'operating_hours') {
            if (operatingHours) {
                return Promise.resolve(mockOperatingHours(operatingHours));
            }
            return Promise.resolve({ rows: [] });
        }

        if (paramKey === 'maintenance_mode') {
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
    beforeEach(async () => {
        process.env.KIOSK_TIMEZONE = 'UTC';
        jest.resetModules();
        statusService = await loadStatusService();
        mockedDb = await loadDbMock();
        mockedDb.query.mockReset();
    });

    it('falls back to default timezone when configuration provides an invalid zone', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

        mockedDb.query.mockResolvedValueOnce(
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
        mockedDb.query.mockResolvedValueOnce(
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
        const [window] = config.windows;
        expect(window?.start).toBe('08:00');
        expect(window?.end).toBe('18:00');
        expect(window?.days).toEqual([1, 2, 3, 4, 5]);
    });
});

describe('statusService.getMaintenanceState', () => {
    beforeEach(async () => {
        jest.resetModules();
        statusService = await loadStatusService();
        mockedDb = await loadDbMock();
        mockedDb.query.mockReset();
    });

    it('returns defaults when no maintenance configuration is stored', async () => {
        mockedDb.query.mockResolvedValueOnce({ rows: [] });

        const maintenance = await statusService.getMaintenanceState();

        expect(maintenance.enabled).toBe(false);
        expect(maintenance.message).toContain('System Under Maintenance');
        expect(maintenance.since).toBeNull();
    });
});

describe('statusService.statusHasChanged', () => {
    beforeEach(async () => {
        jest.resetModules();
        statusService = await loadStatusService();
        mockedDb = await loadDbMock();
    });

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
        } as unknown as Awaited<ReturnType<typeof statusService.getKioskStatus>>;

        expect(statusService.statusHasChanged(baseStatus, { ...baseStatus })).toBe(false);

        const updated = {
            ...baseStatus,
            message: 'Closing soon'
        } as typeof baseStatus;

        expect(statusService.statusHasChanged(baseStatus, updated)).toBe(true);
    });
});

describe('statusService.getKioskStatus', () => {
    const originalEnv = process.env.KIOSK_TIMEZONE;

    beforeEach(async () => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2025-05-05T10:00:00Z'));
        process.env.KIOSK_TIMEZONE = 'UTC';
        jest.resetModules();
        statusService = await loadStatusService();
        mockedDb = await loadDbMock();
        mockedDb.query.mockReset();
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
