const express = require('express');
const statusService = require('../services/statusService');
const statusEvents = require('../services/statusEvents');

const router = express.Router();

router.get('/kiosk', async (req, res, next) => {
  try {
    const status = await statusService.getKioskStatus({});
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

router.get('/events', async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write(': connected\n\n');

    const clientId = await statusEvents.registerClient({ res });

    const cleanup = () => statusEvents.removeClient(clientId);
    req.on('close', cleanup);
    req.on('end', cleanup);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
