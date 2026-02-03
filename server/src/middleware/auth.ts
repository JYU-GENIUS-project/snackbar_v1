import jwt, { type JwtPayload } from 'jsonwebtoken';
import { ApiError } from './errorHandler';
import db from '../utils/database';
import type { NextFunction, Request, Response } from 'express';

// =============================================================================
// Authentication Middleware
// =============================================================================
// JWT verification and session timeout handling
// Based on SRS FR-5.1 (JWT Authentication) and FR-5.4 (30-minute timeout)
// =============================================================================

type AuthUser = {
  id: string;
  username: string;
  sessionId: string;
};

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

type SessionTokenPayload = JwtPayload & {
  sessionId: string;
  userId: string;
};

const JWT_SECRET = process.env.JWT_SECRET || '';
const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || '', 10) || 1800000; // 30 minutes

/**
 * Verify JWT token and check session validity
 */
export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query && req.query.token) {
      const raw = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
      if (typeof raw === 'string' && raw.trim().length > 0) {
        token = raw.trim();
      }
    }

    if (!token) {
      throw new ApiError(401, 'No authentication token provided');
    }

    // Verify JWT
    let decoded: SessionTokenPayload;
    try {
      const verified = jwt.verify(token, JWT_SECRET);
      if (typeof verified === 'string') {
        throw new ApiError(401, 'Invalid authentication token');
      }
      decoded = verified as SessionTokenPayload;
    } catch (jwtError: unknown) {
      if (jwtError instanceof Error && jwtError.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Token has expired');
      }
      throw new ApiError(401, 'Invalid authentication token');
    }

    // Check if session exists and is still valid
    const sessionResult = (await db.query(
      `SELECT s.*, a.username, a.is_active
       FROM admin_sessions s
       JOIN admins a ON s.admin_id = a.id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [decoded.sessionId]
    )) as { rows: Array<{ username: string; is_active: boolean; last_activity_at: string | Date }> };

    if (sessionResult.rows.length === 0) {
      throw new ApiError(401, 'Session has expired or is invalid');
    }

    const session = sessionResult.rows[0];
    if (!session) {
      throw new ApiError(401, 'Session has expired or is invalid');
    }

    // Check if admin is still active
    if (!session.is_active) {
      throw new ApiError(401, 'Admin account is deactivated');
    }

    // Check for session timeout due to inactivity (30 minutes)
    const lastActivity = new Date(session.last_activity_at);
    const now = new Date();
    const inactivityMs = now.getTime() - lastActivity.getTime();

    if (inactivityMs > SESSION_TIMEOUT_MS) {
      // Delete expired session
      await db.query('DELETE FROM admin_sessions WHERE id = $1', [decoded.sessionId]);
      throw new ApiError(401, 'Session expired due to inactivity');
    }

    // Update last activity timestamp
    await db.query('UPDATE admin_sessions SET last_activity_at = NOW() WHERE id = $1', [decoded.sessionId]);

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      username: session.username,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await authenticate(req, res, next);
  } catch {
    // Ignore auth errors for optional auth
    next();
  }
};
