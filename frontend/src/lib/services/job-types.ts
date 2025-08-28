/**
 * TypeScript interfaces and types for Background Job Processing System
 * Defines all data structures used for job queuing, processing, and monitoring
 */

/**
 * Job status enumeration
 */
export type JobStatus = 
  | 'pending'     // Job created but not yet started
  | 'queued'      // Job added to queue, waiting for worker
  | 'running'     // Job currently being processed
  | 'completed'   // Job finished successfully
  | 'failed'      // Job failed with error
  | 'cancelled'   // Job was cancelled by user
  | 'retry'       // Job is being retried after failure
  | 'stalled';    // Job has been running too long without progress

/**
 * Job priority levels
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Supported job types
 */
export type JobType = 
  | 'email_storage'           // Store email content in GCS
  | 'email_bulk_assignment'   // Process multiple email assignments
  | 'email_content_analysis'  // Analyze email content with AI
  | 'cleanup_storage'         // Clean up orphaned storage files
  | 'maintenance_task'        // General maintenance operations
  | 'export_case_data';       // Export case data for backup/migration

/**
 * Base job data interface - all jobs extend this
 */
export interface BaseJobData {
  /** Organization ID for tenant isolation */
  orgId: string;
  
  /** User ID who initiated the job */
  userId: string;
  
  /** Optional job description for UI display */
  description?: string;
  
  /** Job timeout in milliseconds */
  timeout?: number;
  
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Custom metadata for the job */
  metadata?: Record<string, any>;
}

/**
 * Email storage job data
 */
export interface EmailStorageJobData extends BaseJobData {
  type: 'email_storage';
  emailId: string;
  caseId: string;
  /** Whether to force re-storage if already exists */
  forceRestore?: boolean;
  /** Whether to skip attachment processing */
  skipAttachments?: boolean;
}

/**
 * Bulk email assignment job data
 */
export interface BulkAssignmentJobData extends BaseJobData {
  type: 'email_bulk_assignment';
  /** Array of email IDs to process */
  emailIds: string[];
  /** Target case ID for assignments */
  caseId: string;
  /** Batch size for processing */
  batchSize?: number;
  /** Whether to skip emails already assigned */
  skipExisting?: boolean;
}

/**
 * Email content analysis job data
 */
export interface EmailAnalysisJobData extends BaseJobData {
  type: 'email_content_analysis';
  emailId: string;
  caseId: string;
  /** Types of analysis to perform */
  analysisTypes: ('sentiment' | 'keywords' | 'classification' | 'priority')[];
  /** Whether to update existing analysis */
  updateExisting?: boolean;
}

/**
 * Storage cleanup job data
 */
export interface StorageCleanupJobData extends BaseJobData {
  type: 'cleanup_storage';
  /** Specific case ID to clean up, or 'all' for organization-wide */
  targetScope: string;
  /** Age in days for files to be considered for cleanup */
  cleanupAge?: number;
  /** Whether to perform dry run (don't actually delete) */
  dryRun?: boolean;
}

/**
 * Maintenance task job data
 */
export interface MaintenanceJobData extends BaseJobData {
  type: 'maintenance_task';
  /** Specific maintenance task identifier */
  taskType: string;
  /** Task-specific parameters */
  parameters?: Record<string, any>;
}

/**
 * Case data export job data
 */
export interface ExportJobData extends BaseJobData {
  type: 'export_case_data';
  /** Case IDs to export */
  caseIds: string[];
  /** Export format */
  format: 'json' | 'csv' | 'pdf';
  /** Include email content in export */
  includeEmails?: boolean;
  /** Include attachments in export */
  includeAttachments?: boolean;
}

/**
 * Union type of all job data types
 */
export type JobData = 
  | EmailStorageJobData 
  | BulkAssignmentJobData 
  | EmailAnalysisJobData 
  | StorageCleanupJobData 
  | MaintenanceJobData 
  | ExportJobData;

/**
 * Job progress information
 */
export interface JobProgress {
  /** Current progress percentage (0-100) */
  percentage: number;
  
  /** Current step being processed */
  currentStep: string;
  
  /** Total number of steps */
  totalSteps: number;
  
  /** Items processed so far */
  processedItems: number;
  
  /** Total items to process */
  totalItems: number;
  
  /** Current operation being performed */
  currentOperation?: string;
  
  /** Additional progress metadata */
  metadata?: Record<string, any>;
}

/**
 * Job error information
 */
export interface JobError {
  /** Error code for categorization */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Detailed error information */
  details?: string;
  
  /** Stack trace for debugging */
  stack?: string;
  
  /** Additional error context */
  context?: Record<string, any>;
  
  /** Whether this error is retryable */
  retryable: boolean;
  
  /** Timestamp when error occurred */
  occurredAt: string;
}

/**
 * Job result data
 */
export interface JobResult {
  /** Whether job completed successfully */
  success: boolean;
  
  /** Result data specific to job type */
  data?: Record<string, any>;
  
  /** Summary of what was accomplished */
  summary?: string;
  
  /** Performance metrics */
  metrics?: {
    duration: number;
    itemsProcessed: number;
    bytesProcessed?: number;
    errorsEncountered?: number;
  };
  
  /** Warnings that occurred during processing */
  warnings?: string[];
  
  /** Additional result metadata */
  metadata?: Record<string, any>;
}

/**
 * Complete job definition
 */
export interface Job {
  /** Unique job identifier */
  id: string;
  
  /** Job type */
  type: JobType;
  
  /** Current job status */
  status: JobStatus;
  
  /** Job priority level */
  priority: JobPriority;
  
  /** Job-specific data */
  data: JobData;
  
  /** Current progress information */
  progress?: JobProgress;
  
  /** Error information if job failed */
  error?: JobError;
  
  /** Job result if completed */
  result?: JobResult;
  
  /** Number of times this job has been attempted */
  attempts: number;
  
  /** Maximum allowed attempts */
  maxRetries: number;
  
  /** Job timeout in milliseconds */
  timeout: number;
  
  /** Timestamps for job lifecycle */
  timestamps: {
    created: string;
    queued?: string;
    started?: string;
    completed?: string;
    lastAttempt?: string;
  };
  
  /** Worker ID that processed/is processing this job */
  workerId?: string;
  
  /** Additional job metadata */
  metadata?: Record<string, any>;
}

/**
 * Job queue configuration
 */
export interface JobQueueConfig {
  /** Maximum number of concurrent jobs */
  maxConcurrency: number;
  
  /** Default job timeout in milliseconds */
  defaultTimeout: number;
  
  /** Default maximum retry attempts */
  defaultMaxRetries: number;
  
  /** Retry delay configuration */
  retryDelay: {
    /** Initial retry delay in milliseconds */
    initial: number;
    /** Backoff multiplier for subsequent retries */
    multiplier: number;
    /** Maximum retry delay in milliseconds */
    maximum: number;
  };
  
  /** Job cleanup configuration */
  cleanup: {
    /** Age in milliseconds after which completed jobs are cleaned up */
    completedJobAge: number;
    /** Age in milliseconds after which failed jobs are cleaned up */
    failedJobAge: number;
    /** How often to run cleanup in milliseconds */
    cleanupInterval: number;
  };
  
  /** Health check configuration */
  healthCheck: {
    /** How often to check for stalled jobs in milliseconds */
    stalledJobInterval: number;
    /** How long a job can run without progress before being marked as stalled */
    stalledJobTimeout: number;
  };
}

/**
 * Worker configuration
 */
export interface JobWorkerConfig {
  /** Worker identifier */
  workerId: string;
  
  /** Job types this worker can process */
  supportedJobTypes: JobType[];
  
  /** Maximum concurrent jobs for this worker */
  maxConcurrency: number;
  
  /** Worker heartbeat interval in milliseconds */
  heartbeatInterval: number;
  
  /** Worker idle timeout in milliseconds */
  idleTimeout: number;
  
  /** Whether worker is enabled */
  enabled: boolean;
}

/**
 * Job queue statistics
 */
export interface JobQueueStats {
  /** Total jobs in queue by status */
  counts: {
    pending: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    stalled: number;
  };
  
  /** Jobs by type */
  byType: Record<JobType, number>;
  
  /** Jobs by priority */
  byPriority: Record<JobPriority, number>;
  
  /** Average processing time by job type */
  averageProcessingTime: Record<JobType, number>;
  
  /** Active workers */
  activeWorkers: number;
  
  /** Queue health metrics */
  health: {
    throughput: number; // jobs per minute
    errorRate: number;  // percentage
    averageWaitTime: number; // milliseconds
  };
}

/**
 * Job filter options for querying
 */
export interface JobFilter {
  /** Filter by job status */
  status?: JobStatus | JobStatus[];
  
  /** Filter by job type */
  type?: JobType | JobType[];
  
  /** Filter by priority */
  priority?: JobPriority | JobPriority[];
  
  /** Filter by organization ID */
  orgId?: string;
  
  /** Filter by user ID */
  userId?: string;
  
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  
  /** Filter by case ID (for relevant job types) */
  caseId?: string;
  
  /** Text search in job data/metadata */
  search?: string;
}

/**
 * Job pagination options
 */
export interface JobPagination {
  /** Page number (0-based) */
  page: number;
  
  /** Number of items per page */
  limit: number;
  
  /** Sort field */
  sortBy?: 'created' | 'started' | 'completed' | 'priority' | 'status';
  
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated job results
 */
export interface PaginatedJobResult {
  /** Array of jobs */
  jobs: Job[];
  
  /** Total number of jobs matching filter */
  totalCount: number;
  
  /** Current page (0-based) */
  page: number;
  
  /** Number of items per page */
  limit: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Whether there are more pages */
  hasMore: boolean;
}

/**
 * Job event for real-time updates
 */
export interface JobEvent {
  /** Event type */
  type: 'created' | 'queued' | 'started' | 'progress' | 'completed' | 'failed' | 'cancelled' | 'retry';
  
  /** Job ID */
  jobId: string;
  
  /** Updated job data */
  job: Partial<Job>;
  
  /** Event timestamp */
  timestamp: string;
  
  /** Additional event data */
  data?: Record<string, any>;
}

/**
 * Bulk operation request
 */
export interface BulkJobOperation {
  /** Job IDs to operate on */
  jobIds: string[];
  
  /** Operation to perform */
  operation: 'cancel' | 'retry' | 'delete' | 'restart';
  
  /** Optional operation parameters */
  parameters?: Record<string, any>;
}

/**
 * Bulk operation result
 */
export interface BulkJobOperationResult {
  /** Number of jobs successfully processed */
  successCount: number;
  
  /** Number of jobs that failed to process */
  failureCount: number;
  
  /** Results for each job */
  results: Array<{
    jobId: string;
    success: boolean;
    error?: string;
  }>;
  
  /** Overall operation summary */
  summary: string;
}

/**
 * Job template for creating common job configurations
 */
export interface JobTemplate {
  /** Template identifier */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Job type */
  type: JobType;
  
  /** Default job priority */
  priority: JobPriority;
  
  /** Default timeout */
  timeout: number;
  
  /** Default max retries */
  maxRetries: number;
  
  /** Template-specific default data */
  defaultData: Partial<JobData>;
  
  /** Required fields that must be provided when using template */
  requiredFields: string[];
  
  /** Whether template is active */
  active: boolean;
}

/**
 * Job scheduler configuration for recurring jobs
 */
export interface JobSchedule {
  /** Schedule identifier */
  id: string;
  
  /** Job template to use */
  templateId: string;
  
  /** Cron expression for scheduling */
  cronExpression: string;
  
  /** Timezone for schedule */
  timezone: string;
  
  /** Whether schedule is active */
  active: boolean;
  
  /** Schedule-specific job data overrides */
  dataOverrides?: Partial<JobData>;
  
  /** Next scheduled execution time */
  nextExecution?: string;
  
  /** Last execution time */
  lastExecution?: string;
  
  /** Schedule metadata */
  metadata?: Record<string, any>;
}

/**
 * Worker health status
 */
export interface WorkerHealth {
  /** Worker identifier */
  workerId: string;
  
  /** Whether worker is healthy */
  healthy: boolean;
  
  /** Worker status */
  status: 'active' | 'idle' | 'busy' | 'stopped' | 'error';
  
  /** Last heartbeat timestamp */
  lastHeartbeat: string;
  
  /** Currently processing job IDs */
  currentJobs: string[];
  
  /** Worker performance metrics */
  metrics: {
    jobsProcessed: number;
    averageProcessingTime: number;
    errorRate: number;
    uptime: number;
  };
  
  /** Any error information */
  error?: {
    message: string;
    timestamp: string;
  };
}

/**
 * System health status
 */
export interface SystemHealth {
  /** Overall system health */
  healthy: boolean;
  
  /** Queue health status */
  queue: {
    healthy: boolean;
    pendingJobs: number;
    runningJobs: number;
    avgWaitTime: number;
  };
  
  /** Worker health statuses */
  workers: WorkerHealth[];
  
  /** Database connectivity */
  database: {
    healthy: boolean;
    latency: number;
    error?: string;
  };
  
  /** External service health */
  services: {
    microsoftGraph: boolean;
    googleCloudStorage: boolean;
    supabase: boolean;
  };
  
  /** System load metrics */
  load: {
    cpu: number;
    memory: number;
    disk: number;
  };
  
  /** Health check timestamp */
  timestamp: string;
}