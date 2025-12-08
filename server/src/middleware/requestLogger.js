// =============================================================================
// Request Logger Middleware
// =============================================================================
// Custom request logging for audit and debugging purposes
// =============================================================================

/**
 * Request logging middleware
 * Logs request details for debugging and monitoring
 */
const requestLogger = (req, res, next) => {
  // Start time for response time calculation
  req.startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end to log after response
  res.end = function(chunk, encoding) {
    // Call original end
    originalEnd.call(this, chunk, encoding);

    // Calculate response time
    const responseTime = Date.now() - req.startTime;

    // Only log in debug mode or for errors
    if (process.env.LOG_LEVEL === 'debug' || res.statusCode >= 400) {
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      };

      if (res.statusCode >= 400) {
        console.warn('[Request]', JSON.stringify(logData));
      } else {
        console.log('[Request]', JSON.stringify(logData));
      }
    }
  };

  next();
};

module.exports = { requestLogger };
