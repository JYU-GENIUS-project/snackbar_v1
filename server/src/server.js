// =============================================================================
// Express.js API Server Entry Point
// =============================================================================
// Self-Service Snack Bar Kiosk System - Main Server File
// Based on C4 Architecture and ADR-003 PERN Technology Stack
// =============================================================================

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { rateLimiters } = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admins');

// =============================================================================
// Application Setup
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'blob:'],
      connectSrc: ['\'self\''],
      fontSrc: ['\'self\''],
      objectSrc: ['\'none\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\'']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// =============================================================================
// Request Processing Middleware
// =============================================================================

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (Morgan)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.LOG_FORMAT === 'json' ? 'combined' : 'dev'));
}

// Custom request logger (for audit purposes)
app.use(requestLogger);

// Trust proxy (for getting real IP behind Nginx)
app.set('trust proxy', 1);

// =============================================================================
// API Routes
// =============================================================================

// Health check endpoints (no rate limiting needed)
app.use('/api', healthRoutes);

// Authentication routes (stricter rate limiting)
app.use('/api/auth', rateLimiters.auth, authRoutes);

// Admin management routes (standard API rate limiting)
app.use('/api/admins', rateLimiters.api, adminRoutes);

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================================================
// Server Startup
// =============================================================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         Snackbar Kiosk API Server                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     Running                                          ║
║  Port:       ${PORT}                                              ║
║  Mode:       ${process.env.NODE_ENV || 'development'}                                     ║
║  Health:     http://localhost:${PORT}/api/health                   ║
╚═══════════════════════════════════════════════════════════════╝
  `);

  // Signal PM2 that the app is ready
  if (process.send) {
    process.send('ready');
  }
});

// =============================================================================
// Graceful Shutdown
// =============================================================================

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed.');

    // Close database connections
    const db = require('./utils/database');
    db.pool.end(() => {
      console.log('Database connections closed.');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
