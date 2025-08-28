/**
 * Job Queue Service Tests
 * Tests for background job processing and queue management
 */

import { jobQueueService } from '../job-queue';
import { testData, testDataFactory } from '@/test-utils/test-data';
import { dbHelpers } from '@/test-utils/db-helpers';

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  lpush: jest.fn(),
  rpop: jest.fn(),
  llen: jest.fn(),
  hset: jest.fn(),
  hget: jest.fn(),
  hgetall: jest.fn(),
  hdel: jest.fn(),
  expire: jest.fn(),
  exists: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  quit: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockRedisClient),
}));

// Mock database
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}));

// Mock worker processes
const mockWorkerProcess = {
  send: jest.fn(),
  kill: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('child_process', () => ({
  fork: jest.fn(() => mockWorkerProcess),
}));

describe('Job Queue Service', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbHelpers.setup();
    
    // Reset Redis mocks
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisClient.rpop.mockResolvedValue(null);
    mockRedisClient.llen.mockResolvedValue(0);
  });

  afterEach(async () => {
    await dbHelpers.teardown();
  });

  describe('Job creation', () => {
    it('creates a new job successfully', async () => {
      const jobData = {
        emailIds: testDataFactory.emails(5).map(e => e.id),
        caseId: 'test-case-1',
        userId: 'test-user-1',
        organizationId: 'test-org-1',
      };

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().insert().mockResolvedValue({
        data: {
          id: 'job-123',
          type: 'bulk_email_assignment',
          status: 'pending',
          data: jobData,
          created_at: new Date().toISOString(),
          estimated_completion: new Date(Date.now() + 60000).toISOString(),
        },
        error: null,
      });

      mockRedisClient.lpush.mockResolvedValue(1);

      const job = await jobQueueService.createJob('bulk_email_assignment', jobData);

      expect(job).toEqual(
        expect.objectContaining({
          id: 'job-123',
          type: 'bulk_email_assignment',
          status: 'pending',
          data: jobData,
        })
      );

      expect(supabase.from).toHaveBeenCalledWith('jobs');
      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'queue:bulk_email_assignment',
        'job-123'
      );
    });

    it('validates job data before creation', async () => {
      const invalidJobData = {
        // Missing required fields
      };

      await expect(
        jobQueueService.createJob('bulk_email_assignment', invalidJobData)
      ).rejects.toThrow('Invalid job data');
    });

    it('sets job priority correctly', async () => {
      const highPriorityData = {
        emailIds: ['urgent-email-1'],
        caseId: 'urgent-case',
        priority: 'high',
      };

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().insert().mockResolvedValue({
        data: { id: 'job-high-priority', priority: 'high' },
        error: null,
      });

      mockRedisClient.lpush.mockResolvedValue(1);

      const job = await jobQueueService.createJob('bulk_email_assignment', highPriorityData);

      // High priority jobs should go to priority queue
      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'queue:bulk_email_assignment:high',
        'job-high-priority'
      );
    });

    it('handles database failures', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().insert().mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(
        jobQueueService.createJob('bulk_email_assignment', { emailIds: [] })
      ).rejects.toThrow('Failed to create job');
    });

    it('handles Redis failures', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().insert().mockResolvedValue({
        data: { id: 'job-123' },
        error: null,
      });

      mockRedisClient.lpush.mockRejectedValue(new Error('Redis connection failed'));

      await expect(
        jobQueueService.createJob('bulk_email_assignment', { emailIds: [] })
      ).rejects.toThrow('Failed to queue job');
    });
  });

  describe('Job processing', () => {
    const mockJob = {
      id: 'job-123',
      type: 'bulk_email_assignment',
      status: 'pending',
      data: {
        emailIds: ['email-1', 'email-2', 'email-3'],
        caseId: 'case-1',
      },
    };

    it('processes jobs from queue', async () => {
      mockRedisClient.rpop.mockResolvedValue('job-123');
      
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockJob,
        error: null,
      });

      const processedJob = await jobQueueService.processNextJob('bulk_email_assignment');

      expect(processedJob).toEqual(mockJob);
      expect(mockRedisClient.rpop).toHaveBeenCalledWith('queue:bulk_email_assignment');
    });

    it('handles empty queue', async () => {
      mockRedisClient.rpop.mockResolvedValue(null);

      const result = await jobQueueService.processNextJob('bulk_email_assignment');

      expect(result).toBeNull();
    });

    it('starts worker processes', async () => {
      const fork = require('child_process').fork;
      fork.mockReturnValue(mockWorkerProcess);

      mockWorkerProcess.on.mockImplementation((event, callback) => {
        if (event === 'message') {
          // Simulate worker ready message
          setTimeout(() => callback({ type: 'ready' }), 10);
        }
      });

      const workerCount = await jobQueueService.startWorkers('bulk_email_assignment', 2);

      expect(workerCount).toBe(2);
      expect(fork).toHaveBeenCalledTimes(2);
      expect(fork).toHaveBeenCalledWith(
        expect.stringContaining('worker'),
        expect.arrayContaining(['bulk_email_assignment'])
      );
    });

    it('handles worker failures', async () => {
      const fork = require('child_process').fork;
      fork.mockReturnValue(mockWorkerProcess);

      mockWorkerProcess.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          setTimeout(() => callback(1), 10); // Exit with error code
        }
      });

      const restartSpy = jest.spyOn(jobQueueService, 'restartWorker');
      restartSpy.mockResolvedValue(mockWorkerProcess);

      await jobQueueService.startWorkers('bulk_email_assignment', 1);

      // Wait for worker exit
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(restartSpy).toHaveBeenCalled();
    });

    it('implements job retry logic', async () => {
      const failedJob = {
        ...mockJob,
        status: 'failed',
        retry_count: 1,
        max_retries: 3,
      };

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: failedJob,
        error: null,
      });

      supabase.from().update().eq().mockResolvedValue({
        data: { ...failedJob, status: 'pending', retry_count: 2 },
        error: null,
      });

      const retriedJob = await jobQueueService.retryJob('job-123');

      expect(retriedJob.retry_count).toBe(2);
      expect(retriedJob.status).toBe('pending');
    });

    it('prevents retry when max retries exceeded', async () => {
      const maxRetriedJob = {
        ...mockJob,
        status: 'failed',
        retry_count: 3,
        max_retries: 3,
      };

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: maxRetriedJob,
        error: null,
      });

      await expect(
        jobQueueService.retryJob('job-123')
      ).rejects.toThrow('Maximum retry attempts exceeded');
    });
  });

  describe('Job status tracking', () => {
    it('updates job progress', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().update().eq().mockResolvedValue({
        data: {
          id: 'job-123',
          progress: 50,
          processed_items: 5,
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      mockRedisClient.hset.mockResolvedValue(1);
      mockRedisClient.publish.mockResolvedValue(1);

      await jobQueueService.updateJobProgress('job-123', {
        progress: 50,
        processedItems: 5,
        currentItem: 'email-5',
      });

      expect(supabase.from().update).toHaveBeenCalledWith({
        progress: 50,
        processed_items: 5,
        current_item: 'email-5',
        updated_at: expect.any(String),
      });

      // Should publish progress update
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'job-progress:job-123',
        expect.stringContaining('50')
      );
    });

    it('completes job successfully', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().update().eq().mockResolvedValue({
        data: {
          id: 'job-123',
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        error: null,
      });

      const completionData = {
        processedItems: 10,
        results: { successes: 8, failures: 2 },
      };

      await jobQueueService.completeJob('job-123', completionData);

      expect(supabase.from().update).toHaveBeenCalledWith({
        status: 'completed',
        progress: 100,
        completed_at: expect.any(String),
        result: completionData,
      });
    });

    it('marks job as failed', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().update().eq().mockResolvedValue({
        data: {
          id: 'job-123',
          status: 'failed',
          failed_at: new Date().toISOString(),
        },
        error: null,
      });

      const error = 'Database connection lost';

      await jobQueueService.failJob('job-123', error);

      expect(supabase.from().update).toHaveBeenCalledWith({
        status: 'failed',
        error_message: error,
        failed_at: expect.any(String),
      });
    });

    it('retrieves job status', async () => {
      const jobStatus = {
        id: 'job-123',
        type: 'bulk_email_assignment',
        status: 'in_progress',
        progress: 75,
        processed_items: 7,
        total_items: 10,
      };

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: jobStatus,
        error: null,
      });

      const status = await jobQueueService.getJobStatus('job-123');

      expect(status).toEqual(jobStatus);
    });
  });

  describe('Queue management', () => {
    it('gets queue statistics', async () => {
      mockRedisClient.llen
        .mockResolvedValueOnce(5) // pending jobs
        .mockResolvedValueOnce(2) // high priority jobs
        .mockResolvedValueOnce(0); // failed jobs

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select()
        .mockResolvedValueOnce({ data: [1, 2, 3], error: null }) // in_progress
        .mockResolvedValueOnce({ data: [1, 2, 3, 4, 5, 6, 7], error: null }); // completed

      const stats = await jobQueueService.getQueueStats('bulk_email_assignment');

      expect(stats).toEqual({
        pending: 5,
        highPriority: 2,
        inProgress: 3,
        completed: 7,
        failed: 0,
        totalProcessed: 10,
      });
    });

    it('purges old completed jobs', async () => {
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().delete().lte().mockResolvedValue({
        data: [],
        error: null,
        count: 25, // 25 jobs deleted
      });

      const result = await jobQueueService.purgeCompletedJobs(cutoffDate);

      expect(result.deletedCount).toBe(25);
      expect(supabase.from().delete).toHaveBeenCalled();
    });

    it('cancels running job', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: { id: 'job-123', status: 'in_progress', worker_id: 'worker-1' },
        error: null,
      });

      supabase.from().update().eq().mockResolvedValue({
        data: { id: 'job-123', status: 'cancelled' },
        error: null,
      });

      mockRedisClient.publish.mockResolvedValue(1);

      await jobQueueService.cancelJob('job-123', 'test-user-1');

      expect(supabase.from().update).toHaveBeenCalledWith({
        status: 'cancelled',
        cancelled_at: expect.any(String),
        cancelled_by: 'test-user-1',
      });

      // Should signal worker to stop
      expect(mockRedisClient.publish).toHaveBeenCalledWith(
        'job-cancel:worker-1',
        'job-123'
      );
    });
  });

  describe('Performance and scalability', () => {
    it('implements job batching for efficiency', async () => {
      const largeBulkJob = {
        id: 'job-large',
        type: 'bulk_email_assignment',
        data: {
          emailIds: Array.from({ length: 1000 }, (_, i) => `email-${i}`),
          caseId: 'case-1',
          batchSize: 50,
        },
      };

      const batches = jobQueueService.createJobBatches(largeBulkJob);

      expect(batches).toHaveLength(20); // 1000 / 50
      expect(batches[0].emailIds).toHaveLength(50);
      expect(batches[19].emailIds).toHaveLength(50);
    });

    it('distributes jobs across workers', async () => {
      const workers = ['worker-1', 'worker-2', 'worker-3'];
      const jobs = Array.from({ length: 10 }, (_, i) => `job-${i}`);

      mockRedisClient.llen.mockResolvedValue(0); // Empty queues
      mockRedisClient.lpush.mockResolvedValue(1);

      await jobQueueService.distributeJobs(jobs, workers);

      // Jobs should be distributed evenly
      expect(mockRedisClient.lpush).toHaveBeenCalledTimes(10);
      
      // Each worker should get approximately equal number of jobs
      const workerCalls = mockRedisClient.lpush.mock.calls.reduce((acc, call) => {
        const queueName = call[0];
        acc[queueName] = (acc[queueName] || 0) + 1;
        return acc;
      }, {});

      expect(Object.keys(workerCalls)).toHaveLength(3);
    });

    it('monitors memory usage during processing', async () => {
      const memoryUsage = process.memoryUsage();
      const threshold = 500 * 1024 * 1024; // 500MB

      const shouldPause = jobQueueService.checkMemoryUsage(threshold);

      if (memoryUsage.heapUsed > threshold) {
        expect(shouldPause).toBe(true);
      } else {
        expect(shouldPause).toBe(false);
      }
    });

    it('implements backpressure when queue is full', async () => {
      mockRedisClient.llen.mockResolvedValue(10000); // Queue at capacity

      await expect(
        jobQueueService.createJob('bulk_email_assignment', { emailIds: [] })
      ).rejects.toThrow('Queue is at capacity');
    });
  });

  describe('Error handling and resilience', () => {
    it('handles Redis connection failures', async () => {
      mockRedisClient.lpush.mockRejectedValue(new Error('Connection refused'));

      // Should fallback to database-only mode
      const fallbackResult = await jobQueueService.createJobWithFallback(
        'bulk_email_assignment',
        { emailIds: [] }
      );

      expect(fallbackResult.usesFallback).toBe(true);
    });

    it('implements circuit breaker pattern', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        mockRedisClient.rpop.mockRejectedValueOnce(new Error('Connection timeout'));
        
        try {
          await jobQueueService.processNextJob('bulk_email_assignment');
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should be open now
      const isOpen = jobQueueService.isCircuitBreakerOpen();
      expect(isOpen).toBe(true);

      // Should not attempt to process jobs when circuit breaker is open
      const result = await jobQueueService.processNextJob('bulk_email_assignment');
      expect(result).toBeNull();
    });

    it('recovers from worker crashes', async () => {
      const fork = require('child_process').fork;
      fork.mockReturnValue(mockWorkerProcess);

      // Start worker
      await jobQueueService.startWorkers('bulk_email_assignment', 1);

      // Simulate worker crash
      mockWorkerProcess.on.mock.calls
        .find(call => call[0] === 'exit')[1](1, 'SIGKILL');

      await new Promise(resolve => setTimeout(resolve, 100));

      // Worker should be restarted
      expect(fork).toHaveBeenCalledTimes(2); // Initial + restart
    });

    it('handles deadletter queue', async () => {
      const poisonJob = {
        id: 'job-poison',
        type: 'bulk_email_assignment',
        retry_count: 5,
        max_retries: 3,
        data: { malformed: 'data' },
      };

      mockRedisClient.lpush.mockResolvedValue(1);

      await jobQueueService.moveToDeadLetterQueue(poisonJob);

      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        'deadletter:bulk_email_assignment',
        JSON.stringify(poisonJob)
      );
    });
  });

  describe('Monitoring and observability', () => {
    it('tracks job processing metrics', async () => {
      const metrics = await jobQueueService.getProcessingMetrics();

      expect(metrics).toEqual({
        averageProcessingTime: expect.any(Number),
        throughput: expect.any(Number),
        errorRate: expect.any(Number),
        queueDepth: expect.any(Number),
        workerUtilization: expect.any(Number),
      });
    });

    it('provides job history', async () => {
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().order().limit().mockResolvedValue({
        data: [
          { id: 'job-1', status: 'completed', completed_at: '2023-01-01' },
          { id: 'job-2', status: 'failed', failed_at: '2023-01-02' },
        ],
        error: null,
      });

      const history = await jobQueueService.getJobHistory('bulk_email_assignment', 10);

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('job-1');
    });

    it('sends alerts for critical failures', async () => {
      const alertSpy = jest.spyOn(jobQueueService, 'sendAlert');
      alertSpy.mockResolvedValue(true);

      const criticalError = {
        jobId: 'job-123',
        error: 'Database connection failed',
        severity: 'critical',
        timestamp: new Date().toISOString(),
      };

      await jobQueueService.handleCriticalError(criticalError);

      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical_job_failure',
          jobId: 'job-123',
        })
      );
    });
  });
});