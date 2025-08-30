// Webhook and Polling Handler for DocETL Jobs
// Provides mechanisms to handle long-running tasks that exceed Edge Function timeout limits

export interface WebhookConfig {
  url: string;
  secret?: string;
  headers?: Record<string, string>;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface JobStatusUpdate {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_percentage: number;
  current_step?: string;
  output_data?: any;
  error_message?: string;
  error_details?: any;
  completed_at?: string;
}

/**
 * Webhook handler for job status notifications
 */
export class DocETLWebhookHandler {
  private supabase: any;
  private schema: string;

  constructor(supabase: any, schema: string) {
    this.supabase = supabase;
    this.schema = schema;
  }

  /**
   * Send webhook notification for job status update
   */
  async sendWebhook(jobId: string, config: WebhookConfig, update: JobStatusUpdate): Promise<boolean> {
    const maxRetries = config.retryAttempts || 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Prepare payload
        const payload = {
          event: 'job_status_update',
          timestamp: new Date().toISOString(),
          data: update
        };

        // Prepare headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'DocETL-Processor/1.0',
          ...config.headers
        };

        // Add signature if secret is provided
        if (config.secret) {
          const signature = await this.generateSignature(JSON.stringify(payload), config.secret);
          headers['X-DocETL-Signature'] = signature;
        }

        // Send webhook
        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          // Log successful webhook
          await this.logWebhookEvent(jobId, 'success', `Webhook sent successfully (attempt ${attempt + 1})`, {
            status_code: response.status,
            response_headers: Object.fromEntries(response.headers.entries())
          });
          return true;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        await this.logWebhookEvent(jobId, 'error', 
          `Webhook attempt ${attempt} failed: ${errorMessage}`, 
          { attempt, error: errorMessage }
        );

        if (attempt < maxRetries) {
          // Wait before retry
          const delay = (config.retryDelay || 1000) * Math.pow(2, attempt - 1); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    return false;
  }

  /**
   * Generate HMAC signature for webhook security
   */
  private async generateSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return `sha256=${hashHex}`;
  }

  /**
   * Log webhook event
   */
  private async logWebhookEvent(jobId: string, level: 'info' | 'error', message: string, details?: any): Promise<void> {
    try {
      await this.supabase.rpc('create_doc_intel_job_log', {
        p_job_id: jobId,
        p_level: level,
        p_message: `Webhook: ${message}`,
        p_details: details
      });
    } catch (error) {
      console.error('Failed to log webhook event:', error);
    }
  }

  /**
   * Get webhook configuration for a job
   */
  async getWebhookConfig(jobId: string): Promise<WebhookConfig | null> {
    try {
      const { data: job, error } = await this.supabase
        .schema(this.schema)
        .from('doc_intel_job_queue')
        .select('metadata')
        .eq('id', jobId)
        .single();

      if (error || !job || !job.metadata?.webhook) {
        return null;
      }

      return job.metadata.webhook;
    } catch (error) {
      console.error('Error getting webhook config:', error);
      return null;
    }
  }

  /**
   * Notify job status change via webhook if configured
   */
  async notifyJobStatusChange(jobId: string, status: JobStatusUpdate['status'], additionalData: Partial<JobStatusUpdate> = {}): Promise<void> {
    const config = await this.getWebhookConfig(jobId);
    if (!config) {
      return;
    }

    // Get current job data
    const { data: job, error } = await this.supabase
      .schema(this.schema)
      .from('doc_intel_job_queue')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      console.error('Failed to get job data for webhook:', error);
      return;
    }

    const update: JobStatusUpdate = {
      job_id: jobId,
      status,
      progress_percentage: job.progress_percentage,
      current_step: job.current_step,
      ...additionalData
    };

    // Send webhook asynchronously (don't wait for completion)
    this.sendWebhook(jobId, config, update).catch(error => {
      console.error('Webhook sending failed:', error);
    });
  }
}

/**
 * Polling mechanism for job status monitoring
 */
export class DocETLPollingManager {
  private supabase: any;
  private schema: string;
  private pollingIntervals: Map<string, number> = new Map();

  constructor(supabase: any, schema: string) {
    this.supabase = supabase;
    this.schema = schema;
  }

  /**
   * Start polling for job status updates
   */
  startPolling(jobId: string, intervalMs: number = 5000, timeoutMs: number = 600000): void {
    if (this.pollingIntervals.has(jobId)) {
      return; // Already polling
    }

    const startTime = Date.now();
    
    const intervalId = setInterval(async () => {
      try {
        // Check if we've exceeded the timeout
        if (Date.now() - startTime > timeoutMs) {
          this.stopPolling(jobId);
          await this.handleJobTimeout(jobId);
          return;
        }

        // Get job status
        const { data: job, error } = await this.supabase
          .schema(this.schema)
          .from('doc_intel_job_queue')
          .select('*')
          .eq('id', jobId)
          .single();

        if (error) {
          console.error('Error polling job status:', error);
          return;
        }

        // Stop polling if job is complete
        if (!job || ['completed', 'failed', 'cancelled'].includes(job.status)) {
          this.stopPolling(jobId);
          return;
        }

        // Check for stale heartbeat (job might be stuck)
        if (job.status === 'processing' && job.last_heartbeat) {
          const heartbeatAge = Date.now() - new Date(job.last_heartbeat).getTime();
          if (heartbeatAge > 180000) { // 3 minutes without heartbeat
            await this.handleStaleJob(jobId, heartbeatAge);
          }
        }

      } catch (error) {
        console.error('Error in polling loop:', error);
      }
    }, intervalMs);

    this.pollingIntervals.set(jobId, intervalId);
  }

  /**
   * Stop polling for a specific job
   */
  stopPolling(jobId: string): void {
    const intervalId = this.pollingIntervals.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(jobId);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const [jobId, intervalId] of this.pollingIntervals) {
      clearInterval(intervalId);
    }
    this.pollingIntervals.clear();
  }

  /**
   * Handle job timeout
   */
  private async handleJobTimeout(jobId: string): Promise<void> {
    try {
      await this.supabase.rpc('fail_doc_intel_job', {
        p_job_id: jobId,
        p_error_message: 'Job timed out',
        p_error_details: { timeout_reason: 'exceeded_maximum_processing_time' },
        p_should_retry: false
      });

      await this.supabase.rpc('create_doc_intel_job_log', {
        p_job_id: jobId,
        p_level: 'error',
        p_message: 'Job timed out during processing'
      });
    } catch (error) {
      console.error('Error handling job timeout:', error);
    }
  }

  /**
   * Handle stale job (no heartbeat)
   */
  private async handleStaleJob(jobId: string, heartbeatAge: number): Promise<void> {
    try {
      await this.supabase.rpc('fail_doc_intel_job', {
        p_job_id: jobId,
        p_error_message: 'Job appears to be stuck (no heartbeat)',
        p_error_details: { 
          stale_reason: 'missing_heartbeat',
          heartbeat_age_ms: heartbeatAge
        },
        p_should_retry: true // Retry stale jobs
      });

      await this.supabase.rpc('create_doc_intel_job_log', {
        p_job_id: jobId,
        p_level: 'warning',
        p_message: `Job marked as stale due to missing heartbeat (${Math.round(heartbeatAge / 1000)}s ago)`
      });
    } catch (error) {
      console.error('Error handling stale job:', error);
    }
  }

  /**
   * Get polling status for all active jobs
   */
  getPollingStatus(): { jobId: string, active: boolean }[] {
    return Array.from(this.pollingIntervals.keys()).map(jobId => ({
      jobId,
      active: true
    }));
  }
}

/**
 * Long-running task coordinator
 * Manages the execution of tasks that may exceed Edge Function timeout limits
 */
export class LongRunningTaskCoordinator {
  private webhookHandler: DocETLWebhookHandler;
  private pollingManager: DocETLPollingManager;
  private supabase: any;
  private schema: string;

  constructor(supabase: any, schema: string) {
    this.supabase = supabase;
    this.schema = schema;
    this.webhookHandler = new DocETLWebhookHandler(supabase, schema);
    this.pollingManager = new DocETLPollingManager(supabase, schema);
  }

  /**
   * Initiate a long-running task
   */
  async initiateLongRunningTask(jobId: string, taskFunction: () => Promise<void>): Promise<void> {
    try {
      // Start monitoring
      this.pollingManager.startPolling(jobId);

      // Notify task started
      await this.webhookHandler.notifyJobStatusChange(jobId, 'processing');

      // Execute the task
      await taskFunction();

      // Stop monitoring on success
      this.pollingManager.stopPolling(jobId);

      // Notify completion
      await this.webhookHandler.notifyJobStatusChange(jobId, 'completed');

    } catch (error) {
      // Stop monitoring on error
      this.pollingManager.stopPolling(jobId);

      // Notify failure
      await this.webhookHandler.notifyJobStatusChange(jobId, 'failed', {
        error_message: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.pollingManager.stopAllPolling();
  }
}

/**
 * Create webhook handler instance
 */
export function createWebhookHandler(supabase: any, schema: string): DocETLWebhookHandler {
  return new DocETLWebhookHandler(supabase, schema);
}

/**
 * Create polling manager instance
 */
export function createPollingManager(supabase: any, schema: string): DocETLPollingManager {
  return new DocETLPollingManager(supabase, schema);
}

/**
 * Create long-running task coordinator
 */
export function createTaskCoordinator(supabase: any, schema: string): LongRunningTaskCoordinator {
  return new LongRunningTaskCoordinator(supabase, schema);
}