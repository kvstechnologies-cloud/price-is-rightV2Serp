import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { users, files, jobs, jobItems, searchEvents, finalChoices, auditLogs } from './drizzle-schema';

// Environment variables for database connection
const DB_HOST = process.env.DB_HOST;
const DB_PORT = parseInt(process.env.DB_PORT || '3306');
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;

// Pool configuration for App Runner (small pool, low max connections)
const DB_POOL_MIN = parseInt(process.env.DB_POOL_MIN || '0');
const DB_POOL_MAX = parseInt(process.env.DB_POOL_MAX || '3');

// Feature flag
const AUDIT_ENABLED = process.env.AUDIT_ENABLED === 'true';

let pool: mysql.Pool | null = null;
let db: any = null;

/**
 * Initialize database connection
 * Returns false if audit is disabled or DB config is missing
 */
export async function initializeDatabase(): Promise<boolean> {
  if (!AUDIT_ENABLED) {
    console.log('🔍 Audit system disabled - AUDIT_ENABLED=false');
    return false;
  }

  if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    console.log('🔍 Audit system disabled - missing database configuration');
    console.log('Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    return false;
  }

  try {
    // Create connection pool
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: DB_POOL_MAX,
      queueLimit: 0,
      // acquireTimeout: 10000, // 10 seconds - not supported in mysql2
      // timeout: 60000, // 60 seconds - REMOVED (not supported in mysql2)
      // reconnect: true, // REMOVED (not supported in mysql2)
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    // Initialize Drizzle
    db = drizzle(pool, { 
      schema: { users, files, jobs, jobItems, searchEvents, finalChoices, auditLogs },
      mode: 'default'
    });

    console.log('✅ Audit database connected successfully');
    console.log(`📊 Pool config: min=${DB_POOL_MIN}, max=${DB_POOL_MAX}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize audit database:', error);
    pool = null;
    db = null;
    return false;
  }
}

/**
 * Get database instance
 * Returns null if not initialized
 */
export function getDatabase() {
  return db;
}

/**
 * Get connection pool
 * Returns null if not initialized
 */
export function getPool() {
  return pool;
}

/**
 * Health check for database connectivity
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; message: string }> {
  if (!pool || !db) {
    return { healthy: false, message: 'Database not initialized' };
  }

  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    return { healthy: true, message: 'Database connection healthy' };
  } catch (error) {
    return { 
      healthy: false, 
      message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Gracefully close database connections
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
      console.log('🔍 Audit database connections closed');
    } catch (error) {
      console.error('❌ Error closing audit database connections:', error);
    } finally {
      pool = null;
      db = null;
    }
  }
}

/**
 * Execute a database operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`🔍 Database operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if audit system is enabled and ready
 */
export function isAuditEnabled(): boolean {
  return AUDIT_ENABLED && db !== null && pool !== null;
}

// Graceful shutdown
process.on('SIGINT', closeDatabase);
process.on('SIGTERM', closeDatabase);
