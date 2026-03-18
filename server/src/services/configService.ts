import { randomUUID } from 'crypto';
import db from '../utils/database';
import statusService from './statusService';
import { ApiError } from '../middleware/errorHandler';
import { createAuditLog, AuditActions, EntityTypes } from './auditService';

const OPERATING_HOURS_KEY = 'operating_hours';
const OPERATING_HOURS_SCHEDULE_KEY = 'operating_hours_schedule';
const MAINTENANCE_MODE_KEY = 'maintenance_mode';
const MAINTENANCE_SCHEDULE_KEY = 'maintenance_schedule';
const NOTIFICATION_POLICIES_KEY = 'notification_recipient_policies';
const SYSTEM_FLAGS_KEY = 'system_flags';
const NOTIFICATION_RECIPIENTS_KEY = 'notification_recipients';

const DEFAULT_NOTIFICATION_POLICIES = {
    maxRecipientsPerType: 10,
    verificationExpiryHours: 48
};

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type AdminActor = {
    id: string;
    username: string;
};

type OperatingHoursPayload = {
    timezone?: string;
    windows?: Array<{ start?: string; end?: string; days?: Array<number | string> }>;
    start?: string;
    end?: string;
    days?: Array<number | string>;
    breaks?: Array<{ start: string; end: string; days?: Array<number | string> }>;
    holidays?: Array<{ date: string; name?: string; start?: string; end?: string; closed?: boolean }>;
    enable247?: boolean;
    copyMondayToWeekdays?: boolean;
};

type MaintenancePayload = {
    enabled: boolean;
    message?: string | null;
    since?: string | null;
};

type NotificationRecipientRow = {
    id: string;
    alert_type: string;
    email: string;
    status: string;
    is_primary: boolean;
    verified_at: string | null;
    expires_at: string | null;
    created_at: string;
    updated_at: string;
};

type NotificationRecipientInput = {
    alertType: string;
    email: string;
    isPrimary?: boolean;
};

type NotificationPolicies = {
    maxRecipientsPerType: number;
    verificationExpiryHours: number;
};

const database = db as unknown as DbClient;

const parseConfigValue = (value: unknown) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === 'object' || typeof value === 'boolean' || typeof value === 'number') {
        return value;
    }

    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as unknown;
        } catch {
            return value;
        }
    }

    return value;
};

const getConfigValue = async (key: string) => {
    const result = (await database.query('SELECT value FROM system_config WHERE key = $1 LIMIT 1', [key])) as {
        rows: Array<{ value: unknown }>;
    };

    if (!result.rows.length) {
        return null;
    }

    return parseConfigValue(result.rows[0]?.value);
};

const upsertConfigValue = async (key: string, value: unknown, description?: string | null) => {
    await database.query(
        `INSERT INTO system_config (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, description = COALESCE($3, system_config.description)`,
        [key, JSON.stringify(value ?? null), description ?? null]
    );
};

const getNotificationPolicies = async (): Promise<NotificationPolicies> => {
    const stored = await getConfigValue(NOTIFICATION_POLICIES_KEY);
    if (stored && typeof stored === 'object') {
        const record = stored as Partial<NotificationPolicies>;
        return {
            maxRecipientsPerType:
                typeof record.maxRecipientsPerType === 'number' && record.maxRecipientsPerType > 0
                    ? record.maxRecipientsPerType
                    : DEFAULT_NOTIFICATION_POLICIES.maxRecipientsPerType,
            verificationExpiryHours:
                typeof record.verificationExpiryHours === 'number' && record.verificationExpiryHours > 0
                    ? record.verificationExpiryHours
                    : DEFAULT_NOTIFICATION_POLICIES.verificationExpiryHours
        };
    }

    return { ...DEFAULT_NOTIFICATION_POLICIES };
};

const normalizeOperatingHours = (payload: OperatingHoursPayload) => {
    const normalized: Record<string, unknown> = { ...payload };
    if (payload.enable247) {
        normalized.windows = [
            {
                start: '00:00',
                end: '00:00',
                days: [1, 2, 3, 4, 5, 6, 7]
            }
        ];
    }

    return normalized;
};

const buildLegacyOperatingHours = (payload: OperatingHoursPayload) => {
    if (payload.enable247) {
        return {
            timezone: payload.timezone,
            windows: [
                {
                    start: '00:00',
                    end: '00:00',
                    days: [1, 2, 3, 4, 5, 6, 7]
                }
            ]
        };
    }

    if (Array.isArray(payload.windows) && payload.windows.length) {
        return {
            timezone: payload.timezone,
            windows: payload.windows
        };
    }

    return {
        timezone: payload.timezone,
        start: payload.start,
        end: payload.end,
        days: payload.days
    };
};

const getSystemConfig = async () => {
    const [operatingHours, maintenance, maintenanceSchedule, notificationPolicies, systemFlags, recipients] =
        await Promise.all([
            statusService.getOperatingHoursConfig(),
            statusService.getMaintenanceState(),
            getConfigValue(MAINTENANCE_SCHEDULE_KEY),
            getNotificationPolicies(),
            getConfigValue(SYSTEM_FLAGS_KEY),
            listNotificationRecipients()
        ]);

    return {
        operatingHours,
        maintenance,
        maintenanceSchedule: maintenanceSchedule || { windows: [] },
        notificationPolicies,
        systemFlags: systemFlags || {},
        notificationRecipients: recipients
    };
};

const updateOperatingHours = async (payload: OperatingHoursPayload, actor: AdminActor, context?: { ip?: string; ua?: string }) => {
    const normalized = normalizeOperatingHours(payload);
    const legacyPayload = buildLegacyOperatingHours(payload);

    await Promise.all([
        upsertConfigValue(OPERATING_HOURS_SCHEDULE_KEY, normalized, 'Extended operating hours configuration.'),
        upsertConfigValue(OPERATING_HOURS_KEY, legacyPayload, 'Kiosk operating hours')
    ]);

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: OPERATING_HOURS_KEY,
        newValues: normalized,
        ipAddress: context?.ip ?? null,
        userAgent: context?.ua ?? null
    });

    return statusService.getOperatingHoursConfig();
};

const updateMaintenanceState = async (payload: MaintenancePayload, actor: AdminActor, context?: { ip?: string; ua?: string }) => {
    const now = new Date().toISOString();
    const nextValue = {
        enabled: Boolean(payload.enabled),
        message: payload.message ?? null,
        since: payload.enabled ? payload.since ?? now : null
    };

    await upsertConfigValue(MAINTENANCE_MODE_KEY, nextValue, 'Maintenance mode configuration payload.');

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: MAINTENANCE_MODE_KEY,
        newValues: nextValue,
        ipAddress: context?.ip ?? null,
        userAgent: context?.ua ?? null
    });

    return statusService.getMaintenanceState();
};

const updateMaintenanceSchedule = async (schedule: Record<string, unknown>, actor: AdminActor, context?: { ip?: string; ua?: string }) => {
    await upsertConfigValue(MAINTENANCE_SCHEDULE_KEY, schedule, 'Scheduled maintenance windows.');

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: MAINTENANCE_SCHEDULE_KEY,
        newValues: schedule,
        ipAddress: context?.ip ?? null,
        userAgent: context?.ua ?? null
    });

    return schedule;
};

const listNotificationRecipients = async (alertType?: string) => {
    const params: unknown[] = [];
    let where = '';
    if (alertType) {
        params.push(alertType);
        where = 'WHERE alert_type = $1';
    }
    const result = (await database.query(
        `SELECT id, alert_type, email, status, is_primary, verified_at, expires_at, created_at, updated_at
         FROM notification_recipients
         ${where}
         ORDER BY alert_type, is_primary DESC, email ASC`,
        params
    )) as DbQueryResult<NotificationRecipientRow>;

    return result.rows.map((row) => ({
        id: row.id,
        alertType: row.alert_type,
        email: row.email,
        status: row.status,
        isPrimary: row.is_primary,
        verifiedAt: row.verified_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
};

const syncRecipientsConfig = async () => {
    const result = (await database.query(
        `SELECT DISTINCT email FROM notification_recipients WHERE status = 'verified'`
    )) as DbQueryResult<{ email: string }>;

    const emails = result.rows.map((row) => row.email);
    await upsertConfigValue(
        NOTIFICATION_RECIPIENTS_KEY,
        emails,
        'List of admin email addresses that receive system alerts (JSON array).'
    );

    return emails;
};

const addNotificationRecipient = async (
    payload: NotificationRecipientInput,
    actor: AdminActor,
    context?: { ip?: string; ua?: string }
) => {
    const policies = await getNotificationPolicies();
    const countResult = (await database.query(
        `SELECT COUNT(*)::int AS count FROM notification_recipients WHERE alert_type = $1`,
        [payload.alertType]
    )) as DbQueryResult<{ count: string }>;

    const count = parseInt(countResult.rows[0]?.count || '0', 10);
    if (count >= policies.maxRecipientsPerType) {
        throw new ApiError(400, `Maximum ${policies.maxRecipientsPerType} recipients allowed for ${payload.alertType}`);
    }

    const verificationToken = randomUUID();
    const expiresAt = new Date(Date.now() + policies.verificationExpiryHours * 3600 * 1000);

    const existing = (await database.query(
        `SELECT id FROM notification_recipients WHERE alert_type = $1 AND email = $2`,
        [payload.alertType, payload.email]
    )) as DbQueryResult<{ id: string }>;

    let recipientId: string;
    if (existing.rows.length) {
        recipientId = existing.rows[0]?.id as string;
        await database.query(
            `UPDATE notification_recipients
             SET status = 'pending', is_primary = $3, verification_token = $4, verified_at = NULL, expires_at = $5
             WHERE id = $1`,
            [recipientId, payload.isPrimary ?? false, verificationToken, expiresAt]
        );
    } else {
        const insertResult = (await database.query(
            `INSERT INTO notification_recipients
             (alert_type, email, status, is_primary, verification_token, expires_at)
             VALUES ($1, $2, 'pending', $3, $4, $5)
             RETURNING id`,
            [payload.alertType, payload.email, payload.isPrimary ?? false, verificationToken, expiresAt]
        )) as DbQueryResult<{ id: string }>;

        recipientId = insertResult.rows[0]?.id || '';
    }

    if (payload.isPrimary) {
        await database.query(
            `UPDATE notification_recipients
             SET is_primary = CASE WHEN id = $1 THEN TRUE ELSE FALSE END
             WHERE alert_type = $2`,
            [recipientId, payload.alertType]
        );
    }

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: `notification_recipient:${recipientId}`,
        newValues: { alertType: payload.alertType, email: payload.email, status: 'pending' },
        ipAddress: context?.ip ?? null,
        userAgent: context?.ua ?? null
    });

    await syncRecipientsConfig();

    return {
        id: recipientId,
        alertType: payload.alertType,
        email: payload.email,
        status: 'pending',
        verificationToken,
        expiresAt: expiresAt.toISOString()
    };
};

const removeNotificationRecipient = async (recipientId: string, actor: AdminActor, context?: { ip?: string; ua?: string }) => {
    await database.query('DELETE FROM notification_recipients WHERE id = $1', [recipientId]);

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: `notification_recipient:${recipientId}`,
        newValues: { removed: true },
        ipAddress: context?.ip ?? null,
        userAgent: context?.ua ?? null
    });

    await syncRecipientsConfig();
};

const setNotificationPrimary = async (recipientId: string, actor: AdminActor, context?: { ip?: string; ua?: string }) => {
    const rowResult = (await database.query(
        `SELECT alert_type FROM notification_recipients WHERE id = $1`,
        [recipientId]
    )) as DbQueryResult<{ alert_type: string }>;

    const alertType = rowResult.rows[0]?.alert_type;
    if (!alertType) {
        throw new ApiError(404, 'Recipient not found');
    }

    await database.query(
        `UPDATE notification_recipients
         SET is_primary = CASE WHEN id = $1 THEN TRUE ELSE FALSE END
         WHERE alert_type = $2`,
        [recipientId, alertType]
    );

    await createAuditLog({
        adminId: actor.id,
        adminUsername: actor.username,
        action: AuditActions.CONFIG_UPDATED,
        entityType: EntityTypes.CONFIG,
        entityId: `notification_recipient:${recipientId}`,
        newValues: { isPrimary: true },
        ipAddress: context?.ip ?? null,
        userAgent: context?.ua ?? null
    });

    await syncRecipientsConfig();
};

const verifyNotificationRecipient = async (token: string, actor: AdminActor | null = null) => {
    const result = (await database.query(
        `UPDATE notification_recipients
         SET status = 'verified', verified_at = NOW(), expires_at = NULL, verification_token = NULL
         WHERE verification_token = $1
         RETURNING id, alert_type, email`,
        [token]
    )) as DbQueryResult<{ id: string; alert_type: string; email: string }>;

    if (!result.rows.length) {
        throw new ApiError(404, 'Verification token not found');
    }

    const row = result.rows[0];
    if (!row) {
        throw new ApiError(404, 'Verification token not found');
    }

    if (actor) {
        await createAuditLog({
            adminId: actor.id,
            adminUsername: actor.username,
            action: AuditActions.CONFIG_UPDATED,
            entityType: EntityTypes.CONFIG,
            entityId: `notification_recipient:${row.id}`,
            newValues: { status: 'verified' }
        });
    }

    await syncRecipientsConfig();

    return { id: row.id, alertType: row.alert_type, email: row.email, status: 'verified' };
};

const configService = {
    getSystemConfig,
    updateOperatingHours,
    updateMaintenanceState,
    updateMaintenanceSchedule,
    listNotificationRecipients,
    addNotificationRecipient,
    removeNotificationRecipient,
    setNotificationPrimary,
    verifyNotificationRecipient,
    getNotificationPolicies
};

export {
    getSystemConfig,
    updateOperatingHours,
    updateMaintenanceState,
    updateMaintenanceSchedule,
    listNotificationRecipients,
    addNotificationRecipient,
    removeNotificationRecipient,
    setNotificationPrimary,
    verifyNotificationRecipient,
    getNotificationPolicies
};

export default configService;
