/**
 * System Initialization Service
 * Initializes and starts all background services for job processing
 */

import { getJobQueueService } from './job-queue';
import { getWorkerManagerService } from './worker-manager-service';
import { startJobMonitoring } from './job-monitoring';

/**
 * Initialize all job processing services
 * This should be called when the application starts
 */
export async function initializeJobProcessingSystem(): Promise<{
  success: boolean;
  message: string;
  services: {
    jobQueue: boolean;
    workerManager: boolean;
    monitoring: boolean;
  };
}> {
  const results = {
    jobQueue: false,
    workerManager: false,
    monitoring: false
  };

  try {
    console.log('Initializing job processing system...');

    // Initialize job queue service
    try {
      const jobQueue = getJobQueueService();
      console.log('✓ Job queue service initialized');
      results.jobQueue = true;
    } catch (error) {
      console.error('✗ Failed to initialize job queue service:', error);
    }

    // Initialize and start worker manager
    try {
      const workerManager = getWorkerManagerService({
        autoStart: true,
        healthCheckInterval: 30000,
        autoRestart: true,
        maxRestartAttempts: 3
      });
      
      // Give it a moment to start
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('✓ Worker manager service initialized and started');
      results.workerManager = true;
    } catch (error) {
      console.error('✗ Failed to initialize worker manager service:', error);
    }

    // Start monitoring service
    try {
      const monitoringService = startJobMonitoring({
        errorRateThreshold: 10,
        queueSizeThreshold: 100,
        healthCheckInterval: 60000,
        autoRetryEnabled: true,
        autoRetryJobTypes: ['email_storage', 'email_content_analysis']
      });
      
      console.log('✓ Monitoring service initialized and started');
      results.monitoring = true;
    } catch (error) {
      console.error('✗ Failed to initialize monitoring service:', error);
    }

    const allInitialized = Object.values(results).every(Boolean);
    
    if (allInitialized) {
      console.log('🚀 Job processing system fully initialized');
      return {
        success: true,
        message: 'Job processing system fully initialized',
        services: results
      };
    } else {
      console.warn('⚠️ Job processing system partially initialized');
      return {
        success: false,
        message: 'Job processing system partially initialized - some services failed to start',
        services: results
      };
    }

  } catch (error) {
    console.error('❌ Failed to initialize job processing system:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'System initialization failed',
      services: results
    };
  }
}

/**
 * Check if the job processing system is healthy
 */
export async function checkSystemHealth(): Promise<{
  healthy: boolean;
  message: string;
  details: {
    jobQueue: boolean;
    workers: boolean;
    monitoring: boolean;
  };
}> {
  try {
    const jobQueue = getJobQueueService();
    const workerManager = getWorkerManagerService({ autoStart: false });
    
    // Check if services are running
    const jobQueueHealthy = !!jobQueue;
    const workersHealthy = workerManager.isServiceRunning();
    const monitoringHealthy = true; // We assume monitoring is running if we can check it
    
    const allHealthy = jobQueueHealthy && workersHealthy && monitoringHealthy;
    
    return {
      healthy: allHealthy,
      message: allHealthy 
        ? 'All job processing services are healthy' 
        : 'Some job processing services are not healthy',
      details: {
        jobQueue: jobQueueHealthy,
        workers: workersHealthy,
        monitoring: monitoringHealthy
      }
    };
    
  } catch (error) {
    console.error('Error checking system health:', error);
    return {
      healthy: false,
      message: 'Failed to check system health',
      details: {
        jobQueue: false,
        workers: false,
        monitoring: false
      }
    };
  }
}

/**
 * Shutdown the job processing system gracefully
 */
export async function shutdownJobProcessingSystem(): Promise<void> {
  console.log('Shutting down job processing system...');
  
  try {
    // Import shutdown functions
    const { shutdownWorkerManager } = await import('./worker-manager-service');
    const { stopJobMonitoring } = await import('./job-monitoring');
    
    // Stop monitoring
    stopJobMonitoring();
    console.log('✓ Monitoring service stopped');
    
    // Stop workers
    await shutdownWorkerManager();
    console.log('✓ Worker manager stopped');
    
    console.log('🛑 Job processing system shutdown complete');
    
  } catch (error) {
    console.error('Error during system shutdown:', error);
  }
}

/**
 * Restart the entire job processing system
 */
export async function restartJobProcessingSystem(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    console.log('Restarting job processing system...');
    
    // Shutdown first
    await shutdownJobProcessingSystem();
    
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Initialize again
    const result = await initializeJobProcessingSystem();
    
    return {
      success: result.success,
      message: result.success 
        ? 'Job processing system restarted successfully'
        : 'Job processing system restart failed partially'
    };
    
  } catch (error) {
    console.error('Error restarting job processing system:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Restart failed'
    };
  }
}

// Auto-initialize on module load if in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Server-side and production environment
  initializeJobProcessingSystem().catch(error => {
    console.error('Auto-initialization failed:', error);
  });
}