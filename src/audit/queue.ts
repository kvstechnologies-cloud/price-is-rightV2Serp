import { v4 as uuidv4 } from 'uuid';
import { getDatabase, executeWithRetry } from './db';
import { users, files, jobs, jobItems, searchEvents, finalChoices, auditLogs } from './drizzle-schema';
import { isAuditEnabled } from './db';
import { eq } from 'drizzle-orm';

// Queue configuration
const MAX_QUEUE_SIZE = 1000;
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60 seconds

// Queue item interface
interface QueueItem {
  id: string;
  type: 'user' | 'file' | 'job' | 'jobItem' | 'searchEvent' | 'finalChoice' | 'auditLog';
  operation: 'insert' | 'update';
  data: any;
  timestamp: number;
  retries: number;
}

// Queue state
let queue: QueueItem[] = [];
let isProcessing = false;
let circuitBreakerOpen = false;
let circuitBreakerOpenedAt = 0;
let batchTimeout: NodeJS.Timeout | null = null;

/**
 * Add item to audit queue
 * Returns immediately, never blocks
 */
export function enqueueAuditItem(
  type: QueueItem['type'],
  operation: 'insert' | 'update',
  data: any
): void {
  if (!isAuditEnabled()) {
    return;
  }

  // Check circuit breaker
  if (circuitBreakerOpen) {
    const timeSinceOpen = Date.now() - circuitBreakerOpenedAt;
    if (timeSinceOpen < CIRCUIT_BREAKER_TIMEOUT) {
      console.warn('🔍 Circuit breaker open, dropping audit item');
      return;
    } else {
      console.log('🔍 Circuit breaker timeout expired, resuming operations');
      circuitBreakerOpen = false;
    }
  }

  // Check queue size
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn('🔍 Audit queue full, dropping oldest item');
    queue.shift(); // Remove oldest item
  }

  // Add new item
  const item: QueueItem = {
    id: uuidv4(),
    type,
    operation,
    data,
    timestamp: Date.now(),
    retries: 0,
  };

  queue.push(item);

  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }

  // Set batch timeout
  if (batchTimeout) {
    clearTimeout(batchTimeout);
  }
  batchTimeout = setTimeout(() => {
    processQueue();
  }, BATCH_TIMEOUT);
}

/**
 * Process items in the queue
 */
async function processQueue(): Promise<void> {
  if (isProcessing || queue.length === 0) {
    return;
  }

  isProcessing = true;

  try {
    // Take items up to batch size
    const batch = queue.splice(0, BATCH_SIZE);
    
    if (batch.length === 0) {
      return;
    }

    console.log(`🔍 Processing ${batch.length} audit items`);

    // Group items by type for batch operations
    const groupedItems = groupItemsByType(batch);
    
    // Process each group in a transaction
    await executeWithRetry(async () => {
      const db = getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }

      // Process users
      if (groupedItems.users.length > 0) {
        await processUserBatch(db, groupedItems.users);
      }

      // Process files
      if (groupedItems.files.length > 0) {
        await processFileBatch(db, groupedItems.files);
      }

      // Process jobs
      if (groupedItems.jobs.length > 0) {
        await processJobBatch(db, groupedItems.jobs);
      }

      // Process job items
      if (groupedItems.jobItems.length > 0) {
        await processJobItemBatch(db, groupedItems.jobItems);
      }

      // Process search events
      if (groupedItems.searchEvents.length > 0) {
        await processSearchEventBatch(db, groupedItems.searchEvents);
      }

      // Process final choices
      if (groupedItems.finalChoices.length > 0) {
        await processFinalChoiceBatch(db, groupedItems.finalChoices);
      }

      // Process audit logs
      if (groupedItems.auditLogs.length > 0) {
        await processAuditLogBatch(db, groupedItems.auditLogs);
      }
    });

    console.log(`✅ Successfully processed ${batch.length} audit items`);

  } catch (error) {
    console.error('❌ Error processing audit queue:', error);
    
    // Open circuit breaker
    circuitBreakerOpen = true;
    circuitBreakerOpenedAt = Date.now();
    
    // Retry failed items (up to 3 retries)
    const failedItems = queue.splice(0, BATCH_SIZE);
    failedItems.forEach(item => {
      if (item.retries < 3) {
        item.retries++;
        queue.unshift(item); // Put back at front of queue
      } else {
        console.warn(`🔍 Dropping audit item after ${item.retries} retries:`, item.type);
      }
    });
  } finally {
    isProcessing = false;
    
    // Continue processing if there are more items
    if (queue.length > 0) {
      setImmediate(() => processQueue());
    }
  }
}

/**
 * Group queue items by type for batch processing
 */
function groupItemsByType(items: QueueItem[]) {
  return {
    users: items.filter(item => item.type === 'user'),
    files: items.filter(item => item.type === 'file'),
    jobs: items.filter(item => item.type === 'job'),
    jobItems: items.filter(item => item.type === 'jobItem'),
    searchEvents: items.filter(item => item.type === 'searchEvent'),
    finalChoices: items.filter(item => item.type === 'finalChoice'),
    auditLogs: items.filter(item => item.type === 'auditLog'),
  };
}

/**
 * Process user batch
 */
async function processUserBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const userData = inserts.map(item => item.data);
    await db.insert(users).values(userData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(users).set(item.data).where(eq(users.id, item.data.id));
    }
  }
}

/**
 * Process file batch
 */
async function processFileBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const fileData = inserts.map(item => item.data);
    await db.insert(files).values(fileData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(files).set(item.data).where(eq(files.id, item.data.id));
    }
  }
}

/**
 * Process job batch
 */
async function processJobBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const jobData = inserts.map(item => item.data);
    await db.insert(jobs).values(jobData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(jobs).set(item.data).where(eq(jobs.id, item.data.id));
    }
  }
}

/**
 * Process job item batch
 */
async function processJobItemBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const itemData = inserts.map(item => item.data);
    await db.insert(jobItems).values(itemData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(jobItems).set(item.data).where(eq(jobItems.id, item.data.id));
    }
  }
}

/**
 * Process search event batch
 */
async function processSearchEventBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const eventData = inserts.map(item => item.data);
    await db.insert(searchEvents).values(eventData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(searchEvents).set(item.data).where(eq(searchEvents.id, item.data.id));
    }
  }
}

/**
 * Process final choice batch
 */
async function processFinalChoiceBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const choiceData = inserts.map(item => item.data);
    await db.insert(finalChoices).values(choiceData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(finalChoices).set(item.data).where(eq(finalChoices.id, item.data.id));
    }
  }
}

/**
 * Process audit log batch
 */
async function processAuditLogBatch(db: any, items: QueueItem[]) {
  const inserts = items.filter(item => item.operation === 'insert');
  const updates = items.filter(item => item.operation === 'update');

  if (inserts.length > 0) {
    const logData = inserts.map(item => item.data);
    await db.insert(auditLogs).values(logData);
  }

  if (updates.length > 0) {
    for (const item of updates) {
      await db.update(auditLogs).set(item.data).where(eq(auditLogs.id, item.data.id));
    }
  }
}

/**
 * Get queue status
 */
export function getQueueStatus() {
  return {
    queueLength: queue.length,
    isProcessing,
    circuitBreakerOpen,
    circuitBreakerOpenedAt,
    maxQueueSize: MAX_QUEUE_SIZE,
    batchSize: BATCH_SIZE,
  };
}

/**
 * Clear queue (for testing/debugging)
 */
export function clearQueue(): void {
  queue = [];
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }
}
