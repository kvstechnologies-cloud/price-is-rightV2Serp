import { v4 as uuidv4 } from 'uuid';
import { enqueueAuditItem } from './queue';
import { uploadToS3, buildS3Key, calculateSHA256 } from './s3';
import { isAuditEnabled } from './db';
import { 
  User, 
  SingleSearchInput, 
  FileJobInput, 
  ImageJobInput, 
  AuditLogInput,
  FileMeta,
  JobMeta,
  JobItem,
  SearchEvent,
  FinalChoice
} from '../types/audit';

/**
 * Main audit service for persisting search and processing operations
 * All methods are non-blocking and return immediately
 */
export class AuditService {
  /**
   * Persist a single search operation
   * Creates: User (if new), Job (SINGLE), JobItem, SearchEvents, FinalChoice
   */
  static persistSingleSearch(user: User, input: SingleSearchInput): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      const jobId = uuidv4();
      const jobItemId = uuidv4();
      const timestamp = new Date();

      // Queue user creation/update
      enqueueAuditItem('user', 'insert', {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider,
        createdAt: timestamp,
      });

      // Queue job creation
      enqueueAuditItem('job', 'insert', {
        id: jobId,
        userId: user.id,
        jobType: 'SINGLE',
        status: 'SUCCESS',
        inputText: input.text,
        startedAt: timestamp,
        completedAt: timestamp,
        createdAt: timestamp,
      });

      // Queue job item creation
      enqueueAuditItem('jobItem', 'insert', {
        id: jobItemId,
        jobId: jobId,
        inputDesc: input.text,
        status: 'DONE',
        createdAt: timestamp,
      });

      // Queue final choice creation
      enqueueAuditItem('finalChoice', 'insert', {
        id: uuidv4(),
        jobItemId: jobItemId,
        sourceDomain: input.choice.sourceDomain,
        productTitle: input.choice.productTitle,
        priceCents: input.choice.price ? Math.round(input.choice.price * 100) : null,
        currency: input.choice.currency,
        url: input.choice.url,
        validated: input.choice.validated || false,
        validatedPriceCents: input.choice.validatedPrice ? Math.round(input.choice.validatedPrice * 100) : null,
        validationMethod: input.choice.validationMethod,
        isTrustedDomain: input.choice.isTrustedDomain || false,
        reason: input.choice.reason,
        decidedAt: timestamp,
      });

      // Queue audit log
      enqueueAuditItem('auditLog', 'insert', {
        id: uuidv4(),
        userId: user.id,
        action: 'SEARCH_SINGLE',
        metaJson: JSON.stringify({
          jobId,
          jobItemId,
          query: input.text,
          choice: input.choice,
          resultCount: input.allResults.length,
        }),
        createdAt: timestamp,
      });

      console.log(`🔍 Queued single search audit: jobId=${jobId}, itemId=${jobItemId}`);

    } catch (error) {
      console.error('❌ Error queuing single search audit:', error);
    }
  }

  /**
   * Persist a file processing job (CSV/Excel)
   * Creates: User (if new), File, Job (CSV), JobItems
   */
  static persistFileJob(user: User, input: FileJobInput): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      const timestamp = new Date();

      // Queue user creation/update
      enqueueAuditItem('user', 'insert', {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider,
        createdAt: timestamp,
      });

      // Queue file creation
      enqueueAuditItem('file', 'insert', {
        id: input.fileMeta.id,
        userId: user.id,
        bucket: input.fileMeta.bucket,
        s3Key: input.fileMeta.s3Key,
        originalName: input.fileMeta.originalName,
        mimeType: input.fileMeta.mimeType,
        sizeBytes: input.fileMeta.sizeBytes,
        sha256: input.fileMeta.sha256,
        fileType: input.fileMeta.fileType,
        createdAt: timestamp,
      });

      // Queue job creation
      enqueueAuditItem('job', 'insert', {
        id: input.jobMeta.id,
        userId: user.id,
        jobType: 'CSV',
        status: input.jobMeta.status,
        fileId: input.fileMeta.id,
        startedAt: input.jobMeta.startedAt,
        completedAt: input.jobMeta.completedAt,
        errorMessage: input.jobMeta.errorMessage,
        createdAt: timestamp,
      });

      // Queue job items creation
      input.items.forEach(item => {
        enqueueAuditItem('jobItem', 'insert', {
          id: item.id,
          jobId: input.jobMeta.id,
          rowIndex: item.rowIndex,
          inputDesc: item.inputDesc,
          status: item.status,
          errorMessage: item.errorMessage,
          createdAt: timestamp,
        });
      });

      // Queue audit log
      enqueueAuditItem('auditLog', 'insert', {
        id: uuidv4(),
        userId: user.id,
        action: 'UPLOAD_FILE',
        metaJson: JSON.stringify({
          jobId: input.jobMeta.id,
          fileId: input.fileMeta.id,
          fileName: input.fileMeta.originalName,
          itemCount: input.items.length,
          fileType: input.fileMeta.fileType,
        }),
        createdAt: timestamp,
      });

      console.log(`🔍 Queued file job audit: jobId=${input.jobMeta.id}, fileId=${input.fileMeta.id}, items=${input.items.length}`);

    } catch (error) {
      console.error('❌ Error queuing file job audit:', error);
    }
  }

  /**
   * Persist an image processing job
   * Creates: User (if new), File, Job (IMAGE), JobItems
   */
  static persistImageJob(user: User, input: ImageJobInput): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      const timestamp = new Date();

      // Queue user creation/update
      enqueueAuditItem('user', 'insert', {
        id: user.id,
        email: user.email,
        name: user.name,
        authProvider: user.authProvider,
        createdAt: timestamp,
      });

      // Queue file creation
      enqueueAuditItem('file', 'insert', {
        id: input.fileMeta.id,
        userId: user.id,
        bucket: input.fileMeta.bucket,
        s3Key: input.fileMeta.s3Key,
        originalName: input.fileMeta.originalName,
        mimeType: input.fileMeta.mimeType,
        sizeBytes: input.fileMeta.sizeBytes,
        sha256: input.fileMeta.sha256,
        fileType: 'image',
        createdAt: timestamp,
      });

      // Queue job creation
      enqueueAuditItem('job', 'insert', {
        id: input.jobMeta.id,
        userId: user.id,
        jobType: 'IMAGE',
        status: input.jobMeta.status,
        fileId: input.fileMeta.id,
        startedAt: input.jobMeta.startedAt,
        completedAt: input.jobMeta.completedAt,
        errorMessage: input.jobMeta.errorMessage,
        createdAt: timestamp,
      });

      // Queue job items creation
      input.items.forEach(item => {
        enqueueAuditItem('jobItem', 'insert', {
          id: item.id,
          jobId: input.jobMeta.id,
          imageRef: item.imageRef,
          inputDesc: item.inputDesc,
          status: item.status,
          errorMessage: item.errorMessage,
          createdAt: timestamp,
        });
      });

      // Queue audit log
      enqueueAuditItem('auditLog', 'insert', {
        id: uuidv4(),
        userId: user.id,
        action: 'UPLOAD_FILE',
        metaJson: JSON.stringify({
          jobId: input.jobMeta.id,
          fileId: input.fileMeta.id,
          fileName: input.fileMeta.originalName,
          itemCount: input.items.length,
          fileType: 'image',
        }),
        createdAt: timestamp,
      });

      console.log(`🔍 Queued image job audit: jobId=${input.jobMeta.id}, fileId=${input.fileMeta.id}, items=${input.items.length}`);

    } catch (error) {
      console.error('❌ Error queuing image job audit:', error);
    }
  }

  /**
   * Persist search events for a job item
   * This is called during the search pipeline execution
   */
  static persistSearchEvents(jobItemId: string, events: SearchEvent[]): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      events.forEach(event => {
        enqueueAuditItem('searchEvent', 'insert', {
          id: uuidv4(),
          jobItemId: jobItemId,
          engine: event.engine,
          queryText: event.queryText,
          startedAt: event.startedAt,
          completedAt: event.completedAt,
          success: event.success,
          errorMessage: event.errorMessage,
          resultsJson: JSON.stringify(event.results),
          createdAt: new Date(),
        });
      });

      console.log(`🔍 Queued ${events.length} search events for jobItemId=${jobItemId}`);

    } catch (error) {
      console.error('❌ Error queuing search events audit:', error);
    }
  }

  /**
   * Update job status
   */
  static updateJobStatus(jobId: string, status: string, errorMessage?: string): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      const updateData: any = {
        id: jobId,
        status: status,
      };

      if (status === 'SUCCESS' || status === 'FAILED') {
        updateData.completedAt = new Date();
      }

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      enqueueAuditItem('job', 'update', updateData);
      console.log(`🔍 Queued job status update: jobId=${jobId}, status=${status}`);

    } catch (error) {
      console.error('❌ Error queuing job status update:', error);
    }
  }

  /**
   * Update job item status
   */
  static updateJobItemStatus(jobItemId: string, status: string, errorMessage?: string): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      const updateData: any = {
        id: jobItemId,
        status: status,
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      enqueueAuditItem('jobItem', 'update', updateData);
      console.log(`🔍 Queued job item status update: itemId=${jobItemId}, status=${status}`);

    } catch (error) {
      console.error('❌ Error queuing job item status update:', error);
    }
  }

  /**
   * Log a custom audit event
   */
  static logAuditEvent(userId: string, action: string, metaJson: Record<string, any>): void {
    if (!isAuditEnabled()) {
      return;
    }

    try {
      enqueueAuditItem('auditLog', 'insert', {
        id: uuidv4(),
        userId: userId,
        action: action,
        metaJson: JSON.stringify(metaJson),
        createdAt: new Date(),
      });

      console.log(`🔍 Queued audit log: userId=${userId}, action=${action}`);

    } catch (error) {
      console.error('❌ Error queuing audit log:', error);
    }
  }
}

// Export convenience functions for easy integration
export const Audit = {
  persistSingleSearch: AuditService.persistSingleSearch,
  persistFileJob: AuditService.persistFileJob,
  persistImageJob: AuditService.persistImageJob,
  persistSearchEvents: AuditService.persistSearchEvents,
  updateJobStatus: AuditService.updateJobStatus,
  updateJobItemStatus: AuditService.updateJobItemStatus,
  logAuditEvent: AuditService.logAuditEvent,
};
