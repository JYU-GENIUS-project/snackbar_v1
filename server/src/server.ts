// =============================================================================
// Express.js API Server Entry Point
// =============================================================================
// Self-Service Snack Bar Kiosk System - Main Server File
// Based on C4 Architecture and ADR-003 PERN Technology Stack
// =============================================================================

import path from 'path';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import compression from 'compression';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiters } from './middleware/rateLimiter';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admins';
import categoryRoutes from './routes/categories';
import productRoutes from './routes/products';
import feedRoutes from './routes/feed';
import inventoryRoutes from './routes/inventory';
import notificationRoutes from './routes/notifications';
import transactionRoutes from './routes/transactions';
import statusRoutes from './routes/status';
import mediaStorage from './utils/mediaStorage';
import notificationService from './services/notificationService';
import db from './utils/database';

// Load environment variables from project root (fallback to local .env)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

// =============================================================================
// Application Setup
// =============================================================================

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const CLIENT_DIST_DIR = path.resolve(__dirname, '../../client/dist');

// Ensure upload directories are present before handling any requests
mediaStorage.ensureStorageStructure();

// =============================================================================
// Security Middleware
// =============================================================================

// Helmet for security headers
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    })
);

// CORS configuration
const corsOptions: CorsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400, // 24 hours
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

// Serve admin portal static assets
app.use('/admin', express.static(CLIENT_DIST_DIR, { index: false }));

// SPA fallback for admin routes
const serveAdminApp = (req: Request, res: Response, next: NextFunction) => {
    try {
        res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
    } catch (error) {
        next(error);
    }
};

app.get('/admin', serveAdminApp);
app.get(/\/admin\/.*/, serveAdminApp);

// Serve kiosk bundle and shared static assets
app.use(express.static(CLIENT_DIST_DIR, { index: false }));

const serveKioskApp = (req: Request, res: Response, next: NextFunction) => {
    try {
        res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
    } catch (error) {
        next(error);
    }
};

app.get('/', serveKioskApp);
app.get(/^(?!\/(?:api|admin|uploads)\/).*/, serveKioskApp);

// Serve media assets
app.use(
    '/uploads',
    express.static(mediaStorage.getBaseDirectory(), {
        index: false,
        maxAge: '1h',
        setHeaders: (res) => {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        },
    })
);

// Request logging (Morgan)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(process.env.LOG_FORMAT === 'json' ? 'combined' : 'dev'));
}

// Custom request logger (for audit purposes)
app.use(requestLogger);

// Trust proxy (for getting real IP behind Nginx)
app.set('trust proxy', 1);

// =============================================================================
// Notification Worker
// =============================================================================

type NotificationWorkerHandle = {
    stop: () => Promise<void> | void;
};

let notificationWorkerHandle: NotificationWorkerHandle | null = null;
if (process.env.NODE_ENV !== 'test') {
    notificationWorkerHandle = notificationService.startNotificationWorker({
        workerId: 'api-process',
    }) as NotificationWorkerHandle | null;
}

// =============================================================================
// API Routes
// =============================================================================

const authLimiter = rateLimiters.auth as unknown as RequestHandler;
const apiLimiter = rateLimiters.api as unknown as RequestHandler;

// Health check endpoints (no rate limiting needed)
app.use('/api', healthRoutes);

// Authentication routes (stricter rate limiting)
app.use('/api/auth', authLimiter, authRoutes);

// Admin management routes (standard API rate limiting)
app.use('/api/admins', apiLimiter, adminRoutes);

// Category management routes
app.use('/api/categories', apiLimiter, categoryRoutes);

// Product catalog routes
app.use('/api/products', apiLimiter, productRoutes);

// Product feed routes
app.use('/api/feed', apiLimiter, feedRoutes);

// Kiosk status routes
app.use('/api/status', apiLimiter, statusRoutes);

// Inventory management routes
app.use('/api/inventory', apiLimiter, inventoryRoutes);

// Notification log routes
app.use('/api/notifications', apiLimiter, notificationRoutes);

// Customer transaction routes
app.use('/api/transactions', apiLimiter, transactionRoutes);

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

type ShutdownSignal = 'SIGTERM' | 'SIGINT' | 'UNCAUGHT_EXCEPTION';

const gracefulShutdown = (signal: ShutdownSignal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    if (notificationWorkerHandle) {
        void notificationWorkerHandle.stop();
    }

    server.close(() => {
        console.log('HTTP server closed.');

        // Close database connections
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
