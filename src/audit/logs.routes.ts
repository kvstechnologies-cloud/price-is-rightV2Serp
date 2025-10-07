import { Router, Request, Response } from 'express';
import { getUser, isAuthenticated } from './auth';
import { getDatabase } from './db';
import { isAuditEnabled } from './db';
import { eq, desc, asc, and, gte, count, sql } from 'drizzle-orm';
import { jobs, jobItems, searchEvents, finalChoices, auditLogs, files } from './drizzle-schema';
import { 
  JobSummary, 
  DashboardSummary, 
  PaginationParams, 
  PaginatedResponse 
} from '../types/audit';

const router = Router();

// Middleware to check if audit is enabled
const requireAuditEnabled = (req: Request, res: Response, next: Function) => {
  if (!isAuditEnabled()) {
    return res.status(503).json({ 
      error: 'Audit system not available',
      message: 'Set AUDIT_ENABLED=true and configure database to enable audit features'
    });
  }
  next();
};

// Middleware to require authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Include Authorization header or X-Dev-User header'
    });
  }
  next();
};

/**
 * GET /api/logs/jobs - List recent jobs for the current user
 */
router.get('/jobs', requireAuditEnabled, requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const cursor = req.query.cursor as string;

    // Build query
    let query = db.select({
      id: jobs.id,
      jobType: jobs.jobType,
      status: jobs.status,
      createdAt: jobs.createdAt,
      completedAt: jobs.completedAt,
      inputText: jobs.inputText,
      errorMessage: jobs.errorMessage,
    })
    .from(jobs)
    .where(eq(jobs.userId, user.id))
    .orderBy(desc(jobs.createdAt))
    .limit(limit + 1); // +1 to check if there are more results

    if (cursor) {
      // For cursor-based pagination, we need to find the job and get items after it
      const cursorJob = await db.select({ createdAt: jobs.createdAt })
        .from(jobs)
        .where(eq(jobs.id, cursor))
        .limit(1);
      
      if (cursorJob.length > 0) {
        query = query.where(and(
          eq(jobs.userId, user.id),
          sql`${jobs.createdAt} < ${cursorJob[0].createdAt}`
        ));
      }
    }

    const results = await query;

    // Check if there are more results
    const hasMore = results.length > limit;
    const data = results.slice(0, limit);
    const nextCursor = hasMore ? data[data.length - 1].id : undefined;

    // Get counts for each job
    const jobSummaries: JobSummary[] = await Promise.all(
      data.map(async (job) => {
        const itemCounts = await db.select({
          total: count(),
          completed: count(sql`CASE WHEN ${jobItems.status} = 'DONE' THEN 1 END`),
          error: count(sql`CASE WHEN ${jobItems.status} = 'ERROR' THEN 1 END`),
        })
        .from(jobItems)
        .where(eq(jobItems.jobId, job.id));

        const counts = itemCounts[0];
        const successRate = counts.total > 0 ? (counts.completed / counts.total) * 100 : 0;

        return {
          id: job.id,
          jobType: job.jobType,
          status: job.status,
          createdAt: job.createdAt,
          completedAt: job.completedAt,
          totalItems: counts.total,
          completedItems: counts.completed,
          errorItems: counts.error,
          successRate: Math.round(successRate * 100) / 100,
        };
      })
    );

    const response: PaginatedResponse<JobSummary> = {
      data: jobSummaries,
      nextCursor,
      hasMore,
      total: jobSummaries.length,
    };

    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch jobs'
    });
  }
});

/**
 * GET /api/logs/jobs/:jobId - Get job details with items
 */
router.get('/jobs/:jobId', requireAuditEnabled, requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { jobId } = req.params;
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get job details
    const jobDetails = await db.select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, user.id)))
      .limit(1);

    if (jobDetails.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobDetails[0];

    // Get job items
    const items = await db.select({
      id: jobItems.id,
      rowIndex: jobItems.rowIndex,
      imageRef: jobItems.imageRef,
      inputDesc: jobItems.inputDesc,
      status: jobItems.status,
      errorMessage: jobItems.errorMessage,
      createdAt: jobItems.createdAt,
    })
    .from(jobItems)
    .where(eq(jobItems.jobId, jobId))
    .orderBy(asc(jobItems.rowIndex || 0));

    // Get file info if this is a file job
    let fileInfo = null;
    if (job.fileId) {
      const fileDetails = await db.select({
        id: files.id,
        originalName: files.originalName,
        fileType: files.fileType,
        sizeBytes: files.sizeBytes,
        s3Key: files.s3Key,
      })
      .from(files)
      .where(eq(files.id, job.fileId))
      .limit(1);

      if (fileDetails.length > 0) {
        fileInfo = fileDetails[0];
      }
    }

    res.json({
      job: {
        id: job.id,
        jobType: job.jobType,
        status: job.status,
        inputText: job.inputText,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt,
      },
      file: fileInfo,
      items: items,
      totalItems: items.length,
    });

  } catch (error) {
    console.error('❌ Error fetching job details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch job details'
    });
  }
});

/**
 * GET /api/logs/items/:itemId - Get detailed item information
 */
router.get('/items/:itemId', requireAuditEnabled, requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const { itemId } = req.params;
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Get job item details
    const itemDetails = await db.select({
      id: jobItems.id,
      jobId: jobItems.jobId,
      rowIndex: jobItems.rowIndex,
      imageRef: jobItems.imageRef,
      inputDesc: jobItems.inputDesc,
      status: jobItems.status,
      errorMessage: jobItems.errorMessage,
      createdAt: jobItems.createdAt,
    })
    .from(jobItems)
    .where(eq(jobItems.id, itemId))
    .limit(1);

    if (itemDetails.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = itemDetails[0];

    // Verify user has access to this item
    const jobAccess = await db.select({ userId: jobs.userId })
      .from(jobs)
      .where(eq(jobs.id, item.jobId))
      .limit(1);

    if (jobAccess.length === 0 || jobAccess[0].userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get search events
    const events = await db.select({
      id: searchEvents.id,
      engine: searchEvents.engine,
      queryText: searchEvents.queryText,
      startedAt: searchEvents.startedAt,
      completedAt: searchEvents.completedAt,
      success: searchEvents.success,
      errorMessage: searchEvents.errorMessage,
      resultsJson: searchEvents.resultsJson,
      createdAt: searchEvents.createdAt,
    })
    .from(searchEvents)
    .where(eq(searchEvents.jobItemId, itemId))
    .orderBy(asc(searchEvents.createdAt));

    // Get final choice
    const finalChoice = await db.select()
      .from(finalChoices)
      .where(eq(finalChoices.jobItemId, itemId))
      .limit(1);

    res.json({
      item: {
        id: item.id,
        jobId: item.jobId,
        rowIndex: item.rowIndex,
        imageRef: item.imageRef,
        inputDesc: item.inputDesc,
        status: item.status,
        errorMessage: item.errorMessage,
        createdAt: item.createdAt,
      },
      searchEvents: events.map(event => ({
        ...event,
        results: event.resultsJson ? JSON.parse(event.resultsJson) : [],
      })),
      finalChoice: finalChoice.length > 0 ? {
        ...finalChoice[0],
        price: finalChoice[0].priceCents ? finalChoice[0].priceCents / 100 : null,
        validatedPrice: finalChoice[0].validatedPriceCents ? finalChoice[0].validatedPriceCents / 100 : null,
      } : null,
    });

  } catch (error) {
    console.error('❌ Error fetching item details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch item details'
    });
  }
});

/**
 * GET /api/logs/summary - Get dashboard summary for the current user
 */
router.get('/summary', requireAuditEnabled, requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const days = parseInt(req.query.days as string) || 30;
    const db = getDatabase();
    if (!db) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get job counts by type and status
    const jobStats = await db.select({
      jobType: jobs.jobType,
      status: jobs.status,
      count: count(),
    })
    .from(jobs)
    .where(and(
      eq(jobs.userId, user.id),
      gte(jobs.createdAt, cutoffDate)
    ))
    .groupBy(jobs.jobType, jobs.status);

    // Calculate summary
    const jobsByType: Record<string, number> = {};
    const jobsByStatus: Record<string, number> = {};
    let totalJobs = 0;
    let successJobs = 0;

    jobStats.forEach(stat => {
      const type = stat.jobType;
      const status = stat.status;
      const count = stat.count;

      totalJobs += count;
      if (status === 'SUCCESS') successJobs += count;

      jobsByType[type] = (jobsByType[type] || 0) + count;
      jobsByStatus[status] = (jobsByStatus[status] || 0) + count;
    });

    const successRate = totalJobs > 0 ? (successJobs / totalJobs) * 100 : 0;

    // Get average duration
    const durationStats = await db.select({
      avgDuration: sql<number>`AVG(TIMESTAMPDIFF(SECOND, ${jobs.startedAt}, ${jobs.completedAt}))`,
    })
    .from(jobs)
    .where(and(
      eq(jobs.userId, user.id),
      gte(jobs.createdAt, cutoffDate),
      sql`${jobs.completedAt} IS NOT NULL`
    ));

    const averageDuration = durationStats[0]?.avgDuration || 0;

    // Get top domains
    const domainStats = await db.select({
      domain: finalChoices.sourceDomain,
      count: count(),
    })
    .from(finalChoices)
    .innerJoin(jobItems, eq(finalChoices.jobItemId, jobItems.id))
    .innerJoin(jobs, eq(jobItems.jobId, jobs.id))
    .where(and(
      eq(jobs.userId, user.id),
      gte(jobs.createdAt, cutoffDate),
      sql`${finalChoices.sourceDomain} IS NOT NULL`
    ))
    .groupBy(finalChoices.sourceDomain)
    .orderBy(desc(count()))
    .limit(10);

    const topDomains = domainStats.map(stat => ({
      domain: stat.domain!,
      count: stat.count,
    }));

    // Get average price delta (where validation was performed)
    const priceDeltaStats = await db.select({
      avgDelta: sql<number>`AVG(ABS(${finalChoices.priceCents} - ${finalChoices.validatedPriceCents}))`,
    })
    .from(finalChoices)
    .innerJoin(jobItems, eq(finalChoices.jobItemId, jobItems.id))
    .innerJoin(jobs, eq(jobItems.jobId, jobs.id))
    .where(and(
      eq(jobs.userId, user.id),
      gte(jobs.createdAt, cutoffDate),
      sql`${finalChoices.validatedPriceCents} IS NOT NULL`
    ));

    const averagePriceDelta = priceDeltaStats[0]?.avgDelta || 0;

    const summary: DashboardSummary = {
      totalJobs,
      jobsByType,
      jobsByStatus,
      successRate: Math.round(successRate * 100) / 100,
      averageDuration: Math.round(averageDuration * 100) / 100,
      topDomains,
      averagePriceDelta: Math.round(averagePriceDelta / 100 * 100) / 100, // Convert cents to dollars
    };

    res.json(summary);

  } catch (error) {
    console.error('❌ Error fetching summary:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch summary'
    });
  }
});

/**
 * GET /api/logs/health - Health check for audit system
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const auditEnabled = isAuditEnabled();
    const db = getDatabase();
    
    let dbHealth = { healthy: false, message: 'Database not initialized' };
    if (db) {
      dbHealth = await import('./db').then(m => m.checkDatabaseHealth());
    }

    res.json({
      audit: {
        enabled: auditEnabled,
        status: auditEnabled ? 'operational' : 'disabled',
      },
      database: dbHealth,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    res.status(500).json({
      audit: {
        enabled: false,
        status: 'error',
      },
      database: { healthy: false, message: 'Health check failed' },
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
