'use strict';

const { randomUUID } = require('crypto');
const statusService = require('./statusService');

const EVENT_TYPES = {
  STATUS_UPDATE: 'status:update'
};

const POLL_INTERVAL_MS = 5000;
const KEEP_ALIVE_INTERVAL_MS = 15000;

const clients = new Map();
let pollTimer = null;
let keepAliveTimer = null;
let latestStatus = null;
let evaluating = false;

const removeClient = (id) => {
  const client = clients.get(id);
  if (client && client.res && !client.res.writableEnded) {
    try {
      client.res.end();
    } catch (error) {
      console.error('[StatusEvents] Error while closing SSE connection', { id, error });
    }
  }
  clients.delete(id);

  if (!clients.size) {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
  }
};

const broadcast = (status) => {
  const payload = JSON.stringify(status);
  for (const [id, client] of clients.entries()) {
    try {
      client.res.write(`event: ${EVENT_TYPES.STATUS_UPDATE}\ndata: ${payload}\n\n`);
    } catch (error) {
      console.error('[StatusEvents] Failed to notify client, removing subscription', { id, error });
      removeClient(id);
    }
  }
};

const evaluateAndBroadcast = async (force = false) => {
  if (evaluating) {
    return;
  }

  evaluating = true;
  try {
    const status = await statusService.getKioskStatus();
    if (force || statusService.statusHasChanged(latestStatus, status)) {
      latestStatus = status;
      broadcast(status);
    }
  } catch (error) {
    console.error('[StatusEvents] Failed to evaluate kiosk status', error);
  } finally {
    evaluating = false;
  }
};

const ensurePollTimer = () => {
  if (pollTimer || clients.size === 0) {
    return;
  }

  pollTimer = setInterval(() => {
    evaluateAndBroadcast(false);
  }, POLL_INTERVAL_MS);

  if (typeof pollTimer.unref === 'function') {
    pollTimer.unref();
  }
};

const ensureKeepAlive = () => {
  if (keepAliveTimer || clients.size === 0) {
    return;
  }

  keepAliveTimer = setInterval(() => {
    for (const [id, client] of clients.entries()) {
      try {
        client.res.write(': keep-alive\n\n');
      } catch (error) {
        console.error('[StatusEvents] Failed to send keep-alive, removing client', { id, error });
        removeClient(id);
      }
    }

    if (clients.size === 0) {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }
  }, KEEP_ALIVE_INTERVAL_MS);

  if (typeof keepAliveTimer.unref === 'function') {
    keepAliveTimer.unref();
  }
};

const registerClient = async ({ res }) => {
  const id = randomUUID();
  clients.set(id, { res });

  try {
    const status = latestStatus || await statusService.getKioskStatus();
    latestStatus = status;
    res.write(`event: status:init\ndata: ${JSON.stringify(status)}\n\n`);
  } catch (error) {
    console.error('[StatusEvents] Failed to send initial status payload', error);
  }

  ensurePollTimer();
  ensureKeepAlive();
  return id;
};

const triggerImmediateRefresh = () => {
  evaluateAndBroadcast(true);
};

module.exports = {
  EVENT_TYPES,
  registerClient,
  removeClient,
  triggerImmediateRefresh
};
