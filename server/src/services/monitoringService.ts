import { promises as fs } from 'fs';
import path from 'path';
import db from '../utils/database';
import { NOTIFICATION_TYPES, queueSystemAlert as queueSystemAlertFn } from './notificationService';

const STORAGE_ALERT_WINDOW_HOURS = parseInt(process.env.STORAGE_ALERT_WINDOW_HOURS || '12', 10);
const MONITOR_INTERVAL_MS = parseInt(process.env.MONITOR_INTERVAL_MS || '', 10) || 300000;
const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
const BACKUP_META_PREFIX = 'snackbar_backup_';

type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

const STORAGE_THRESHOLDS: Array<{ level: 'info' | 'warning' | 'critical'; percent: number; type: NotificationType; alertType: string }> = [
    { level: 'info', percent: 75, type: NOTIFICATION_TYPES.STORAGE_INFO as NotificationType, alertType: 'storage_info' },
    { level: 'warning', percent: 80, type: NOTIFICATION_TYPES.STORAGE_WARNING as NotificationType, alertType: 'storage_warning' },
    { level: 'critical', percent: 90, type: NOTIFICATION_TYPES.STORAGE_CRITICAL as NotificationType, alertType: 'storage_critical' }
];

const database = db as unknown as {
    query: (text: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

type QueueSystemAlert = (params: {
    notificationType: string;
    alertType?: string;
    subject: string;
    payload: { text?: string; html?: string; context?: Record<string, unknown> };
}) => Promise<{ queued: number; reason?: string }>;

const queueSystemAlert = queueSystemAlertFn as QueueSystemAlert;

const getCapacityBytes = () => {
    const capacityBytes = process.env.DB_STORAGE_CAPACITY_BYTES;
    if (capacityBytes) {
        const parsed = parseInt(capacityBytes, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const capacityGb = process.env.DB_STORAGE_CAPACITY_GB;
    if (capacityGb) {
        const parsed = parseFloat(capacityGb);
        return Number.isFinite(parsed) ? Math.round(parsed * 1024 * 1024 * 1024) : null;
    }

    return null;
};

const getConfigValue = async (key: string) => {
    const result = await database.query('SELECT value FROM system_config WHERE key = $1 LIMIT 1', [key]);
    if (!result.rows.length) {
        return null;
    }
    const row = result.rows[0] as { value?: unknown };
    return row?.value ?? null;
};

const upsertConfigValue = async (key: string, value: unknown, description?: string | null) => {
    await database.query(
        `INSERT INTO system_config (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, description = COALESCE($3, system_config.description)`,
        [key, JSON.stringify(value ?? null), description ?? null]
    );
};

const computeProjectedDays = (currentBytes: number, capacityBytes: number, lastSnapshot?: { sizeBytes?: number; recordedAt?: string }) => {
    if (!lastSnapshot?.sizeBytes || !lastSnapshot.recordedAt) {
        return null;
    }
    const lastSize = lastSnapshot.sizeBytes;
    const lastTime = new Date(lastSnapshot.recordedAt);
    const now = new Date();
    const days = (now.getTime() - lastTime.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 0) {
        return null;
    }
    const growthPerDay = (currentBytes - lastSize) / days;
    if (growthPerDay <= 0) {
        return null;
    }
    const remaining = capacityBytes - currentBytes;
    return remaining > 0 ? Math.round(remaining / growthPerDay) : 0;
};

const alreadyAlerted = async (notificationType: string) => {
    const result = await database.query(
        `SELECT 1
         FROM email_notification_log
         WHERE notification_type = $1
           AND created_at > NOW() - ($2 || ' hours')::interval
         LIMIT 1`,
        [notificationType, STORAGE_ALERT_WINDOW_HOURS]
    );
    return result.rows.length > 0;
};

const recordSnapshot = async (metrics: Record<string, unknown>) => {
    await database.query(
        `INSERT INTO system_metrics_snapshot (metrics) VALUES ($1::jsonb)`,
        [JSON.stringify(metrics)]
    );
};

const checkStorage = async () => {
    const capacityBytes = getCapacityBytes();
    if (!capacityBytes) {
        return;
    }

    const sizeResult = await database.query('SELECT pg_database_size(current_database())::bigint AS size_bytes');
    const sizeRow = sizeResult.rows[0] as { size_bytes?: number | string } | undefined;
    const sizeBytes = sizeRow?.size_bytes ? Number(sizeRow.size_bytes) : 0;
    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
        return;
    }

    const usagePercent = Math.round((sizeBytes / capacityBytes) * 100);
    const snapshotResult = await database.query(
        `SELECT metrics, recorded_at
         FROM system_metrics_snapshot
         ORDER BY recorded_at DESC
         LIMIT 1`
    );

    const lastSnapshot = snapshotResult.rows[0] as { metrics?: { size_bytes?: number }; recorded_at?: string } | undefined;
    const lastSize = lastSnapshot?.metrics?.size_bytes;
    const lastRecordedAt = lastSnapshot?.recorded_at;
    const projectedDays = computeProjectedDays(
        sizeBytes,
        capacityBytes,
        lastSize !== undefined && lastRecordedAt ? { sizeBytes: lastSize, recordedAt: lastRecordedAt } : undefined
    );

    await recordSnapshot({ size_bytes: sizeBytes, capacity_bytes: capacityBytes, usage_percent: usagePercent });

    const threshold = STORAGE_THRESHOLDS.find((entry) => usagePercent >= entry.percent);
    if (!threshold) {
        return;
    }

    if (await alreadyAlerted(threshold.type)) {
        return;
    }

    const usageLabel = `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB of ${(capacityBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    const projected = projectedDays !== null ? `${projectedDays} days` : 'N/A';

    await queueSystemAlert({
        notificationType: threshold.type,
        alertType: threshold.alertType,
        subject: `[Snackbar] Database storage at ${usagePercent}% capacity`,
        payload: {
            text: `Database storage at ${usagePercent}% capacity. Current usage: ${usageLabel}. Projected days until full: ${projected}.`,
            html: `<p>Database storage at <strong>${usagePercent}%</strong> capacity.</p><p>Current usage: ${usageLabel}</p><p>Projected days until full: ${projected}</p>`
        }
    });
};

const readLatestBackupMeta = async () => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const metaFiles = files.filter((file) => file.startsWith(BACKUP_META_PREFIX) && file.endsWith('.meta'));
        if (!metaFiles.length) {
            return null;
        }
        const latest = metaFiles.sort().pop();
        if (!latest) {
            return null;
        }
        const content = await fs.readFile(path.join(BACKUP_DIR, latest), 'utf-8');
        return { name: latest, payload: JSON.parse(content) as Record<string, unknown> };
    } catch {
        return null;
    }
};

const readLatestBackupFailure = async () => {
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const logFiles = files.filter((file) => file.startsWith('backup_') && file.endsWith('.log'));
        if (!logFiles.length) {
            return null;
        }
        const latest = logFiles.sort().pop();
        if (!latest) {
            return null;
        }
        const content = await fs.readFile(path.join(BACKUP_DIR, latest), 'utf-8');
        if (!content.includes('ERROR') && !content.includes('FAILED')) {
            return null;
        }
        return { name: latest, content };
    } catch {
        return null;
    }
};

const checkBackups = async () => {
    const lastProcessed = await getConfigValue('backup_last_processed');
    const lastFailure = await getConfigValue('backup_last_failure_processed');

    const latestMeta = await readLatestBackupMeta();
    if (latestMeta && latestMeta.name !== lastProcessed) {
        await upsertConfigValue('backup_last_processed', latestMeta.name, 'Last processed backup metadata file.');
        const fileLabel = typeof latestMeta.payload?.file === 'string' ? latestMeta.payload.file : latestMeta.name;
        await queueSystemAlert({
            notificationType: NOTIFICATION_TYPES.BACKUP_SUCCESS as NotificationType,
            alertType: 'backup_confirmation',
            subject: `Daily backup completed successfully`,
            payload: {
                text: `Daily backup completed successfully. File: ${fileLabel}`,
                html: `<p>Daily backup completed successfully.</p><p>File: ${fileLabel}</p>`
            }
        });
    }

    const latestFailure = await readLatestBackupFailure();
    if (latestFailure && latestFailure.name !== lastFailure) {
        await upsertConfigValue('backup_last_failure_processed', latestFailure.name, 'Last processed backup failure log.');
        await queueSystemAlert({
            notificationType: NOTIFICATION_TYPES.BACKUP_FAILURE as NotificationType,
            alertType: 'backup_failure',
            subject: `URGENT: Backup Failed`,
            payload: {
                text: `Daily backup failed. Please check logs: ${latestFailure.name}`,
                html: `<p><strong>Daily backup failed.</strong></p><p>Please check logs: ${latestFailure.name}</p>`
            }
        });
    }
};

const runMonitoringChecks = async () => {
    await checkStorage();
    await checkBackups();
};

const startMonitoringWorker = ({ intervalMs = MONITOR_INTERVAL_MS }: { intervalMs?: number } = {}) => {
    if (process.env.MONITORING_WORKER_ENABLED === 'false') {
        return null;
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    const execute = async () => {
        try {
            await runMonitoringChecks();
        } catch (error) {
            console.error('[MonitoringWorker] Monitoring checks failed', error);
        }
    };

    void execute();
    timer = setInterval(() => void execute(), intervalMs);
    if (timer && typeof timer.unref === 'function') {
        timer.unref();
    }

    return {
        stop: () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        }
    };
};

const monitoringService = {
    startMonitoringWorker,
    runMonitoringChecks
};

export { startMonitoringWorker, runMonitoringChecks };
export default monitoringService;
