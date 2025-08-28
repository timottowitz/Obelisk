/**
 * Job Monitoring and Error Handling Service
 * Provides comprehensive monitoring, alerting, and error handling for job processing
 */

import { Job, JobStatus, JobType, JobError, JobQueueStats } from './job-types';
import { getJobQueueService } from './job-queue';
import { getWorkerManagerService } from './worker-manager-service';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Alert interface
 */
export interface JobAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  jobId?: string;
  jobType?: JobType;
  timestamp: string;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

/**
 * Monitoring configuration
 */
export interface JobMonitoringConfig {
  /** Error rate threshold (percentage) to trigger alerts */
  errorRateThreshold: number;
  
  /** Queue size threshold to trigger alerts */
  queueSizeThreshold: number;
  
  /** Processing time threshold (ms) for slow job alerts */
  slowJobThreshold: number;
  
  /** Worker health check interval (ms) */
  healthCheckInterval: number;
  
  /** Failed job retry threshold */
  failedJobRetryThreshold: number;
  
  /** Whether to auto-retry certain job types */
  autoRetryEnabled: boolean;
  
  /** Job types that should auto-retry */
  autoRetryJobTypes: JobType[];
  
  /** Maximum number of alerts to keep in memory */
  maxAlertsHistory: number;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  healthy: boolean;
  overallScore: number; // 0-100
  components: {
    workers: {
      healthy: boolean;
      activeWorkers: number;
      totalWorkers: number;
      issues: string[];
    };
    queue: {
      healthy: boolean;
      queuedJobs: number;
      runningJobs: number;
      avgWaitTime: number;
      issues: string[];
    };
    processing: {
      healthy: boolean;
      throughput: number; // jobs per minute
      errorRate: number; // percentage
      avgProcessingTime: number; // ms
      issues: string[];
    };
  };
  alerts: JobAlert[];
  lastCheck: string;
}

/**
 * Default monitoring configuration
 */
const DEFAULT_MONITORING_CONFIG: JobMonitoringConfig = {
  errorRateThreshold: 10, // 10%
  queueSizeThreshold: 100,
  slowJobThreshold: 300000, // 5 minutes
  healthCheckInterval: 60000, // 1 minute
  failedJobRetryThreshold: 3,
  autoRetryEnabled: true,
  autoRetryJobTypes: ['email_storage', 'email_content_analysis'],
  maxAlertsHistory: 1000
};

/**
 * Job Monitoring Service
 */
export class JobMonitoringService {
  private config: JobMonitoringConfig;
  private alerts: JobAlert[] = [];
  private monitoringTimer?: NodeJS.Timeout;
  private isMonitoring = false;

  constructor(config: Partial<JobMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isMonitoring) return;
    
    console.log('Starting job monitoring service...');
    this.isMonitoring = true;
    
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    console.log('Job monitoring service started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;
    
    console.log('Stopping job monitoring service...');
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }
    
    console.log('Job monitoring service stopped');
  }

  /**
   * Get current system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const jobQueue = getJobQueueService();
    const workerManager = getWorkerManagerService({ autoStart: false });
    
    try {
      // Get queue statistics
      const queueStats = await jobQueue.getQueueStats();
      
      // Get worker health
      const workerHealths = workerManager.getWorkerHealth();
      const healthyWorkers = workerHealths.filter(w => w.healthy);
      
      // Calculate component health
      const workerHealth = this.assessWorkerHealth(workerHealths);
      const queueHealth = this.assessQueueHealth(queueStats);
      const processingHealth = this.assessProcessingHealth(queueStats);
      
      // Calculate overall health score
      const overallScore = Math.round((
        (workerHealth.score + queueHealth.score + processingHealth.score) / 3
      ));
      
      return {
        healthy: overallScore >= 70,
        overallScore,
        components: {
          workers: {
            healthy: workerHealth.healthy,
            activeWorkers: healthyWorkers.length,
            totalWorkers: workerHealths.length,
            issues: workerHealth.issues
          },
          queue: {
            healthy: queueHealth.healthy,
            queuedJobs: queueStats.counts.queued,
            runningJobs: queueStats.counts.running,
            avgWaitTime: queueStats.health.averageWaitTime,
            issues: queueHealth.issues
          },
          processing: {
            healthy: processingHealth.healthy,
            throughput: queueStats.health.throughput,
            errorRate: queueStats.health.errorRate,
            avgProcessingTime: this.calculateAvgProcessingTime(queueStats),
            issues: processingHealth.issues
          }
        },
        alerts: this.getRecentAlerts(),
        lastCheck: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to get system health:', error);
      
      return {
        healthy: false,
        overallScore: 0,
        components: {
          workers: { healthy: false, activeWorkers: 0, totalWorkers: 0, issues: ['Health check failed'] },
          queue: { healthy: false, queuedJobs: 0, runningJobs: 0, avgWaitTime: 0, issues: ['Health check failed'] },
          processing: { healthy: false, throughput: 0, errorRate: 0, avgProcessingTime: 0, issues: ['Health check failed'] }
        },
        alerts: this.getRecentAlerts(),
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Create an alert
   */
  createAlert(severity: AlertSeverity, title: string, message: string, metadata?: Record<string, any>): JobAlert {
    const alert: JobAlert = {
      id: crypto.randomUUID(),
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      metadata
    };
    
    this.alerts.unshift(alert);
    
    // Keep only the most recent alerts
    if (this.alerts.length > this.config.maxAlertsHistory) {
      this.alerts = this.alerts.slice(0, this.config.maxAlertsHistory);
    }
    
    console.log(`[${severity.toUpperCase()}] ${title}: ${message}`);
    
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit?: number): JobAlert[] {
    const recentAlerts = this.alerts.slice(0, limit || 50);
    return recentAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Handle job failure with automatic retry logic
   */
  async handleJobFailure(job: Job, error: JobError): Promise<void> {
    console.error(`Job ${job.id} failed:`, error.message);
    
    // Create alert for job failure
    this.createAlert('error', 'Job Failed', `Job ${job.id} (${job.type}) failed: ${error.message}`, {
      jobId: job.id,
      jobType: job.type,
      error: error.code,
      attempts: job.attempts,
      maxRetries: job.maxRetries
    });
    
    // Check if we should auto-retry
    if (this.shouldAutoRetry(job, error)) {
      try {
        const jobQueue = getJobQueueService();
        await jobQueue.retryJob(job.id, job.data.orgId);
        
        this.createAlert('info', 'Job Auto-Retry', `Job ${job.id} automatically queued for retry`, {
          jobId: job.id,
          jobType: job.type,
          attempt: job.attempts + 1
        });
      } catch (retryError) {
        console.error(`Failed to auto-retry job ${job.id}:`, retryError);
        this.createAlert('error', 'Auto-Retry Failed', `Failed to auto-retry job ${job.id}`, {
          jobId: job.id,
          error: retryError instanceof Error ? retryError.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Perform periodic health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isMonitoring) return;
    
    try {
      const health = await this.getSystemHealth();
      
      // Check for critical issues
      if (!health.healthy) {
        this.createAlert('critical', 'System Unhealthy', 
          `System health score is ${health.overallScore}/100`, {
            healthScore: health.overallScore,
            components: health.components
          });
      }
      
      // Check worker issues
      if (!health.components.workers.healthy) {
        this.createAlert('warning', 'Worker Issues', 
          `${health.components.workers.issues.length} worker issues detected`, {
            issues: health.components.workers.issues,
            activeWorkers: health.components.workers.activeWorkers,
            totalWorkers: health.components.workers.totalWorkers
          });
      }
      
      // Check queue backlog
      if (health.components.queue.queuedJobs > this.config.queueSizeThreshold) {
        this.createAlert('warning', 'Queue Backlog', 
          `${health.components.queue.queuedJobs} jobs queued (threshold: ${this.config.queueSizeThreshold})`, {
            queuedJobs: health.components.queue.queuedJobs,
            threshold: this.config.queueSizeThreshold
          });
      }
      
      // Check error rate
      if (health.components.processing.errorRate > this.config.errorRateThreshold) {
        this.createAlert('error', 'High Error Rate', 
          `Error rate is ${health.components.processing.errorRate.toFixed(1)}% (threshold: ${this.config.errorRateThreshold}%)`, {
            errorRate: health.components.processing.errorRate,
            threshold: this.config.errorRateThreshold
          });
      }
      
    } catch (error) {
      console.error('Health check failed:', error);
      this.createAlert('error', 'Health Check Failed', 'Unable to perform system health check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Assess worker health
   */
  private assessWorkerHealth(workerHealths: any[]): { healthy: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    
    if (workerHealths.length === 0) {
      issues.push('No workers found');
      return { healthy: false, score: 0, issues };
    }
    
    const healthyWorkers = workerHealths.filter(w => w.healthy);
    const healthyRatio = healthyWorkers.length / workerHealths.length;
    
    if (healthyRatio < 0.5) {
      issues.push(`Only ${healthyWorkers.length}/${workerHealths.length} workers are healthy`);
    }
    
    // Check for stalled workers
    const stalledWorkers = workerHealths.filter(w => w.status === 'error' || w.status === 'stopped');
    if (stalledWorkers.length > 0) {
      issues.push(`${stalledWorkers.length} workers are stalled or stopped`);
    }
    
    const score = Math.round(healthyRatio * 100);
    const healthy = score >= 80;
    
    return { healthy, score, issues };
  }

  /**
   * Assess queue health
   */
  private assessQueueHealth(stats: JobQueueStats): { healthy: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    
    const queuedJobs = stats.counts.queued;
    const runningJobs = stats.counts.running;
    const avgWaitTime = stats.health.averageWaitTime;
    
    let score = 100;
    
    // Check queue size
    if (queuedJobs > this.config.queueSizeThreshold) {
      issues.push(`Queue has ${queuedJobs} jobs (threshold: ${this.config.queueSizeThreshold})`);
      score -= 30;
    }
    
    // Check wait time
    if (avgWaitTime > 300000) { // 5 minutes
      issues.push(`Average wait time is ${Math.round(avgWaitTime / 1000)}s`);
      score -= 20;
    }
    
    // Check if no jobs are running when there are queued jobs
    if (queuedJobs > 0 && runningJobs === 0) {
      issues.push('Jobs queued but none running - possible worker issue');
      score -= 40;
    }
    
    score = Math.max(0, score);
    const healthy = score >= 70;
    
    return { healthy, score, issues };
  }

  /**
   * Assess processing health
   */
  private assessProcessingHealth(stats: JobQueueStats): { healthy: boolean; score: number; issues: string[] } {
    const issues: string[] = [];
    
    const errorRate = stats.health.errorRate;
    const throughput = stats.health.throughput;
    
    let score = 100;
    
    // Check error rate
    if (errorRate > this.config.errorRateThreshold) {
      issues.push(`Error rate is ${errorRate.toFixed(1)}% (threshold: ${this.config.errorRateThreshold}%)`);
      score -= 40;
    }
    
    // Check throughput (this is basic - you might want more sophisticated metrics)
    if (throughput === 0 && stats.counts.queued > 0) {
      issues.push('No jobs processed recently despite queue backlog');
      score -= 30;
    }
    
    score = Math.max(0, score);
    const healthy = score >= 70;
    
    return { healthy, score, issues };
  }

  /**
   * Calculate average processing time from stats
   */
  private calculateAvgProcessingTime(stats: JobQueueStats): number {
    const processingTimes = Object.values(stats.averageProcessingTime);
    if (processingTimes.length === 0) return 0;
    
    return processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
  }

  /**
   * Determine if job should be auto-retried
   */
  private shouldAutoRetry(job: Job, error: JobError): boolean {
    if (!this.config.autoRetryEnabled) return false;
    if (!this.config.autoRetryJobTypes.includes(job.type)) return false;
    if (!error.retryable) return false;
    if (job.attempts >= job.maxRetries) return false;
    
    // Don't auto-retry if we've already retried too many times recently
    const recentRetries = this.alerts.filter(
      alert => alert.title === 'Job Auto-Retry' && 
               alert.metadata?.jobId === job.id &&
               new Date(alert.timestamp).getTime() > Date.now() - 3600000 // Last hour
    );
    
    return recentRetries.length < this.config.failedJobRetryThreshold;
  }
}

/**
 * Global monitoring service instance
 */
let globalMonitoringService: JobMonitoringService | null = null;

/**
 * Get or create the global monitoring service
 */
export function getJobMonitoringService(config?: Partial<JobMonitoringConfig>): JobMonitoringService {
  if (!globalMonitoringService) {
    globalMonitoringService = new JobMonitoringService(config);
  }
  return globalMonitoringService;
}

/**
 * Initialize monitoring service and start monitoring
 */
export function startJobMonitoring(config?: Partial<JobMonitoringConfig>): JobMonitoringService {
  const service = getJobMonitoringService(config);
  service.start();
  return service;
}

/**
 * Stop monitoring service
 */
export function stopJobMonitoring(): void {
  if (globalMonitoringService) {
    globalMonitoringService.stop();
  }
}