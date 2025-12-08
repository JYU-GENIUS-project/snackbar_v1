// =============================================================================
// Rate Limiter Middleware
// =============================================================================
// Simple in-memory rate limiting for API protection
// Nginx also provides rate limiting at the proxy level
// =============================================================================

// In-memory store for rate limiting (use Redis in production for multi-instance)
const requestCounts = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.firstRequest > data.windowMs) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.max - Maximum requests per window (default: 100)
 * @param {string} options.message - Error message when rate limited
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100,
    message = 'Too many requests, please try again later.'
  } = options;

  return (req, res, next) => {
    // Use IP address as identifier
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    let clientData = requestCounts.get(key);

    if (!clientData || now - clientData.firstRequest > windowMs) {
      // New window or window expired
      clientData = {
        count: 1,
        firstRequest: now,
        windowMs
      };
      requestCounts.set(key, clientData);
    } else {
      clientData.count++;
    }

    // Check if rate limit exceeded
    if (clientData.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          message,
          retryAfter: Math.ceil((clientData.firstRequest + windowMs - now) / 1000)
        }
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientData.count));
    res.setHeader('X-RateLimit-Reset', new Date(clientData.firstRequest + windowMs).toISOString());

    next();
  };
};

// Pre-configured rate limiters
const rateLimiters = {
  // General API rate limit
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: 'Too many API requests, please try again later.'
  }),

  // Stricter limit for auth endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many authentication attempts, please try again later.'
  }),

  // Very strict limit for login
  login: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many login attempts, please try again in an hour.'
  })
};

module.exports = {
  createRateLimiter,
  rateLimiters
};
