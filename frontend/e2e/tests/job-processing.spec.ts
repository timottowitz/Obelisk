import { test, expect } from '@playwright/test';

test.describe('Job Processing and Monitoring', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/email');
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
  });

  test.describe('Background Job Processing', () => {
    test('tracks bulk assignment job progress', async ({ page }) => {
      // Mock job creation and progress tracking
      let statusCallCount = 0;
      await page.route('/api/emails/bulk-assign', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'job-bulk-123',
            totalEmails: 5,
            message: 'Bulk assignment job created successfully',
          }),
        });
      });

      await page.route('/api/jobs/job-bulk-123', (route) => {
        statusCallCount++;
        
        if (statusCallCount <= 2) {
          // Initial progress
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'job-bulk-123',
              status: 'in_progress',
              progress: 40,
              processedItems: 2,
              totalItems: 5,
              startedAt: new Date().toISOString(),
              estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
              currentStep: 'Assigning emails to case',
              steps: [
                { name: 'Validating emails', status: 'completed', duration: 1200 },
                { name: 'Assigning emails to case', status: 'in_progress', progress: 40 },
                { name: 'Updating email status', status: 'pending' },
                { name: 'Sending notifications', status: 'pending' },
              ],
            }),
          });
        } else {
          // Completion
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'job-bulk-123',
              status: 'completed',
              progress: 100,
              processedItems: 5,
              totalItems: 5,
              startedAt: new Date(Date.now() - 45000).toISOString(),
              completedAt: new Date().toISOString(),
              duration: 45000,
              results: {
                successes: 5,
                failures: 0,
                successfulEmails: [
                  { id: 'email-1', subject: 'Test Email 1' },
                  { id: 'email-2', subject: 'Test Email 2' },
                  { id: 'email-3', subject: 'Test Email 3' },
                  { id: 'email-4', subject: 'Test Email 4' },
                  { id: 'email-5', subject: 'Test Email 5' },
                ],
              },
              steps: [
                { name: 'Validating emails', status: 'completed', duration: 1200 },
                { name: 'Assigning emails to case', status: 'completed', duration: 32000 },
                { name: 'Updating email status', status: 'completed', duration: 8500 },
                { name: 'Sending notifications', status: 'completed', duration: 3300 },
              ],
            }),
          });
        }
      });

      // Select multiple emails for bulk assignment
      for (let i = 0; i < 5; i++) {
        const email = page.locator('[data-testid="email-item"]').nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      await expect(page.getByText('5 emails selected')).toBeVisible();

      // Start bulk assignment
      await page.locator('[data-testid="bulk-assign-button"]').click();
      await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();

      // Select case and start assignment
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('Test Case');
      await page.waitForSelector('[data-testid="case-item"]');
      await page.locator('[data-testid="case-item"]').first().click();
      await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

      // Should show job progress tracking
      await expect(page.getByText('Processing Assignments...')).toBeVisible();
      await expect(page.locator('[data-testid="job-progress-tracker"]')).toBeVisible();

      // Should show progress bar
      await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('40%');

      // Should show current step
      await expect(page.getByText('Assigning emails to case')).toBeVisible();

      // Should show processed items count
      await expect(page.getByText('2 of 5 emails processed')).toBeVisible();

      // Should show estimated completion time
      await expect(page.getByText(/Estimated completion:/)).toBeVisible();

      // Should show step breakdown
      await expect(page.locator('[data-testid="job-steps"]')).toBeVisible();
      await expect(page.getByText('Validating emails')).toBeVisible();
      await expect(page.locator('[data-testid="step-completed-icon"]')).toBeVisible();

      // Wait for completion
      await expect(page.getByText('Assignment Complete')).toBeVisible({ timeout: 30000 });
      await expect(page.getByText('5 emails assigned successfully')).toBeVisible();

      // Should show completion summary
      await expect(page.locator('[data-testid="job-summary"]')).toBeVisible();
      await expect(page.getByText(/Completed in 45 seconds/)).toBeVisible();

      // Should show results breakdown
      await expect(page.getByRole('tab', { name: /Successful \(5\)/ })).toBeVisible();
      await page.getByRole('tab', { name: /Successful/ }).click();

      // Should list successful emails
      const successfulEmails = page.locator('[data-testid="successful-email-item"]');
      await expect(successfulEmails).toHaveCount(5);
      await expect(successfulEmails.first().locator('[data-testid="email-subject"]')).toContainText('Test Email 1');
    });

    test('monitors job queue and system status', async ({ page }) => {
      // Mock job queue API
      await page.route('/api/jobs/queue', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            activeJobs: [
              {
                id: 'job-active-1',
                type: 'bulk_assignment',
                status: 'in_progress',
                progress: 65,
                processedItems: 13,
                totalItems: 20,
                startedAt: '2024-01-15T10:00:00Z',
                userId: 'current-user',
                description: 'Bulk assigning 20 emails to Contract Dispute case',
              },
              {
                id: 'job-active-2',
                type: 'email_storage',
                status: 'in_progress',
                progress: 90,
                processedItems: 9,
                totalItems: 10,
                startedAt: '2024-01-15T10:05:00Z',
                userId: 'other-user',
                description: 'Storing email attachments to cloud storage',
              },
            ],
            queuedJobs: [
              {
                id: 'job-queued-1',
                type: 'bulk_assignment',
                status: 'queued',
                queuePosition: 1,
                estimatedStart: '2024-01-15T10:15:00Z',
                userId: 'current-user',
                description: 'Bulk assigning 15 emails to Employment case',
              },
            ],
            completedJobs: [
              {
                id: 'job-completed-1',
                type: 'bulk_assignment',
                status: 'completed',
                completedAt: '2024-01-15T09:55:00Z',
                duration: 45000,
                results: { successes: 8, failures: 0 },
                userId: 'current-user',
                description: 'Bulk assigned 8 emails successfully',
              },
            ],
            systemStats: {
              totalJobsToday: 247,
              averageJobDuration: 23000,
              successRate: 0.96,
              currentLoad: 'moderate',
              activeWorkers: 3,
              maxWorkers: 5,
            },
          }),
        });
      });

      // Navigate to job monitoring dashboard
      await page.goto('/dashboard/jobs');
      await page.waitForSelector('[data-testid="job-dashboard"]');

      // Should show job dashboard
      await expect(page.getByText('Job Processing Dashboard')).toBeVisible();

      // Should show system statistics
      await expect(page.locator('[data-testid="system-stats"]')).toBeVisible();
      await expect(page.getByText('247 jobs today')).toBeVisible();
      await expect(page.getByText('96% success rate')).toBeVisible();
      await expect(page.getByText('Moderate system load')).toBeVisible();
      await expect(page.getByText('3 of 5 workers active')).toBeVisible();

      // Should show active jobs
      await expect(page.getByText('Active Jobs (2)')).toBeVisible();
      const activeJobs = page.locator('[data-testid="active-job-item"]');
      await expect(activeJobs).toHaveCount(2);

      // First active job should show progress
      const firstActiveJob = activeJobs.first();
      await expect(firstActiveJob.locator('[data-testid="job-description"]')).toContainText('Bulk assigning 20 emails');
      await expect(firstActiveJob.locator('[data-testid="job-progress"]')).toContainText('65%');
      await expect(firstActiveJob.locator('[data-testid="job-items-count"]')).toContainText('13 of 20');

      // Should show job actions for own jobs
      await expect(firstActiveJob.locator('[data-testid="cancel-job-button"]')).toBeVisible();
      await expect(firstActiveJob.locator('[data-testid="view-job-details"]')).toBeVisible();

      // Should show queued jobs
      await expect(page.getByText('Queued Jobs (1)')).toBeVisible();
      const queuedJobs = page.locator('[data-testid="queued-job-item"]');
      await expect(queuedJobs).toHaveCount(1);

      // Queued job should show position and estimated start
      const firstQueuedJob = queuedJobs.first();
      await expect(firstQueuedJob.locator('[data-testid="queue-position"]')).toContainText('Position: 1');
      await expect(firstQueuedJob.locator('[data-testid="estimated-start"]')).toContainText('Starts in');

      // Should show completed jobs
      await expect(page.getByText('Recently Completed (1)')).toBeVisible();
      const completedJobs = page.locator('[data-testid="completed-job-item"]');
      await expect(completedJobs).toHaveCount(1);

      // Completed job should show results
      const firstCompletedJob = completedJobs.first();
      await expect(firstCompletedJob.locator('[data-testid="job-results"]')).toContainText('8 successful, 0 failed');
      await expect(firstCompletedJob.locator('[data-testid="job-duration"]')).toContainText('45s');
    });

    test('handles job cancellation', async ({ page }) => {
      // Mock job status and cancellation
      await page.route('/api/jobs/job-cancel-test', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-cancel-test',
            status: 'in_progress',
            progress: 30,
            processedItems: 6,
            totalItems: 20,
            canCancel: true,
            description: 'Test bulk assignment job',
          }),
        });
      });

      await page.route('/api/jobs/job-cancel-test/cancel', (route) => {
        expect(route.request().method()).toBe('POST');
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-cancel-test',
            status: 'cancelling',
            message: 'Job cancellation initiated',
          }),
        });
      });

      // Start a bulk operation that we can cancel
      for (let i = 0; i < 3; i++) {
        const email = page.locator('[data-testid="email-item"]').nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      await page.locator('[data-testid="bulk-assign-button"]').click();
      
      // Mock the job creation to return our test job ID
      await page.route('/api/emails/bulk-assign', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'job-cancel-test',
            message: 'Job created',
          }),
        });
      });

      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('Test');
      await page.waitForSelector('[data-testid="case-item"]');
      await page.locator('[data-testid="case-item"]').first().click();
      await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

      // Should show progress with cancel option
      await expect(page.getByText('Processing Assignments...')).toBeVisible();
      
      // Cancel button should be visible and enabled
      const cancelButton = page.getByRole('button', { name: /Cancel/ });
      await expect(cancelButton).toBeVisible();
      await expect(cancelButton).toBeEnabled();

      // Click cancel
      await cancelButton.click();

      // Should show cancellation confirmation
      await expect(page.getByText('Cancel Job?')).toBeVisible();
      await expect(page.getByText('This will stop the current assignment process')).toBeVisible();

      // Confirm cancellation
      await page.getByRole('button', { name: /Yes, Cancel Job/ }).click();

      // Should show cancellation in progress
      await expect(page.getByText('Cancelling job...')).toBeVisible();

      // Mock the final cancelled state
      await page.route('/api/jobs/job-cancel-test', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-cancel-test',
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            processedItems: 6,
            totalItems: 20,
            results: {
              successes: 6,
              failures: 0,
              cancelled: true,
            },
          }),
        });
      });

      // Should show cancellation complete
      await expect(page.getByText('Job Cancelled')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('6 emails were processed before cancellation')).toBeVisible();
    });

    test('retries failed jobs', async ({ page }) => {
      // Mock failed job
      await page.route('/api/jobs/job-retry-test', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-retry-test',
            status: 'failed',
            error: 'Network timeout during email assignment',
            processedItems: 3,
            totalItems: 10,
            failedAt: new Date().toISOString(),
            canRetry: true,
            retryCount: 0,
            maxRetries: 3,
          }),
        });
      });

      await page.route('/api/jobs/job-retry-test/retry', (route) => {
        expect(route.request().method()).toBe('POST');
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            newJobId: 'job-retry-test-attempt-2',
            message: 'Job retry initiated',
            originalJobId: 'job-retry-test',
          }),
        });
      });

      // Navigate to jobs dashboard to see failed job
      await page.goto('/dashboard/jobs');
      await page.waitForSelector('[data-testid="job-dashboard"]');

      // Mock failed jobs in the API
      await page.route('/api/jobs/queue', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            activeJobs: [],
            queuedJobs: [],
            completedJobs: [],
            failedJobs: [
              {
                id: 'job-retry-test',
                type: 'bulk_assignment',
                status: 'failed',
                error: 'Network timeout during email assignment',
                failedAt: '2024-01-15T10:00:00Z',
                processedItems: 3,
                totalItems: 10,
                canRetry: true,
                retryCount: 0,
                maxRetries: 3,
                description: 'Bulk assigning 10 emails to case',
              },
            ],
          }),
        });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="job-dashboard"]');

      // Should show failed jobs section
      await expect(page.getByText('Failed Jobs (1)')).toBeVisible();
      const failedJobs = page.locator('[data-testid="failed-job-item"]');
      await expect(failedJobs).toHaveCount(1);

      const failedJob = failedJobs.first();
      
      // Should show error details
      await expect(failedJob.locator('[data-testid="job-error"]')).toContainText('Network timeout');
      await expect(failedJob.locator('[data-testid="retry-count"]')).toContainText('Attempt 1 of 3');
      await expect(failedJob.locator('[data-testid="processed-items"]')).toContainText('3 of 10 processed');

      // Should have retry button
      const retryButton = failedJob.locator('[data-testid="retry-job-button"]');
      await expect(retryButton).toBeVisible();
      await expect(retryButton).toBeEnabled();

      // Click retry
      await retryButton.click();

      // Should show retry confirmation
      await expect(page.getByText('Retry Failed Job?')).toBeVisible();
      await expect(page.getByText('This will create a new job to retry the failed operation')).toBeVisible();

      // Confirm retry
      await page.getByRole('button', { name: /Yes, Retry Job/ }).click();

      // Should show retry initiated message
      await expect(page.getByText('Job retry initiated')).toBeVisible();
      await expect(page.getByText('New job created: job-retry-test-attempt-2')).toBeVisible();
    });

    test('shows detailed job execution logs', async ({ page }) => {
      // Mock job details with logs
      await page.route('/api/jobs/job-logs-test', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-logs-test',
            status: 'completed',
            progress: 100,
            processedItems: 5,
            totalItems: 5,
            duration: 12000,
            logs: [
              {
                timestamp: '2024-01-15T10:00:00Z',
                level: 'info',
                message: 'Job started: bulk assignment of 5 emails',
                details: { jobId: 'job-logs-test', totalItems: 5 },
              },
              {
                timestamp: '2024-01-15T10:00:01Z',
                level: 'info',
                message: 'Validating email permissions',
                details: { step: 1, emailCount: 5 },
              },
              {
                timestamp: '2024-01-15T10:00:03Z',
                level: 'info',
                message: 'Email validation completed successfully',
                details: { validEmails: 5, invalidEmails: 0 },
              },
              {
                timestamp: '2024-01-15T10:00:04Z',
                level: 'info',
                message: 'Starting email assignment process',
                details: { caseId: 'target-case-123' },
              },
              {
                timestamp: '2024-01-15T10:00:06Z',
                level: 'info',
                message: 'Assigned email 1/5: "Contract Question"',
                details: { emailId: 'email-1', progress: 20 },
              },
              {
                timestamp: '2024-01-15T10:00:08Z',
                level: 'warn',
                message: 'Email 2/5: Large attachment detected, processing may be slower',
                details: { emailId: 'email-2', attachmentSize: '5.2MB' },
              },
              {
                timestamp: '2024-01-15T10:00:10Z',
                level: 'info',
                message: 'Assigned email 2/5: "Contract Amendment with Attachments"',
                details: { emailId: 'email-2', progress: 40 },
              },
              {
                timestamp: '2024-01-15T10:00:11Z',
                level: 'info',
                message: 'All emails assigned successfully',
                details: { totalAssigned: 5, totalFailed: 0 },
              },
              {
                timestamp: '2024-01-15T10:00:12Z',
                level: 'info',
                message: 'Job completed successfully',
                details: { duration: 12000, successRate: 1.0 },
              },
            ],
            performance: {
              memoryUsage: { peak: '45MB', average: '32MB' },
              cpuUsage: { peak: '15%', average: '8%' },
              networkRequests: 12,
              databaseQueries: 8,
            },
          }),
        });
      });

      // Navigate to jobs dashboard
      await page.goto('/dashboard/jobs');
      await page.waitForSelector('[data-testid="job-dashboard"]');

      // Mock a completed job in the list
      await page.route('/api/jobs/queue', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            activeJobs: [],
            queuedJobs: [],
            completedJobs: [
              {
                id: 'job-logs-test',
                type: 'bulk_assignment',
                status: 'completed',
                completedAt: '2024-01-15T10:00:12Z',
                duration: 12000,
                results: { successes: 5, failures: 0 },
                description: 'Bulk assigned 5 emails successfully',
              },
            ],
          }),
        });
      });

      await page.reload();

      // Click on job to view details
      const completedJob = page.locator('[data-testid="completed-job-item"]').first();
      await completedJob.locator('[data-testid="view-job-details"]').click();

      // Job details modal should open
      await expect(page.locator('[data-testid="job-details-modal"]')).toBeVisible();
      await expect(page.getByText('Job Details')).toBeVisible();

      // Should show job overview
      await expect(page.getByText('job-logs-test')).toBeVisible();
      await expect(page.getByText('Completed successfully')).toBeVisible();
      await expect(page.getByText('5 of 5 items processed')).toBeVisible();
      await expect(page.getByText('Duration: 12 seconds')).toBeVisible();

      // Should show execution logs tab
      await page.getByRole('tab', { name: /Execution Logs/ }).click();
      
      // Should display log entries
      const logEntries = page.locator('[data-testid="log-entry"]');
      await expect(logEntries).toHaveCount(9);

      // Should show different log levels
      await expect(page.locator('[data-testid="log-level-info"]')).toHaveCount(7);
      await expect(page.locator('[data-testid="log-level-warn"]')).toHaveCount(1);

      // Should show log filtering options
      await expect(page.locator('[data-testid="log-level-filter"]')).toBeVisible();
      
      // Filter to show only warnings
      await page.locator('[data-testid="log-level-filter"]').selectOption('warn');
      
      // Should show only warning logs
      const warningLogs = page.locator('[data-testid="log-entry"]:visible');
      await expect(warningLogs).toHaveCount(1);
      await expect(warningLogs.first()).toContainText('Large attachment detected');

      // Should show performance metrics tab
      await page.getByRole('tab', { name: /Performance/ }).click();
      
      // Should display performance data
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.getByText('Peak Memory: 45MB')).toBeVisible();
      await expect(page.getByText('Average Memory: 32MB')).toBeVisible();
      await expect(page.getByText('Peak CPU: 15%')).toBeVisible();
      await expect(page.getByText('Network Requests: 12')).toBeVisible();
      await expect(page.getByText('Database Queries: 8')).toBeVisible();
    });
  });

  test.describe('Job System Health and Monitoring', () => {
    test('monitors system resource usage', async ({ page }) => {
      // Mock system health API
      await page.route('/api/jobs/system/health', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            metrics: {
              cpu: { usage: 23.5, limit: 80 },
              memory: { used: '1.2GB', total: '4GB', percentage: 30 },
              disk: { used: '45GB', total: '100GB', percentage: 45 },
              network: { inbound: '1.2MB/s', outbound: '0.8MB/s' },
            },
            jobQueue: {
              activeJobs: 2,
              queuedJobs: 1,
              completedToday: 156,
              failedToday: 4,
              avgProcessingTime: '23s',
              throughput: '12 jobs/hour',
            },
            workers: {
              active: 3,
              idle: 2,
              total: 5,
              utilization: 60,
            },
            alerts: [
              {
                level: 'warning',
                message: 'Queue processing is slower than usual',
                timestamp: '2024-01-15T09:45:00Z',
                resolved: false,
              },
            ],
          }),
        });
      });

      await page.goto('/dashboard/jobs/system');
      await page.waitForSelector('[data-testid="system-health-dashboard"]');

      // Should show system status
      await expect(page.getByText('System Status: Healthy')).toBeVisible();
      await expect(page.locator('[data-testid="health-indicator"]')).toHaveClass(/healthy/);

      // Should show resource metrics
      await expect(page.locator('[data-testid="cpu-usage"]')).toContainText('23.5%');
      await expect(page.locator('[data-testid="memory-usage"]')).toContainText('1.2GB / 4GB (30%)');
      await expect(page.locator('[data-testid="disk-usage"]')).toContainText('45GB / 100GB (45%)');

      // Should show job queue statistics
      await expect(page.locator('[data-testid="active-jobs-count"]')).toContainText('2');
      await expect(page.locator('[data-testid="queued-jobs-count"]')).toContainText('1');
      await expect(page.locator('[data-testid="completed-today-count"]')).toContainText('156');
      await expect(page.locator('[data-testid="failed-today-count"]')).toContainText('4');
      await expect(page.locator('[data-testid="avg-processing-time"]')).toContainText('23s');
      await expect(page.locator('[data-testid="throughput"]')).toContainText('12 jobs/hour');

      // Should show worker status
      await expect(page.locator('[data-testid="active-workers"]')).toContainText('3');
      await expect(page.locator('[data-testid="idle-workers"]')).toContainText('2');
      await expect(page.locator('[data-testid="worker-utilization"]')).toContainText('60%');

      // Should show alerts
      await expect(page.locator('[data-testid="system-alerts"]')).toBeVisible();
      await expect(page.getByText('Queue processing is slower than usual')).toBeVisible();
      await expect(page.locator('[data-testid="alert-warning"]')).toBeVisible();
    });

    test('handles system overload conditions', async ({ page }) => {
      // Mock system under high load
      await page.route('/api/jobs/system/health', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            metrics: {
              cpu: { usage: 89.2, limit: 80 },
              memory: { used: '3.8GB', total: '4GB', percentage: 95 },
              disk: { used: '95GB', total: '100GB', percentage: 95 },
            },
            jobQueue: {
              activeJobs: 12,
              queuedJobs: 45,
              avgWaitTime: '8 minutes',
              processingSlowed: true,
            },
            workers: {
              active: 5,
              idle: 0,
              total: 5,
              utilization: 100,
              overloaded: true,
            },
            alerts: [
              {
                level: 'critical',
                message: 'CPU usage exceeded 80% threshold',
                timestamp: '2024-01-15T10:00:00Z',
                resolved: false,
              },
              {
                level: 'critical',
                message: 'Memory usage critical (95%)',
                timestamp: '2024-01-15T10:02:00Z',
                resolved: false,
              },
              {
                level: 'warning',
                message: 'Job queue is experiencing delays',
                timestamp: '2024-01-15T09:58:00Z',
                resolved: false,
              },
            ],
            recommendations: [
              'Consider reducing concurrent job processing',
              'Scale up system resources if possible',
              'Defer non-critical jobs to off-peak hours',
            ],
          }),
        });
      });

      await page.goto('/dashboard/jobs/system');
      await page.waitForSelector('[data-testid="system-health-dashboard"]');

      // Should show degraded status
      await expect(page.getByText('System Status: Degraded')).toBeVisible();
      await expect(page.locator('[data-testid="health-indicator"]')).toHaveClass(/degraded/);

      // Should show critical alerts
      await expect(page.locator('[data-testid="alert-critical"]')).toHaveCount(2);
      await expect(page.getByText('CPU usage exceeded 80% threshold')).toBeVisible();
      await expect(page.getByText('Memory usage critical (95%)')).toBeVisible();

      // Should show overload indicators
      await expect(page.getByText('System Overloaded')).toBeVisible();
      await expect(page.getByText('Processing delays expected')).toBeVisible();
      await expect(page.getByText('Average wait time: 8 minutes')).toBeVisible();

      // Should show recommendations
      await expect(page.locator('[data-testid="system-recommendations"]')).toBeVisible();
      await expect(page.getByText('Consider reducing concurrent job processing')).toBeVisible();
      await expect(page.getByText('Scale up system resources if possible')).toBeVisible();

      // Should offer emergency controls
      await expect(page.getByRole('button', { name: /Pause New Jobs/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Emergency Stop/ })).toBeVisible();

      // Test emergency pause
      await page.route('/api/jobs/system/pause', (route) => {
        expect(route.request().method()).toBe('POST');
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ 
            status: 'paused',
            message: 'New job processing paused',
          }),
        });
      });

      await page.getByRole('button', { name: /Pause New Jobs/ }).click();
      
      // Should show confirmation
      await expect(page.getByText('Pause Job Processing?')).toBeVisible();
      await page.getByRole('button', { name: /Yes, Pause/ }).click();
      
      // Should show paused status
      await expect(page.getByText('Job processing paused')).toBeVisible();
    });

    test('provides job performance analytics', async ({ page }) => {
      // Mock analytics API
      await page.route('/api/jobs/analytics*', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            timeRange: 'last_7_days',
            totalJobs: 1247,
            completedJobs: 1198,
            failedJobs: 42,
            cancelledJobs: 7,
            successRate: 96.1,
            averageDuration: 23400, // milliseconds
            jobTypeStats: [
              { type: 'bulk_assignment', count: 856, avgDuration: 18200, successRate: 97.2 },
              { type: 'email_storage', count: 234, avgDuration: 45600, successRate: 94.4 },
              { type: 'data_export', count: 157, avgDuration: 67800, successRate: 95.5 },
            ],
            dailyStats: [
              { date: '2024-01-15', completed: 198, failed: 8, avgDuration: 22100 },
              { date: '2024-01-14', completed: 203, failed: 5, avgDuration: 24200 },
              { date: '2024-01-13', completed: 156, failed: 12, avgDuration: 26800 },
              { date: '2024-01-12', completed: 189, failed: 3, avgDuration: 21400 },
              { date: '2024-01-11', completed: 167, failed: 6, avgDuration: 23900 },
              { date: '2024-01-10', completed: 145, failed: 4, avgDuration: 25100 },
              { date: '2024-01-09', completed: 140, failed: 4, avgDuration: 22600 },
            ],
            performanceTrends: {
              processingSpeed: 'improving',
              errorRate: 'stable',
              resourceUsage: 'increasing',
            },
          }),
        });
      });

      await page.goto('/dashboard/jobs/analytics');
      await page.waitForSelector('[data-testid="job-analytics-dashboard"]');

      // Should show overview statistics
      await expect(page.getByText('1,247 Total Jobs')).toBeVisible();
      await expect(page.getByText('1,198 Completed')).toBeVisible();
      await expect(page.getByText('42 Failed')).toBeVisible();
      await expect(page.getByText('96.1% Success Rate')).toBeVisible();
      await expect(page.getByText('23.4s Average Duration')).toBeVisible();

      // Should show job type breakdown
      await expect(page.locator('[data-testid="job-type-stats"]')).toBeVisible();
      await expect(page.getByText('Bulk Assignment: 856 jobs (97.2% success)')).toBeVisible();
      await expect(page.getByText('Email Storage: 234 jobs (94.4% success)')).toBeVisible();
      await expect(page.getByText('Data Export: 157 jobs (95.5% success)')).toBeVisible();

      // Should show daily performance chart
      await expect(page.locator('[data-testid="daily-performance-chart"]')).toBeVisible();
      
      // Should show performance trends
      await expect(page.locator('[data-testid="performance-trends"]')).toBeVisible();
      await expect(page.getByText('Processing Speed: Improving')).toBeVisible();
      await expect(page.getByText('Error Rate: Stable')).toBeVisible();
      await expect(page.getByText('Resource Usage: Increasing')).toBeVisible();

      // Should allow filtering by date range
      await expect(page.locator('[data-testid="date-range-filter"]')).toBeVisible();
      
      // Change date range
      await page.locator('[data-testid="date-range-filter"]').selectOption('last_30_days');
      
      // Should update data (verified by route mock being called again)
      await page.waitForTimeout(1000);
    });
  });
});