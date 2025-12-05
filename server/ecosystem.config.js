// =============================================================================
// PM2 Ecosystem Configuration for Snackbar API
// =============================================================================
// Based on C4 Architecture Section 4.4
//
// PM2 provides:
// - Process clustering for multi-core utilization
// - Automatic restart on crashes
// - Log management with rotation
// - Memory limit enforcement
// =============================================================================

module.exports = {
  apps: [{
    // Application name (used in PM2 commands)
    name: 'snackbar-api',
    
    // Entry point script
    script: './src/server.js',
    
    // Clustering configuration
    instances: process.env.NODE_ENV === 'production' ? 2 : 1,
    exec_mode: 'cluster',
    
    // Environment variables
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // Logging configuration
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Auto-restart configuration
    max_memory_restart: '1G',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    
    // Watch configuration (development only)
    watch: process.env.NODE_ENV !== 'production',
    ignore_watch: ['node_modules', 'logs', 'uploads'],
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
