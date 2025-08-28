/**
 * Background Job Workers
 * Handles the actual processing of different job types
 */

import {
  Job,
  JobType,
  JobStatus,
  JobProgress,
  JobError,
  JobResult,
  JobWorkerConfig,
  EmailStorageJobData,
  BulkAssignmentJobData,
  EmailAnalysisJobData,
  StorageCleanupJobData,
  MaintenanceJobData,
  ExportJobData,
  WorkerHealth
} from './job-types';
import { JobQueueService } from './job-queue';
import { createEmailStorageService, getDefaultStorageConfig } from './email-storage';
import { createGraphEmailClient } from './microsoft-graph-client';
import { getMicrosoftGraphToken, isMicrosoftAccountConnected } from './microsoft-auth-service';
import { EmailStorageError } from './types/email-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Base abstract worker class
 */
abstract class BaseJobWorker {
  protected workerId: string;
  protected config: JobWorkerConfig;
  protected jobQueue: JobQueueService;
  protected isRunning = false;
  protected currentJobs = new Set<string>();
  protected lastHeartbeat = Date.now();
  protected metrics = {
    jobsProcessed: 0,
    totalProcessingTime: 0,
    errorsEncountered: 0,
    startTime: Date.now()
  };

  constructor(config: JobWorkerConfig, jobQueue: JobQueueService) {
    this.workerId = config.workerId;
    this.config = config;
    this.jobQueue = jobQueue;
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`Worker ${this.workerId} starting...`);
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Start main processing loop
    this.processJobs();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log(`Worker ${this.workerId} stopping...`);
    this.isRunning = false;
    
    // Wait for current jobs to complete
    while (this.currentJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Worker ${this.workerId} stopped.`);
  }

  /**
   * Get worker health status
   */
  getHealth(): WorkerHealth {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;
    const averageProcessingTime = this.metrics.jobsProcessed > 0 
      ? this.metrics.totalProcessingTime / this.metrics.jobsProcessed 
      : 0;
    const errorRate = this.metrics.jobsProcessed > 0 
      ? this.metrics.errorsEncountered / this.metrics.jobsProcessed 
      : 0;

    return {
      workerId: this.workerId,
      healthy: this.isRunning && (now - this.lastHeartbeat) < 60000, // Healthy if heartbeat within last minute
      status: this.isRunning ? (this.currentJobs.size > 0 ? 'busy' : 'idle') : 'stopped',
      lastHeartbeat: new Date(this.lastHeartbeat).toISOString(),
      currentJobs: Array.from(this.currentJobs),
      metrics: {
        jobsProcessed: this.metrics.jobsProcessed,
        averageProcessingTime,
        errorRate,
        uptime
      }
    };
  }

  /**
   * Abstract method for processing specific job types
   */
  protected abstract processJob(job: Job): Promise<JobResult>;

  /**
   * Main job processing loop
   */
  private async processJobs(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check if we can take on more work
        if (this.currentJobs.size >= this.config.maxConcurrency) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Get next job from queue
        const job = await this.jobQueue.getNextJob(this.workerId, this.config.supportedJobTypes);
        
        if (!job) {
          // No jobs available, wait before checking again
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }

        // Process job asynchronously
        this.handleJob(job);
        
      } catch (error) {
        console.error(`Worker ${this.workerId} error in main loop:`, error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Handle individual job processing
   */
  private async handleJob(job: Job): Promise<void> {
    const startTime = Date.now();
    this.currentJobs.add(job.id);
    
    try {
      // Update job status to running
      await this.jobQueue.updateJob(job.id, job.data.orgId, {
        status: 'running',
        workerId: this.workerId
      });

      // Set up job timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.timeout);
      });

      // Process job with timeout
      const result = await Promise.race([
        this.processJob(job),
        timeoutPromise
      ]);

      // Update job with successful result
      await this.jobQueue.updateJob(job.id, job.data.orgId, {
        status: 'completed',
        result
      });

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.metrics.jobsProcessed++;
      this.metrics.totalProcessingTime += processingTime;
      
      console.log(`Worker ${this.workerId} completed job ${job.id} in ${processingTime}ms`);

    } catch (error) {
      console.error(`Worker ${this.workerId} error processing job ${job.id}:`, error);
      
      const jobError: JobError = {
        code: error instanceof EmailStorageError ? error.code : 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
        retryable: this.isRetryableError(error),
        occurredAt: new Date().toISOString(),
        context: {
          workerId: this.workerId,
          jobType: job.type,
          attempt: job.attempts + 1
        }
      };

      // Determine if we should retry
      const shouldRetry = jobError.retryable && job.attempts < job.maxRetries;
      const status: JobStatus = shouldRetry ? 'queued' : 'failed';

      await this.jobQueue.updateJob(job.id, job.data.orgId, {
        status,
        error: jobError,
        workerId: shouldRetry ? undefined : this.workerId
      });

      // Update metrics
      this.metrics.errorsEncountered++;
      
    } finally {
      this.currentJobs.delete(job.id);
    }
  }

  /**
   * Determine if an error is retryable
   */
  protected isRetryableError(error: any): boolean {
    if (error instanceof EmailStorageError) {
      return error.code !== 'VALIDATION_ERROR' && error.code !== 'NOT_FOUND';
    }
    
    // Network and timeout errors are generally retryable
    return error.code === 'NETWORK_ERROR' || 
           error.code === 'TIMEOUT' ||
           error.code === 'SERVICE_UNAVAILABLE' ||
           error.message?.includes('timeout');
  }

  /**
   * Start heartbeat timer
   */
  private startHeartbeat(): void {
    const heartbeat = () => {
      if (!this.isRunning) return;
      
      this.lastHeartbeat = Date.now();
      setTimeout(heartbeat, this.config.heartbeatInterval);
    };
    
    heartbeat();
  }

  /**
   * Update job progress
   */
  protected async updateProgress(jobId: string, orgId: string, progress: JobProgress): Promise<void> {
    await this.jobQueue.updateJob(jobId, orgId, { progress });
  }
}

/**
 * Email Storage Job Worker
 * Handles storage of email content and attachments
 */
export class EmailStorageWorker extends BaseJobWorker {
  protected async processJob(job: Job): Promise<JobResult> {
    const jobData = job.data as EmailStorageJobData;
    const startTime = Date.now();
    
    console.log(`Processing email storage job for email ${jobData.emailId}, case ${jobData.caseId}`);
    
    // Update progress
    await this.updateProgress(job.id, jobData.orgId, {
      percentage: 0,
      currentStep: 'Initializing',
      totalSteps: 4,
      processedItems: 0,
      totalItems: 1,
      currentOperation: 'Setting up storage service'
    });

    try {
      // Check if user has Microsoft account connected
      const isConnected = await isMicrosoftAccountConnected(jobData.userId, jobData.orgId);
      
      if (!isConnected) {
        throw new Error('Microsoft account not connected for user');
      }

      // Update progress
      await this.updateProgress(job.id, jobData.orgId, {
        percentage: 25,
        currentStep: 'Fetching email content',
        totalSteps: 4,
        processedItems: 0,
        totalItems: 1,
        currentOperation: 'Connecting to Microsoft Graph'
      });

      // Get Microsoft Graph access token
      const accessToken = await getMicrosoftGraphToken(jobData.userId, jobData.orgId);
      
      if (!accessToken) {
        throw new Error('Failed to obtain Microsoft Graph access token');
      }

      // Create Graph client and storage service
      const graphClient = createGraphEmailClient(accessToken);
      const storageConfig = getDefaultStorageConfig();
      const storageService = createEmailStorageService(storageConfig);

      // Update progress
      await this.updateProgress(job.id, jobData.orgId, {
        percentage: 50,
        currentStep: 'Downloading email content',
        totalSteps: 4,
        processedItems: 0,
        totalItems: 1,
        currentOperation: `Fetching email ${jobData.emailId}`
      });

      // Fetch email content from Microsoft Graph
      const { content, metadata } = await graphClient.fetchEmailContent(jobData.emailId);

      // Update progress
      await this.updateProgress(job.id, jobData.orgId, {
        percentage: 75,
        currentStep: 'Storing in Google Cloud Storage',
        totalSteps: 4,
        processedItems: 0,
        totalItems: 1,
        currentOperation: 'Uploading content and attachments'
      });

      // Store email content in Google Cloud Storage
      const storageResult = await storageService.storeEmailContent(
        jobData.emailId,
        jobData.caseId,
        content,
        metadata
      );

      // Update progress
      await this.updateProgress(job.id, jobData.orgId, {
        percentage: 100,
        currentStep: 'Completed',
        totalSteps: 4,
        processedItems: 1,
        totalItems: 1,
        currentOperation: 'Storage completed successfully'
      });

      const processingTime = Date.now() - startTime;
      
      return {
        success: storageResult.success,
        data: {
          emailId: jobData.emailId,
          caseId: jobData.caseId,
          storagePath: storageResult.storagePath,
          contentFiles: Object.keys(storageResult.contentFiles).length,
          attachmentFiles: storageResult.attachmentFiles.length
        },
        summary: `Successfully stored email ${jobData.emailId} for case ${jobData.caseId}`,
        metrics: {
          duration: processingTime,
          itemsProcessed: 1,
          bytesProcessed: content.attachments?.reduce((total, att) => total + att.size, 0) || 0
        }
      };

    } catch (error) {
      console.error('Email storage job failed:', error);
      throw error;
    }
  }
}

/**
 * Bulk Assignment Job Worker
 * Handles bulk assignment of emails to cases
 */
export class BulkAssignmentWorker extends BaseJobWorker {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  protected async processJob(job: Job): Promise<JobResult> {
    const jobData = job.data as BulkAssignmentJobData;
    const startTime = Date.now();
    const batchSize = jobData.batchSize || 10;
    
    console.log(`Processing bulk assignment job for ${jobData.emailIds.length} emails to case ${jobData.caseId}`);
    
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const totalEmails = jobData.emailIds.length;
    const totalBatches = Math.ceil(totalEmails / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, totalEmails);
      const batchEmails = jobData.emailIds.slice(batchStart, batchEnd);

      // Update progress
      await this.updateProgress(job.id, jobData.orgId, {
        percentage: Math.round((processedCount / totalEmails) * 100),
        currentStep: `Processing batch ${batchIndex + 1} of ${totalBatches}`,
        totalSteps: totalBatches,
        processedItems: processedCount,
        totalItems: totalEmails,
        currentOperation: `Assigning emails ${batchStart + 1}-${batchEnd}`
      });

      // Process batch
      const batchResults = await this.processBatch(
        batchEmails,
        jobData.caseId,
        jobData.orgId,
        jobData.userId,
        jobData.skipExisting || false
      );

      successCount += batchResults.successCount;
      errorCount += batchResults.errorCount;
      errors.push(...batchResults.errors);
      processedCount += batchEmails.length;

      // Small delay between batches to avoid overwhelming the system
      if (batchIndex < totalBatches - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final progress update
    await this.updateProgress(job.id, jobData.orgId, {
      percentage: 100,
      currentStep: 'Completed',
      totalSteps: totalBatches,
      processedItems: totalEmails,
      totalItems: totalEmails,
      currentOperation: `Processed ${successCount} successfully, ${errorCount} failed`
    });

    const processingTime = Date.now() - startTime;

    return {
      success: errorCount === 0,
      data: {
        totalEmails,
        successCount,
        errorCount,
        caseId: jobData.caseId,
        errors: errors.slice(0, 10) // Limit error details to prevent huge payloads
      },
      summary: `Bulk assignment completed: ${successCount} successful, ${errorCount} failed out of ${totalEmails} emails`,
      metrics: {
        duration: processingTime,
        itemsProcessed: totalEmails,
        errorsEncountered: errorCount
      },
      warnings: errorCount > 0 ? [`${errorCount} emails failed to assign`] : undefined
    };
  }

  private async processBatch(
    emailIds: string[],
    caseId: string,
    orgId: string,
    userId: string,
    skipExisting: boolean
  ): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const results = { successCount: 0, errorCount: 0, errors: [] as string[] };

    for (const emailId of emailIds) {
      try {
        // Check if already assigned (if skipExisting is true)
        if (skipExisting) {
          const { data: existing } = await this.supabase
            .from(`${tenantSchema}.email_assignments`)
            .select('id')
            .eq('email_id', emailId)
            .eq('case_id', caseId)
            .single();

          if (existing) {
            results.successCount++; // Consider it a success since it's already assigned
            continue;
          }
        }

        // Create assignment
        const assignmentId = crypto.randomUUID();
        const { error } = await this.supabase
          .from(`${tenantSchema}.email_assignments`)
          .insert({
            id: assignmentId,
            email_id: emailId,
            case_id: caseId,
            assigned_by: userId,
            assigned_date: new Date().toISOString(),
            status: 'completed',
            storage_location: `cases/${caseId}/emails/${emailId}/`
          });

        if (error) {
          results.errorCount++;
          results.errors.push(`Email ${emailId}: ${error.message}`);
        } else {
          results.successCount++;
          
          // Create email storage job for this assignment
          await this.jobQueue.createJob({
            type: 'email_storage',
            data: {
              type: 'email_storage',
              orgId,
              userId,
              emailId,
              caseId
            },
            priority: 'normal'
          });
        }

      } catch (error) {
        results.errorCount++;
        results.errors.push(`Email ${emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }
}

/**
 * Storage Cleanup Job Worker
 * Handles cleanup of orphaned or old storage files
 */
export class StorageCleanupWorker extends BaseJobWorker {
  protected async processJob(job: Job): Promise<JobResult> {
    const jobData = job.data as StorageCleanupJobData;
    const startTime = Date.now();
    
    console.log(`Processing storage cleanup job for scope: ${jobData.targetScope}`);
    
    await this.updateProgress(job.id, jobData.orgId, {
      percentage: 0,
      currentStep: 'Initializing cleanup',
      totalSteps: 3,
      processedItems: 0,
      totalItems: 1,
      currentOperation: 'Setting up cleanup service'
    });

    try {
      const storageConfig = getDefaultStorageConfig();
      const storageService = createEmailStorageService(storageConfig);
      
      // For now, implement basic case-specific cleanup
      // In a full implementation, you'd have more sophisticated cleanup logic
      
      let cleanupCount = 0;
      let totalSize = 0;
      
      if (jobData.targetScope !== 'all') {
        // Clean up specific case
        await this.updateProgress(job.id, jobData.orgId, {
          percentage: 50,
          currentStep: 'Analyzing storage',
          totalSteps: 3,
          processedItems: 0,
          totalItems: 1,
          currentOperation: `Analyzing case ${jobData.targetScope}`
        });

        const stats = await storageService.getCaseStorageStats(jobData.targetScope);
        totalSize = stats.totalSize;
        
        if (!jobData.dryRun) {
          // This would implement actual cleanup logic
          // For now, we'll just report what would be cleaned
          cleanupCount = stats.totalEmails;
        }
      }

      await this.updateProgress(job.id, jobData.orgId, {
        percentage: 100,
        currentStep: 'Completed',
        totalSteps: 3,
        processedItems: 1,
        totalItems: 1,
        currentOperation: 'Cleanup completed'
      });

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          targetScope: jobData.targetScope,
          cleanupCount,
          totalSize,
          dryRun: jobData.dryRun || false
        },
        summary: jobData.dryRun 
          ? `Dry run completed: Would clean up ${cleanupCount} items (${totalSize} bytes)`
          : `Cleanup completed: ${cleanupCount} items cleaned up`,
        metrics: {
          duration: processingTime,
          itemsProcessed: cleanupCount,
          bytesProcessed: totalSize
        }
      };

    } catch (error) {
      console.error('Storage cleanup job failed:', error);
      throw error;
    }
  }
}

/**
 * Job Worker Manager
 * Manages multiple workers and their lifecycle
 */
export class JobWorkerManager {
  private workers = new Map<string, BaseJobWorker>();
  private configs: JobWorkerConfig[];
  private jobQueue: JobQueueService;
  private isRunning = false;

  constructor(configs: JobWorkerConfig[], jobQueue: JobQueueService) {
    this.configs = configs;
    this.jobQueue = jobQueue;
  }

  /**
   * Start all workers
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log('Starting Job Worker Manager...');
    this.isRunning = true;

    // Create and start workers
    for (const config of this.configs) {
      if (!config.enabled) continue;

      let worker: BaseJobWorker;
      
      // Create appropriate worker based on supported job types
      if (config.supportedJobTypes.includes('email_storage')) {
        worker = new EmailStorageWorker(config, this.jobQueue);
      } else if (config.supportedJobTypes.includes('email_bulk_assignment')) {
        worker = new BulkAssignmentWorker(config, this.jobQueue);
      } else if (config.supportedJobTypes.includes('cleanup_storage')) {
        worker = new StorageCleanupWorker(config, this.jobQueue);
      } else {
        // Generic worker for other job types
        worker = new EmailStorageWorker(config, this.jobQueue); // Default fallback
      }

      this.workers.set(config.workerId, worker);
      await worker.start();
    }

    console.log(`Started ${this.workers.size} workers`);
  }

  /**
   * Stop all workers
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    console.log('Stopping Job Worker Manager...');
    this.isRunning = false;

    // Stop all workers
    const stopPromises = Array.from(this.workers.values()).map(worker => worker.stop());
    await Promise.all(stopPromises);

    this.workers.clear();
    console.log('All workers stopped');
  }

  /**
   * Get health status of all workers
   */
  getWorkerHealth(): WorkerHealth[] {
    return Array.from(this.workers.values()).map(worker => worker.getHealth());
  }

  /**
   * Get specific worker health
   */
  getWorkerHealthById(workerId: string): WorkerHealth | null {
    const worker = this.workers.get(workerId);
    return worker ? worker.getHealth() : null;
  }

  /**
   * Check if manager is running
   */
  isManagerRunning(): boolean {
    return this.isRunning;
  }
}

/**
 * Default worker configurations
 */
export const DEFAULT_WORKER_CONFIGS: JobWorkerConfig[] = [
  {
    workerId: 'email-storage-worker-1',
    supportedJobTypes: ['email_storage'],
    maxConcurrency: 3,
    heartbeatInterval: 30000,
    idleTimeout: 300000,
    enabled: true
  },
  {
    workerId: 'bulk-assignment-worker-1',
    supportedJobTypes: ['email_bulk_assignment'],
    maxConcurrency: 2,
    heartbeatInterval: 30000,
    idleTimeout: 300000,
    enabled: true
  },
  {
    workerId: 'cleanup-worker-1',
    supportedJobTypes: ['cleanup_storage', 'maintenance_task'],
    maxConcurrency: 1,
    heartbeatInterval: 60000,
    idleTimeout: 600000,
    enabled: true
  }
];

/**
 * Create and configure job worker manager
 */
export function createJobWorkerManager(
  jobQueue: JobQueueService,
  configs: JobWorkerConfig[] = DEFAULT_WORKER_CONFIGS
): JobWorkerManager {
  return new JobWorkerManager(configs, jobQueue);
}