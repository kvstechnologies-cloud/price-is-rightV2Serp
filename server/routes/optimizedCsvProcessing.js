// Optimized CSV Processing Route with Performance Optimizer
const express = require('express');
const multer = require('multer');
const path = require('path');
const { PerformanceOptimizer } = require('../utils/PerformanceOptimizer');
const { normalizeSearchQuery } = require('../utils/TextNormalization');
// Audit system (non-blocking)
let Audit;
try {
  const auditSystem = require('../../src/audit/index.js');
  Audit = auditSystem.Audit;
  console.log('✅ Audit system imported in optimizedCsvProcessing');
} catch (e) {
  console.log('⚠️ Audit system not available in optimizedCsvProcessing:', e.message);
  Audit = null;
}

// Import request utilities for user and IP extraction
const { getClientIP, getUserFromRequest, getRequestMetadata } = require('../utils/requestUtils');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Initialize performance optimizer
const performanceOptimizer = new PerformanceOptimizer();

// Import the enhanced InsuranceItemPricer from shared service
const { getInsuranceItemPricer } = require('../services/sharedServices');

// Get the shared instance
const pricer = getInsuranceItemPricer();

if (!pricer) {
  console.error('❌ Failed to get shared InsuranceItemPricer instance');
}

router.post('/api/process-csv-optimized', upload.single('csvFile'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📁 Processing file: ${req.file.originalname}`);
    
    // Parse CSV/Excel data
    const items = await parseFileData(req.file);
    console.log(`📊 Parsed ${items.length} items from file`);
    
    // Start performance tracking
    performanceOptimizer.startProcessing(items.length);
    
    // Preprocess items to JSON format
    const preprocessedItems = performanceOptimizer.preprocessCSVToJSON(items);
    console.log(`🔄 Preprocessed ${preprocessedItems.length} items to optimized JSON format`);
    
    // Process items in batches with adaptive timing
    const results = [];
    const batchSize = parseInt(process.env.BATCH_SIZE) || 5;
    let processedCount = 0;
    let consecutiveErrors = 0;
    let adaptiveDelay = 100; // Start with 100ms delay
    
    for (let i = 0; i < preprocessedItems.length; i += batchSize) {
      const batch = preprocessedItems.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      console.log(`⚡ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(preprocessedItems.length/batchSize)} (${batch.length} items)`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (item) => {
        try {
          const result = await pricer.findBestPrice(normalizeSearchQuery(item.description), item.targetPrice);
          return {
            ...item,
            ...result,
            processingTime: Date.now() - batchStartTime
          };
        } catch (error) {
          console.error(`❌ Error processing item: ${item.description}`, error.message);
          consecutiveErrors++;
          return {
            ...item,
            error: error.message,
            processingTime: Date.now() - batchStartTime
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      processedCount += batch.length;
      performanceOptimizer.updateProgress(processedCount);
      
      // Adaptive throttling based on error rate
      if (i + batchSize < preprocessedItems.length) {
        if (consecutiveErrors > 2) {
          adaptiveDelay = Math.min(adaptiveDelay * 1.5, 2000); // Increase delay up to 2s
          console.log(`⚠️ High error rate detected, increasing delay to ${adaptiveDelay}ms`);
        } else if (consecutiveErrors === 0 && adaptiveDelay > 100) {
          adaptiveDelay = Math.max(adaptiveDelay * 0.8, 100); // Decrease delay down to 100ms
          console.log(`✅ Low error rate, decreasing delay to ${adaptiveDelay}ms`);
        }
        
        await performanceOptimizer.delay(adaptiveDelay);
        consecutiveErrors = 0; // Reset error counter
      }
    }
    
    // Finish processing and get accurate timing
    const timingStats = performanceOptimizer.finishProcessing();
    const totalProcessingTime = Date.now() - startTime;
    
    console.log(`✅ Processing completed:`);
    console.log(`   ⏱️  Total time: ${timingStats.totalTimeMinutes}m ${timingStats.totalTimeSeconds % 60}s`);
    console.log(`   📊 Items processed: ${results.length}`);
    console.log(`   🚀 Rate: ${timingStats.itemsPerMinute} items/minute`);
    
    // Add paging support
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const totalPages = Math.ceil(results.length / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedResults = results.slice(startIndex, endIndex);
    
    // Calculate statistics
    const validResults = results.filter(r => !r.error);
    const estimatedResults = results.filter(r => r.isEstimate);
    const foundResults = validResults.filter(r => !r.isEstimate);
    
    const response = {
      success: true,
      data: paginatedResults,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: results.length,
        pageSize: pageSize,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      statistics: {
        totalItems: results.length,
        validResults: validResults.length,
        foundResults: foundResults.length,
        estimatedResults: estimatedResults.length,
        errorResults: results.filter(r => r.error).length,
        successRate: ((validResults.length / results.length) * 100).toFixed(1),
        accuracyRate: foundResults.length > 0 ? 
          ((foundResults.filter(r => r.isValidMatch).length / foundResults.length) * 100).toFixed(1) : 0
      },
      timing: {
        totalProcessingTimeMs: totalProcessingTime,
        totalProcessingTimeSeconds: Math.floor(totalProcessingTime / 1000),
        totalProcessingTimeMinutes: Math.floor(totalProcessingTime / 60000),
        itemsPerSecond: timingStats.itemsPerSecond,
        itemsPerMinute: timingStats.itemsPerMinute,
        averageTimePerItem: results.length > 0 ? (totalProcessingTime / results.length).toFixed(0) : 0
      },
      cache: {
        hits: performanceOptimizer.smartCache.getStats().hits,
        misses: performanceOptimizer.smartCache.getStats().misses,
        hitRate: performanceOptimizer.smartCache.getStats().hitRate
      }
    };
    
    console.log(`📈 Final Statistics:`);
    console.log(`   ✅ Valid results: ${response.statistics.validResults}/${response.statistics.totalItems}`);
    console.log(`   🎯 Found results: ${response.statistics.foundResults}`);
    console.log(`   📊 Estimated results: ${response.statistics.estimatedResults}`);
    console.log(`   ❌ Errors: ${response.statistics.errorResults}`);
    console.log(`   📄 Paging: Page ${page}/${totalPages} (${paginatedResults.length} items)`);
    
    // ===== Optional S3 upload + Audit persistence (non-blocking) =====
    if (Audit) {
      try {
        // S3 upload
        let s3Key = null;
        let bucket = process.env.S3_BUCKET;
        if (process.env.S3_UPLOAD_ENABLED === 'true' && bucket && req.file && req.file.path) {
          try {
            const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
            const fs = require('fs').promises;
            const s3 = new S3Client({ region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1' });
            const original = (req.file.originalname || 'upload.bin');
            const lower = original.toLowerCase();
            const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv')
              || (req.file.mimetype || '').toLowerCase().includes('excel') || (req.file.mimetype || '').toLowerCase().includes('csv');
            const prefix = isExcel ? (process.env.S3_PREFIX_EXCEL || 'excel/') : (process.env.S3_PREFIX_IMAGES || 'images/');
            const safeName = original.replace(/[^\w.\-]/g, '_');
            s3Key = `${prefix}${Date.now()}_${safeName}`;
            console.log('☁️ S3 upload begin (optimized)', { bucket, s3Key, mimetype: req.file.mimetype, size: req.file.size });
            const body = await fs.readFile(req.file.path);
            await s3.send(new PutObjectCommand({
              Bucket: bucket,
              Key: s3Key,
              Body: body,
              ContentType: req.file.mimetype || 'application/octet-stream'
            }));
            console.log(`☁️ Uploaded to S3 (optimized): s3://${bucket}/${s3Key}`);
          } catch (s3Err) {
            console.error('⚠️ S3 upload failed (optimized route):', s3Err.name, s3Err.message);
          }
        }

        // Build audit payload with real user data and IP address
        const requestMetadata = getRequestMetadata(req);
        const user = requestMetadata.user || { id: 'anonymous-user', email: 'anonymous@example.com' };
        const ipAddress = requestMetadata.ipAddress;
        
        console.log('🔍 Optimized processing - User:', user.id, 'IP:', ipAddress);
        const fileMeta = {
          name: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
          bucket,
          s3Key
        };
        const jobMeta = {
          type: 'CSV',
          itemCount: results.length,
          successfulFinds: (results || []).filter(r => r && !r.error).length,
          totalItems: (results || []).length,
          errorCount: (results || []).filter(r => r && r.error).length,
          processingTime: Date.now() - startTime
        };
        const items = (results || []).map((r, idx) => ({
          description: r && (r.description || r.title || r.queryUsed) || `Item ${idx+1}`,
          targetPrice: r && r.targetPrice || '',
          result: r || {},
          status: r && r.error ? 'ERROR' : 'DONE'
        }));

        console.log('📤 Audit.persistFileJob begin (optimized)', { fileMeta, jobMetaItems: items.length, ipAddress });
        await Audit.persistFileJob(user, { fileMeta, jobMeta, items, ipAddress });
        console.log('📤 Audit.persistFileJob done (optimized)');
        console.log('✅ Optimized CSV job audited successfully');
      } catch (auditErr) {
        console.error('⚠️ Optimized audit logging failed:', auditErr.message);
      }
    }

    res.json(response);
    
  } catch (error) {
    console.error('❌ Error in optimized CSV processing:', error);
    res.status(500).json({ 
      error: 'Processing failed', 
      details: error.message,
      timing: {
        totalProcessingTimeMs: Date.now() - startTime
      }
    });
  }
});

// Helper function to parse file data
async function parseFileData(file) {
  const filePath = file.path;
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (fileExtension === '.csv') {
    const Papa = require('papaparse');
    const fs = require('fs').promises;
    const csvContent = await fs.readFile(filePath, 'utf8');
    const result = Papa.parse(csvContent, { header: true });
    return result.data.filter(row => Object.values(row).some(val => val && val.trim()));
  } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet).filter(row => Object.values(row).some(val => val && val.toString().trim()));
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel file.');
  }
}

module.exports = router;
