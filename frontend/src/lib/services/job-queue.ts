/**
 * Job Queue Service
 * Handles job creation, queuing, and management using Supabase as the backend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Job,
  JobType,
  JobStatus,
  JobPriority,
  JobData,
  JobProgress,
  JobError,
  JobResult,
  JobFilter,
  JobPagination,
  PaginatedJobResult,
  JobEvent,
  BulkJobOperation,
  BulkJobOperationResult,
  JobQueueConfig,
  JobQueueStats
} from './job-types';

/**
 * Job Queue Service Configuration
 */
interface JobQueueServiceConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  defaultConfig?: Partial<JobQueueConfig>;
}

/**
 * Job creation parameters
 */
interface CreateJobParams {
  type: JobType;
  data: JobData;
  priority?: JobPriority;
  timeout?: number;
  maxRetries?: number;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

/**
 * Default job queue configuration
 */
const DEFAULT_CONFIG: JobQueueConfig = {
  maxConcurrency: 10,
  defaultTimeout: 300000, // 5 minutes
  defaultMaxRetries: 3,
  retryDelay: {
    initial: 1000,     // 1 second
    multiplier: 2,     // Exponential backoff
    maximum: 60000     // 1 minute max
  },
  cleanup: {
    completedJobAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    failedJobAge: 30 * 24 * 60 * 60 * 1000,     // 30 days
    cleanupInterval: 60 * 60 * 1000              // 1 hour
  },
  healthCheck: {
    stalledJobInterval: 60 * 1000,   // 1 minute
    stalledJobTimeout: 600 * 1000    // 10 minutes
  }
};

/**
 * Job Queue Service Class
 */
export class JobQueueService {
  private supabase: SupabaseClient;
  private config: JobQueueConfig;
  private eventListeners: Map<string, (event: JobEvent) => void> = new Map();
  private cleanupTimer?: NodeJS.Timer;
  private stalledJobTimer?: NodeJS.Timer;

  constructor(config: JobQueueServiceConfig) {
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    this.config = { ...DEFAULT_CONFIG, ...config.defaultConfig };
    
    this.startPeriodicTasks();
  }

  /**
   * Create a new job and add it to the queue
   */
  async createJob(params: CreateJobParams): Promise<Job> {
    const jobId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const job: Job = {
      id: jobId,
      type: params.type,
      status: params.scheduledFor && params.scheduledFor > new Date() ? 'pending' : 'queued',
      priority: params.priority || 'normal',
      data: params.data,
      attempts: 0,
      maxRetries: params.maxRetries || this.config.defaultMaxRetries,
      timeout: params.timeout || this.config.defaultTimeout,
      timestamps: {
        created: now,
        ...(params.scheduledFor && params.scheduledFor <= new Date() && { queued: now })
      },
      metadata: params.metadata
    };

    // Get tenant schema
    const tenantSchema = this.getTenantSchema(params.data.orgId);

    // Insert job into database
    const { data, error } = await this.supabase
      .from(`${tenantSchema}.jobs`)
      .insert({
        id: job.id,
        type: job.type,
        status: job.status,
        priority: job.priority,
        data: job.data,
        attempts: job.attempts,
        max_retries: job.maxRetries,
        timeout: job.timeout,
        timestamps: job.timestamps,
        metadata: job.metadata,
        scheduled_for: params.scheduledFor?.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }

    // Emit job created event
    this.emitJobEvent({
      type: 'created',
      jobId: job.id,
      job: job,
      timestamp: now
    });

    // If job should be queued immediately, emit queued event
    if (job.status === 'queued') {
      this.emitJobEvent({
        type: 'queued',
        jobId: job.id,
        job: { status: 'queued', timestamps: { ...job.timestamps, queued: now } },
        timestamp: now
      });
    }

    return job;
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string, orgId: string): Promise<Job | null> {
    const tenantSchema = this.getTenantSchema(orgId);
    
    const { data, error } = await this.supabase
      .from(`${tenantSchema}.jobs`)
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapDatabaseJobToJob(data);
  }

  /**
   * Update job status and progress
   */
  async updateJob(
    jobId: string,
    orgId: string,
    updates: {
      status?: JobStatus;
      progress?: JobProgress;
      error?: JobError;
      result?: JobResult;
      workerId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<void> {
    const tenantSchema = this.getTenantSchema(orgId);
    const now = new Date().toISOString();
    
    // Prepare timestamp updates based on status changes
    const timestampUpdates: Record<string, string> = {};
    
    if (updates.status === 'running') {
      timestampUpdates.started = now;
      timestampUpdates.lastAttempt = now;
    }
    
    if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
      timestampUpdates.completed = now;
    }

    // Build update object
    const updateData: any = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.progress) updateData.progress = updates.progress;
    if (updates.error) updateData.error = updates.error;
    if (updates.result) updateData.result = updates.result;
    if (updates.workerId) updateData.worker_id = updates.workerId;
    if (updates.metadata) updateData.metadata = updates.metadata;
    
    // Update timestamps
    if (Object.keys(timestampUpdates).length > 0) {
      const { data: currentData } = await this.supabase
        .from(`${tenantSchema}.jobs`)
        .select('timestamps')
        .eq('id', jobId)
        .single();
      
      if (currentData) {
        updateData.timestamps = {
          ...currentData.timestamps,
          ...timestampUpdates
        };
      }
    }

    const { error } = await this.supabase
      .from(`${tenantSchema}.jobs`)
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to update job: ${error.message}`);
    }

    // Emit appropriate event
    let eventType: JobEvent['type'] = 'progress';
    if (updates.status === 'running') eventType = 'started';
    else if (updates.status === 'completed') eventType = 'completed';
    else if (updates.status === 'failed') eventType = 'failed';
    else if (updates.status === 'cancelled') eventType = 'cancelled';

    this.emitJobEvent({
      type: eventType,
      jobId,
      job: updates,
      timestamp: now
    });
  }

  /**
   * Get next available job for processing
   */
  async getNextJob(workerId: string, supportedTypes: JobType[]): Promise<Job | null> {
    // Find jobs across all tenant schemas that this worker can handle
    // This is a simplified version - in production you'd want better tenant isolation
    
    try {
      // Get list of all tenant schemas
      const { data: schemas } = await this.supabase.rpc('get_tenant_schemas');
      
      if (!schemas) return null;

      for (const schema of schemas) {
        const { data, error } = await this.supabase
          .from(`${schema}.jobs`)
          .select('*')
          .in('type', supportedTypes)
          .eq('status', 'queued')
          .is('worker_id', null)
          .or('scheduled_for.is.null,scheduled_for.lte.' + new Date().toISOString())
          .order('priority', { ascending: false }) // High priority first
          .order('created_at', { ascending: true })  // FIFO within same priority
          .limit(1);

        if (error) continue;

        if (data && data.length > 0) {
          const jobData = data[0];
          
          // Attempt to claim the job atomically
          const { error: claimError } = await this.supabase
            .from(`${schema}.jobs`)
            .update({
              status: 'running',
              worker_id: workerId,
              timestamps: {
                ...jobData.timestamps,
                started: new Date().toISOString(),
                lastAttempt: new Date().toISOString()
              }
            })
            .eq('id', jobData.id)
            .eq('status', 'queued'); // Ensure it's still queued

          if (!claimError) {
            const job = this.mapDatabaseJobToJob(jobData);
            
            this.emitJobEvent({
              type: 'started',
              jobId: job.id,
              job: { status: 'running', workerId },
              timestamp: new Date().toISOString()
            });
            
            return job;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting next job:', error);
      return null;
    }
  }

  /**
   * Query jobs with filtering and pagination
   */
  async queryJobs(
    orgId: string,
    filter?: JobFilter,
    pagination?: JobPagination
  ): Promise<PaginatedJobResult> {
    const tenantSchema = this.getTenantSchema(orgId);
    
    let query = this.supabase
      .from(`${tenantSchema}.jobs`)
      .select('*', { count: 'exact' });

    // Apply filters
    if (filter) {
      if (filter.status) {
        if (Array.isArray(filter.status)) {
          query = query.in('status', filter.status);
        } else {
          query = query.eq('status', filter.status);
        }
      }
      
      if (filter.type) {
        if (Array.isArray(filter.type)) {
          query = query.in('type', filter.type);
        } else {
          query = query.eq('type', filter.type);
        }
      }
      
      if (filter.priority) {
        if (Array.isArray(filter.priority)) {
          query = query.in('priority', filter.priority);
        } else {
          query = query.eq('priority', filter.priority);
        }
      }
      
      if (filter.userId) {
        query = query.eq('data->>userId', filter.userId);
      }
      
      if (filter.caseId) {
        query = query.eq('data->>caseId', filter.caseId);
      }
      
      if (filter.dateRange) {
        query = query
          .gte('timestamps->>created', filter.dateRange.start)
          .lte('timestamps->>created', filter.dateRange.end);
      }
      
      if (filter.search) {
        // Simple text search in data and metadata
        query = query.or(`data.ilike.%${filter.search}%,metadata.ilike.%${filter.search}%`);
      }
    }

    // Apply sorting
    const sortBy = pagination?.sortBy || 'created';
    const sortOrder = pagination?.sortOrder || 'desc';
    
    if (sortBy === 'created') {
      query = query.order('timestamps->>created', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'started') {
      query = query.order('timestamps->>started', { ascending: sortOrder === 'asc' });
    } else if (sortBy === 'completed') {
      query = query.order('timestamps->>completed', { ascending: sortOrder === 'asc' });
    } else {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    }

    // Apply pagination
    const page = pagination?.page || 0;
    const limit = pagination?.limit || 50;
    
    query = query.range(page * limit, (page + 1) * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to query jobs: ${error.message}`);
    }

    const jobs = (data || []).map(job => this.mapDatabaseJobToJob(job));
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      jobs,
      totalCount,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages - 1
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, orgId: string): Promise<void> {
    await this.updateJob(jobId, orgId, {
      status: 'cancelled'
    });
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, orgId: string): Promise<void> {
    const job = await this.getJob(jobId, orgId);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    if (job.status !== 'failed' && job.status !== 'stalled') {
      throw new Error('Only failed or stalled jobs can be retried');
    }

    await this.updateJob(jobId, orgId, {
      status: 'queued',
      error: undefined,
      workerId: undefined
    });

    this.emitJobEvent({
      type: 'retry',
      jobId,
      job: { status: 'queued' },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string, orgId: string): Promise<void> {
    const tenantSchema = this.getTenantSchema(orgId);
    
    const { error } = await this.supabase
      .from(`${tenantSchema}.jobs`)
      .delete()
      .eq('id', jobId);

    if (error) {
      throw new Error(`Failed to delete job: ${error.message}`);
    }
  }

  /**
   * Perform bulk operations on jobs
   */
  async bulkOperation(
    orgId: string,
    operation: BulkJobOperation
  ): Promise<BulkJobOperationResult> {
    const results: BulkJobOperationResult['results'] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const jobId of operation.jobIds) {
      try {
        switch (operation.operation) {
          case 'cancel':
            await this.cancelJob(jobId, orgId);
            break;
          case 'retry':
            await this.retryJob(jobId, orgId);
            break;
          case 'delete':
            await this.deleteJob(jobId, orgId);
            break;
          case 'restart':
            // Reset job to queued status
            await this.updateJob(jobId, orgId, {
              status: 'queued',
              error: undefined,
              workerId: undefined,
              progress: undefined
            });
            break;
        }
        
        results.push({ jobId, success: true });
        successCount++;
      } catch (error) {
        results.push({
          jobId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        failureCount++;
      }
    }

    return {
      successCount,
      failureCount,
      results,
      summary: `${operation.operation} operation: ${successCount} succeeded, ${failureCount} failed`
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(orgId?: string): Promise<JobQueueStats> {
    try {
      // If orgId is provided, get stats for specific tenant
      // Otherwise, get system-wide stats
      const schemas = orgId ? [this.getTenantSchema(orgId)] : await this.getAllTenantSchemas();
      
      const stats: JobQueueStats = {
        counts: {
          pending: 0,
          queued: 0,
          running: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
          stalled: 0
        },
        byType: {} as Record<JobType, number>,
        byPriority: {
          low: 0,
          normal: 0,
          high: 0,
          urgent: 0
        },
        averageProcessingTime: {} as Record<JobType, number>,
        activeWorkers: 0,
        health: {
          throughput: 0,
          errorRate: 0,
          averageWaitTime: 0
        }
      };

      for (const schema of schemas) {
        // Get counts by status
        const { data: statusCounts } = await this.supabase
          .from(`${schema}.jobs`)
          .select('status')
          .then(({ data }) => ({
            data: data?.reduce((acc, job) => {
              acc[job.status] = (acc[job.status] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          }));

        if (statusCounts) {
          Object.entries(statusCounts).forEach(([status, count]) => {
            if (status in stats.counts) {
              stats.counts[status as keyof typeof stats.counts] += count;
            }
          });
        }

        // Get counts by type and priority
        const { data: jobs } = await this.supabase
          .from(`${schema}.jobs`)
          .select('type, priority, timestamps')
          .gte('timestamps->>created', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        if (jobs) {
          jobs.forEach(job => {
            // Count by type
            stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;
            
            // Count by priority
            stats.byPriority[job.priority] = (stats.byPriority[job.priority] || 0) + 1;
          });
        }
      }

      // Calculate active workers (simplified - in reality you'd track worker heartbeats)
      const { data: activeJobs } = await this.supabase
        .rpc('count_active_workers');
      
      stats.activeWorkers = activeJobs || 0;

      return stats;
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        counts: {
          pending: 0, queued: 0, running: 0, completed: 0,
          failed: 0, cancelled: 0, stalled: 0
        },
        byType: {} as Record<JobType, number>,
        byPriority: { low: 0, normal: 0, high: 0, urgent: 0 },
        averageProcessingTime: {} as Record<JobType, number>,
        activeWorkers: 0,
        health: { throughput: 0, errorRate: 0, averageWaitTime: 0 }
      };
    }
  }

  /**
   * Subscribe to job events
   */
  onJobEvent(jobId: string, callback: (event: JobEvent) => void): () => void {
    this.eventListeners.set(jobId, callback);
    
    // Return unsubscribe function
    return () => {
      this.eventListeners.delete(jobId);
    };
  }

  /**
   * Clean up completed and old jobs
   */
  private async cleanupJobs(): Promise<void> {
    try {
      const schemas = await this.getAllTenantSchemas();
      const now = new Date();
      
      for (const schema of schemas) {
        // Delete old completed jobs
        const completedCutoff = new Date(now.getTime() - this.config.cleanup.completedJobAge);
        await this.supabase
          .from(`${schema}.jobs`)
          .delete()
          .eq('status', 'completed')
          .lt('timestamps->>completed', completedCutoff.toISOString());

        // Delete old failed jobs
        const failedCutoff = new Date(now.getTime() - this.config.cleanup.failedJobAge);
        await this.supabase
          .from(`${schema}.jobs`)
          .delete()
          .eq('status', 'failed')
          .lt('timestamps->>completed', failedCutoff.toISOString());
      }
    } catch (error) {
      console.error('Error during job cleanup:', error);
    }
  }

  /**
   * Check for and handle stalled jobs
   */
  private async handleStalledJobs(): Promise<void> {
    try {
      const schemas = await this.getAllTenantSchemas();
      const stalledCutoff = new Date(Date.now() - this.config.healthCheck.stalledJobTimeout);
      
      for (const schema of schemas) {
        const { data: stalledJobs } = await this.supabase
          .from(`${schema}.jobs`)
          .select('id, data')
          .eq('status', 'running')
          .lt('timestamps->>started', stalledCutoff.toISOString());

        if (stalledJobs) {
          for (const job of stalledJobs) {
            await this.supabase
              .from(`${schema}.jobs`)
              .update({
                status: 'stalled',
                error: {
                  code: 'STALLED',
                  message: 'Job has been running too long without progress updates',
                  retryable: true,
                  occurredAt: new Date().toISOString()
                }
              })
              .eq('id', job.id);

            this.emitJobEvent({
              type: 'failed',
              jobId: job.id,
              job: { status: 'stalled' },
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling stalled jobs:', error);
    }
  }

  /**
   * Start periodic maintenance tasks
   */
  private startPeriodicTasks(): void {
    // Cleanup timer
    this.cleanupTimer = setInterval(
      () => this.cleanupJobs(),
      this.config.cleanup.cleanupInterval
    );

    // Stalled job check timer
    this.stalledJobTimer = setInterval(
      () => this.handleStalledJobs(),
      this.config.healthCheck.stalledJobInterval
    );
  }

  /**
   * Stop the job queue service
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    
    if (this.stalledJobTimer) {
      clearInterval(this.stalledJobTimer);
      this.stalledJobTimer = undefined;
    }
    
    this.eventListeners.clear();
  }

  /**
   * Emit job event to listeners
   */
  private emitJobEvent(event: JobEvent): void {
    const listener = this.eventListeners.get(event.jobId);
    if (listener) {
      listener(event);
    }
  }

  /**
   * Get tenant schema name from organization ID
   */
  private getTenantSchema(orgId: string): string {
    return `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Get all tenant schemas
   */
  private async getAllTenantSchemas(): Promise<string[]> {
    try {
      const { data } = await this.supabase.rpc('get_tenant_schemas');
      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Map database job record to Job interface
   */
  private mapDatabaseJobToJob(dbJob: any): Job {
    return {
      id: dbJob.id,
      type: dbJob.type,
      status: dbJob.status,
      priority: dbJob.priority,
      data: dbJob.data,
      progress: dbJob.progress,
      error: dbJob.error,
      result: dbJob.result,
      attempts: dbJob.attempts,
      maxRetries: dbJob.max_retries,
      timeout: dbJob.timeout,
      timestamps: dbJob.timestamps,
      workerId: dbJob.worker_id,
      metadata: dbJob.metadata
    };
  }
}

/**
 * Factory function to create a JobQueueService instance
 */
export function createJobQueueService(config?: Partial<JobQueueServiceConfig>): JobQueueService {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for JobQueueService');
  }

  return new JobQueueService({
    supabaseUrl,
    supabaseServiceKey,
    ...config
  });
}

/**
 * Singleton instance for global use
 */
let globalJobQueueService: JobQueueService | null = null;

/**
 * Get or create the global job queue service instance
 */
export function getJobQueueService(): JobQueueService {
  if (!globalJobQueueService) {
    globalJobQueueService = createJobQueueService();
  }
  return globalJobQueueService;
}