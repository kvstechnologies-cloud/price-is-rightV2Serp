import { initializeDatabase } from './db';
import { initializeS3 } from './s3';
import { Audit } from './audit.service';
import logsRouter from './logs.routes';

/**
 * Initialize the audit system
 * Returns true if successfully initialized, false otherwise
 */
export async function initializeAuditSystem(): Promise<boolean> {
  try {
    console.log('🔍 Initializing audit system...');

    // Initialize database
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized) {
      console.log('🔍 Audit system disabled - database not available');
      return false;
    }

    // Initialize S3
    const s3Initialized = initializeS3();
    if (!s3Initialized) {
      console.log('🔍 Audit system partially enabled - S3 not available');
      // Continue without S3 - file uploads won't work but other audit features will
    }

    console.log('✅ Audit system initialized successfully');
    return true;

  } catch (error) {
    console.error('❌ Failed to initialize audit system:', error);
    return false;
  }
}

/**
 * Get audit service for integration
 */
export { Audit };

/**
 * Get logs router for mounting in main app
 */
export { logsRouter };

/**
 * Re-export types for convenience
 */
export type { 
  User, 
  SingleSearchInput, 
  FileJobInput, 
  ImageJobInput,
  FileMeta,
  JobMeta,
  JobItem,
  SearchEvent,
  FinalChoice,
  JobSummary,
  DashboardSummary
} from '../types/audit';

/**
 * Re-export database utilities
 */
export { 
  isAuditEnabled, 
  checkDatabaseHealth,
  getDatabase 
} from './db';

/**
 * Re-export S3 utilities
 */
export { 
  isS3Enabled, 
  buildS3Key, 
  uploadToS3, 
  calculateSHA256 
} from './s3';

/**
 * Re-export authentication utilities
 */
export { 
  getUser, 
  isAuthenticated, 
  getUserId 
} from './auth';

/**
 * Get audit system status
 */
export function getAuditStatus() {
  const { isAuditEnabled } = require('./db');
  const { isS3Enabled } = require('./s3');
  
  return {
    auditEnabled: isAuditEnabled(),
    s3Enabled: isS3Enabled(),
    timestamp: new Date().toISOString(),
  };
}
