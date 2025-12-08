// =============================================================================
// Health Check Routes
// =============================================================================
// Health and metrics endpoints for monitoring and container health checks
// =============================================================================

const express = require('express');
const router = express.Router();
const db = require('../utils/database');

/**
 * GET /api/health
 * Basic health check endpoint for container health checks
 */
router.get('/health', async (req, res) => {
  const status = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  res.status(200).json(status);
});

/**
 * GET /api/health/ready
 * Readiness check - includes database connectivity
 */
router.get('/health/ready', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await db.checkConnection();

    if (!dbStatus.healthy) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'unhealthy', error: dbStatus.error }
        }
      });
    }

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: 'healthy', timestamp: dbStatus.timestamp }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * GET /api/health/live
 * Liveness check - basic check that the process is running
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/metrics
 * Basic metrics endpoint for monitoring
 */
router.get('/metrics', async (req, res) => {
  try {
    const dbStats = db.getPoolStats();
    const memoryUsage = process.memoryUsage();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB',
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB'
      },
      database: {
        poolTotal: dbStats.total,
        poolIdle: dbStats.idle,
        poolWaiting: dbStats.waiting
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      }
    };

    res.status(200).json(metrics);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

module.exports = router;
