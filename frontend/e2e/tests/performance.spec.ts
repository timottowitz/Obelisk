import { test, expect } from '@playwright/test';

test.describe('Performance Testing Suite', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.describe('Email List Performance', () => {
    test('handles large email datasets efficiently', async ({ page }) => {
      // Mock API to return large dataset
      await page.route('/api/email/messages*', (route) => {
        const emails = Array.from({ length: 1000 }, (_, index) => ({
          id: `email-${index + 1}`,
          subject: `Test Email Subject ${index + 1}`,
          from: `sender${index + 1}@example.com`,
          to: 'recipient@example.com',
          date: new Date(Date.now() - (index * 60000)).toISOString(),
          hasAttachments: index % 5 === 0,
          isRead: index % 3 === 0,
          priority: ['high', 'medium', 'low'][index % 3],
          body: `This is the body of test email ${index + 1}`,
        }));

        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            emails: emails.slice(0, 50), // Paginated response
            total: 1000,
            hasMore: true,
            page: 1,
            pageSize: 50,
          }),
        });
      });

      // Start performance measurement
      const startTime = Date.now();
      
      await page.goto('/dashboard/email');
      
      // Wait for initial load
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
      const initialLoadTime = Date.now() - startTime;

      // Initial load should be under 3 seconds
      expect(initialLoadTime).toBeLessThan(3000);

      // Check if virtual scrolling is implemented
      const emailItems = page.locator('[data-testid="email-item"]');
      const visibleItemCount = await emailItems.count();
      
      // Should not render all 1000 items at once (virtual scrolling)
      expect(visibleItemCount).toBeLessThan(100);
      expect(visibleItemCount).toBeGreaterThan(20);

      // Test scrolling performance
      const scrollStartTime = Date.now();
      
      // Scroll to bottom to trigger more items
      await page.evaluate(() => {
        const scrollContainer = document.querySelector('[data-testid="email-list"]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      });

      // Wait for new items to load
      await page.waitForFunction(
        () => document.querySelectorAll('[data-testid="email-item"]').length > 50,
        {},
        { timeout: 5000 }
      );

      const scrollLoadTime = Date.now() - scrollStartTime;
      
      // Scroll-triggered loading should be fast
      expect(scrollLoadTime).toBeLessThan(1000);

      // Test search performance with large dataset
      const searchStartTime = Date.now();
      const searchInput = page.locator('[data-testid="email-search-input"]');
      await searchInput.fill('Test Email Subject 100');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      const searchTime = Date.now() - searchStartTime;

      // Search should be responsive
      expect(searchTime).toBeLessThan(2000);
    });

    test('maintains UI responsiveness during heavy operations', async ({ page }) => {
      // Mock slow API responses
      await page.route('/api/emails/bulk-assign', async (route) => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'performance-test-job',
            totalEmails: 50,
          }),
        });
      });

      let statusCallCount = 0;
      await page.route('/api/jobs/performance-test-job', async (route) => {
        statusCallCount++;
        
        // Simulate gradual progress
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const progress = Math.min(statusCallCount * 10, 100);
        
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'performance-test-job',
            status: progress === 100 ? 'completed' : 'in_progress',
            progress,
            processedItems: Math.floor((progress / 100) * 50),
            totalItems: 50,
          }),
        });
      });

      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Select multiple emails for bulk assignment
      for (let i = 0; i < 5; i++) {
        const email = page.locator('[data-testid="email-item"]').nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      // Start bulk assignment
      await page.locator('[data-testid="bulk-assign-button"]').click();
      await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();

      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('Test Case');
      await page.waitForSelector('[data-testid="case-item"]');
      await page.locator('[data-testid="case-item"]').first().click();
      await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

      // Monitor UI responsiveness during processing
      let uiResponsiveTests = 0;
      let uiResponsiveFailures = 0;

      const checkUIResponsiveness = async () => {
        const testStartTime = Date.now();
        
        try {
          // Try to interact with UI elements
          const progressBar = page.locator('[data-testid="progress-bar"]');
          await expect(progressBar).toBeVisible({ timeout: 100 });
          
          // Check if progress updates are smooth
          const progressPercentage = page.locator('[data-testid="progress-percentage"]');
          await expect(progressPercentage).toBeVisible({ timeout: 100 });
          
          const responseTime = Date.now() - testStartTime;
          
          // UI should respond within 100ms
          if (responseTime > 100) {
            uiResponsiveFailures++;
          }
          
          uiResponsiveTests++;
        } catch (error) {
          uiResponsiveFailures++;
          uiResponsiveTests++;
        }
      };

      // Test UI responsiveness every 200ms during processing
      const responsivenessInterval = setInterval(checkUIResponsiveness, 200);

      // Wait for completion
      await expect(page.getByText('Assignment Complete')).toBeVisible({ timeout: 30000 });
      
      clearInterval(responsivenessInterval);

      // UI should remain responsive (less than 20% failures)
      const failureRate = (uiResponsiveFailures / uiResponsiveTests) * 100;
      expect(failureRate).toBeLessThan(20);
    });

    test('optimizes memory usage during extended sessions', async ({ page }) => {
      // Enable memory tracking
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Simulate heavy email interactions
      for (let cycle = 0; cycle < 5; cycle++) {
        // Open and close assignment modals repeatedly
        for (let i = 0; i < 10; i++) {
          const email = page.locator('[data-testid="email-item"]').nth(i % 5);
          await email.locator('[data-testid="assign-button"]').click();
          
          await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();
          
          // Close modal
          await page.keyboard.press('Escape');
          await expect(page.locator('[data-testid="case-assignment-modal"]')).not.toBeVisible();
        }

        // Trigger garbage collection if available
        await page.evaluate(() => {
          if ('gc' in window) {
            (window as any).gc();
          }
        });

        // Check memory usage
        const currentMemory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize;
          }
          return 0;
        });

        // Memory should not grow excessively (less than 50MB increase)
        if (currentMemory > 0 && initialMemory > 0) {
          const memoryIncrease = currentMemory - initialMemory;
          const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
          expect(memoryIncreaseMB).toBeLessThan(50);
        }
      }
    });
  });

  test.describe('Search and Filter Performance', () => {
    test('provides fast search results with large datasets', async ({ page }) => {
      // Mock search API with large result set
      await page.route('/api/cases/search*', (route) => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q') || '';
        
        // Simulate processing time based on query complexity
        const processingTime = query.length > 10 ? 150 : 50;
        
        setTimeout(() => {
          const results = Array.from({ length: 500 }, (_, index) => ({
            id: `case-${index + 1}`,
            caseNumber: `CASE-2024-${String(index + 1).padStart(4, '0')}`,
            title: `${query} Case ${index + 1}`,
            client: `Client ${index + 1}`,
            status: 'active',
            relevanceScore: Math.random(),
          }));

          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              cases: results.slice(0, 20), // Paginated results
              total: 500,
              searchTime: processingTime,
              page: 1,
            }),
          });
        }, processingTime);
      });

      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]');

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Test simple search performance
      const simpleSearchStartTime = Date.now();
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('Contract');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 3000 });
      const simpleSearchTime = Date.now() - simpleSearchStartTime;

      // Simple search should be very fast
      expect(simpleSearchTime).toBeLessThan(500);

      // Test complex search performance
      await searchInput.clear();
      const complexSearchStartTime = Date.now();
      await searchInput.fill('Contract Dispute Resolution Legal Analysis');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 3000 });
      const complexSearchTime = Date.now() - complexSearchStartTime;

      // Complex search should still be reasonable
      expect(complexSearchTime).toBeLessThan(1000);

      // Test search result rendering performance
      const renderStartTime = Date.now();
      const searchResults = page.locator('[data-testid="case-search-result"]');
      await expect(searchResults).toHaveCount(20);

      const renderTime = Date.now() - renderStartTime;
      expect(renderTime).toBeLessThan(200);
    });

    test('efficiently handles filter combinations', async ({ page }) => {
      // Mock filtered search API
      await page.route('/api/cases/search*', (route) => {
        const url = new URL(route.request().url());
        const filters = JSON.parse(url.searchParams.get('filters') || '{}');
        
        // Simulate filter processing time
        const filterCount = Object.keys(filters).length;
        const processingTime = filterCount * 20; // 20ms per filter
        
        setTimeout(() => {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              cases: Array.from({ length: 50 }, (_, i) => ({
                id: `filtered-case-${i}`,
                caseNumber: `FC-${i}`,
                title: `Filtered Case ${i}`,
              })),
              total: 50,
              appliedFilters: filters,
              filterTime: processingTime,
            }),
          });
        }, processingTime);
      });

      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]');

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Apply multiple filters
      const filterStartTime = Date.now();
      
      await page.getByRole('button', { name: /Filters/ }).click();
      
      // Apply multiple filters sequentially
      await page.getByLabel('Active cases only').check();
      await page.getByLabel('High priority').check();
      await page.getByLabel('Medium priority').check();
      
      // Date range filter
      await page.locator('[data-testid="date-range-toggle"]').click();
      await page.locator('[data-testid="start-date"]').fill('2024-01-01');
      await page.locator('[data-testid="end-date"]').fill('2024-12-31');
      
      // Apply filters
      await page.getByRole('button', { name: /Apply Filters/ }).click();

      await page.waitForSelector('[data-testid="search-results"]');
      const filterTime = Date.now() - filterStartTime;

      // Multi-filter application should be efficient
      expect(filterTime).toBeLessThan(1500);

      // Test filter removal performance
      const removeFilterStartTime = Date.now();
      
      await page.getByRole('button', { name: /Clear All Filters/ }).click();
      await page.waitForFunction(() => 
        !document.querySelector('[data-testid="active-filters"]')?.textContent?.includes('Active')
      );
      
      const removeFilterTime = Date.now() - removeFilterStartTime;
      expect(removeFilterTime).toBeLessThan(300);
    });
  });

  test.describe('Bulk Operations Performance', () => {
    test('handles large bulk assignments efficiently', async ({ page }) => {
      // Mock bulk assignment with progress tracking
      await page.route('/api/emails/bulk-assign', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'bulk-performance-test',
            totalEmails: 100,
            estimatedDuration: 30000, // 30 seconds
          }),
        });
      });

      let progressUpdates = 0;
      await page.route('/api/jobs/bulk-performance-test', (route) => {
        progressUpdates++;
        const progress = Math.min(progressUpdates * 5, 100);
        
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'bulk-performance-test',
            status: progress === 100 ? 'completed' : 'in_progress',
            progress,
            processedItems: Math.floor((progress / 100) * 100),
            totalItems: 100,
            throughput: '3.2 emails/second',
            estimatedCompletion: new Date(Date.now() + ((100 - progress) * 300)).toISOString(),
          }),
        });
      });

      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]');

      // Select 10 emails for bulk assignment
      const selectionStartTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        const email = page.locator('[data-testid="email-item"]').nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      const selectionTime = Date.now() - selectionStartTime;
      
      // Selection should be fast even with many items
      expect(selectionTime).toBeLessThan(2000);

      // Start bulk assignment
      const bulkStartTime = Date.now();
      
      await page.locator('[data-testid="bulk-assign-button"]').click();
      await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();

      const modalLoadTime = Date.now() - bulkStartTime;
      expect(modalLoadTime).toBeLessThan(500);

      // Complete bulk assignment workflow
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('Test Case');
      await page.waitForSelector('[data-testid="case-item"]');
      await page.locator('[data-testid="case-item"]').first().click();
      
      const workflowStartTime = Date.now();
      await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

      // Should show progress tracking immediately
      await expect(page.getByText('Processing Assignments...')).toBeVisible({ timeout: 1000 });
      
      const progressStartTime = Date.now() - workflowStartTime;
      expect(progressStartTime).toBeLessThan(500);

      // Monitor progress update frequency
      let lastProgress = 0;
      let progressUpdateCount = 0;
      let progressUpdateTimes = [];

      const monitorProgress = async () => {
        try {
          const progressText = await page.locator('[data-testid="progress-percentage"]').textContent();
          const currentProgress = parseInt(progressText?.replace('%', '') || '0');
          
          if (currentProgress !== lastProgress) {
            progressUpdateCount++;
            progressUpdateTimes.push(Date.now());
            lastProgress = currentProgress;
          }
        } catch (error) {
          // Ignore errors during monitoring
        }
      };

      const progressMonitor = setInterval(monitorProgress, 100);

      // Wait for completion
      await expect(page.getByText('Assignment Complete')).toBeVisible({ timeout: 45000 });
      clearInterval(progressMonitor);

      // Progress should update regularly (at least every 2 seconds)
      expect(progressUpdateCount).toBeGreaterThan(5);
      
      if (progressUpdateTimes.length > 1) {
        const avgTimeBetweenUpdates = (progressUpdateTimes[progressUpdateTimes.length - 1] - progressUpdateTimes[0]) / (progressUpdateTimes.length - 1);
        expect(avgTimeBetweenUpdates).toBeLessThan(2000);
      }
    });

    test('optimizes network requests during bulk operations', async ({ page }) => {
      let requestCount = 0;
      let statusRequestCount = 0;

      // Monitor all API requests
      page.on('request', (request) => {
        if (request.url().includes('/api/')) {
          requestCount++;
          
          if (request.url().includes('/jobs/') && request.method() === 'GET') {
            statusRequestCount++;
          }
        }
      });

      await page.route('/api/emails/bulk-assign', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            jobId: 'network-optimization-test',
            totalEmails: 20,
          }),
        });
      });

      await page.route('/api/jobs/network-optimization-test', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'network-optimization-test',
            status: 'completed',
            progress: 100,
            processedItems: 20,
            totalItems: 20,
          }),
        });
      });

      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]');

      // Reset request counts after page load
      requestCount = 0;
      statusRequestCount = 0;

      // Perform bulk assignment
      for (let i = 0; i < 5; i++) {
        const email = page.locator('[data-testid="email-item"]').nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      await page.locator('[data-testid="bulk-assign-button"]').click();
      await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();

      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('Test Case');
      await page.waitForSelector('[data-testid="case-item"]');
      await page.locator('[data-testid="case-item"]').first().click();
      await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

      await expect(page.getByText('Assignment Complete')).toBeVisible({ timeout: 10000 });

      // Should minimize network requests
      expect(requestCount).toBeLessThan(20); // Reasonable limit for bulk operation
      
      // Status polling should not be excessive
      expect(statusRequestCount).toBeLessThan(10);
    });
  });

  test.describe('Email Archive Performance', () => {
    test('efficiently loads and filters large email archives', async ({ page }) => {
      // Mock large email archive
      await page.route('/api/cases/*/emails*', (route) => {
        const url = new URL(route.request().url());
        const searchQuery = url.searchParams.get('search');
        const page_num = parseInt(url.searchParams.get('page') || '1');
        const page_size = parseInt(url.searchParams.get('pageSize') || '50');
        
        // Simulate processing time based on query
        const processingTime = searchQuery ? 200 : 50;
        
        setTimeout(() => {
          const totalEmails = 5000;
          const emails = Array.from({ length: page_size }, (_, index) => {
            const emailIndex = (page_num - 1) * page_size + index + 1;
            return {
              id: `archive-email-${emailIndex}`,
              subject: searchQuery ? `${searchQuery} Email ${emailIndex}` : `Archive Email ${emailIndex}`,
              from: `sender${emailIndex}@example.com`,
              date: new Date(Date.now() - (emailIndex * 3600000)).toISOString(),
              hasAttachments: emailIndex % 10 === 0,
              body: `Email content for ${emailIndex}`,
            };
          });

          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              emails,
              total: totalEmails,
              page: page_num,
              pageSize: page_size,
              hasMore: (page_num * page_size) < totalEmails,
              searchTime: processingTime,
            }),
          });
        }, processingTime);
      });

      await page.goto('/dashboard/cases/test-case-with-emails');
      await page.waitForSelector('[data-testid="case-detail-page"]');
      
      // Navigate to email archive
      const archiveLoadStartTime = Date.now();
      await page.getByRole('tab', { name: /Email Archive/ }).click();
      await page.waitForSelector('[data-testid="email-archive-tab"]');
      
      const archiveLoadTime = Date.now() - archiveLoadStartTime;
      expect(archiveLoadTime).toBeLessThan(2000);

      // Test search performance
      const searchStartTime = Date.now();
      const searchInput = page.locator('[data-testid="email-search-input"]');
      await searchInput.fill('Contract');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]');
      const searchTime = Date.now() - searchStartTime;
      expect(searchTime).toBeLessThan(1000);

      // Test pagination performance
      const paginationStartTime = Date.now();
      
      if (await page.locator('[data-testid="next-page"]').isVisible()) {
        await page.locator('[data-testid="next-page"]').click();
        await page.waitForFunction(() => 
          document.querySelector('[data-testid="archived-email-item"]')?.textContent?.includes('Archive Email 51')
        );
      }
      
      const paginationTime = Date.now() - paginationStartTime;
      expect(paginationTime).toBeLessThan(800);

      // Test filter application performance
      const filterStartTime = Date.now();
      await page.getByRole('button', { name: /Filter/ }).click();
      await page.getByRole('button', { name: /Last 30 days/ }).click();
      
      await page.waitForTimeout(500); // Allow filter to apply
      const filterTime = Date.now() - filterStartTime;
      expect(filterTime).toBeLessThan(1000);
    });

    test('optimizes email content viewer performance', async ({ page }) => {
      // Mock email content API
      await page.route('/api/cases/*/emails/*/content', (route) => {
        const emailContent = {
          subject: 'Large Email Content Test',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          date: new Date().toISOString(),
          // Large email body to test rendering performance
          body: 'Email content '.repeat(1000) + '\n\nLarge attachment content: ' + 'A'.repeat(10000),
          attachments: [
            { id: 'att-1', name: 'large-document.pdf', size: '5.2MB', type: 'application/pdf' },
            { id: 'att-2', name: 'spreadsheet.xlsx', size: '2.8MB', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          ],
        };

        // Simulate processing time for large content
        setTimeout(() => {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(emailContent),
          });
        }, 100);
      });

      await page.goto('/dashboard/cases/test-case-with-emails');
      await page.getByRole('tab', { name: /Email Archive/ }).click();
      await page.waitForSelector('[data-testid="email-archive-tab"]');

      // Open email viewer
      const viewerOpenStartTime = Date.now();
      const emailItem = page.locator('[data-testid="archived-email-item"]').first();
      await emailItem.click();

      await expect(page.locator('[data-testid="email-content-viewer"]')).toBeVisible();
      const viewerOpenTime = Date.now() - viewerOpenStartTime;
      expect(viewerOpenTime).toBeLessThan(1000);

      // Test content rendering performance
      const contentRenderStartTime = Date.now();
      await expect(page.locator('[data-testid="email-body"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-attachments"]')).toBeVisible();
      
      const contentRenderTime = Date.now() - contentRenderStartTime;
      expect(contentRenderTime).toBeLessThan(500);

      // Test viewer close performance
      const closeStartTime = Date.now();
      await page.getByRole('button', { name: /Close/ }).click();
      await expect(page.locator('[data-testid="email-content-viewer"]')).not.toBeVisible();
      
      const closeTime = Date.now() - closeStartTime;
      expect(closeTime).toBeLessThan(200);
    });
  });

  test.describe('Real User Metrics (RUM)', () => {
    test('measures Core Web Vitals', async ({ page }) => {
      // Navigate to main email dashboard
      await page.goto('/dashboard/email');
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-testid="email-list"]');

      // Measure Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {
            LCP: 0, // Largest Contentful Paint
            FID: 0, // First Input Delay
            CLS: 0, // Cumulative Layout Shift
            FCP: 0, // First Contentful Paint
            TTFB: 0, // Time to First Byte
          };

          // Measure FCP and LCP
          if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                  vitals.LCP = entry.startTime;
                }
                if (entry.entryType === 'first-contentful-paint') {
                  vitals.FCP = entry.startTime;
                }
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                  vitals.CLS += (entry as any).value;
                }
              }
            });

            observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift', 'paint'] });
          }

          // Measure TTFB
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            vitals.TTFB = navigation.responseStart - navigation.fetchStart;
          }

          // Measure FID on first interaction
          let fidMeasured = false;
          const measureFID = () => {
            if (!fidMeasured) {
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  vitals.FID = entry.processingStart - entry.startTime;
                  fidMeasured = true;
                  break;
                }
              });
              observer.observe({ entryTypes: ['first-input'] });
            }
          };

          // Trigger FID measurement
          document.addEventListener('click', measureFID, { once: true });
          document.addEventListener('keydown', measureFID, { once: true });

          // Return results after a short delay to collect metrics
          setTimeout(() => resolve(vitals), 2000);
        });
      });

      // Core Web Vitals thresholds (good performance)
      expect(webVitals.LCP).toBeLessThan(2500); // 2.5 seconds
      expect(webVitals.FCP).toBeLessThan(1800); // 1.8 seconds
      expect(webVitals.CLS).toBeLessThan(0.1); // 0.1 cumulative score
      expect(webVitals.TTFB).toBeLessThan(800); // 800ms
      
      // FID would be 0 if no interaction occurred
      if (webVitals.FID > 0) {
        expect(webVitals.FID).toBeLessThan(100); // 100ms
      }
    });

    test('measures JavaScript bundle performance', async ({ page }) => {
      // Track resource loading
      const resourceMetrics = [];
      
      page.on('response', async (response) => {
        const request = response.request();
        const url = request.url();
        
        if (url.includes('.js') || url.includes('.css')) {
          const timing = await response.timing();
          resourceMetrics.push({
            url,
            size: parseInt(response.headers()['content-length'] || '0'),
            loadTime: timing.receiveHeadersEnd - timing.connectStart,
            type: url.includes('.js') ? 'javascript' : 'css',
          });
        }
      });

      await page.goto('/dashboard/email');
      await page.waitForLoadState('networkidle');

      // Analyze bundle performance
      const jsResources = resourceMetrics.filter(r => r.type === 'javascript');
      const cssResources = resourceMetrics.filter(r => r.type === 'css');

      // Check JavaScript bundle sizes
      const totalJsSize = jsResources.reduce((sum, resource) => sum + resource.size, 0);
      const totalJsLoadTime = jsResources.reduce((sum, resource) => sum + resource.loadTime, 0);

      // Bundle size should be reasonable (less than 2MB total)
      expect(totalJsSize).toBeLessThan(2 * 1024 * 1024);

      // JavaScript loading should be efficient
      const avgJsLoadTime = totalJsLoadTime / jsResources.length;
      expect(avgJsLoadTime).toBeLessThan(1000);

      // Check for proper code splitting (multiple smaller bundles vs one large bundle)
      const mainBundle = jsResources.find(r => r.url.includes('main') || r.url.includes('index'));
      if (mainBundle) {
        // Main bundle should not be too large (suggests good code splitting)
        expect(mainBundle.size).toBeLessThan(1024 * 1024); // 1MB
      }
    });

    test('measures API response times', async ({ page }) => {
      const apiMetrics = [];

      page.on('response', async (response) => {
        const request = response.request();
        const url = request.url();
        
        if (url.includes('/api/')) {
          const timing = await response.timing();
          const responseTime = timing.receiveHeadersEnd - timing.requestStart;
          
          apiMetrics.push({
            endpoint: url.split('/api/')[1].split('?')[0],
            method: request.method(),
            status: response.status(),
            responseTime,
            size: parseInt(response.headers()['content-length'] || '0'),
          });
        }
      });

      await page.goto('/dashboard/email');
      await page.waitForLoadState('networkidle');

      // Trigger some API calls
      const searchInput = page.locator('[data-testid="email-search-input"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
      }

      // Analyze API performance
      const emailApiCalls = apiMetrics.filter(m => m.endpoint.includes('email') || m.endpoint.includes('messages'));
      const searchApiCalls = apiMetrics.filter(m => m.endpoint.includes('search'));

      // Email loading APIs should be fast
      for (const apiCall of emailApiCalls) {
        expect(apiCall.responseTime).toBeLessThan(2000);
        expect(apiCall.status).toBeLessThan(400);
      }

      // Search APIs should be responsive
      for (const apiCall of searchApiCalls) {
        expect(apiCall.responseTime).toBeLessThan(1500);
        expect(apiCall.status).toBeLessThan(400);
      }

      // Calculate average response times
      if (apiMetrics.length > 0) {
        const avgResponseTime = apiMetrics.reduce((sum, metric) => sum + metric.responseTime, 0) / apiMetrics.length;
        expect(avgResponseTime).toBeLessThan(1000);
      }
    });
  });

  test.describe('Mobile Performance', () => {
    test('performs well on mobile devices', async ({ page, browserName }) => {
      // Emulate mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // Throttle network to simulate mobile conditions
      const client = await page.context().newCDPSession(page);
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
        uploadThroughput: 750 * 1024 / 8, // 750 Kbps
        latency: 40, // 40ms latency
      });

      const startTime = Date.now();
      
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      
      // Mobile loading should complete within reasonable time
      expect(loadTime).toBeLessThan(8000);

      // Test touch interactions
      const firstEmail = page.locator('[data-testid="email-item"]').first();
      if (await firstEmail.isVisible()) {
        // Touch targets should be adequately sized
        const boundingBox = await firstEmail.boundingBox();
        expect(boundingBox?.height).toBeGreaterThan(44); // Minimum touch target size

        // Touch interaction should be responsive
        const touchStartTime = Date.now();
        await firstEmail.tap();
        
        // Should respond quickly to touch
        const touchResponseTime = Date.now() - touchStartTime;
        expect(touchResponseTime).toBeLessThan(150);
      }

      // Test mobile-specific features
      const hamburgerMenu = page.locator('[data-testid="mobile-menu-toggle"]');
      if (await hamburgerMenu.isVisible()) {
        await hamburgerMenu.tap();
        
        const mobileMenu = page.locator('[data-testid="mobile-menu"]');
        await expect(mobileMenu).toBeVisible({ timeout: 500 });
      }
    });
  });
});