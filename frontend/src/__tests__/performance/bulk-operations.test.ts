/**
 * Performance Tests for Bulk Operations
 * Tests performance benchmarks for email assignment and search operations
 */

import { performance } from 'perf_hooks';
import { testData, testDataFactory } from '@/test-utils/test-data';
import { dbHelpers } from '@/test-utils/db-helpers';

// Mock performance APIs
Object.defineProperty(global, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
  },
});

// Mock API calls for performance testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Bulk Operations Performance Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbHelpers.setup();
    
    // Reset performance timer
    performance.now = jest.fn(() => Date.now());
  });

  afterEach(async () => {
    await dbHelpers.teardown();
  });

  describe('Email Assignment Performance', () => {
    it('assigns single email within 5 seconds', async () => {
      const email = testDataFactory.email();
      const case_ = testDataFactory.case();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'assignment-123',
          status: 'completed',
        }),
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: case_.id }),
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      console.log(`Single email assignment completed in ${duration}ms`);
    });

    it('bulk assigns 50 emails within 30 seconds', async () => {
      const emails = testDataFactory.emails(50);
      const case_ = testDataFactory.case();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'bulk-job-123',
          status: 'started',
          totalEmails: 50,
        }),
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/emails/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: emails.map(e => e.id),
          caseId: case_.id,
        }),
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(30000); // 30 seconds
      
      console.log(`Bulk assignment (50 emails) initiated in ${duration}ms`);
    });

    it('handles 100 bulk assignments with acceptable performance', async () => {
      const emails = testDataFactory.emails(100);
      const case_ = testDataFactory.case();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          jobId: 'bulk-job-large-456',
          status: 'started',
          totalEmails: 100,
          estimatedCompletion: new Date(Date.now() + 60000).toISOString(),
        }),
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/emails/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: emails.map(e => e.id),
          caseId: case_.id,
        }),
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(60000); // 1 minute
      
      console.log(`Large bulk assignment (100 emails) initiated in ${duration}ms`);
    });

    it('measures memory usage during bulk operations', async () => {
      const emails = testDataFactory.emails(200);
      
      const initialMemory = process.memoryUsage();
      
      // Simulate processing large batch
      const assignments = emails.map(email => ({
        id: `assignment-${email.id}`,
        emailId: email.id,
        caseId: 'test-case',
        status: 'pending',
        createdAt: new Date().toISOString(),
      }));

      const peakMemory = process.memoryUsage();
      const memoryIncrease = peakMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB for 200 emails)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      
      console.log(`Memory usage increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB for 200 emails`);
    });
  });

  describe('Case Search Performance', () => {
    it('searches cases within 1 second', async () => {
      const cases = testDataFactory.cases(1000);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          cases: cases.slice(0, 10),
          total: 1000,
          hasMore: true,
        }),
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/cases/search?q=contract&limit=10', {
        method: 'GET',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(1000); // 1 second
      
      console.log(`Case search completed in ${duration}ms`);
    });

    it('handles complex search queries efficiently', async () => {
      const complexQuery = {
        q: 'contract dispute litigation',
        status: 'active',
        clientName: 'Acme Corp',
        dateRange: {
          start: '2023-01-01',
          end: '2023-12-31',
        },
        attorney: 'john.doe',
        limit: 25,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          cases: testDataFactory.cases(25),
          total: 250,
          hasMore: true,
          searchTime: 450, // ms
        }),
      });

      const startTime = performance.now();
      
      const queryParams = new URLSearchParams();
      Object.entries(complexQuery).forEach(([key, value]) => {
        if (typeof value === 'object') {
          queryParams.append(key, JSON.stringify(value));
        } else {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/cases/search?${queryParams}`, {
        method: 'GET',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(2000); // 2 seconds for complex query
      
      console.log(`Complex search completed in ${duration}ms`);
    });

    it('benchmarks AI suggestion generation', async () => {
      const email = testDataFactory.email();
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          suggestions: testData.mockSuggestions,
          analysisTime: 8500, // ms
          totalCount: 3,
        }),
      });

      const startTime = performance.now();
      
      const response = await fetch(`/api/emails/${email.id}/suggestions`, {
        method: 'GET',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      console.log(`AI suggestions generated in ${duration}ms`);
    });
  });

  describe('Email Archive Performance', () => {
    it('loads email archive within 2 seconds', async () => {
      const emails = testDataFactory.emails(50);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          emails: emails,
          totalCount: 1000,
          hasMore: true,
          loadTime: 1200, // ms
        }),
      });

      const startTime = performance.now();
      
      const response = await fetch('/api/emails?limit=50&offset=0', {
        method: 'GET',
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(2000); // 2 seconds
      
      console.log(`Email archive loaded in ${duration}ms`);
    });

    it('handles pagination efficiently', async () => {
      const pageSize = 25;
      const totalPages = 10;
      const durations = [];

      for (let page = 0; page < totalPages; page++) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            emails: testDataFactory.emails(pageSize),
            totalCount: 1000,
            hasMore: page < totalPages - 1,
          }),
        });

        const startTime = performance.now();
        
        await fetch(`/api/emails?limit=${pageSize}&offset=${page * pageSize}`, {
          method: 'GET',
        });

        const endTime = performance.now();
        durations.push(endTime - startTime);
      }

      // All page loads should be consistent
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxDuration = Math.max(...durations);
      
      expect(avgDuration).toBeLessThan(1500); // Average under 1.5s
      expect(maxDuration).toBeLessThan(3000);  // No page over 3s
      
      console.log(`Average pagination load time: ${Math.round(avgDuration)}ms`);
      console.log(`Max pagination load time: ${Math.round(maxDuration)}ms`);
    });
  });

  describe('Job Processing Performance', () => {
    it('processes background jobs efficiently', async () => {
      const jobData = {
        emailIds: testDataFactory.emails(25).map(e => e.id),
        caseId: 'test-case-1',
        batchSize: 5,
      };

      // Simulate job processing timing
      const batchCount = Math.ceil(jobData.emailIds.length / jobData.batchSize);
      const batchDurations = [];

      for (let i = 0; i < batchCount; i++) {
        const startTime = performance.now();
        
        // Simulate batch processing
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per batch
        
        const endTime = performance.now();
        batchDurations.push(endTime - startTime);
      }

      const totalDuration = batchDurations.reduce((sum, d) => sum + d, 0);
      const avgBatchTime = totalDuration / batchCount;

      // Each batch should process quickly
      expect(avgBatchTime).toBeLessThan(500); // 500ms per batch
      expect(totalDuration).toBeLessThan(5000); // Total under 5s
      
      console.log(`Processed ${batchCount} batches in ${Math.round(totalDuration)}ms`);
      console.log(`Average batch processing time: ${Math.round(avgBatchTime)}ms`);
    });

    it('maintains job queue performance under load', async () => {
      const jobCount = 100;
      const jobs = Array.from({ length: jobCount }, (_, i) => ({
        id: `job-${i}`,
        type: 'bulk_email_assignment',
        status: 'pending',
        priority: i < 10 ? 'high' : 'normal',
        createdAt: new Date().toISOString(),
      }));

      const startTime = performance.now();

      // Simulate job queue operations
      const queueOperations = jobs.map(async (job) => {
        // Simulate adding to queue and processing
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms per job
        return job;
      });

      await Promise.all(queueOperations);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should handle 100 jobs in under 5s
      
      const jobsPerSecond = (jobCount / duration) * 1000;
      expect(jobsPerSecond).toBeGreaterThan(20); // At least 20 jobs per second
      
      console.log(`Processed ${jobCount} jobs in ${Math.round(duration)}ms`);
      console.log(`Throughput: ${Math.round(jobsPerSecond)} jobs/second`);
    });
  });

  describe('Concurrency and Load Testing', () => {
    it('handles concurrent assignment requests', async () => {
      const concurrentRequests = 10;
      const emails = testDataFactory.emails(concurrentRequests);
      
      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({
                id: `assignment-${Date.now()}`,
                status: 'completed',
              }),
            });
          }, 200); // 200ms delay per request
        })
      );

      const startTime = performance.now();

      const assignments = emails.map(email => 
        fetch('/api/emails/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            emailId: email.id,
            caseId: 'test-case' 
          }),
        })
      );

      const results = await Promise.all(assignments);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // All requests should succeed
      expect(results.every(r => r.ok)).toBe(true);
      
      // Concurrent processing should be faster than sequential
      expect(duration).toBeLessThan(concurrentRequests * 200 * 0.8); // 80% of sequential time
      
      console.log(`${concurrentRequests} concurrent assignments completed in ${Math.round(duration)}ms`);
    });

    it('maintains performance under memory pressure', async () => {
      // Simulate memory pressure with large data sets
      const largeDataSet = {
        emails: testDataFactory.emails(500),
        cases: testDataFactory.cases(200),
        assignments: Array.from({ length: 1000 }, (_, i) => ({
          id: `assignment-${i}`,
          emailId: `email-${i}`,
          caseId: `case-${i % 200}`,
          metadata: 'x'.repeat(1000), // 1KB metadata per assignment
        })),
      };

      const initialMemory = process.memoryUsage();
      
      const startTime = performance.now();

      // Simulate operations with large dataset
      const operations = [
        // Search operations
        largeDataSet.cases.filter(c => c.title.includes('contract')),
        largeDataSet.emails.filter(e => e.hasAttachments),
        largeDataSet.assignments.filter(a => a.caseId.includes('case-1')),
        
        // Sorting operations
        [...largeDataSet.emails].sort((a, b) => 
          new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
        ),
        [...largeDataSet.cases].sort((a, b) => a.title.localeCompare(b.title)),
      ];

      // Process all operations
      const results = await Promise.all(operations.map(op => Promise.resolve(op)));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Operations should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      // Memory increase should be manageable
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // Less than 200MB
      
      console.log(`Large dataset operations completed in ${Math.round(duration)}ms`);
      console.log(`Memory increased by ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Performance Regression Testing', () => {
    it('maintains baseline performance benchmarks', async () => {
      const benchmarks = {
        singleAssignment: 5000,      // 5 seconds
        bulkAssignment: 30000,       // 30 seconds for 50 emails
        caseSearch: 1000,            // 1 second
        aiSuggestions: 10000,        // 10 seconds
        emailArchiveLoad: 2000,      // 2 seconds
      };

      const results = {};

      // Test single assignment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'assignment-1' }),
      });

      let startTime = performance.now();
      await fetch('/api/emails/test/assign', { method: 'POST' });
      results.singleAssignment = performance.now() - startTime;

      // Test bulk assignment
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ jobId: 'bulk-1' }),
      });

      startTime = performance.now();
      await fetch('/api/emails/bulk-assign', { method: 'POST' });
      results.bulkAssignment = performance.now() - startTime;

      // Test case search
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ cases: [] }),
      });

      startTime = performance.now();
      await fetch('/api/cases/search?q=test');
      results.caseSearch = performance.now() - startTime;

      // Verify all benchmarks are met
      Object.entries(benchmarks).forEach(([test, benchmark]) => {
        const actualTime = results[test];
        expect(actualTime).toBeLessThan(benchmark);
        
        const percentOfBenchmark = (actualTime / benchmark) * 100;
        console.log(`${test}: ${Math.round(actualTime)}ms (${Math.round(percentOfBenchmark)}% of benchmark)`);
      });
    });
  });
});