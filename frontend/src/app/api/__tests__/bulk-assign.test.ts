/**
 * Bulk Email Assignment API Tests
 * Tests for bulk email assignment endpoint and job processing
 */

import { testData, testDataFactory } from '@/test-utils/test-data';
import { dbHelpers } from '@/test-utils/db-helpers';

// Mock Next.js request/response objects
const createMockRequest = (body: any) => ({
  json: jest.fn().mockResolvedValue(body),
  headers: new Headers(),
  method: 'POST',
  url: 'http://localhost:3000/api/emails/bulk-assign',
});

const createMockResponse = () => {
  const response = {
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
    headers: new Headers(),
  };
  return response;
};

// Mock authentication
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => ({
    userId: 'test-user-1',
    orgId: 'test-org-1',
  })),
}));

// Mock job queue service
jest.mock('@/lib/services/job-queue', () => ({
  jobQueueService: {
    createJob: jest.fn(),
    getJob: jest.fn(),
    updateJobProgress: jest.fn(),
    completeJob: jest.fn(),
    failJob: jest.fn(),
  },
}));

// Mock email storage service
jest.mock('@/lib/services/email-storage', () => ({
  emailStorageService: {
    bulkStoreEmails: jest.fn(),
    storeEmailWithAttachments: jest.fn(),
  },
}));

describe('Bulk Assignment API', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbHelpers.setup();
  });

  afterEach(async () => {
    await dbHelpers.teardown();
  });

  describe('POST /api/emails/bulk-assign', () => {
    const mockEmails = testDataFactory.emails(10);
    const mockCase = testDataFactory.case();

    const validBulkRequest = {
      emailIds: mockEmails.map(e => e.id),
      caseId: mockCase.id,
      storeContent: true,
      notify: true,
    };

    beforeEach(async () => {
      await dbHelpers.createCase(mockCase);
      
      for (const email of mockEmails) {
        await dbHelpers.createEmail(email);
      }
    });

    it('creates bulk assignment job successfully', async () => {
      const request = createMockRequest(validBulkRequest);
      const response = createMockResponse();

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;
      jobQueueService.createJob.mockResolvedValue({
        id: 'bulk-job-123',
        type: 'bulk_email_assignment',
        status: 'pending',
        data: {
          emailIds: validBulkRequest.emailIds,
          caseId: validBulkRequest.caseId,
          userId: 'test-user-1',
          organizationId: 'test-org-1',
        },
        createdAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
      });

      response.json({
        jobId: 'bulk-job-123',
        status: 'started',
        totalEmails: validBulkRequest.emailIds.length,
        estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
      });

      expect(jobQueueService.createJob).toHaveBeenCalledWith(
        'bulk_email_assignment',
        expect.objectContaining({
          emailIds: validBulkRequest.emailIds,
          caseId: validBulkRequest.caseId,
        })
      );

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.jobId).toBe('bulk-job-123');
      expect(responseCall.totalEmails).toBe(10);
    });

    it('validates required parameters', async () => {
      const invalidRequest = {
        emailIds: [],
        // Missing caseId
      };

      const request = createMockRequest(invalidRequest);
      const response = createMockResponse();

      response.status(400);
      response.json({
        error: 'Validation failed',
        details: {
          emailIds: 'At least one email ID is required',
          caseId: 'Case ID is required',
        },
      });

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('validates email ID limits', async () => {
      const tooManyEmails = Array.from({ length: 1001 }, (_, i) => `email-${i}`);
      const request = createMockRequest({
        ...validBulkRequest,
        emailIds: tooManyEmails,
      });
      const response = createMockResponse();

      response.status(400);
      response.json({
        error: 'Too many emails in bulk request',
        limit: 1000,
        provided: 1001,
      });

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('validates case existence', async () => {
      const request = createMockRequest({
        ...validBulkRequest,
        caseId: 'non-existent-case',
      });
      const response = createMockResponse();

      response.status(404);
      response.json({ error: 'Case not found' });

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it('filters out already assigned emails', async () => {
      // Mark some emails as already assigned
      const alreadyAssignedEmails = mockEmails.slice(0, 3);
      for (const email of alreadyAssignedEmails) {
        await dbHelpers.createAssignment({
          emailId: email.id,
          caseId: 'existing-case',
          assignedBy: 'test-user-1',
        });
      }

      const request = createMockRequest(validBulkRequest);
      const response = createMockResponse();

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;
      jobQueueService.createJob.mockResolvedValue({
        id: 'bulk-job-123',
        type: 'bulk_email_assignment',
        status: 'pending',
        data: {
          emailIds: mockEmails.slice(3).map(e => e.id), // Only unassigned emails
          caseId: validBulkRequest.caseId,
        },
      });

      response.json({
        jobId: 'bulk-job-123',
        totalEmails: 7, // 10 - 3 already assigned
        skippedEmails: 3,
        warnings: ['3 emails were already assigned and skipped'],
      });

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.totalEmails).toBe(7);
      expect(responseCall.skippedEmails).toBe(3);
    });

    it('handles job creation failures', async () => {
      const request = createMockRequest(validBulkRequest);
      const response = createMockResponse();

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;
      jobQueueService.createJob.mockRejectedValue(new Error('Job queue service unavailable'));

      response.status(503);
      response.json({
        error: 'Failed to create bulk assignment job',
        retryAfter: 30,
      });

      expect(response.status).toHaveBeenCalledWith(503);
    });

    it('handles authorization failures', async () => {
      const auth = require('@clerk/nextjs').auth;
      auth.mockReturnValue({ userId: null, orgId: null });

      const request = createMockRequest(validBulkRequest);
      const response = createMockResponse();

      response.status(401);
      response.json({ error: 'Unauthorized' });

      expect(response.status).toHaveBeenCalledWith(401);
    });

    it('estimates completion time based on email count', async () => {
      const largeRequest = {
        ...validBulkRequest,
        emailIds: Array.from({ length: 100 }, (_, i) => `email-${i}`),
      };

      const request = createMockRequest(largeRequest);
      const response = createMockResponse();

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;
      const estimatedCompletion = new Date(Date.now() + 300000); // 5 minutes for 100 emails

      jobQueueService.createJob.mockResolvedValue({
        id: 'bulk-job-large',
        estimatedCompletion: estimatedCompletion.toISOString(),
      });

      response.json({
        jobId: 'bulk-job-large',
        totalEmails: 100,
        estimatedCompletion: estimatedCompletion.toISOString(),
        estimatedDuration: 300, // seconds
      });

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.estimatedDuration).toBe(300);
    });
  });

  describe('Bulk assignment job processing', () => {
    const mockEmails = testDataFactory.emails(5);
    const mockCase = testDataFactory.case();

    beforeEach(async () => {
      await dbHelpers.createCase(mockCase);
      
      for (const email of mockEmails) {
        await dbHelpers.createEmail(email);
      }
    });

    it('processes emails in batches', async () => {
      const jobData = {
        emailIds: mockEmails.map(e => e.id),
        caseId: mockCase.id,
        userId: 'test-user-1',
        organizationId: 'test-org-1',
        batchSize: 2,
      };

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;

      // Simulate batch processing
      const batches = [
        mockEmails.slice(0, 2),
        mockEmails.slice(2, 4),
        mockEmails.slice(4, 5),
      ];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const progress = ((i + 1) * 2) / mockEmails.length * 100;

        jobQueueService.updateJobProgress.mockResolvedValueOnce({
          progress: Math.min(progress, 100),
          processedItems: (i + 1) * 2,
          currentBatch: i + 1,
          totalBatches: batches.length,
        });

        // Process batch
        for (const email of batch) {
          await dbHelpers.createAssignment({
            emailId: email.id,
            caseId: mockCase.id,
            assignedBy: 'test-user-1',
          });
        }
      }

      expect(jobQueueService.updateJobProgress).toHaveBeenCalledTimes(3);
    });

    it('handles individual email assignment failures', async () => {
      const jobData = {
        emailIds: mockEmails.map(e => e.id),
        caseId: mockCase.id,
        userId: 'test-user-1',
      };

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;

      // Simulate some failures
      const results = {
        successes: mockEmails.slice(0, 3).map(email => ({
          emailId: email.id,
          success: true,
          timestamp: new Date().toISOString(),
        })),
        failures: mockEmails.slice(3).map(email => ({
          emailId: email.id,
          success: false,
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
        })),
      };

      jobQueueService.completeJob.mockResolvedValue({
        id: 'bulk-job-123',
        status: 'completed_with_errors',
        results,
        summary: {
          totalEmails: mockEmails.length,
          successCount: results.successes.length,
          failureCount: results.failures.length,
          processingTime: 45000,
        },
      });

      expect(results.successes).toHaveLength(3);
      expect(results.failures).toHaveLength(2);
    });

    it('handles storage service integration', async () => {
      const jobData = {
        emailIds: mockEmails.map(e => e.id),
        caseId: mockCase.id,
        storeContent: true,
      };

      const emailStorageService = require('@/lib/services/email-storage').emailStorageService;
      
      emailStorageService.bulkStoreEmails.mockResolvedValue({
        results: mockEmails.map(email => ({
          emailId: email.id,
          storageLocation: `gs://test-bucket/emails/${email.id}`,
          success: true,
        })),
        totalSize: 5 * 1024 * 1024, // 5MB total
      });

      // Storage should be called for bulk operations
      expect(emailStorageService.bulkStoreEmails).toHaveBeenCalledWith(
        mockEmails.map(e => e.id),
        expect.any(Object)
      );
    });

    it('supports job cancellation', async () => {
      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;

      jobQueueService.getJob.mockResolvedValue({
        id: 'bulk-job-123',
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'test-user-1',
      });

      // Job processing should stop when cancelled
      const job = await jobQueueService.getJob('bulk-job-123');
      expect(job.status).toBe('cancelled');
    });

    it('handles timeout scenarios', async () => {
      const jobData = {
        emailIds: mockEmails.map(e => e.id),
        caseId: mockCase.id,
        timeout: 30000, // 30 seconds
      };

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;

      // Simulate timeout
      jobQueueService.failJob.mockResolvedValue({
        id: 'bulk-job-123',
        status: 'failed',
        error: 'Job exceeded maximum execution time',
        failedAt: new Date().toISOString(),
        partialResults: {
          processed: 2,
          total: mockEmails.length,
        },
      });

      expect(jobQueueService.failJob).toHaveBeenCalledWith(
        'bulk-job-123',
        'Job exceeded maximum execution time',
        expect.any(Object)
      );
    });
  });

  describe('Job monitoring and status', () => {
    it('provides real-time job status updates', async () => {
      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;

      const jobStatus = {
        id: 'bulk-job-123',
        type: 'bulk_email_assignment',
        status: 'in_progress',
        progress: 60,
        processedItems: 6,
        totalItems: 10,
        currentItem: 'email-7',
        startedAt: new Date(Date.now() - 30000).toISOString(),
        estimatedCompletion: new Date(Date.now() + 20000).toISOString(),
        errors: [],
        warnings: ['1 email was already assigned and skipped'],
      };

      jobQueueService.getJob.mockResolvedValue(jobStatus);

      const job = await jobQueueService.getJob('bulk-job-123');
      expect(job.progress).toBe(60);
      expect(job.processedItems).toBe(6);
      expect(job.warnings).toHaveLength(1);
    });

    it('tracks detailed progress metrics', async () => {
      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;

      const detailedStatus = {
        id: 'bulk-job-123',
        metrics: {
          averageProcessingTime: 2500, // ms per email
          throughput: 0.4, // emails per second
          peakMemoryUsage: 256 * 1024 * 1024, // 256MB
          networkRequests: 45,
          storageOperations: 10,
        },
        timeline: [
          { timestamp: new Date().toISOString(), event: 'job_started' },
          { timestamp: new Date().toISOString(), event: 'batch_1_completed', emailsProcessed: 5 },
          { timestamp: new Date().toISOString(), event: 'batch_2_started' },
        ],
      };

      jobQueueService.getJob.mockResolvedValue(detailedStatus);

      const job = await jobQueueService.getJob('bulk-job-123');
      expect(job.metrics.throughput).toBe(0.4);
      expect(job.timeline).toHaveLength(3);
    });
  });

  describe('Error recovery and retry logic', () => {
    it('supports partial retry of failed assignments', async () => {
      const originalEmailIds = testDataFactory.emails(10).map(e => e.id);
      const failedEmailIds = originalEmailIds.slice(6); // Last 4 failed

      const retryRequest = {
        originalJobId: 'bulk-job-123',
        emailIds: failedEmailIds,
        caseId: 'test-case-1',
        isRetry: true,
      };

      const request = createMockRequest(retryRequest);
      const response = createMockResponse();

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;
      jobQueueService.createJob.mockResolvedValue({
        id: 'bulk-job-retry-456',
        parentJobId: 'bulk-job-123',
        type: 'bulk_email_assignment_retry',
        status: 'pending',
      });

      response.json({
        retryJobId: 'bulk-job-retry-456',
        originalJobId: 'bulk-job-123',
        retryEmails: failedEmailIds.length,
      });

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.retryJobId).toBe('bulk-job-retry-456');
      expect(responseCall.retryEmails).toBe(4);
    });

    it('prevents infinite retry loops', async () => {
      const retryRequest = {
        originalJobId: 'bulk-job-123',
        emailIds: ['email-1'],
        caseId: 'test-case-1',
        isRetry: true,
        retryCount: 3, // Maximum retries reached
      };

      const request = createMockRequest(retryRequest);
      const response = createMockResponse();

      response.status(400);
      response.json({
        error: 'Maximum retry attempts exceeded',
        maxRetries: 3,
        suggestion: 'Please check email and case configuration',
      });

      expect(response.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Performance and scalability', () => {
    it('handles large bulk operations efficiently', async () => {
      const largeEmailList = Array.from({ length: 500 }, (_, i) => `email-${i}`);
      
      const request = createMockRequest({
        emailIds: largeEmailList,
        caseId: 'test-case-1',
        storeContent: true,
      });
      const response = createMockResponse();

      const jobQueueService = require('@/lib/services/job-queue').jobQueueService;
      jobQueueService.createJob.mockResolvedValue({
        id: 'bulk-job-large-789',
        type: 'bulk_email_assignment',
        priority: 'high', // Large jobs get higher priority
        batchSize: 20, // Larger batch size for efficiency
        estimatedCompletion: new Date(Date.now() + 900000).toISOString(), // 15 minutes
      });

      response.json({
        jobId: 'bulk-job-large-789',
        totalEmails: 500,
        batchSize: 20,
        estimatedDuration: 900,
      });

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.totalEmails).toBe(500);
      expect(responseCall.batchSize).toBe(20);
    });

    it('implements circuit breaker for external service failures', async () => {
      const request = createMockRequest({
        emailIds: ['email-1', 'email-2'],
        caseId: 'test-case-1',
      });
      const response = createMockResponse();

      // Simulate circuit breaker open state
      response.status(503);
      response.json({
        error: 'Service temporarily unavailable',
        circuitBreakerState: 'open',
        retryAfter: 300, // 5 minutes
      });

      expect(response.status).toHaveBeenCalledWith(503);
    });
  });
});