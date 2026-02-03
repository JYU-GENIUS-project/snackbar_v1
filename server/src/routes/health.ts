import { Router, type Request, type Response } from 'express';
import db from '../utils/database';

// =============================================================================
// Health Check Routes
// =============================================================================
// Health and metrics endpoints for monitoring and container health checks
// =============================================================================

const router = Router();

/**
 * GET /api/health
 * Basic health check endpoint for container health checks
 */
router.get('/health', (_req: Request, res: Response) => {
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
type ConnectionStatus = { healthy: true; timestamp: string } | { healthy: false; error: string };
type PoolStats = { total: number; idle: number; waiting: number };

router.get('/health/ready', (_req: Request, res: Response) => {
  void db
    .checkConnection()
    .then((status) => status as unknown as ConnectionStatus)
    .then((dbStatus) => {
      if (!dbStatus.healthy) {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: { status: 'unhealthy', error: dbStatus.error }
          }
        });
        return;
      }

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'healthy', timestamp: dbStatus.timestamp }
        }
      });
    })
    .catch((error: unknown) => {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
});

/**
 * GET /api/health/live
 * Liveness check - basic check that the process is running
 */
router.get('/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/metrics
 * Basic metrics endpoint for monitoring
 */
router.get('/metrics', (_req: Request, res: Response) => {
  try {
    const dbStats = db.getPoolStats() as PoolStats;
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
  } catch (error: unknown) {
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
