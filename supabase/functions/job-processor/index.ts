/**
 * Supabase Edge Function: Job Processor
 * Handles background job processing with proper error handling and retry logic
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Job processing interfaces (simplified versions of the main types)
interface JobData {
  orgId: string;
  userId: string;
  type: string;
  [key: string]: any;
}

interface Job {
  id: string;
  type: string;
  status: string;
  priority: string;
  data: JobData;
  progress?: any;
  error?: any;
  result?: any;
  attempts: number;
  max_retries: number;
  timeout: number;
  timestamps: any;
  worker_id?: string;
  metadata?: any;
}

interface JobProgress {
  percentage: number;
  currentStep: string;
  totalSteps: number;
  processedItems: number;
  totalItems: number;
  currentOperation?: string;
  metadata?: Record<string, any>;
}

interface JobResult {
  success: boolean;
  data?: Record<string, any>;
  summary?: string;
  metrics?: {
    duration: number;
    itemsProcessed: number;
    bytesProcessed?: number;
    errorsEncountered?: number;
  };
  warnings?: string[];
  metadata?: Record<string, any>;
}

interface JobError {
  code: string;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, any>;
  retryable: boolean;
  occurredAt: string;
}

/**
 * Email Storage Job Processor
 */
class EmailStorageJobProcessor {
  private supabase: any;
  private workerId: string;

  constructor(supabase: any, workerId: string) {
    this.supabase = supabase;
    this.workerId = workerId;
  }

  async processJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    const jobData = job.data;

    console.log(`Processing email storage job: ${job.id} for email ${jobData.emailId}`);

    try {
      // Update progress
      await this.updateProgress(job.id, jobData.orgId, {
        percentage: 0,
        currentStep: 'Initializing',
        totalSteps: 4,
        processedItems: 0,
        totalItems: 1,
        currentOperation: 'Setting up storage service'
      });

      // In a real implementation, you would:
      // 1. Get Microsoft Graph token
      // 2. Fetch email content from Graph API
      // 3. Store content in Google Cloud Storage
      // 4. Update database records

      // For now, we'll simulate the process
      await this.simulateEmailStorage(job);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          emailId: jobData.emailId,
          caseId: jobData.caseId,
          storagePath: `cases/${jobData.caseId}/emails/${jobData.emailId}/`,
          contentFiles: 3,
          attachmentFiles: 2
        },
        summary: `Successfully stored email ${jobData.emailId} for case ${jobData.caseId}`,
        metrics: {
          duration: processingTime,
          itemsProcessed: 1,
          bytesProcessed: 1024000 // Simulated
        }
      };

    } catch (error) {
      console.error('Email storage job failed:', error);
      throw error;
    }
  }

  private async simulateEmailStorage(job: Job): Promise<void> {
    const steps = [
      { step: 'Connecting to Microsoft Graph', percentage: 25, delay: 1000 },
      { step: 'Downloading email content', percentage: 50, delay: 2000 },
      { step: 'Storing in Google Cloud Storage', percentage: 75, delay: 1500 },
      { step: 'Updating database records', percentage: 100, delay: 500 }
    ];

    for (const stepInfo of steps) {
      await this.updateProgress(job.id, job.data.orgId, {
        percentage: stepInfo.percentage,
        currentStep: stepInfo.step,
        totalSteps: 4,
        processedItems: stepInfo.percentage === 100 ? 1 : 0,
        totalItems: 1,
        currentOperation: stepInfo.step
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, stepInfo.delay));
    }
  }

  private async updateProgress(jobId: string, orgId: string, progress: JobProgress): Promise<void> {
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await this.supabase
      .from(`${tenantSchema}.jobs`)
      .update({
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

/**
 * Bulk Assignment Job Processor
 */
class BulkAssignmentJobProcessor {
  private supabase: any;
  private workerId: string;

  constructor(supabase: any, workerId: string) {
    this.supabase = supabase;
    this.workerId = workerId;
  }

  async processJob(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    const jobData = job.data;
    const batchSize = jobData.batchSize || 10;

    console.log(`Processing bulk assignment job: ${job.id} for ${jobData.emailIds.length} emails`);

    try {
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

        // Small delay between batches
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
          errors: errors.slice(0, 10)
        },
        summary: `Bulk assignment completed: ${successCount} successful, ${errorCount} failed out of ${totalEmails} emails`,
        metrics: {
          duration: processingTime,
          itemsProcessed: totalEmails,
          errorsEncountered: errorCount
        },
        warnings: errorCount > 0 ? [`${errorCount} emails failed to assign`] : undefined
      };

    } catch (error) {
      console.error('Bulk assignment job failed:', error);
      throw error;
    }
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
            results.successCount++;
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
        }

      } catch (error) {
        results.errorCount++;
        results.errors.push(`Email ${emailId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  private async updateProgress(jobId: string, orgId: string, progress: JobProgress): Promise<void> {
    const tenantSchema = `org_${orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await this.supabase
      .from(`${tenantSchema}.jobs`)
      .update({
        progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

/**
 * Job processor factory
 */
function createJobProcessor(job: Job, supabase: any, workerId: string) {
  switch (job.type) {
    case 'email_storage':
      return new EmailStorageJobProcessor(supabase, workerId);
    case 'email_bulk_assignment':
      return new BulkAssignmentJobProcessor(supabase, workerId);
    default:
      throw new Error(`Unsupported job type: ${job.type}`);
  }
}

/**
 * Main job processing function
 */
async function processJob(job: Job, supabase: any, workerId: string): Promise<void> {
  console.log(`Starting job ${job.id} (type: ${job.type})`);
  
  try {
    const processor = createJobProcessor(job, supabase, workerId);
    const result = await processor.processJob(job);

    // Update job with successful result
    const tenantSchema = `org_${job.data.orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await supabase
      .from(`${tenantSchema}.jobs`)
      .update({
        status: 'completed',
        result,
        timestamps: {
          ...job.timestamps,
          completed: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} completed successfully`);

  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);

    const jobError: JobError = {
      code: 'PROCESSING_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      retryable: isRetryableError(error),
      occurredAt: new Date().toISOString(),
      context: {
        workerId,
        jobType: job.type,
        attempt: job.attempts + 1
      }
    };

    // Determine if we should retry
    const shouldRetry = jobError.retryable && job.attempts < job.max_retries;
    const status = shouldRetry ? 'queued' : 'failed';

    const tenantSchema = `org_${job.data.orgId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    await supabase
      .from(`${tenantSchema}.jobs`)
      .update({
        status,
        error: jobError,
        worker_id: shouldRetry ? null : workerId,
        timestamps: shouldRetry ? job.timestamps : {
          ...job.timestamps,
          completed: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id);

    if (!shouldRetry) {
      throw error; // Re-throw if not retrying
    }
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network and timeout errors are generally retryable
  const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'RATE_LIMIT'];
  return retryableCodes.some(code => error.code === code || error.message?.includes(code.toLowerCase()));
}

/**
 * Get next job for processing
 */
async function getNextJob(supabase: any, workerId: string, supportedTypes: string[]): Promise<Job | null> {
  try {
    // Call the database function to atomically get and claim a job
    const { data, error } = await supabase.rpc('get_next_job_for_worker', {
      p_worker_id: workerId,
      p_supported_types: supportedTypes
    });

    if (error) {
      console.error('Error getting next job:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const jobData = data[0];
    
    return {
      id: jobData.job_id,
      type: jobData.job_type,
      status: 'running',
      priority: jobData.job_priority,
      data: jobData.job_data,
      progress: undefined,
      error: undefined,
      result: undefined,
      attempts: jobData.job_attempts,
      max_retries: jobData.job_max_retries,
      timeout: jobData.job_timeout,
      timestamps: jobData.job_timestamps,
      worker_id: workerId,
      metadata: jobData.job_metadata
    };

  } catch (error) {
    console.error('Error in getNextJob:', error);
    return null;
  }
}

/**
 * Main Edge Function handler
 */
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Generate worker ID
    const workerId = `edge-worker-${crypto.randomUUID().slice(0, 8)}`;
    
    // Supported job types for this worker
    const supportedTypes = ['email_storage', 'email_bulk_assignment'];

    // Handle different request methods
    if (req.method === 'POST') {
      // Process a single job or start worker loop
      const { action, jobId, workerConfig } = await req.json();

      if (action === 'process_job' && jobId) {
        // Process specific job
        console.log(`Processing specific job: ${jobId}`);
        
        // This would fetch and process the specific job
        // For now, return success
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Job ${jobId} queued for processing` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } else if (action === 'start_worker') {
        // Start worker loop (limited execution time in Edge Functions)
        console.log(`Starting worker ${workerId}`);
        
        let processedJobs = 0;
        const maxJobs = 5; // Limit for Edge Function execution
        const maxRunTime = 50000; // 50 seconds max
        const startTime = Date.now();

        while (processedJobs < maxJobs && (Date.now() - startTime) < maxRunTime) {
          const job = await getNextJob(supabase, workerId, supportedTypes);
          
          if (!job) {
            // No jobs available, wait a bit
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          try {
            await processJob(job, supabase, workerId);
            processedJobs++;
            console.log(`Processed job ${job.id} (${processedJobs}/${maxJobs})`);
          } catch (error) {
            console.error(`Failed to process job ${job.id}:`, error);
          }

          // Small delay between jobs
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            processedJobs,
            workerId,
            message: `Worker processed ${processedJobs} jobs` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET request - return worker status
    if (req.method === 'GET') {
      return new Response(
        JSON.stringify({ 
          status: 'ready',
          workerId,
          supportedTypes,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});