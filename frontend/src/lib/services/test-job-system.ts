/**
 * Job System Testing Utilities
 * Provides functions to test and validate the job processing system
 */

import { getJobQueueService } from './job-queue';
import { BulkAssignmentJobData, EmailStorageJobData } from './job-types';
import { checkSystemHealth } from './system-init';

/**
 * Test configuration
 */
interface JobSystemTestConfig {
  orgId: string;
  userId: string;
  testCaseId: string;
  testEmailIds: string[];
}

/**
 * Test results
 */
interface JobSystemTestResult {
  success: boolean;
  message: string;
  tests: {
    name: string;
    success: boolean;
    message: string;
    duration?: number;
    data?: any;
  }[];
  summary: {
    passed: number;
    failed: number;
    total: number;
    duration: number;
  };
}

/**
 * Run comprehensive job system tests
 */
export async function runJobSystemTests(config: JobSystemTestConfig): Promise<JobSystemTestResult> {
  const startTime = Date.now();
  const tests: JobSystemTestResult['tests'] = [];
  
  console.log('🧪 Starting job system tests...');

  // Test 1: System Health Check
  await runTest(tests, 'System Health Check', async () => {
    const health = await checkSystemHealth();
    if (!health.healthy) {
      throw new Error(`System not healthy: ${health.message}`);
    }
    return { healthy: health.healthy, details: health.details };
  });

  // Test 2: Job Queue Service
  await runTest(tests, 'Job Queue Service Initialization', async () => {
    const jobQueue = getJobQueueService();
    return { initialized: !!jobQueue };
  });

  // Test 3: Create Email Storage Job
  await runTest(tests, 'Create Email Storage Job', async () => {
    const jobQueue = getJobQueueService();
    
    const jobData: EmailStorageJobData = {
      type: 'email_storage',
      orgId: config.orgId,
      userId: config.userId,
      emailId: config.testEmailIds[0] || 'test-email-1',
      caseId: config.testCaseId,
      description: 'Test email storage job'
    };

    const job = await jobQueue.createJob({
      type: 'email_storage',
      data: jobData,
      priority: 'normal',
      timeout: 300000,
      maxRetries: 2,
      metadata: { test: true }
    });

    return { jobId: job.id, status: job.status, type: job.type };
  });

  // Test 4: Create Bulk Assignment Job
  await runTest(tests, 'Create Bulk Assignment Job', async () => {
    const jobQueue = getJobQueueService();
    
    const jobData: BulkAssignmentJobData = {
      type: 'email_bulk_assignment',
      orgId: config.orgId,
      userId: config.userId,
      emailIds: config.testEmailIds.length > 0 ? config.testEmailIds : ['test-email-1', 'test-email-2'],
      caseId: config.testCaseId,
      batchSize: 2,
      skipExisting: true,
      description: 'Test bulk assignment job'
    };

    const job = await jobQueue.createJob({
      type: 'email_bulk_assignment',
      data: jobData,
      priority: 'normal',
      timeout: 600000,
      maxRetries: 2,
      metadata: { test: true }
    });

    return { jobId: job.id, status: job.status, type: job.type, emailCount: jobData.emailIds.length };
  });

  // Test 5: Query Jobs
  await runTest(tests, 'Query Jobs', async () => {
    const jobQueue = getJobQueueService();
    
    const result = await jobQueue.queryJobs(config.orgId, {
      userId: config.userId
    }, {
      page: 0,
      limit: 10,
      sortBy: 'created',
      sortOrder: 'desc'
    });

    return { 
      totalJobs: result.totalCount, 
      jobsReturned: result.jobs.length,
      pagination: {
        page: result.page,
        totalPages: result.totalPages,
        hasMore: result.hasMore
      }
    };
  });

  // Test 6: Get Queue Statistics
  await runTest(tests, 'Get Queue Statistics', async () => {
    const jobQueue = getJobQueueService();
    const stats = await jobQueue.getQueueStats(config.orgId);
    
    return {
      totalJobs: Object.values(stats.counts).reduce((sum, count) => sum + count, 0),
      activeWorkers: stats.activeWorkers,
      errorRate: stats.health.errorRate,
      throughput: stats.health.throughput
    };
  });

  // Test 7: Job Lifecycle Test (if we have jobs)
  const createdJobs = tests
    .filter(t => t.name.includes('Create') && t.success && t.data?.jobId)
    .map(t => t.data.jobId);

  if (createdJobs.length > 0) {
    await runTest(tests, 'Job Lifecycle Operations', async () => {
      const jobQueue = getJobQueueService();
      const jobId = createdJobs[0];
      
      // Get job
      const job = await jobQueue.getJob(jobId, config.orgId);
      if (!job) {
        throw new Error('Failed to retrieve created job');
      }
      
      // Try to cancel if it's still running
      let cancelled = false;
      if (['pending', 'queued', 'running'].includes(job.status)) {
        await jobQueue.cancelJob(jobId, config.orgId);
        cancelled = true;
      }
      
      return {
        jobId,
        originalStatus: job.status,
        cancelled,
        jobType: job.type
      };
    });
  }

  // Calculate summary
  const totalDuration = Date.now() - startTime;
  const passed = tests.filter(t => t.success).length;
  const failed = tests.filter(t => !t.success).length;
  
  const allPassed = failed === 0;
  
  const result: JobSystemTestResult = {
    success: allPassed,
    message: allPassed 
      ? `All ${passed} tests passed successfully` 
      : `${passed} tests passed, ${failed} tests failed`,
    tests,
    summary: {
      passed,
      failed,
      total: tests.length,
      duration: totalDuration
    }
  };

  console.log(allPassed ? '✅' : '❌', result.message);
  console.log(`📊 Test Summary: ${passed}/${tests.length} passed in ${totalDuration}ms`);

  return result;
}

/**
 * Helper function to run individual tests
 */
async function runTest(
  tests: JobSystemTestResult['tests'],
  name: string,
  testFunction: () => Promise<any>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    console.log(`  Running: ${name}...`);
    const result = await testFunction();
    const duration = Date.now() - startTime;
    
    tests.push({
      name,
      success: true,
      message: 'Passed',
      duration,
      data: result
    });
    
    console.log(`  ✅ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    tests.push({
      name,
      success: false,
      message,
      duration
    });
    
    console.log(`  ❌ ${name} (${duration}ms): ${message}`);
  }
}

/**
 * Quick health check function
 */
export async function quickHealthCheck(): Promise<{
  healthy: boolean;
  message: string;
  services: any;
}> {
  try {
    const health = await checkSystemHealth();
    return {
      healthy: health.healthy,
      message: health.message,
      services: health.details
    };
  } catch (error) {
    return {
      healthy: false,
      message: error instanceof Error ? error.message : 'Health check failed',
      services: {}
    };
  }
}

/**
 * Create test jobs for manual testing
 */
export async function createTestJobs(config: JobSystemTestConfig): Promise<{
  success: boolean;
  jobs: Array<{ id: string; type: string; status: string }>;
}> {
  try {
    const jobQueue = getJobQueueService();
    const jobs = [];

    // Create an email storage job
    const storageJob = await jobQueue.createJob({
      type: 'email_storage',
      data: {
        type: 'email_storage',
        orgId: config.orgId,
        userId: config.userId,
        emailId: 'test-email-storage',
        caseId: config.testCaseId,
        description: 'Manual test email storage job'
      },
      priority: 'normal',
      metadata: { test: true, manual: true }
    });

    jobs.push({
      id: storageJob.id,
      type: storageJob.type,
      status: storageJob.status
    });

    // Create a bulk assignment job
    const bulkJob = await jobQueue.createJob({
      type: 'email_bulk_assignment',
      data: {
        type: 'email_bulk_assignment',
        orgId: config.orgId,
        userId: config.userId,
        emailIds: ['test-email-1', 'test-email-2', 'test-email-3'],
        caseId: config.testCaseId,
        batchSize: 2,
        skipExisting: true,
        description: 'Manual test bulk assignment job'
      },
      priority: 'high',
      metadata: { test: true, manual: true }
    });

    jobs.push({
      id: bulkJob.id,
      type: bulkJob.type,
      status: bulkJob.status
    });

    return { success: true, jobs };
  } catch (error) {
    console.error('Failed to create test jobs:', error);
    return { success: false, jobs: [] };
  }
}