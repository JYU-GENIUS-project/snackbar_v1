import type { NextFunction, Request, Response } from 'express';

// =============================================================================
// Request Logger Middleware
// =============================================================================
// Custom request logging for audit and debugging purposes
// =============================================================================

declare module 'express-serve-static-core' {
  interface Request {
    startTime?: number;
  }
}

/**
 * Request logging middleware
 * Logs request details for debugging and monitoring
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Start time for response time calculation
  req.startTime = Date.now();

  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end to log after response
  res.end = ((...args: Parameters<Response['end']>) => {
    // Call original end
    originalEnd(...args);

    // Calculate response time
    const responseTime = Date.now() - (req.startTime ?? Date.now());

    // Only log in debug mode or for errors
    if (process.env.LOG_LEVEL === 'debug' || res.statusCode >= 400) {
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      if (res.statusCode >= 400) {
        console.warn('[Request]', JSON.stringify(logData));
      } else {
        console.log('[Request]', JSON.stringify(logData));
      }
    }

    return res;
  }) as Response['end'];

  next();
};
