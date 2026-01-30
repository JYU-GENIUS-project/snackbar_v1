'use strict';

const db = require('../utils/database');

const OPERATING_HOURS_KEY = 'operating_hours';
const MAINTENANCE_MODE_KEY = 'maintenance_mode';
const DEFAULT_TIMEZONE = process.env.KIOSK_TIMEZONE || 'Europe/Helsinki';
const DEFAULT_OPERATING_WINDOW = {
    start: '08:00',
    end: '18:00',
    days: [1, 2, 3, 4, 5]
};
const DEFAULT_MAINTENANCE_MESSAGE = '🔧 System Under Maintenance - Check back soon';
const MAX_LOOKAHEAD_DAYS = 14;

const WEEKDAY_MAP = {
    Sun: 7,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
};

const parseConfigValue = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'number') {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        const lowered = value.toLowerCase();
        if (lowered === 'true') {
            return true;
        }
        if (lowered === 'false') {
            return false;
        }
        return value;
    }
};

const getConfigValue = async (key) => {
    const result = await db.query('SELECT value FROM system_config WHERE key = $1 LIMIT 1', [key]);
    if (!result.rows.length) {
        return null;
    }
    return parseConfigValue(result.rows[0].value);
};

const sanitizeTimeString = (value, fallback) => {
    const source = typeof value === 'string' ? value.trim() : null;
    const candidate = source || fallback;
    if (!candidate) {
        return null;
    }
    const match = /^([0-2]\d):([0-5]\d)$/.exec(candidate);
    if (!match) {
        return null;
    }
    const hours = parseInt(match[1], 10);
    if (hours > 23) {
        return null;
    }
    return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const parseTimeToMinutes = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    const [hours, minutes] = value.split(':');
    const parsedHours = parseInt(hours, 10);
    const parsedMinutes = parseInt(minutes, 10);
    if (Number.isNaN(parsedHours) || Number.isNaN(parsedMinutes)) {
        return null;
    }
    return parsedHours * 60 + parsedMinutes;
};

const sanitizeDays = (input, fallback) => {
    const base = Array.isArray(input) ? input : [];
    const sanitized = base
        .map((value) => parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && value >= 1 && value <= 7);
    if (sanitized.length === 0) {
        return Array.isArray(fallback) && fallback.length ? [...new Set(fallback)] : [...DEFAULT_OPERATING_WINDOW.days];
    }
    return [...new Set(sanitized)];
};

const ensureValidTimeZone = (timeZoneCandidate) => {
    const zone = typeof timeZoneCandidate === 'string' && timeZoneCandidate.trim() ? timeZoneCandidate.trim() : DEFAULT_TIMEZONE;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: zone });
        return zone;
    } catch (error) {
        console.warn(`[StatusService] Invalid timezone '${zone}', falling back to ${DEFAULT_TIMEZONE}`);
        return DEFAULT_TIMEZONE;
    }
};

const buildOperatingWindows = (rawConfig) => {
    const defaultStart = sanitizeTimeString(rawConfig?.start, DEFAULT_OPERATING_WINDOW.start);
    const defaultEnd = sanitizeTimeString(rawConfig?.end, DEFAULT_OPERATING_WINDOW.end);
    const defaultDays = sanitizeDays(rawConfig?.days, DEFAULT_OPERATING_WINDOW.days);

    const windowsInput = Array.isArray(rawConfig?.windows) && rawConfig.windows.length ? rawConfig.windows : [rawConfig || {}];

    const windows = windowsInput
        .map((window) => {
            const start = sanitizeTimeString(window?.start, defaultStart);
            const end = sanitizeTimeString(window?.end, defaultEnd);
            const days = sanitizeDays(window?.days, defaultDays);

            if (!start || !end || !days.length) {
                return null;
            }

            const startMinutes = parseTimeToMinutes(start);
            const endMinutes = parseTimeToMinutes(end);

            if (startMinutes === null || endMinutes === null) {
                return null;
            }

            return {
                start,
                end,
                startMinutes,
                endMinutes,
                days,
                daysSet: new Set(days)
            };
        })
        .filter(Boolean);

    if (!windows.length) {
        const fallbackStart = defaultStart || DEFAULT_OPERATING_WINDOW.start;
        const fallbackEnd = defaultEnd || DEFAULT_OPERATING_WINDOW.end;
        const fallbackDays = defaultDays.length ? defaultDays : DEFAULT_OPERATING_WINDOW.days;
        const fallbackStartMinutes = parseTimeToMinutes(fallbackStart);
        const fallbackEndMinutes = parseTimeToMinutes(fallbackEnd);

        return [
            {
                start: fallbackStart,
                end: fallbackEnd,
                startMinutes: fallbackStartMinutes,
                endMinutes: fallbackEndMinutes,
                days: [...fallbackDays],
                daysSet: new Set(fallbackDays)
            }
        ];
    }

    return windows;
};

const getOperatingHoursConfig = async () => {
    const stored = await getConfigValue(OPERATING_HOURS_KEY);
    const timeZone = ensureValidTimeZone(stored?.timezone);
    const windows = buildOperatingWindows(stored || {});

    return {
        timezone: timeZone,
        windows
    };
};

const getMaintenanceState = async () => {
    const stored = await getConfigValue(MAINTENANCE_MODE_KEY);

    if (stored === null || stored === undefined) {
        return {
            enabled: false,
            message: DEFAULT_MAINTENANCE_MESSAGE,
            since: null
        };
    }

    if (typeof stored === 'boolean') {
        return {
            enabled: stored,
            message: DEFAULT_MAINTENANCE_MESSAGE,
            since: null
        };
    }

    if (typeof stored === 'object') {
        return {
            enabled: Boolean(stored.enabled),
            message: typeof stored.message === 'string' && stored.message.trim() ? stored.message.trim() : DEFAULT_MAINTENANCE_MESSAGE,
            since: stored.since || null
        };
    }

    const normalized = String(stored).toLowerCase();
    const enabled = normalized === 'true';
    return {
        enabled,
        message: DEFAULT_MAINTENANCE_MESSAGE,
        since: null
    };
};

const getZonedDateParts = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const map = {};

    for (const part of parts) {
        if (part.type !== 'literal') {
            map[part.type] = part.value;
        }
    }

    const weekdayCode = WEEKDAY_MAP[map.weekday] || 1;

    return {
        year: parseInt(map.year, 10),
        month: parseInt(map.month, 10),
        day: parseInt(map.day, 10),
        hour: parseInt(map.hour, 10),
        minute: parseInt(map.minute, 10),
        second: parseInt(map.second, 10),
        weekday: weekdayCode
    };
};

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

const getTimeZoneOffset = (timeZone, date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const data = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            data[part.type] = part.value;
        }
    }

    const utcTime = Date.UTC(
        parseInt(data.year, 10),
        parseInt(data.month, 10) - 1,
        parseInt(data.day, 10),
        parseInt(data.hour, 10),
        parseInt(data.minute, 10),
        parseInt(data.second, 10)
    );

    return (utcTime - date.getTime()) / 60000;
};

const makeZonedDate = ({ year, month, day, hour, minute, second = 0 }, timeZone) => {
    const base = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    const offset = getTimeZoneOffset(timeZone, base);
    const adjusted = new Date(base.getTime() - offset * 60000);
    const offsetAfter = getTimeZoneOffset(timeZone, adjusted);
    if (offsetAfter !== offset) {
        return new Date(base.getTime() - offsetAfter * 60000);
    }
    return adjusted;
};

const isWithinWindow = (parts, window) => {
    const { startMinutes, endMinutes, daysSet } = window;
    const minutes = parts.hour * 60 + parts.minute;

    if (startMinutes === endMinutes) {
        return daysSet.has(parts.weekday);
    }

    if (startMinutes < endMinutes) {
        return daysSet.has(parts.weekday) && minutes >= startMinutes && minutes < endMinutes;
    }

    if (minutes >= startMinutes) {
        return daysSet.has(parts.weekday);
    }

    const previousWeekday = parts.weekday === 1 ? 7 : parts.weekday - 1;
    return daysSet.has(previousWeekday) && minutes < endMinutes;
};

const computeWindowClose = (now, parts, timeZone, window) => {
    if (window.startMinutes === window.endMinutes) {
        return null;
    }

    const endHour = Math.floor(window.endMinutes / 60);
    const endMinute = window.endMinutes % 60;
    const minutes = parts.hour * 60 + parts.minute;

    if (window.startMinutes < window.endMinutes) {
        const sameDayClose = makeZonedDate({
            year: parts.year,
            month: parts.month,
            day: parts.day,
            hour: endHour,
            minute: endMinute,
            second: 0
        }, timeZone);

        if (sameDayClose.getTime() <= now.getTime()) {
            const nextDayParts = getZonedDateParts(addDays(now, 1), timeZone);
            return makeZonedDate({
                year: nextDayParts.year,
                month: nextDayParts.month,
                day: nextDayParts.day,
                hour: endHour,
                minute: endMinute,
                second: 0
            }, timeZone);
        }

        return sameDayClose;
    }

    if (minutes >= window.startMinutes) {
        const nextDayParts = getZonedDateParts(addDays(now, 1), timeZone);
        return makeZonedDate({
            year: nextDayParts.year,
            month: nextDayParts.month,
            day: nextDayParts.day,
            hour: endHour,
            minute: endMinute,
            second: 0
        }, timeZone);
    }

    return makeZonedDate({
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: endHour,
        minute: endMinute,
        second: 0
    }, timeZone);
};

const findNextOpen = (now, timeZone, windows) => {
    for (let dayOffset = 0; dayOffset <= MAX_LOOKAHEAD_DAYS; dayOffset += 1) {
        const targetDate = addDays(now, dayOffset);
        const targetParts = getZonedDateParts(targetDate, timeZone);

        for (const window of windows) {
            if (!window.daysSet.has(targetParts.weekday)) {
                continue;
            }

            const startHour = Math.floor(window.startMinutes / 60);
            const startMinute = window.startMinutes % 60;
            const candidate = makeZonedDate({
                year: targetParts.year,
                month: targetParts.month,
                day: targetParts.day,
                hour: startHour,
                minute: startMinute,
                second: 0
            }, timeZone);

            if (candidate.getTime() <= now.getTime()) {
                continue;
            }

            return {
                date: candidate,
                window
            };
        }
    }

    return null;
};

const formatDisplayTime = (date, timeZone, options = {}) => {
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        ...(options.includeWeekday ? { weekday: 'long' } : {}),
        ...(options.includeDate ? { month: '2-digit', day: '2-digit' } : {})
    });
    return formatter.format(date);
};

const buildClosedMessage = ({ nextOpen, window, timeZone }) => {
    if (!nextOpen || !window) {
        return '🔒 Closed - Please check back during operating hours';
    }

    const nextOpenFormatted = formatDisplayTime(nextOpen, timeZone, { includeWeekday: true });
    return `🔒 Closed - Opens ${nextOpenFormatted} (Hours: ${window.start}–${window.end})`;
};

const buildOpenMessage = ({ nextClose, window, timeZone }) => {
    if (!window) {
        return '🟢 Open - Serving customers';
    }

    if (!nextClose) {
        return '🟢 Open - Serving customers';
    }

    const closingFormatted = formatDisplayTime(nextClose, timeZone, {});
    return `🟢 Open - Closes at ${closingFormatted}`;
};

const buildStatusFingerprint = (status) => {
    if (!status) {
        return null;
    }

    const payload = {
        status: status.status,
        reason: status.reason,
        message: status.message,
        nextOpen: status.nextOpen,
        nextClose: status.nextClose,
        maintenanceEnabled: status.maintenance?.enabled,
        maintenanceMessage: status.maintenance?.message
    };

    return JSON.stringify(payload);
};

const getKioskStatus = async ({ now } = {}) => {
    const reference = now instanceof Date ? new Date(now.getTime()) : new Date();
    const operating = await getOperatingHoursConfig();
    const maintenance = await getMaintenanceState();
    const timeZone = ensureValidTimeZone(operating.timezone);

    const parts = getZonedDateParts(reference, timeZone);
    const activeWindow = operating.windows.find((window) => isWithinWindow(parts, window)) || null;
    const isMaintenance = Boolean(maintenance.enabled);
    const isOpen = !isMaintenance && Boolean(activeWindow);

    const nextClose = isOpen ? computeWindowClose(reference, parts, timeZone, activeWindow) : null;
    const nextOpenResult = isMaintenance
        ? null
        : isOpen
            ? findNextOpen(nextClose || reference, timeZone, operating.windows)
            : findNextOpen(reference, timeZone, operating.windows);

    const nextOpenDate = nextOpenResult?.date || null;
    const nextOpenWindow = nextOpenResult?.window || null;

    const statusValue = isMaintenance ? 'maintenance' : isOpen ? 'open' : 'closed';
    const reason = isMaintenance ? 'maintenance' : isOpen ? 'operational' : 'outside-operating-hours';

    let message = DEFAULT_MAINTENANCE_MESSAGE;
    if (statusValue === 'maintenance') {
        message = maintenance.message || DEFAULT_MAINTENANCE_MESSAGE;
    } else if (statusValue === 'open') {
        message = buildOpenMessage({ nextClose, window: activeWindow, timeZone });
    } else {
        message = buildClosedMessage({ nextOpen: nextOpenDate, window: nextOpenWindow, timeZone });
    }

    const windowsForResponse = operating.windows.map((window) => ({
        start: window.start,
        end: window.end,
        days: [...window.days]
    }));

    return {
        status: statusValue,
        reason,
        message,
        timezone: timeZone,
        maintenance: {
            enabled: Boolean(maintenance.enabled),
            message: maintenance.message || DEFAULT_MAINTENANCE_MESSAGE,
            since: maintenance.since || null
        },
        operatingWindow: activeWindow
            ? {
                start: activeWindow.start,
                end: activeWindow.end,
                days: [...activeWindow.days]
            }
            : null,
        nextOpen: nextOpenDate ? nextOpenDate.toISOString() : null,
        nextClose: nextClose ? nextClose.toISOString() : null,
        generatedAt: new Date().toISOString(),
        windows: windowsForResponse
    };
};

const statusHasChanged = (previous, next) => {
    const previousSignature = buildStatusFingerprint(previous);
    const nextSignature = buildStatusFingerprint(next);
    return previousSignature !== nextSignature;
};

module.exports = {
    getOperatingHoursConfig,
    getMaintenanceState,
    getKioskStatus,
    statusHasChanged,
    buildStatusFingerprint
};
