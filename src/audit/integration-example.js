/**
 * 🔍 Audit System Integration Examples
 * 
 * This file shows how to integrate the audit system into your existing
 * insurance pricing application without modifying core business logic.
 * 
 * Just add these one-liners to your existing handlers!
 */

// Import the audit service
const { Audit } = require('./audit.service');

// ============================================================================
// EXAMPLE 1: Single Item Search Auditing
// ============================================================================

// In your existing single search handler (e.g., /api/process-item)
async function handleSingleSearch(req, res) {
  try {
    // ... your existing search logic ...
    
    // After search completes successfully, add this ONE LINE:
    Audit.persistSingleSearch(
      { id: req.user?.id || 'anonymous' },
      {
        text: req.body.text,
        choice: {
          sourceDomain: 'walmart.com',
          productTitle: 'Bissell PowerForce Helix Bagless Upright Vacuum',
          price: 89.99,
          currency: 'USD',
          url: 'https://walmart.com/...',
          validated: true,
          validatedPrice: 89.99,
          validationMethod: 'page-scrape',
          isTrustedDomain: true,
          reason: 'Best price match with validation'
        },
        allResults: searchResults // Your existing search results array
      }
    );
    
    // ... rest of your existing code ...
    res.json({ success: true, result: finalChoice });
    
  } catch (error) {
    // ... your existing error handling ...
  }
}

// ============================================================================
// EXAMPLE 2: CSV/Excel File Processing Auditing
// ============================================================================

// In your existing CSV processing handler (e.g., /api/enhanced/process-enhanced)
async function handleCSVProcessing(req, res) {
  try {
    const file = req.file;
    const jobId = generateUUID(); // Generate a unique job ID
    
    // ... your existing file processing logic ...
    
    // After processing completes, add this ONE LINE:
    Audit.persistFileJob(
      { id: req.user?.id || 'anonymous' },
      {
        fileMeta: {
          id: generateUUID(),
          bucket: process.env.S3_BUCKET || 'local',
          s3Key: `dev/${req.user?.id || 'anonymous'}/CSV/${new Date().toISOString().split('T')[0]}/${jobId}/${file.originalname}`,
          originalName: file.originalname,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          sha256: calculateSHA256(file.buffer), // You'll need to implement this
          fileType: file.originalname.endsWith('.csv') ? 'csv' : 'xlsx'
        },
        jobMeta: {
          id: jobId,
          jobType: 'CSV',
          status: 'SUCCESS',
          startedAt: new Date(),
          completedAt: new Date()
        },
        items: processedRows.map((row, index) => ({
          id: generateUUID(),
          rowIndex: index + 1,
          inputDesc: row.description || row.item || 'Unknown',
          status: row.status || 'DONE'
        }))
      }
    );
    
    // ... rest of your existing code ...
    res.json({ success: true, jobId });
    
  } catch (error) {
    // ... your existing error handling ...
  }
}

// ============================================================================
// EXAMPLE 3: Image Processing Auditing
// ============================================================================

// In your existing image processing handler (e.g., /api/process-image)
async function handleImageProcessing(req, res) {
  try {
    const imageFile = req.file;
    const jobId = generateUUID();
    
    // ... your existing image processing logic ...
    
    // After processing completes, add this ONE LINE:
    Audit.persistImageJob(
      { id: req.user?.id || 'anonymous' },
      {
        fileMeta: {
          id: generateUUID(),
          bucket: process.env.S3_BUCKET || 'local',
          s3Key: `dev/${req.user?.id || 'anonymous'}/IMAGE/${new Date().toISOString().split('T')[0]}/${jobId}/${imageFile.originalname}`,
          originalName: imageFile.originalname,
          mimeType: imageFile.mimetype,
          sizeBytes: imageFile.size,
          sha256: calculateSHA256(imageFile.buffer),
          fileType: 'image'
        },
        jobMeta: {
          id: jobId,
          jobType: 'IMAGE',
          status: 'SUCCESS',
          startedAt: new Date(),
          completedAt: new Date()
        },
        items: extractedItems.map(item => ({
          id: generateUUID(),
          imageRef: `s3://${process.env.S3_BUCKET}/...`,
          inputDesc: item.description,
          status: 'DONE'
        }))
      }
    );
    
    // ... rest of your existing code ...
    res.json({ success: true, jobId });
    
  } catch (error) {
    // ... your existing error handling ...
  }
}

// ============================================================================
// EXAMPLE 4: Search Event Auditing (During Search Pipeline)
// ============================================================================

// In your search pipeline, you can also audit individual search events
async function runSearchPipeline(query, jobItemId) {
  try {
    // SerpAPI search
    const serpApiStart = new Date();
    const serpApiResults = await searchWithSerpAPI(query);
    const serpApiEnd = new Date();
    
    // Audit SerpAPI search
    Audit.persistSearchEvents(jobItemId, [{
      engine: 'serpapi',
      queryText: query,
      startedAt: serpApiStart,
      completedAt: serpApiEnd,
      success: true,
      results: serpApiResults
    }]);
    
    // CSE search
    const cseStart = new Date();
    const cseResults = await searchWithCSE(query);
    const cseEnd = new Date();
    
    // Audit CSE search
    Audit.persistSearchEvents(jobItemId, [{
      engine: 'cse',
      queryText: query,
      startedAt: cseStart,
      completedAt: cseEnd,
      success: true,
      results: cseResults
    }]);
    
    // ... rest of your search logic ...
    
  } catch (error) {
    // Audit failed searches too
    Audit.persistSearchEvents(jobItemId, [{
      engine: 'serpapi',
      queryText: query,
      startedAt: new Date(),
      completedAt: new Date(),
      success: false,
      errorMessage: error.message,
      results: []
    }]);
  }
}

// ============================================================================
// EXAMPLE 5: Job Status Updates
// ============================================================================

// Update job status as processing progresses
async function updateJobProgress(jobId, status, errorMessage) {
  // This updates the job status in the audit system
  Audit.updateJobStatus(jobId, status, errorMessage);
}

// Update individual item status
async function updateItemProgress(itemId, status, errorMessage) {
  // This updates the item status in the audit system
  Audit.updateJobItemStatus(itemId, status, errorMessage);
}

// ============================================================================
// EXAMPLE 6: Custom Audit Events
// ============================================================================

// Log custom user actions
function logUserAction(userId, action, metadata) {
  Audit.logAuditEvent(userId, action, metadata);
}

// Examples of custom actions:
logUserAction('user-123', 'VIEW_DASHBOARD', { page: 'main', timestamp: new Date() });
logUserAction('user-123', 'EXPORT_RESULTS', { format: 'csv', itemCount: 50 });
logUserAction('user-123', 'RETRY_ITEM', { itemId: 'item-456', reason: 'Price validation failed' });

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function calculateSHA256(buffer) {
  // You can use crypto module or a library like crypto-js
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ============================================================================
// INTEGRATION CHECKLIST
// ============================================================================

/*
✅ INTEGRATION CHECKLIST:

1. Add audit initialization to your server startup:
   - Import and call initializeAuditSystem()
   - Mount logsRouter at /api/logs

2. Add audit calls to your handlers:
   - Single search: Audit.persistSingleSearch()
   - File processing: Audit.persistFileJob()
   - Image processing: Audit.persistImageJob()

3. Set environment variables:
   - AUDIT_ENABLED=true
   - Database credentials (DB_HOST, DB_USER, etc.)
   - S3 configuration (optional)

4. Test the integration:
   - Run a search and check dashboard
   - Upload a file and verify job creation
   - Check /api/logs/health endpoint

5. Monitor the system:
   - Watch console logs for audit messages
   - Check dashboard for new jobs
   - Verify data persistence in database

That's it! The audit system will now track everything automatically.
*/

module.exports = {
  handleSingleSearch,
  handleCSVProcessing,
  handleImageProcessing,
  runSearchPipeline,
  updateJobProgress,
  updateItemProgress,
  logUserAction
};
