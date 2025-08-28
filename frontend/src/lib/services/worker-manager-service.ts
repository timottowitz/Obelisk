/**
 * Worker Manager Service
 * Manages the lifecycle of background job workers and ensures they stay running
 */

import { JobWorkerManager, createJobWorkerManager } from './job-workers';
import { getJobQueueService } from './job-queue';
import { JobWorkerConfig } from './job-types';

/**
 * Configuration for the worker manager service
 */
interface WorkerManagerServiceConfig {
  /** Whether to start workers automatically */
  autoStart?: boolean;
  
  /** Interval for health checks in milliseconds */
  healthCheckInterval?: number;
  
  /** Whether to restart failed workers automatically */
  autoRestart?: boolean;
  
  /** Maximum restart attempts for failed workers */
  maxRestartAttempts?: number;
  
  /** Custom worker configurations */
  workerConfigs?: JobWorkerConfig[];
}

/**
 * Service for managing background job workers
 */
export class WorkerManagerService {
  private workerManager: JobWorkerManager;
  private healthCheckTimer?: NodeJS.Timeout;
  private isRunning = false;
  private restartAttempts = new Map<string, number>();
  
  private config: Required<WorkerManagerServiceConfig>;

  constructor(config: WorkerManagerServiceConfig = {}) {
    this.config = {
      autoStart: config.autoStart ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      autoRestart: config.autoRestart ?? true,
      maxRestartAttempts: config.maxRestartAttempts ?? 3,
      workerConfigs: config.workerConfigs ?? this.getDefaultWorkerConfigs()
    };

    // Create job queue service and worker manager
    const jobQueue = getJobQueueService();
    this.workerManager = createJobWorkerManager(jobQueue, this.config.workerConfigs);

    if (this.config.autoStart) {
      this.start();
    }
  }

  /**
   * Start the worker manager service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Worker manager service is already running');
      return;
    }

    console.log('Starting worker manager service...');
    this.isRunning = true;

    try {
      // Start the worker manager
      await this.workerManager.start();
      console.log('Worker manager started successfully');

      // Start health check monitoring
      this.startHealthChecks();

      // Trigger the job processor Edge Function to start processing
      await this.triggerEdgeFunctionWorker();
      
    } catch (error) {
      console.error('Failed to start worker manager service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the worker manager service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Worker manager service is not running');
      return;
    }

    console.log('Stopping worker manager service...');
    this.isRunning = false;

    // Stop health checks
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    // Stop worker manager
    await this.workerManager.stop();
    console.log('Worker manager service stopped');
  }

  /**
   * Check if the service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get worker health status
   */
  getWorkerHealth() {
    return this.workerManager.getWorkerHealth();
  }

  /**
   * Get service configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Restart all workers
   */
  async restartWorkers(): Promise<void> {
    console.log('Restarting all workers...');
    
    await this.workerManager.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Brief pause
    await this.workerManager.start();
    
    // Reset restart attempts
    this.restartAttempts.clear();
    
    console.log('All workers restarted');
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log(`Started health checks with ${this.config.healthCheckInterval}ms interval`);
  }

  /**
   * Perform health check on workers
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const workerHealths = this.workerManager.getWorkerHealth();
      const unhealthyWorkers = workerHealths.filter(health => !health.healthy);
      
      if (unhealthyWorkers.length > 0) {
        console.warn(`Found ${unhealthyWorkers.length} unhealthy workers:`, 
          unhealthyWorkers.map(w => w.workerId));

        if (this.config.autoRestart) {
          await this.handleUnhealthyWorkers(unhealthyWorkers);
        }
      }

      // Trigger Edge Function worker periodically to ensure processing continues
      if (Math.random() < 0.1) { // 10% chance each health check
        await this.triggerEdgeFunctionWorker();
      }

    } catch (error) {
      console.error('Error during health check:', error);
    }
  }

  /**
   * Handle unhealthy workers
   */
  private async handleUnhealthyWorkers(unhealthyWorkers: any[]): Promise<void> {
    for (const worker of unhealthyWorkers) {
      const workerId = worker.workerId;
      const currentAttempts = this.restartAttempts.get(workerId) || 0;

      if (currentAttempts < this.config.maxRestartAttempts) {
        console.log(`Attempting to restart worker ${workerId} (attempt ${currentAttempts + 1})`);
        
        try {
          await this.restartWorkers(); // For now, restart all workers
          this.restartAttempts.set(workerId, currentAttempts + 1);
          
          console.log(`Successfully restarted worker ${workerId}`);
        } catch (error) {
          console.error(`Failed to restart worker ${workerId}:`, error);
          this.restartAttempts.set(workerId, currentAttempts + 1);
        }
      } else {
        console.error(`Worker ${workerId} has exceeded maximum restart attempts (${this.config.maxRestartAttempts})`);
        // Could send alert to monitoring system here
      }
    }
  }

  /**
   * Trigger the Supabase Edge Function worker
   */
  private async triggerEdgeFunctionWorker(): Promise<void> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase configuration missing for Edge Function trigger');
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/job-processor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_worker',
          workerConfig: {
            maxJobs: 5,
            maxRunTime: 50000
          }
        })
      });

      if (!response.ok) {
        console.warn('Edge Function trigger response not OK:', response.statusText);
      } else {
        const result = await response.json();
        console.log('Edge Function worker triggered:', result);
      }
    } catch (error) {
      console.warn('Failed to trigger Edge Function worker:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get default worker configurations
   */
  private getDefaultWorkerConfigs(): JobWorkerConfig[] {
    return [
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
      },
      {
        workerId: 'analysis-worker-1',
        supportedJobTypes: ['email_content_analysis'],
        maxConcurrency: 2,
        heartbeatInterval: 45000,
        idleTimeout: 400000,
        enabled: true
      },
      {
        workerId: 'export-worker-1',
        supportedJobTypes: ['export_case_data'],
        maxConcurrency: 1,
        heartbeatInterval: 60000,
        idleTimeout: 600000,
        enabled: true
      }
    ];
  }
}

/**
 * Global worker manager service instance
 */
let globalWorkerManagerService: WorkerManagerService | null = null;

/**
 * Get or create the global worker manager service
 */
export function getWorkerManagerService(config?: WorkerManagerServiceConfig): WorkerManagerService {
  if (!globalWorkerManagerService) {
    globalWorkerManagerService = new WorkerManagerService(config);
  }
  return globalWorkerManagerService;
}

/**
 * Initialize the worker manager service with custom configuration
 */
export function initializeWorkerManager(config: WorkerManagerServiceConfig): WorkerManagerService {
  if (globalWorkerManagerService) {
    console.warn('Worker manager service already initialized');
  }
  
  globalWorkerManagerService = new WorkerManagerService(config);
  return globalWorkerManagerService;
}

/**
 * Shutdown the global worker manager service
 */
export async function shutdownWorkerManager(): Promise<void> {
  if (globalWorkerManagerService) {
    await globalWorkerManagerService.stop();
    globalWorkerManagerService = null;
  }
}

/**
 * API endpoint helper to trigger worker startup
 */
export async function startWorkersFromAPI(): Promise<{
  success: boolean;
  message: string;
  workerHealth?: any[];
}> {
  try {
    const workerManager = getWorkerManagerService();
    
    if (!workerManager.isServiceRunning()) {
      await workerManager.start();
    }
    
    const workerHealth = workerManager.getWorkerHealth();
    
    return {
      success: true,
      message: 'Workers started successfully',
      workerHealth
    };
  } catch (error) {
    console.error('Failed to start workers from API:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start workers'
    };
  }
}

/**
 * API endpoint helper to get worker status
 */
export function getWorkerStatusFromAPI(): {
  success: boolean;
  isRunning: boolean;
  workerHealth: any[];
  config: any;
} {
  try {
    const workerManager = getWorkerManagerService({ autoStart: false });
    
    return {
      success: true,
      isRunning: workerManager.isServiceRunning(),
      workerHealth: workerManager.getWorkerHealth(),
      config: workerManager.getConfig()
    };
  } catch (error) {
    console.error('Failed to get worker status from API:', error);
    return {
      success: false,
      isRunning: false,
      workerHealth: [],
      config: {}
    };
  }
}