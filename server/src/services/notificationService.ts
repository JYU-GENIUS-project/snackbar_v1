import nodemailer, { type Transporter } from 'nodemailer';
import db from '../utils/database';

const RETRY_SCHEDULE_SECONDS = [30, 60, 120];
const NOTIFICATION_TYPES = {
    LOW_STOCK: 'inventory.low_stock'
} as const;

const NOTIFICATION_WORKER_LOCK_ID = 90210;

let transport: Transporter | null = null;

type DbQueryResult<T = unknown> = {
    rows: T[];
    rowCount?: number;
};

type DbClient = {
    query: (text: string, params?: unknown[]) => Promise<DbQueryResult>;
};

type NotificationLogRow = {
    id: string;
    notification_type: string;
    recipient: string;
    subject: string;
    status: string;
    attempt_count: number;
    last_error: string | null;
    last_attempt_at: string | null;
    next_attempt_at: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    locked_by?: string | null;
    locked_at?: string | null;
};

type NotificationPayload = {
    productId: string;
    productName?: string;
    currentStock?: number | null;
    lowStockThreshold?: number | null;
    triggeredAt?: string;
    resolvedAt?: string | null;
    context?: Record<string, unknown>;
    text?: string;
    html?: string;
};

type NotificationRecipient = string;

type NotificationSendRecord = NotificationLogRow & {
    payload?: NotificationPayload | null;
};

type NotificationOutcome = { id: string; status: string; error?: unknown };

type LowStockSnapshot = {
    productId: string;
    name?: string;
    currentStock?: number | null;
    lowStockThreshold?: number | null;
    lowStock?: boolean;
};

type WorkerHandle = {
    stop: () => Promise<void>;
};

const database = db as unknown as DbClient;

const getSmtpConfig = () => {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || 'alerts@snackbar.local';

    if (!host) {
        throw new Error('SMTP_HOST is not configured');
    }

    return {
        transport: {
            host,
            port,
            secure,
            auth: user && pass ? { user, pass } : undefined
        },
        from
    };
};

const getTransport = () => {
    if (!transport) {
        const config = getSmtpConfig();
        transport = nodemailer.createTransport(config.transport);
    }
    return transport;
};

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

const getNotificationRecipients = async (): Promise<NotificationRecipient[]> => {
    const result = (await database.query('SELECT value FROM system_config WHERE key = $1 LIMIT 1', [
        'notification_recipients'
    ])) as DbQueryResult<{ value: unknown }>;

    if (result.rows.length === 0) {
        return [];
    }

    const value = parseConfigValue(result.rows[0]?.value);
    if (Array.isArray(value)) {
        const recipients = value.filter((entry): entry is string => typeof entry === 'string' && entry.includes('@'));
        return recipients;
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter((entry) => entry.includes('@'));
    }

    return [];
};

const createNotificationLogEntry = async ({
    notificationType,
    recipient,
    subject,
    payload,
    sendAt = new Date()
}: {
    notificationType: string;
    recipient: string;
    subject: string;
    payload: NotificationPayload;
    sendAt?: Date;
}) => {
    await database.query(
        `INSERT INTO email_notification_log (
            notification_type,
            recipient,
            subject,
            payload,
            status,
            next_attempt_at
        ) VALUES ($1, $2, $3, $4::jsonb, 'pending', $5)`,
        [notificationType, recipient, subject, JSON.stringify(payload), sendAt]
    );
};

const hasActiveLowStockAlert = async (productId: string) => {
    const result = await database.query(
        `SELECT 1
         FROM email_notification_log
         WHERE notification_type = $1
           AND payload ->> 'productId' = $2
           AND (payload ->> 'resolvedAt') IS NULL
           AND status IN ('pending', 'sent')
         LIMIT 1`,
        [NOTIFICATION_TYPES.LOW_STOCK, productId]
    );

    return result.rows.length > 0;
};

const markLowStockResolved = async (productId: string) => {
    await database.query(
        `UPDATE email_notification_log
         SET payload = jsonb_set(
             payload,
             '{resolvedAt}',
             to_jsonb(NOW()),
             true
         ),
         updated_at = CURRENT_TIMESTAMP
         WHERE notification_type = $1
           AND payload ->> 'productId' = $2
           AND payload ->> 'resolvedAt' IS NULL`,
        [NOTIFICATION_TYPES.LOW_STOCK, productId]
    );
};

const queueLowStockAlerts = async ({
    snapshot,
    context
}: {
    snapshot: LowStockSnapshot;
    context?: Record<string, unknown>;
}) => {
    const recipients = await getNotificationRecipients();
    if (!recipients.length) {
        return { queued: 0, reason: 'no-recipients-configured' };
    }

    const active = await hasActiveLowStockAlert(snapshot.productId);
    if (active) {
        return { queued: 0, reason: 'alert-already-active' };
    }

    const subject = `[Snackbar] Low stock: ${snapshot.name}`;
    const payload: NotificationPayload = {
        productId: snapshot.productId,
        triggeredAt: new Date().toISOString()
    };
    if (snapshot.name !== undefined) {
        payload.productName = snapshot.name;
    }
    if (snapshot.currentStock !== undefined) {
        payload.currentStock = snapshot.currentStock;
    }
    if (snapshot.lowStockThreshold !== undefined) {
        payload.lowStockThreshold = snapshot.lowStockThreshold;
    }
    if (context !== undefined) {
        payload.context = context;
    }

    await Promise.all(
        recipients.map((recipient) =>
            createNotificationLogEntry({
                notificationType: NOTIFICATION_TYPES.LOW_STOCK,
                recipient,
                subject,
                payload
            })
        )
    );

    return { queued: recipients.length };
};

const renderLowStockEmail = ({
    productName,
    currentStock,
    lowStockThreshold
}: {
    productName?: string;
    currentStock?: number | null;
    lowStockThreshold?: number | null;
}) => {
    const friendlyName = productName || 'A tracked item';
    return {
        subject: `[Snackbar] Low stock: ${friendlyName}`,
        text: `${friendlyName} is below threshold. Current stock: ${currentStock}. Threshold: ${lowStockThreshold}. Please restock promptly.`,
        html: `<p><strong>${friendlyName}</strong> is below its configured threshold.</p>
<p>Current stock: ${currentStock}</p>
<p>Threshold: ${lowStockThreshold}</p>
<p>Please restock promptly to avoid kiosk outages.</p>`
    };
};

const sendNotification = async ({ notification }: { notification: NotificationSendRecord }) => {
    const smtpConfig = getSmtpConfig();
    const mailTransport = getTransport();

    let subject = notification.subject;
    let textBody = notification.payload?.text;
    let htmlBody = notification.payload?.html;

    if (notification.notification_type === NOTIFICATION_TYPES.LOW_STOCK) {
        const rendered = renderLowStockEmail(notification.payload || {});
        subject = rendered.subject;
        textBody = rendered.text;
        htmlBody = rendered.html;
    }

    await mailTransport.sendMail({
        from: smtpConfig.from,
        to: notification.recipient,
        subject,
        text: textBody,
        html: htmlBody
    });
};

const scheduleNextAttempt = (attemptNumber: number) => {
    const scheduleSeconds = RETRY_SCHEDULE_SECONDS[attemptNumber - 1];
    if (!scheduleSeconds) {
        return null;
    }

    const nextAttempt = new Date();
    nextAttempt.setSeconds(nextAttempt.getSeconds() + scheduleSeconds);
    return nextAttempt;
};

const finalizeAttempt = async ({
    notificationId,
    attemptNumber,
    status,
    error = null,
    nextAttempt = null
}: {
    notificationId: string;
    attemptNumber: number;
    status: string;
    error?: string | null;
    nextAttempt?: Date | null;
}) => {
    await database.query(
        `UPDATE email_notification_log
         SET status = $2,
             attempt_count = $3,
             last_error = $4,
             last_attempt_at = CURRENT_TIMESTAMP,
             next_attempt_at = $5,
             locked_by = NULL,
             locked_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [notificationId, status, attemptNumber, error, nextAttempt]
    );
};

const attemptDelivery = async (notification: NotificationSendRecord, _workerId: string) => {
    const attemptNumber = notification.attempt_count + 1;

    try {
        await sendNotification({ notification });
        await finalizeAttempt({
            notificationId: notification.id,
            attemptNumber,
            status: 'sent',
            nextAttempt: null
        });
        return { id: notification.id, status: 'sent' };
    } catch (error) {
        const nextAttempt = scheduleNextAttempt(attemptNumber);
        const status = nextAttempt ? 'pending' : 'failed';
        await finalizeAttempt({
            notificationId: notification.id,
            attemptNumber,
            status,
            error: (error as Error)?.message?.slice(0, 512) || 'Unknown error',
            nextAttempt
        });
        return { id: notification.id, status, error };
    }
};

const claimPendingNotifications = async ({
    limit,
    workerId
}: {
    limit: number;
    workerId: string;
}) => {
    const databaseWithTransaction = db as unknown as {
        transaction: <T>(handler: (client: DbClient) => Promise<T>) => Promise<T>;
    };

    return databaseWithTransaction.transaction(async (client: DbClient) => {
        const { rows } = (await client.query(
            `SELECT *
         FROM email_notification_log
         WHERE status = 'pending'
           AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
           AND (locked_at IS NULL OR locked_at <= NOW() - INTERVAL '5 minutes')
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
            [limit]
        )) as DbQueryResult<NotificationLogRow>;

        if (!rows.length) {
            return [];
        }

        const ids = rows.map((row) => row.id);
        await client.query(
            `UPDATE email_notification_log
         SET locked_by = $1,
             locked_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2::uuid[])`,
            [workerId, ids]
        );

        return rows;
    });
};

const tryAcquireWorkerLock = async (workerId: string) => {
    try {
        const result = (await database.query('SELECT pg_try_advisory_lock($1) AS acquired', [
            NOTIFICATION_WORKER_LOCK_ID
        ])) as DbQueryResult<{ acquired: boolean }>;
        const acquired = result.rows[0]?.acquired === true;
        if (!acquired) {
            console.info(`[NotificationWorker] ${workerId} did not acquire lock; another worker is active.`);
        }
        return acquired;
    } catch (error) {
        console.error('[NotificationWorker] Failed to acquire advisory lock', error);
        return false;
    }
};

const releaseWorkerLock = async () => {
    try {
        await database.query('SELECT pg_advisory_unlock($1)', [NOTIFICATION_WORKER_LOCK_ID]);
    } catch (error) {
        console.error('[NotificationWorker] Failed to release advisory lock', error);
    }
};

const processPendingNotifications = async ({
    limit = 10,
    workerId = 'notification-worker'
}: { limit?: number; workerId?: string } = {}) => {
    const claimed = await claimPendingNotifications({ limit, workerId });
    if (!claimed.length) {
        return [] as NotificationOutcome[];
    }

    const results: NotificationOutcome[] = [];
    for (const notification of claimed) {
        const outcome = await attemptDelivery(notification as NotificationSendRecord, workerId);
        results.push(outcome);
    }

    return results;
};

const startNotificationWorker = ({
    intervalMs = 60000,
    workerId = 'notification-worker'
}: { intervalMs?: number; workerId?: string } = {}): WorkerHandle | null => {
    if (process.env.NOTIFICATION_WORKER_ENABLED === 'false') {
        return null;
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let lockAcquired = false;
    let stopped = false;
    let acquiring = false;

    const execute = async () => {
        if (!lockAcquired || stopped) {
            return;
        }
        try {
            await processPendingNotifications({ workerId });
        } catch (error) {
            console.error('[NotificationWorker] Failed to process notifications', error);
        }
    };

    const scheduleRetry = () => {
        if (stopped || retryTimer) {
            return;
        }
        retryTimer = setTimeout(() => {
            retryTimer = null;
            void ensureWorkerStarted();
        }, intervalMs);
        if (retryTimer && typeof retryTimer.unref === 'function') {
            retryTimer.unref();
        }
    };

    const ensureWorkerStarted = async () => {
        if (stopped || lockAcquired || acquiring) {
            return;
        }

        acquiring = true;
        const acquired = await tryAcquireWorkerLock(workerId);
        acquiring = false;

        if (!acquired) {
            scheduleRetry();
            return;
        }

        lockAcquired = true;
        await execute();
        timer = setInterval(() => {
            void execute();
        }, intervalMs);
        if (timer && typeof timer.unref === 'function') {
            timer.unref();
        }
    };

    void ensureWorkerStarted();

    return {
        stop: async () => {
            if (stopped) {
                return;
            }
            stopped = true;
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            if (lockAcquired) {
                await releaseWorkerLock();
                lockAcquired = false;
            }
        }
    };
};

const evaluateLowStockState = async ({
    snapshot,
    context = {}
}: {
    snapshot: LowStockSnapshot | null;
    context?: Record<string, unknown>;
}) => {
    if (!snapshot) {
        return;
    }

    if (snapshot.lowStock) {
        await queueLowStockAlerts({ snapshot, context });
    } else {
        await markLowStockResolved(snapshot.productId);
    }
};

const getNotificationLog = async ({
    limit = 50,
    offset = 0,
    status = null
}: {
    limit?: number;
    offset?: number;
    status?: string | null;
} = {}) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let index = 1;

    if (status) {
        conditions.push(`status = $${index}`);
        params.push(status);
        index += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataResult = (await database.query(
        `SELECT id,
                notification_type,
                recipient,
                subject,
                status,
                attempt_count,
                last_error,
                last_attempt_at,
                next_attempt_at,
                payload,
                created_at,
                updated_at
         FROM email_notification_log
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${index} OFFSET $${index + 1}`,
        [...params, limit, offset]
    )) as DbQueryResult<NotificationLogRow>;

    const countResult = (await database.query(
        `SELECT COUNT(*) AS total
         FROM email_notification_log
         ${whereClause}`,
        params
    )) as DbQueryResult<{ total: string }>;

    return {
        data: dataResult.rows.map((row) => ({
            id: row.id,
            notificationType: row.notification_type,
            recipient: row.recipient,
            subject: row.subject,
            status: row.status,
            attemptCount: row.attempt_count,
            lastError: row.last_error,
            lastAttemptAt: row.last_attempt_at,
            nextAttemptAt: row.next_attempt_at,
            payload: row.payload,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        })),
        meta: {
            total: parseInt(countResult.rows[0]?.total || '0', 10),
            limit,
            offset,
            status
        }
    };
};

const notificationService = {
    NOTIFICATION_TYPES,
    getNotificationRecipients,
    queueLowStockAlerts,
    evaluateLowStockState,
    markLowStockResolved,
    processPendingNotifications,
    startNotificationWorker,
    getNotificationLog
};

export {
    NOTIFICATION_TYPES,
    getNotificationRecipients,
    queueLowStockAlerts,
    evaluateLowStockState,
    markLowStockResolved,
    processPendingNotifications,
    startNotificationWorker,
    getNotificationLog
};

export default notificationService;
