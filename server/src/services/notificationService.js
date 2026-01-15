'use strict';

const nodemailer = require('nodemailer');
const db = require('../utils/database');

const RETRY_SCHEDULE_MINUTES = [1, 5, 15];
const NOTIFICATION_TYPES = {
  LOW_STOCK: 'inventory.low_stock'
};

let transport = null;

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
    return value;
  }
};

const getNotificationRecipients = async () => {
  const result = await db.query(
    'SELECT value FROM system_config WHERE key = $1 LIMIT 1',
    ['notification_recipients']
  );

  if (result.rows.length === 0) {
    return [];
  }

  const value = parseConfigValue(result.rows[0].value);
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string' && entry.includes('@'));
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
}) => {
  await db.query(
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

const hasActiveLowStockAlert = async (productId) => {
  const result = await db.query(
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

const markLowStockResolved = async (productId) => {
  await db.query(
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

const queueLowStockAlerts = async ({ snapshot, context }) => {
  const recipients = await getNotificationRecipients();
  if (!recipients.length) {
    return { queued: 0, reason: 'no-recipients-configured' };
  }

  const active = await hasActiveLowStockAlert(snapshot.productId);
  if (active) {
    return { queued: 0, reason: 'alert-already-active' };
  }

  const subject = `[Snackbar] Low stock: ${snapshot.name}`;
  const payload = {
    productId: snapshot.productId,
    productName: snapshot.name,
    currentStock: snapshot.currentStock,
    lowStockThreshold: snapshot.lowStockThreshold,
    triggeredAt: new Date().toISOString(),
    context
  };

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

const renderLowStockEmail = ({ productName, currentStock, lowStockThreshold }) => {
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

const sendNotification = async ({ notification }) => {
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

const scheduleNextAttempt = (attemptNumber) => {
  const scheduleMinutes = RETRY_SCHEDULE_MINUTES[attemptNumber - 1];
  if (!scheduleMinutes) {
    return null;
  }

  const nextAttempt = new Date();
  nextAttempt.setMinutes(nextAttempt.getMinutes() + scheduleMinutes);
  return nextAttempt;
};

const finalizeAttempt = async ({ notificationId, attemptNumber, status, error = null, nextAttempt = null }) => {
  await db.query(
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

const attemptDelivery = async (notification, workerId) => {
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
      error: error.message?.slice(0, 512) || 'Unknown error',
      nextAttempt
    });
    return { id: notification.id, status, error };
  }
};

const claimPendingNotifications = async ({ limit, workerId }) => db.transaction(async (client) => {
  const { rows } = await client.query(
    `SELECT *
         FROM email_notification_log
         WHERE status = 'pending'
           AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
           AND (locked_at IS NULL OR locked_at <= NOW() - INTERVAL '5 minutes')
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
    [limit]
  );

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

const processPendingNotifications = async ({ limit = 10, workerId = 'notification-worker' } = {}) => {
  const claimed = await claimPendingNotifications({ limit, workerId });
  if (!claimed.length) {
    return [];
  }

  const results = [];
  // Process sequentially to simplify failure handling
  for (const notification of claimed) {
    const outcome = await attemptDelivery(notification, workerId);
    results.push(outcome);
  }

  return results;
};

const evaluateLowStockState = async ({ snapshot, context = {} }) => {
  if (!snapshot) {
    return;
  }

  if (snapshot.lowStock) {
    await queueLowStockAlerts({ snapshot, context });
  } else {
    await markLowStockResolved(snapshot.productId);
  }
};

const startNotificationWorker = ({ intervalMs = 60000, workerId = 'notification-worker' } = {}) => {
  if (process.env.NOTIFICATION_WORKER_ENABLED === 'false') {
    return null;
  }

  const execute = async () => {
    try {
      await processPendingNotifications({ workerId });
    } catch (error) {
      console.error('[NotificationWorker] Failed to process notifications', error);
    }
  };

  execute();
  const timer = setInterval(execute, intervalMs);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return {
    stop: () => clearInterval(timer)
  };
};

const getNotificationLog = async ({ limit = 50, offset = 0, status = null }) => {
  const conditions = [];
  const params = [];
  let index = 1;

  if (status) {
    conditions.push('status = $' + index);
    params.push(status);
    index += 1;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataResult = await db.query(
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
  );

  const countResult = await db.query(
    `SELECT COUNT(*) AS total
         FROM email_notification_log
         ${whereClause}`,
    params
  );

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

module.exports = {
  NOTIFICATION_TYPES,
  getNotificationRecipients,
  queueLowStockAlerts,
  evaluateLowStockState,
  markLowStockResolved,
  processPendingNotifications,
  startNotificationWorker,
  getNotificationLog
};
