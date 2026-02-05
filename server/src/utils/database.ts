'use strict';

// =============================================================================
// Database Connection Pool
// =============================================================================
// PostgreSQL connection management using node-postgres (pg)
// Based on C4 Architecture and ADR-002 PostgreSQL Database
// =============================================================================

import type { PoolClient, QueryResult, QueryResultRow } from 'pg';
import { Pool } from 'pg';

// =============================================================================
// Connection Pool Configuration
// =============================================================================

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '', 10) || 5432,
    database: process.env.DB_NAME || 'snackbar_prod',
    user: process.env.DB_USER || 'snackbar_app',
    password: process.env.DB_PASSWORD,

    // Pool configuration
    min: Number.parseInt(process.env.POOL_MIN ?? '', 10) || 2,
    max: Number.parseInt(process.env.POOL_MAX ?? '', 10) || 10,

    // Idle timeout
    idleTimeoutMillis: 30000,

    // Connection timeout
    connectionTimeoutMillis: 5000,

    // SSL configuration
    // In production, set DB_SSL=require and ensure proper certificate validation
    // rejectUnauthorized: false is only safe for development environments
    ssl: process.env.DB_SSL === 'require'
        ? {
            rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
        : false
});

// =============================================================================
// Event Handlers
// =============================================================================

pool.on('connect', () => {
    console.log('[Database] New client connected to PostgreSQL');
});

pool.on('error', (err) => {
    console.error('[Database] Unexpected error on idle client:', err);
});

// =============================================================================
// Query Helper Functions
// =============================================================================

/**
 * Execute a query with parameterized values
 * @param text - SQL query text
 * @param params - Query parameters
 * @returns Query result
 */
const query = async <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
): Promise<QueryResult<T>> => {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_LEVEL === 'debug') {
        console.log('[Database] Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
};

/**
 * Get a client from the pool for transactions
 * @returns Database client
 */
const getClient = async (): Promise<PoolClient> => {
    const client = await pool.connect();

    // Wrap release to log errors
    const release = client.release.bind(client);
    const timeout = setTimeout(() => {
        console.error('[Database] Client has been checked out for more than 5 seconds!');
    }, 5000);

    client.release = () => {
        clearTimeout(timeout);
        return release();
    };

    return client;
};

/**
 * Execute a transaction with automatic commit/rollback
 * @param callback - Async function receiving the client
 * @returns Transaction result
 */
const transaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = await getClient();

    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

type DbHealthStatus = {
    healthy: boolean;
    timestamp?: string | Date;
    error?: string;
};

/**
 * Check database connection health
 * @returns Connection status
 */
const checkConnection = async (): Promise<DbHealthStatus> => {
    try {
        const result = await query<{ current_time: Date }>('SELECT NOW() as current_time');
        const timestamp = result.rows[0]?.current_time;
        return timestamp ? { healthy: true, timestamp } : { healthy: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { healthy: false, error: message };
    }
};

/**
 * Get pool statistics
 * @returns Pool stats
 */
const getPoolStats = () => ({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
});

// =============================================================================
// Exports
// =============================================================================

const database = {
    pool,
    query,
    getClient,
    transaction,
    checkConnection,
    getPoolStats
};

export = database;
