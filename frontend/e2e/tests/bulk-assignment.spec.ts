import { test, expect } from '@playwright/test';

test.describe('Bulk Email Assignment Workflow', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/email');
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
  });

  test('performs bulk assignment with multiple emails', async ({ page }) => {
    // Enable selection mode by selecting first email
    const firstEmail = page.locator('[data-testid="email-item"]').first();
    const selectCheckbox = firstEmail.locator('[data-testid="email-select-checkbox"]');
    await selectCheckbox.click();

    // Email list should enter selection mode
    await expect(page.locator('[data-testid="bulk-selection-toolbar"]')).toBeVisible();
    await expect(page.getByText('1 email selected')).toBeVisible();

    // Select additional emails
    const secondEmail = page.locator('[data-testid="email-item"]').nth(1);
    await secondEmail.locator('[data-testid="email-select-checkbox"]').click();

    const thirdEmail = page.locator('[data-testid="email-item"]').nth(2);
    await thirdEmail.locator('[data-testid="email-select-checkbox"]').click();

    // Should show updated count
    await expect(page.getByText('3 emails selected')).toBeVisible();

    // Click bulk assign button
    await page.locator('[data-testid="bulk-assign-button"]').click();

    // Bulk assignment modal should open
    await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();
    await expect(page.getByText('Bulk Assign Emails to Case')).toBeVisible();
    await expect(page.getByText('3 emails selected')).toBeVisible();

    // Should show preview of selected emails
    const emailPreviews = page.locator('[data-testid="selected-email-preview"]');
    await expect(emailPreviews).toHaveCount(3);

    // Search for a case to assign to
    const searchInput = page.locator('[data-testid="case-search-input"]');
    await searchInput.fill('Contract Dispute');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="case-list"]', { timeout: 10000 });
    
    // Select first case
    const firstCase = page.locator('[data-testid="case-item"]').first();
    await expect(firstCase).toBeVisible();
    await firstCase.click();

    // Should show selected case
    await expect(page.getByText('Selected Case')).toBeVisible();
    
    // Bulk assign button should be enabled
    const bulkAssignButton = page.getByRole('button', { name: /Start Bulk Assignment/ });
    await expect(bulkAssignButton).toBeEnabled();
    await bulkAssignButton.click();

    // Should show progress indicator
    await expect(page.getByText('Processing Assignments...')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // Should show progress updates
    await expect(page.getByText(/Assigning \d+ emails/)).toBeVisible();
    await expect(page.getByText(/\d+ of 3 emails processed/)).toBeVisible();

    // Wait for completion
    await expect(page.getByText('Assignment Complete')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('3 emails assigned successfully')).toBeVisible();

    // Should show results summary
    await expect(page.getByRole('tab', { name: /Successful/ })).toBeVisible();
    
    // Close modal
    await page.getByRole('button', { name: /Done/ }).click();
    
    // Selection should be cleared
    await expect(page.locator('[data-testid="bulk-selection-toolbar"]')).not.toBeVisible();
  });

  test('handles partial failures in bulk assignment', async ({ page }) => {
    // Mock some assignment failures
    let assignmentCount = 0;
    await page.route('/api/emails/bulk-assign', async (route) => {
      // Let the first request succeed to start the job
      await route.continue();
    });

    await page.route('/api/jobs/*/status', (route) => {
      assignmentCount++;
      
      if (assignmentCount <= 2) {
        // First few polls show in progress
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-123',
            status: 'in_progress',
            progress: 50,
            processedItems: 2,
            totalItems: 5,
          }),
        });
      } else {
        // Final poll shows completion with partial failures
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-123',
            status: 'completed_with_errors',
            progress: 100,
            processedItems: 5,
            totalItems: 5,
            results: {
              successes: 3,
              failures: 2,
              failureDetails: [
                { emailId: 'email-4', error: 'Case access denied' },
                { emailId: 'email-5', error: 'Email already assigned' },
              ],
            },
          }),
        });
      }
    });

    // Select 5 emails
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

    // Wait for partial completion
    await expect(page.getByText('Assignment Completed with Errors')).toBeVisible({ timeout: 30000 });
    
    // Should show success and failure counts
    await expect(page.getByText('3 emails assigned successfully')).toBeVisible();
    await expect(page.getByText('2 emails failed to assign')).toBeVisible();

    // Check failed tab
    await page.getByRole('tab', { name: /Failed/ }).click();
    await expect(page.getByText('Case access denied')).toBeVisible();
    await expect(page.getByText('Email already assigned')).toBeVisible();

    // Should offer retry option
    await expect(page.getByRole('button', { name: /Retry Failed/ })).toBeVisible();
  });

  test('supports select all functionality', async ({ page }) => {
    // Click select all checkbox
    const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
    await selectAllCheckbox.click();

    // Should select all visible emails
    await expect(page.locator('[data-testid="bulk-selection-toolbar"]')).toBeVisible();
    
    // Should show total count
    const selectedText = page.locator('[data-testid="selected-count"]');
    const selectedCount = await selectedText.textContent();
    expect(selectedCount).toMatch(/\d+ emails selected/);

    // All email checkboxes should be checked
    const emailCheckboxes = page.locator('[data-testid="email-select-checkbox"]');
    const checkboxCount = await emailCheckboxes.count();
    
    for (let i = 0; i < checkboxCount; i++) {
      await expect(emailCheckboxes.nth(i)).toBeChecked();
    }

    // Deselect all
    await selectAllCheckbox.click();
    
    // Selection toolbar should disappear
    await expect(page.locator('[data-testid="bulk-selection-toolbar"]')).not.toBeVisible();
    
    // Checkboxes should be unchecked
    for (let i = 0; i < checkboxCount; i++) {
      await expect(emailCheckboxes.nth(i)).not.toBeChecked();
    }
  });

  test('filters out already assigned emails from bulk selection', async ({ page }) => {
    // Look for assigned emails (from previous tests)
    const assignedEmails = page.locator('[data-testid="email-item"]:has([data-testid="assigned-badge"])');
    const assignedCount = await assignedEmails.count();

    if (assignedCount > 0) {
      // Try to select an assigned email
      const assignedEmail = assignedEmails.first();
      const checkbox = assignedEmail.locator('[data-testid="email-select-checkbox"]');
      
      // Checkbox should be disabled or show different state
      if (await checkbox.isVisible()) {
        await expect(checkbox).toBeDisabled();
      }
    }

    // Select unassigned emails
    const unassignedEmails = page.locator('[data-testid="email-item"]:not(:has([data-testid="assigned-badge"]))');
    const unassignedCount = await unassignedEmails.count();

    if (unassignedCount > 0) {
      // Select first few unassigned emails
      const selectCount = Math.min(unassignedCount, 3);
      
      for (let i = 0; i < selectCount; i++) {
        const email = unassignedEmails.nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      await expect(page.getByText(`${selectCount} emails selected`)).toBeVisible();

      // Bulk assign should only work with unassigned emails
      await page.locator('[data-testid="bulk-assign-button"]').click();
      await expect(page.getByText(`${selectCount} emails selected`)).toBeVisible();
    }
  });

  test('handles keyboard shortcuts for bulk selection', async ({ page }) => {
    // Focus on first email
    const firstEmail = page.locator('[data-testid="email-item"]').first();
    await firstEmail.click();

    // Ctrl+A should select all emails
    await page.keyboard.press('Control+a');
    
    await expect(page.locator('[data-testid="bulk-selection-toolbar"]')).toBeVisible();

    // Escape should deselect all
    await page.keyboard.press('Escape');
    
    await expect(page.locator('[data-testid="bulk-selection-toolbar"]')).not.toBeVisible();

    // Select individual emails with Space
    await firstEmail.focus();
    await page.keyboard.press('Space');
    
    await expect(page.getByText('1 email selected')).toBeVisible();

    // Shift+click for range selection
    const fifthEmail = page.locator('[data-testid="email-item"]').nth(4);
    await fifthEmail.click({ modifiers: ['Shift'] });
    
    await expect(page.getByText('5 emails selected')).toBeVisible();
  });

  test('cancels bulk assignment in progress', async ({ page }) => {
    // Mock a long-running job
    await page.route('/api/jobs/*/status', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'job-123',
          status: 'in_progress',
          progress: 20,
          processedItems: 1,
          totalItems: 5,
          canCancel: true,
        }),
      });
    });

    await page.route('/api/jobs/*/cancel', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'job-123',
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        }),
      });
    });

    // Select emails and start bulk assignment
    for (let i = 0; i < 3; i++) {
      const email = page.locator('[data-testid="email-item"]').nth(i);
      await email.locator('[data-testid="email-select-checkbox"]').click();
    }

    await page.locator('[data-testid="bulk-assign-button"]').click();
    
    // Select case and start
    const searchInput = page.locator('[data-testid="case-search-input"]');
    await searchInput.fill('Test');
    await page.waitForSelector('[data-testid="case-item"]');
    await page.locator('[data-testid="case-item"]').first().click();
    await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

    // Should show progress
    await expect(page.getByText('Processing Assignments...')).toBeVisible();
    
    // Cancel button should be available
    const cancelButton = page.getByRole('button', { name: /Cancel/ });
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // Should show cancellation confirmation
    await expect(page.getByText('Assignment Cancelled')).toBeVisible();
  });

  test('retries failed bulk assignment', async ({ page }) => {
    // Mock initial failure
    let retryAttempt = 0;
    await page.route('/api/jobs/*/status', (route) => {
      if (retryAttempt === 0) {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-123',
            status: 'failed',
            error: 'Network timeout',
            processedItems: 0,
            totalItems: 3,
          }),
        });
      } else {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'job-retry-456',
            status: 'completed',
            processedItems: 3,
            totalItems: 3,
            results: {
              successes: 3,
              failures: 0,
            },
          }),
        });
      }
    });

    await page.route('/api/emails/bulk-assign', (route) => {
      retryAttempt++;
      route.continue();
    });

    // Start bulk assignment
    for (let i = 0; i < 3; i++) {
      const email = page.locator('[data-testid="email-item"]').nth(i);
      await email.locator('[data-testid="email-select-checkbox"]').click();
    }

    await page.locator('[data-testid="bulk-assign-button"]').click();
    
    // Select case and start
    const searchInput = page.locator('[data-testid="case-search-input"]');
    await searchInput.fill('Test');
    await page.waitForSelector('[data-testid="case-item"]');
    await page.locator('[data-testid="case-item"]').first().click();
    await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

    // Should show failure
    await expect(page.getByText('Assignment Failed')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Network timeout')).toBeVisible();

    // Retry the assignment
    await page.getByRole('button', { name: /Try Again/ }).click();

    // Should succeed on retry
    await expect(page.getByText('Assignment Complete')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('3 emails assigned successfully')).toBeVisible();
  });

  test('shows estimated time for large bulk operations', async ({ page }) => {
    // Mock a large bulk operation
    await page.route('/api/emails/bulk-assign', (route) => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          jobId: 'large-job-789',
          totalEmails: 100,
          estimatedCompletion: new Date(Date.now() + 300000).toISOString(), // 5 minutes
          estimatedDuration: 300,
        }),
      });
    });

    // This test simulates selecting many emails
    // In a real scenario, this would be done through select-all or pagination
    
    // For demo purposes, we'll select a few and mock the large count
    for (let i = 0; i < 5; i++) {
      const email = page.locator('[data-testid="email-item"]').nth(i);
      await email.locator('[data-testid="email-select-checkbox"]').click();
    }

    await page.locator('[data-testid="bulk-assign-button"]').click();
    
    // Mock the modal to show large count
    await page.evaluate(() => {
      // This would normally come from the actual selection
      window.mockLargeSelection = true;
    });

    // Start assignment
    const searchInput = page.locator('[data-testid="case-search-input"]');
    await searchInput.fill('Test');
    await page.waitForSelector('[data-testid="case-item"]');
    await page.locator('[data-testid="case-item"]').first().click();
    await page.getByRole('button', { name: /Start Bulk Assignment/ }).click();

    // Should show estimated time
    await expect(page.getByText(/Estimated completion:/)).toBeVisible();
    await expect(page.getByText(/approximately \d+ minutes/)).toBeVisible();
  });
});