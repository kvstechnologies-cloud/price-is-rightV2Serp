// Simple JavaScript version of the audit system
// This provides basic functionality until we can set up TypeScript compilation

// Ensure environment variables are loaded
require('dotenv').config();

const mysql = require('mysql2/promise');
const express = require('express');

// Conditional AWS SDK imports - only load if audit is enabled
let S3Client, PutObjectCommand, GetObjectCommand, getSignedUrl;

try {
  if (process.env.AUDIT_ENABLED === 'true') {
    const awsS3 = require('@aws-sdk/client-s3');
    const awsPresigner = require('@aws-sdk/s3-request-presigner');
    
    S3Client = awsS3.S3Client;
    PutObjectCommand = awsS3.PutObjectCommand;
    GetObjectCommand = awsS3.GetObjectCommand;
    getSignedUrl = awsPresigner.getSignedUrl;
    
    console.log('✅ AWS SDK modules loaded successfully for audit system');
  }
} catch (error) {
  console.log('⚠️ AWS SDK modules not available for audit system:', error.message);
  console.log('🔍 Audit system will work without S3 functionality');
}

class SimpleAudit {
  constructor() {
    this.initialized = false;
    this.dbConnection = null;
  }

  async initialize() {
    try {
      console.log('🔍 Initializing simple audit system...');
      
      // Check if audit is enabled
      if (!process.env.AUDIT_ENABLED || process.env.AUDIT_ENABLED !== 'true') {
        console.log('🔍 Audit system disabled via environment variable');
        return false;
      }

      // Check required environment variables
      const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.log('🔍 Audit system disabled - missing required environment variables:', missingVars);
        return false;
      }

      // Test database connection
      const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
      };
      console.log(`🗄️ Audit DB config → host=${dbConfig.host} db=${dbConfig.database}`);

      // Use a small connection pool (more resilient than a single connection)
      this.dbConnection = await mysql.createPool({
        ...dbConfig,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_POOL_MAX || '3'),
        queueLimit: 0,
      });
      await this.dbConnection.query('SELECT 1');
      
      console.log('✅ Audit system initialized successfully');
      this.initialized = true;
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize audit system:', error.message);
      return false;
    }
  }

  // Simple audit logging function
  async logEvent(userId, action, metadata = {}) {
    if (!this.initialized || !this.dbConnection) {
      return; // Silently fail if not initialized
    }

    try {
      const id = require('crypto').randomUUID();
      console.log('📝 [audit_logs] INSERT begin', { id, userId, action, metaKeys: Object.keys(metadata || {}) });
      await this.dbConnection.execute(
        'INSERT INTO audit_logs (id, user_id, action, meta_json, created_at) VALUES (?, ?, ?, ?, NOW())',
        [id, userId, action, JSON.stringify(metadata)]
      );
      console.log('✅ [audit_logs] INSERT ok', { id });
    } catch (error) {
      console.error('Audit log error:', error.message);
      // Don't throw - audit logging should never break the main application
    }
  }

  // Comprehensive audit functions for full database integration
  async persistSingleSearch(user, data) {
    try {
      if (!this.initialized || !this.dbConnection) {
        console.log('⚠️ Audit system not initialized, skipping single search persistence');
        return;
      }

      // Create user record if doesn't exist
      console.log('🔎 persistSingleSearch: ensure user', { userId: user?.id, email: user?.email });
      await this.createUserIfNotExists(user);
      
      // Create job record
      const jobId = require('crypto').randomUUID();
      console.log('🗄️ [jobs] INSERT begin', { jobId, userId: user.id || 'anonymous', job_type: 'SINGLE' });
      await this.dbConnection.execute(
        'INSERT INTO jobs (id, user_id, job_type, status, input_text, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
        [jobId, user.id || 'anonymous', 'SINGLE', 'SUCCESS', data.text || 'Single item search']
      );
      console.log('✅ [jobs] INSERT ok', { jobId });

      // Create job item
      const itemId = require('crypto').randomUUID();
      console.log('🗄️ [job_items] INSERT begin', { itemId, jobId, row_index: 1 });
      await this.dbConnection.execute(
        'INSERT INTO job_items (id, job_id, row_index, input_desc, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [itemId, jobId, 1, data.text || 'Single item search', 'DONE']
      );
      console.log('✅ [job_items] INSERT ok', { itemId });

      // Create search events
      if (data.allResults && data.allResults.length > 0) {
        for (const result of data.allResults) {
          const eventId = require('crypto').randomUUID();
          console.log('🗄️ [search_events] INSERT begin', { eventId, itemId, engine: 'serpapi', success: result.found ? 1 : 0 });
          await this.dbConnection.execute(
            'INSERT INTO search_events (id, job_item_id, engine, query_text, started_at, completed_at, success, results_json, created_at) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, NOW())',
            [eventId, itemId, 'serpapi', data.text || 'Single item search', result.found ? 1 : 0, JSON.stringify(result)]
          );
          console.log('✅ [search_events] INSERT ok', { eventId });
        }
      }

      // Create final choice record
      if (data.choice) {
        const choiceId = require('crypto').randomUUID();
        const priceCents = data.choice.price ? Math.round(parseFloat(data.choice.price.replace(/[^0-9.]/g, '')) * 100) : null;
        console.log('🗄️ [final_choices] INSERT begin', { choiceId, itemId, price_cents: priceCents });
        await this.dbConnection.execute(
          'INSERT INTO final_choices (id, job_item_id, price_cents, source_domain, url, decided_at) VALUES (?, ?, ?, ?, ?, NOW())',
          [choiceId, itemId, priceCents, this.extractDomain(data.choice.source), data.choice.url || data.choice.link]
        );
        console.log('✅ [final_choices] INSERT ok', { choiceId });
      }

      console.log('✅ Single search audited successfully with full database integration');
      // Also record a generic audit_log event for visibility
      await this.logEvent(user.id || 'anonymous', 'JOB_SUCCESS', { jobId, type: 'SINGLE', items: 1 });
    } catch (error) {
      console.error('❌ Failed to persist single search:', error.message);
      // Fall back to basic logging
      await this.logEvent(user.id || 'anonymous', 'SEARCH_SINGLE', data);
    }
  }

  async persistFileJob(user, data) {
    try {
      if (!this.initialized || !this.dbConnection) {
        console.log('⚠️ Audit system not initialized, skipping file job persistence');
        return;
      }

      // Create user record if doesn't exist
      await this.createUserIfNotExists(user);
      
      // Create file record ONLY if S3 info is present (schema requires bucket & s3_key)
      let fileId = null;
      if (data.fileMeta) {
        const bucket = data.fileMeta.bucket || process.env.S3_BUCKET;
        const s3Key = data.fileMeta.s3Key;
        if (bucket && s3Key) {
          fileId = require('crypto').randomUUID();
          const mimeType = data.fileMeta.type || 'application/octet-stream';
          const sizeBytes = data.fileMeta.size || 0;
          const sha256 = data.fileMeta.sha256 || null;
          const inferred = this.determineJobType(mimeType, data.fileMeta.name);
          const fileType = inferred === 'EXCEL' ? 'xlsx' : (inferred === 'CSV' ? 'csv' : (inferred === 'IMAGE' ? 'image' : 'unknown'));
          await this.dbConnection.execute(
            'INSERT INTO files (id, user_id, bucket, s3_key, original_name, mime_type, size_bytes, sha256, file_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [fileId, user.id || 'anonymous', bucket, s3Key, data.fileMeta.name || 'Unknown file', mimeType, sizeBytes, sha256, fileType]
          );
        }
      }

      // Create job record with IP address
      const jobId = require('crypto').randomUUID();
      const jobType = this.determineJobType(data.fileMeta?.type, data.fileMeta?.name);
      const ipAddress = data.ipAddress || 'unknown';
      
      await this.dbConnection.execute(
        'INSERT INTO jobs (id, user_id, job_type, status, file_id, input_text, ip_address, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
        [jobId, user.id || 'anonymous', jobType, 'SUCCESS', fileId, `File processing: ${data.fileMeta?.name || 'Unknown'}`, ipAddress]
      );

      // Create job items
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = require('crypto').randomUUID();
          
          await this.dbConnection.execute(
            'INSERT INTO job_items (id, job_id, row_index, input_desc, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [itemId, jobId, i + 1, item.description || 'Unknown item', item.status || 'DONE']
          );

          // Create search events for each item
          if (item.result && typeof item.result === 'object') {
            const eventId = require('crypto').randomUUID();
            await this.dbConnection.execute(
              'INSERT INTO search_events (id, job_item_id, engine, query_text, started_at, completed_at, success, results_json, created_at) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, NOW())',
              [eventId, itemId, 'serpapi', item.description || 'Unknown item', item.status === 'DONE' ? 1 : 0, JSON.stringify(item.result)]
            );
            // Create a simple final choice if we have a price and URL
            try {
              const choiceId = require('crypto').randomUUID();
              const url = item.result.URL || item.result.url || item.result.link || null;
              const priceRaw = (item.result.Price != null ? item.result.Price : item.result.price);
              const priceCents = (priceRaw != null)
                ? Math.round((typeof priceRaw === 'string' ? parseFloat(priceRaw.replace(/[$,]/g, '')) : priceRaw) * 100)
                : null;
              const source = item.result.Source || item.result.source || null;
              const sourceDomain = this.extractDomain(source || undefined);
              
              // BLOCK untrusted sources before persisting
              const blockedSources = ['mercari', 'bigbigmart', 'doordash', 'discounttoday', 'martexplore', 'alibaba', 'aliexpress', 'ebay', 'fruugo', 'orbixis', 'directsupply'];
              const isBlockedSource = blockedSources.some(blocked => 
                (sourceDomain && sourceDomain.toLowerCase().includes(blocked)) ||
                (source && source.toLowerCase().includes(blocked))
              );
              
              if (isBlockedSource) {
                console.log('🚫 [final_choices] BLOCKED untrusted source:', { source, sourceDomain });
              } else if (url || priceCents != null || sourceDomain) {
                console.log('🗄️ [final_choices] INSERT begin', { choiceId, itemId, price_cents: priceCents, sourceDomain, hasUrl: !!url });
                await this.dbConnection.execute(
                  'INSERT INTO final_choices (id, job_item_id, price_cents, source_domain, url, decided_at) VALUES (?, ?, ?, ?, ?, NOW())',
                  [choiceId, itemId, priceCents, sourceDomain, url]
                );
                console.log('✅ [final_choices] INSERT ok', { choiceId });
              }
            } catch (fcErr) {
              console.log('⚠️ [final_choices] skipped:', fcErr.message);
            }
          }
        }
      }

      console.log('✅ File job audited successfully with full database integration');
      // Also record a generic audit_log event for visibility
      await this.logEvent(user.id || 'anonymous', 'JOB_SUCCESS', { jobId, type: jobType, items: data.items?.length || 0, fileId });
    } catch (error) {
      console.error('❌ Failed to persist file job:', error.message);
      // Fall back to basic logging
      await this.logEvent(user.id || 'anonymous', 'UPLOAD_FILE', data);
    }
  }

  async persistImageJob(user, data) {
    try {
      if (!this.initialized || !this.dbConnection) {
        console.log('⚠️ Audit system not initialized, skipping image job persistence');
        return;
      }

      // Create user record if doesn't exist
      await this.createUserIfNotExists(user);
      
      // Create job record
      const jobId = require('crypto').randomUUID();
      await this.dbConnection.execute(
        'INSERT INTO jobs (id, user_id, job_type, status, input_text, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())',
        [jobId, user.id || 'anonymous', 'IMAGE', 'SUCCESS', `Image processing: ${data.jobMeta?.itemCount || 0} images`]
      );

      // Create job items for each image
      if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
          const item = data.items[i];
          const itemId = require('crypto').randomUUID();
          
          await this.dbConnection.execute(
            'INSERT INTO job_items (id, job_id, row_index, input_desc, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [itemId, jobId, i + 1, item.description || 'Image item', item.status || 'DONE']
          );

          // Create search events for each image
          if (item.result && typeof item.result === 'object') {
            const eventId = require('crypto').randomUUID();
            await this.dbConnection.execute(
              'INSERT INTO search_events (id, job_item_id, engine, query_text, started_at, completed_at, success, results_json, created_at) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?, NOW())',
              [eventId, itemId, 'scraper', item.description || 'Image item', item.status === 'DONE' ? 1 : 0, JSON.stringify(item.result)]
            );
          }
        }
      }

      console.log('✅ Image job audited successfully with full database integration');
      // Also record a generic audit_log event for visibility
      await this.logEvent(user.id || 'anonymous', 'JOB_SUCCESS', { jobId, type: 'IMAGE', items: data.items?.length || 0 });
    } catch (error) {
      console.error('❌ Failed to persist image job:', error.message);
      // Fall back to basic logging
      await this.logEvent(user.id || 'anonymous', 'PROCESS_IMAGE', data);
    }
  }

  // Helper methods
  async createUserIfNotExists(user) {
    try {
      console.log('👤 [users] ensure begin', { id: user?.id, email: user?.email });
      const [existingUsers] = await this.dbConnection.execute(
        'SELECT id FROM users WHERE id = ?',
        [user.id || 'anonymous']
      );
      
      if (existingUsers.length === 0) {
        console.log('🗄️ [users] INSERT begin', { id: user?.id || 'anonymous', email: user?.email });
        await this.dbConnection.execute(
          'INSERT INTO users (id, email, name, auth_provider, created_at) VALUES (?, ?, ?, ?, NOW())',
          [user.id || 'anonymous', user.email || 'unknown@example.com', user.name || 'Unknown User', 'system']
        );
        console.log('✅ [users] INSERT ok', { id: user?.id || 'anonymous' });
      } else {
        console.log('👤 [users] exists', { id: user?.id || 'anonymous' });
      }
    } catch (error) {
      console.error('⚠️ Failed to create user record:', error.message);
    }
  }

  determineJobType(mimeType, filename) {
    // Enhanced file type detection with proper Excel MIME type support
    const mt = (mimeType || '').toLowerCase();
    const name = (filename || '').toLowerCase();

    // Excel MIME types - all should map to 'EXCEL'
    const excelMimes = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // old .xls
      'application/vnd.ms-excel.sheet.macroenabled.12' // .xlsm
    ]);

    if (excelMimes.has(mt)) return 'EXCEL';
    
    // Handle octet-stream with Excel file extensions
    if (mt === 'application/octet-stream' && (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm'))) {
      return 'EXCEL';
    }
    
    // CSV files
    if (mt === 'text/csv' || name.endsWith('.csv')) return 'CSV';
    
    // Image files
    if (mt.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(name)) return 'IMAGE';
    
    return 'UNKNOWN';
  }

  getDisplayType(mimeType, filename) {
    const mt = (mimeType || '').toLowerCase();
    const name = (filename || '').toLowerCase();

    // Excel MIME types - all should map to 'Excel'
    const excelMimes = new Set([
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // old .xls
      'application/vnd.ms-excel.sheet.macroenabled.12' // .xlsm
    ]);

    if (excelMimes.has(mt)) return 'Excel';
    
    // Handle octet-stream with Excel file extensions
    if (mt === 'application/octet-stream' && (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm'))) {
      return 'Excel';
    }
    
    // CSV files
    if (mt === 'text/csv' || name.endsWith('.csv')) return 'CSV';
    
    // Image files
    if (mt.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|tiff)$/i.test(name)) return 'Image';
    
    return 'Unknown';
  }

  extractDomain(source) {
    if (!source) return null;
    
    // FIXED: Use the same source extraction logic as the main application
    const cleanSource = source.toString().toLowerCase().trim();
    
    // Handle "Price Estimated" and similar fallback sources
    if (cleanSource.includes('price estimated') || cleanSource.includes('estimated')) {
      return 'Market Search'; // FIXED: Use Market Search instead of Price Estimated
    }
    
    // Handle common retailer names
    if (cleanSource.includes('walmart')) return 'Walmart';
    if (cleanSource.includes('amazon')) return 'Amazon';
    if (cleanSource.includes('home depot') || cleanSource.includes('homedepot')) return 'Home Depot';
    if (cleanSource.includes('target')) return 'Target';
    if (cleanSource.includes('lowes')) return 'Lowes';
    if (cleanSource.includes('best buy') || cleanSource.includes('bestbuy')) return 'Best Buy';
    if (cleanSource.includes('wayfair')) return 'Wayfair';
    if (cleanSource.includes('costco')) return 'Costco';
    if (cleanSource.includes('overstock')) return 'Overstock';
    if (cleanSource.includes('ebay')) return 'eBay';
    if (cleanSource.includes('aliexpress')) return 'AliExpress';
    if (cleanSource.includes('alibaba')) return 'Alibaba';
    
    // Handle "the" prefix cases
    if (cleanSource.startsWith('the ')) {
      const withoutThe = cleanSource.substring(4).trim();
      if (withoutThe.includes('container') && withoutThe.includes('store')) return 'The Container Store';
      if (withoutThe.includes('home') && withoutThe.includes('depot')) return 'Home Depot';
      if (withoutThe.includes('lowes')) return 'Lowes';
      if (withoutThe.includes('best') && withoutThe.includes('buy')) return 'Best Buy';
      if (withoutThe.includes('wayfair')) return 'Wayfair';
      if (withoutThe.includes('costco')) return 'Costco';
      if (withoutThe.includes('overstock')) return 'Overstock';
      if (withoutThe.includes('amazon')) return 'Amazon';
      if (withoutThe.includes('walmart')) return 'Walmart';
      if (withoutThe.includes('target')) return 'Target';
    }
    
    // Try URL parsing for actual URLs
    try {
      const url = new URL(source.startsWith('http') ? source : `https://${source}`);
      const domain = url.hostname.toLowerCase();
      
      // Extract clean domain name
      if (domain.includes('walmart')) return 'Walmart';
      if (domain.includes('amazon')) return 'Amazon';
      if (domain.includes('homedepot')) return 'Home Depot';
      if (domain.includes('target')) return 'Target';
      if (domain.includes('lowes')) return 'Lowes';
      if (domain.includes('bestbuy')) return 'Best Buy';
      if (domain.includes('wayfair')) return 'Wayfair';
      if (domain.includes('costco')) return 'Costco';
      if (domain.includes('overstock')) return 'Overstock';
      
      // Return clean domain name
      return domain.replace(/^www\./, '').split('.')[0];
    } catch {
      // If not a URL, return cleaned source
      return cleanSource.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      auditEnabled: process.env.AUDIT_ENABLED === 'true',
      s3Enabled: !!process.env.S3_BUCKET,
      timestamp: new Date().toISOString()
    };
  }
}

// Create global instance
const auditInstance = new SimpleAudit();

// Initialize the audit system
async function initializeAuditSystem() {
  const initialized = await auditInstance.initialize();
  if (initialized) {
    // Create the logs router after successful initialization
    const router = createLogsRouter();
    module.exports.logsRouter = router;
  }
  return initialized;
}

// Create simple logs router for basic functionality
function createLogsRouter() {
  const router = express.Router();

  // GET /api/logs/health - Health check for audit system
  router.get('/health', async (req, res) => {
    try {
      res.json({
        audit: {
          enabled: process.env.AUDIT_ENABLED === 'true',
          status: process.env.AUDIT_ENABLED === 'true' ? 'operational' : 'disabled',
        },
        database: {
          healthy: auditInstance.initialized,
          message: auditInstance.initialized ? 'Connected' : 'Not initialized'
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        audit: {
          enabled: false,
          status: 'error',
        },
        database: { healthy: false, message: 'Health check failed' },
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // GET /api/logs/summary - Get dashboard summary
  router.get('/summary', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      // Query actual database for real-time summary
      let totalJobs = 0;
      let jobsByType = {};
      let jobsByStatus = {};
      let successRate = 0;
      let averageDuration = 0;
      let topDomains = [];
      let averagePriceDelta = 0;

      try {
        // Get total jobs count
        const [jobsResult] = await auditInstance.dbConnection.execute(
          'SELECT COUNT(*) as totalJobs FROM jobs'
        );
        totalJobs = jobsResult[0]?.totalJobs || 0;

        // Get jobs by type
        const [jobsByTypeResult] = await auditInstance.dbConnection.execute(
          'SELECT job_type, COUNT(*) as count FROM jobs GROUP BY job_type'
        );
        jobsByTypeResult.forEach(row => {
          jobsByType[row.job_type] = row.count;
        });

        // Get jobs by status
        const [jobsByStatusResult] = await auditInstance.dbConnection.execute(
          'SELECT status, COUNT(*) as count FROM jobs GROUP BY status'
        );
        jobsByStatusResult.forEach(row => {
          jobsByStatus[row.status] = row.count;
        });

        // Calculate success rate
        const successCount = jobsByStatus['SUCCESS'] || 0;
        successRate = totalJobs > 0 ? (successCount / totalJobs) * 100 : 0;

        // Get top domains from final choices
        const [domainsResult] = await auditInstance.dbConnection.execute(
          'SELECT source_domain, COUNT(*) as count FROM final_choices WHERE source_domain IS NOT NULL GROUP BY source_domain ORDER BY count DESC LIMIT 10'
        );
        topDomains = domainsResult.map(row => ({
          domain: row.source_domain,
          count: row.count
        }));

      } catch (dbError) {
        console.error('⚠️ Database query failed:', dbError.message);
        // Return basic data if database queries fail
      }

      res.json({
        totalJobs,
        jobsByType,
        jobsByStatus,
        successRate: Math.round(successRate * 100) / 100,
        averageDuration: Math.round(averageDuration * 100) / 100,
        topDomains,
        averagePriceDelta,
        message: 'Full audit system with real-time database analytics'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch summary'
      });
    }
  });

  // GET /api/logs/jobs - List recent jobs with pagination
  router.get('/jobs', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      const limit = Math.min(parseInt(req.query.limit) || 50, 200);
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const offset = (page - 1) * limit;

      // Total count
      const [countRows] = await auditInstance.dbConnection.execute(
        'SELECT COUNT(*) AS total FROM jobs'
      );
      const total = countRows[0]?.total || 0;

      // Fetch jobs with item counts (avoid bound params for LIMIT/OFFSET on some MySQL configs)
      const jobsQuery =
        `SELECT j.id, j.user_id, j.job_type, j.status, j.file_id, j.input_text, j.started_at, j.completed_at, j.created_at,
                (SELECT COUNT(*) FROM job_items ji WHERE ji.job_id = j.id) AS item_count
         FROM jobs j
         ORDER BY j.created_at DESC
         LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;
      const [rows] = await auditInstance.dbConnection.execute(jobsQuery);

      const data = rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        jobType: r.job_type,
        status: r.status,
        fileId: r.file_id,
        inputText: r.input_text,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
        itemCount: r.item_count
      }));

      const totalPages = Math.ceil(total / limit) || 1;
      const hasMore = page < totalPages;
      const nextCursor = hasMore ? { page: page + 1, limit } : null;

      console.log(`🔎 /api/logs/jobs → total=${total} page=${page} limit=${limit} rows=${rows.length}`);
      res.json({
        data,
        nextCursor,
        hasMore,
        total,
        page,
        totalPages
      });
    } catch (error) {
            res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch jobs'
      });
    }
  });

  // GET /api/logs/jobs/export - Export all jobs (no pagination limit)
  router.get('/jobs/export', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      console.log('🔍 /api/logs/jobs/export → Exporting all jobs...');

      // Fetch ALL jobs without pagination limit
      const jobsQuery =
        `SELECT j.id, j.user_id, j.job_type, j.status, j.file_id, j.input_text, j.started_at, j.completed_at, j.created_at,
                (SELECT COUNT(*) FROM job_items ji WHERE ji.job_id = j.id) AS item_count
         FROM jobs j
         ORDER BY j.created_at DESC`;
      const [rows] = await auditInstance.dbConnection.execute(jobsQuery);

      const data = rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        jobType: r.job_type,
        status: r.status,
        fileId: r.file_id,
        inputText: r.input_text,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
        itemCount: r.item_count
      }));

      console.log(`🔎 /api/logs/jobs/export → exported ${data.length} jobs`);
      res.json({
        data,
        total: data.length,
        message: 'All jobs exported successfully'
      });
    } catch (error) {
      console.error('❌ Export jobs error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to export jobs'
      });
    }
  });

  // GET /api/logs/jobs/:jobId - Get job details
  router.get('/jobs/:jobId', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      const { jobId } = req.params;
      
      // Get job details
      const [jobResult] = await auditInstance.dbConnection.execute(
        'SELECT * FROM jobs WHERE id = ?',
        [jobId]
      );
      
      if (jobResult.length === 0) {
        return res.status(404).json({ 
          error: 'Job not found',
          message: 'No job found with the specified ID'
        });
      }

      const job = jobResult[0];

      // Get job items
      const [itemsResult] = await auditInstance.dbConnection.execute(
        'SELECT * FROM job_items WHERE job_id = ? ORDER BY row_index',
        [jobId]
      );

      // Get search events for all items
      const searchEvents = [];
      for (const item of itemsResult) {
        const [eventsResult] = await auditInstance.dbConnection.execute(
          'SELECT * FROM search_events WHERE job_item_id = ?',
          [item.id]
        );
        searchEvents.push(...eventsResult);
      }

      // Get final choices for all items
      const finalChoices = [];
      for (const item of itemsResult) {
        const [choicesResult] = await auditInstance.dbConnection.execute(
          'SELECT * FROM final_choices WHERE job_item_id = ?',
          [item.id]
        );
        finalChoices.push(...choicesResult);
      }

      res.json({
        job,
        totalItems: itemsResult.length,
        items: itemsResult,
        searchEvents,
        finalChoices,
        message: 'Full job details from audit system'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch job details'
      });
    }
  });

  // GET /api/logs/items/:itemId - Get item details
  router.get('/items/:itemId', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      res.status(404).json({ 
        error: 'Item not found',
        message: 'Basic audit system - detailed item tracking coming soon'
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch item details'
      });
    }
  });

  // TEMP: GET /api/logs/debug/raw-jobs - Raw jobs sample (for debugging)
  router.get('/debug/raw-jobs', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ error: 'Audit system not available' });
      }
      const [countRows] = await auditInstance.dbConnection.execute('SELECT COUNT(*) AS total FROM jobs');
      const total = countRows[0]?.total || 0;
      const [rows] = await auditInstance.dbConnection.execute('SELECT id, user_id, job_type, status, created_at FROM jobs ORDER BY created_at DESC LIMIT 10');
      const ids = rows.map(r => r.id);
      let items = [];
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const [itemRows] = await auditInstance.dbConnection.execute(`SELECT job_id, COUNT(*) as cnt FROM job_items WHERE job_id IN (${placeholders}) GROUP BY job_id`, ids);
        items = itemRows;
      }
      res.json({ total, rows, itemCounts: items });
    } catch (e) {
      res.status(500).json({ error: 'debug_failed', message: e.message });
    }
  });

  // TEMP: GET /api/logs/debug/counts - Row counts per audit table
  router.get('/debug/counts', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ error: 'Audit system not available' });
      }
      const tables = ['users', 'files', 'jobs', 'job_items', 'search_events', 'final_choices', 'audit_logs'];
      const counts = {};
      for (const t of tables) {
        try {
          const [rows] = await auditInstance.dbConnection.execute(`SELECT COUNT(*) AS c FROM ${t}`);
          counts[t] = rows[0]?.c ?? 0;
        } catch (e) {
          counts[t] = `error: ${e.message}`;
        }
      }
      res.json({ counts, timestamp: new Date().toISOString() });
    } catch (e) {
      res.status(500).json({ error: 'debug_failed', message: e.message });
    }
  });

  // GET /api/logs/files/:fileId/download - Generate presigned URL for file download
  router.get('/files/:fileId/download', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      const { fileId } = req.params;
      
      // Get file information from database
      const [fileResult] = await auditInstance.dbConnection.execute(
        'SELECT * FROM files WHERE id = ?',
        [fileId]
      );
      
      if (fileResult.length === 0) {
        return res.status(404).json({ 
          error: 'File not found',
          message: 'No file found with the specified ID'
        });
      }

      const file = fileResult[0];
      
      // Check if S3 is configured
      const bucket = process.env.S3_BUCKET;
      const region = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1';
      
      if (!bucket) {
        return res.status(503).json({
          error: 'S3 not configured',
          message: 'S3_BUCKET environment variable not set'
        });
      }

      try {
        // Check if AWS SDK modules are available
        if (!S3Client || !GetObjectCommand || !getSignedUrl) {
          return res.status(503).json({
            error: 'S3 functionality not available',
            message: 'AWS SDK modules not loaded - audit system may be disabled'
          });
        }

        // Create S3 client
        const s3Client = new S3Client({ region });
        
        // Generate friendly filename from original name or s3 key
        const friendlyFilename = file.original_name || file.s3_key.split('/').pop() || 'download';
        
        // Create GetObject command with Content-Disposition for friendly filename
        const command = new GetObjectCommand({
          Bucket: file.bucket,
          Key: file.s3_key,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(friendlyFilename)}"`
        });

        // Generate presigned URL (60 seconds expiry)
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });
        
        console.log(`📥 Generated presigned URL for file download: fileId=${fileId}, s3Key=${file.s3_key}`);
        
        res.json({
          url: presignedUrl,
          filename: friendlyFilename,
          fileType: auditInstance.getDisplayType(file.mime_type, file.original_name),
          sizeBytes: file.size_bytes,
          expiresIn: 60,
          message: 'Presigned URL generated successfully'
        });
        
      } catch (s3Error) {
        console.error('❌ S3 presigned URL generation failed:', s3Error.message);
        res.status(500).json({
          error: 'S3 operation failed',
          message: 'Failed to generate download URL',
          details: s3Error.message
        });
      }
      
    } catch (error) {
      console.error('❌ File download endpoint error:', error.message);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process download request'
      });
    }
  });

  // GET /api/logs/files/:fileId - Get file metadata (for backward compatibility)
  router.get('/files/:fileId', async (req, res) => {
    try {
      if (!auditInstance.initialized) {
        return res.status(503).json({ 
          error: 'Audit system not available',
          message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
        });
      }

      const { fileId } = req.params;
      
      // Get file information from database
      const [fileResult] = await auditInstance.dbConnection.execute(
        'SELECT * FROM files WHERE id = ?',
        [fileId]
      );
      
      if (fileResult.length === 0) {
        return res.status(404).json({ 
          error: 'File not found',
          message: 'No file found with the specified ID'
        });
      }

      const file = fileResult[0];
      
      res.json({
        file: {
          id: file.id,
          originalName: file.original_name,
          fileType: auditInstance.getDisplayType(file.mime_type, file.original_name),
          mimeType: file.mime_type,
          sizeBytes: file.size_bytes,
          s3Key: file.s3_key,
          bucket: file.bucket,
          createdAt: file.created_at
        },
        downloadUrl: `/api/logs/files/${fileId}/download`,
        message: 'File metadata retrieved successfully'
      });
      
    } catch (error) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch file information'
      });
    }
  });

  // TEMP: POST /api/logs/debug/s3-test - Attempt a server-side S3 write
  router.post('/debug/s3-test', async (req, res) => {
    try {
      // Check if AWS SDK modules are available
      if (!S3Client || !PutObjectCommand) {
        return res.status(503).json({
          error: 'S3 functionality not available',
          message: 'AWS SDK modules not loaded - audit system may be disabled'
        });
      }

      const bucket = process.env.S3_BUCKET;
      const region = process.env.S3_REGION || process.env.AWS_REGION;
      if (!bucket) return res.status(400).json({ error: 'missing_bucket', message: 'S3_BUCKET not set' });
      if (!region) return res.status(400).json({ error: 'missing_region', message: 'S3_REGION/AWS_REGION not set' });
      const prefix = process.env.S3_PREFIX_EXCEL || 'excel/';
      const key = `${prefix}debug-${Date.now()}.txt`;
      const s3 = new S3Client({ region });
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'audit-s3-test', ContentType: 'text/plain' }));
      console.log(`☁️ S3 debug write success: s3://${bucket}/${key}`);
      res.json({ ok: true, bucket, key, region });
    } catch (e) {
      console.log('☁️ S3 debug write failed:', e.message);
      res.status(500).json({ ok: false, error: e.name, message: e.message });
    }
  });

  return router;
}

// Export the main functions
module.exports = {
  initializeAuditSystem,
  Audit: auditInstance,
  getAuditStatus: () => auditInstance.getStatus(),
  logsRouter: null // Will be set after initialization
};
