import type { NextFunction, Request, Response } from 'express';

// =============================================================================
// Rate Limiter Middleware
// =============================================================================
// Simple in-memory rate limiting for API protection
// Nginx also provides rate limiting at the proxy level
// =============================================================================

type RateLimitStateEntry = {
    enabled: boolean;
    identifier: string | null;
    count: number;
    limit: number;
    remaining: number;
    resetTime: Date | null;
    windowMs: number;
};

type RateLimitState = Record<string, RateLimitStateEntry>;

declare module 'express-serve-static-core' {
    interface Request {
        rateLimitState?: RateLimitState;
    }
}

// In-memory store for rate limiting (use Redis in production for multi-instance)
const requestCounts = new Map<string, { count: number; firstRequest: number; windowMs: number }>();

const isProduction = process.env.NODE_ENV === 'production';

const defaultIdentifier = (req: Request) => {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
        if (first) {
            return first.trim();
        }
    }
    return req.ip || req.connection?.remoteAddress || 'unknown';
};

const parseEnvInt = (key: string, fallback: number) => {
    const value = process.env[key];
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

// Clean up old entries periodically (disabled in test environments to avoid open handles)
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, data] of requestCounts.entries()) {
            if (now - data.firstRequest > data.windowMs) {
                requestCounts.delete(key);
            }
        }
    }, 60000); // Clean up every minute
}

type RateLimiterOptions = {
    windowMs?: number;
    max?: number;
    message?: string;
    identifier?: (req: Request) => string | undefined | null;
    enabled?: boolean;
    name?: string;
};

/**
 * Create a rate limiter middleware
 */
export const createRateLimiter = (options: RateLimiterOptions = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        max = 100,
        message = 'Too many requests, please try again later.',
        identifier = defaultIdentifier,
        enabled = true,
        name = 'rate-limit'
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        const state = req.rateLimitState || (req.rateLimitState = {});

        if (!enabled) {
            state[name] = {
                enabled: false,
                identifier: null,
                count: 0,
                limit: max,
                remaining: max,
                resetTime: null,
                windowMs
            };
            res.setHeader('X-RateLimit-Limit', 'disabled');
            res.setHeader('X-RateLimit-Remaining', 'disabled');
            res.setHeader('X-RateLimit-Reset', 'disabled');
            return next();
        }

        // Use IP address as identifier
        const id = identifier(req) || 'unknown';
        const key = `${name}:${id}`;
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

        const resetTimestamp = clientData.firstRequest + windowMs;
        const remaining = Math.max(0, max - clientData.count);

        state[name] = {
            enabled: true,
            identifier: id,
            count: clientData.count,
            limit: max,
            remaining,
            resetTime: new Date(resetTimestamp),
            windowMs
        };

        // Check if rate limit exceeded
        if (clientData.count > max) {
            return res.status(429).json({
                success: false,
                error: {
                    message,
                    retryAfter: Math.ceil((resetTimestamp - now) / 1000)
                }
            });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', new Date(resetTimestamp).toISOString());

        next();
    };
};

// Pre-configured rate limiters
type RateLimiters = {
    api: ReturnType<typeof createRateLimiter>;
    auth: ReturnType<typeof createRateLimiter>;
    login: ReturnType<typeof createRateLimiter>;
    reset: (name: string, identifier: string) => void;
};

export const rateLimiters: RateLimiters = {
    // General API rate limit
    api: createRateLimiter({
        name: 'api',
        windowMs: parseEnvInt('API_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
        max: parseEnvInt('API_RATE_LIMIT_MAX', isProduction ? 100 : 500),
        message: process.env.API_RATE_LIMIT_MESSAGE || 'Too many API requests, please try again later.'
    }),

    // Stricter limit for auth endpoints
    auth: createRateLimiter({
        name: 'auth',
        windowMs: parseEnvInt('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
        max: parseEnvInt('AUTH_RATE_LIMIT_MAX', isProduction ? 10 : 200),
        message: process.env.AUTH_RATE_LIMIT_MESSAGE || 'Too many authentication attempts, please try again later.'
    }),

    // Very strict limit for login
    login: createRateLimiter({
        name: 'login',
        windowMs: parseEnvInt('LOGIN_RATE_LIMIT_WINDOW_MS', 60 * 60 * 1000),
        max: parseEnvInt('LOGIN_RATE_LIMIT_MAX', isProduction ? 5 : 100),
        message: process.env.LOGIN_RATE_LIMIT_MESSAGE || 'Too many login attempts, please try again later.',
        enabled: process.env.LOGIN_RATE_LIMIT_ENABLED === 'true' || isProduction
    }),
    reset: (name: string, identifier: string) => {
        if (!name || !identifier) {
            return;
        }

        const key = `${name}:${identifier}`;
        requestCounts.delete(key);
    }
};
