import type { NextFunction, Request, Response } from 'express';

// =============================================================================
// Error Handler Middleware
// =============================================================================
// Centralized error handling for the Express API
// =============================================================================

export type ApiErrorDetails = Record<string, unknown> | string | null;

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  statusCode: number;
  details: ApiErrorDetails;
  isOperational: boolean;

  constructor(statusCode: number, message: string, details: ApiErrorDetails = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export type ErrorWithMeta = Error & {
  statusCode?: number;
  details?: ApiErrorDetails;
  code?: string;
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Resource not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (err: ErrorWithMeta, req: Request, res: Response, _next: NextFunction) => {
  // Default to 500 internal server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Log error
  console.error('[Error]', {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.details || err.message;
  }

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
