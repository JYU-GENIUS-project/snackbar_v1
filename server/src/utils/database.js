// =============================================================================
// Database Connection Pool
// =============================================================================
// PostgreSQL connection management using node-postgres (pg)
// Based on C4 Architecture and ADR-002 PostgreSQL Database
// =============================================================================

const { Pool } = require('pg');

// =============================================================================
// Connection Pool Configuration
// =============================================================================

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'snackbar_prod',
  user: process.env.DB_USER || 'snackbar_app',
  password: process.env.DB_PASSWORD,

  // Pool configuration
  min: parseInt(process.env.POOL_MIN, 10) || 2,
  max: parseInt(process.env.POOL_MAX, 10) || 10,

  // Idle timeout
  idleTimeoutMillis: 30000,

  // Connection timeout
  connectionTimeoutMillis: 5000,

  // SSL configuration
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: false } : false
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
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params) => {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (process.env.LOG_LEVEL === 'debug') {
    console.log('[Database] Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
  }

  return result;
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Database client
 */
const getClient = async () => {
  const client = await pool.connect();

  // Wrap release to log errors
  const release = client.release;
  const timeout = setTimeout(() => {
    console.error('[Database] Client has been checked out for more than 5 seconds!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    return release.apply(client);
  };

  return client;
};

/**
 * Execute a transaction with automatic commit/rollback
 * @param {Function} callback - Async function receiving the client
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback) => {
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

/**
 * Check database connection health
 * @returns {Promise<boolean>} Connection status
 */
const checkConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    return { healthy: true, timestamp: result.rows[0].current_time };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

/**
 * Get pool statistics
 * @returns {Object} Pool stats
 */
const getPoolStats = () => ({
  total: pool.totalCount,
  idle: pool.idleCount,
  waiting: pool.waitingCount
});

// =============================================================================
// Exports
// =============================================================================

module.exports = {
  pool,
  query,
  getClient,
  transaction,
  checkConnection,
  getPoolStats
};
