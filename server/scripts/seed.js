#!/usr/bin/env node
// =============================================================================
// Database Seed Script
// =============================================================================
// Seeds the primary admin account for initial setup
// Usage: node scripts/seed.js
// =============================================================================

require('dotenv').config();

const db = require('../src/utils/database');
const adminService = require('../src/services/adminService');

const DEFAULT_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'SecurePass123!';
const DEFAULT_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@snackbar.local';

async function seed() {
  console.log('='.repeat(60));
  console.log('Snackbar Kiosk System - Database Seed');
  console.log('='.repeat(60));
  
  try {
    // Check database connection
    console.log('\nChecking database connection...');
    const dbStatus = await db.checkConnection();
    
    if (!dbStatus.healthy) {
      console.error('Database connection failed:', dbStatus.error);
      process.exit(1);
    }
    
    console.log('Database connected successfully.');
    
    // Seed primary admin
    console.log('\nSeeding primary admin account...');
    const admin = await adminService.seedPrimaryAdmin(
      DEFAULT_ADMIN_USERNAME,
      DEFAULT_ADMIN_PASSWORD,
      DEFAULT_ADMIN_EMAIL
    );
    
    if (admin) {
      console.log('\n✓ Primary admin created:');
      console.log(`  Username: ${admin.username}`);
      console.log(`  Email:    ${admin.email}`);
      console.log(`  ID:       ${admin.id}`);
      console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
    } else {
      console.log('Admin accounts already exist. No seed needed.');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('Seed completed successfully');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\nSeed failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

seed();
