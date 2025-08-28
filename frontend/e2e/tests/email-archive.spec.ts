import { test, expect } from '@playwright/test';

test.describe('Email Archive Management', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to a case detail page with email archive
    await page.goto('/dashboard/cases/test-case-with-emails');
    await page.waitForSelector('[data-testid="case-detail-page"]', { timeout: 10000 });
    
    // Click on the email archive tab
    await page.getByRole('tab', { name: /Email Archive/ }).click();
    await page.waitForSelector('[data-testid="email-archive-tab"]', { timeout: 10000 });
  });

  test('displays email archive with proper structure', async ({ page }) => {
    // Email archive should be visible
    await expect(page.locator('[data-testid="email-archive-list"]')).toBeVisible();
    
    // Should show email count
    await expect(page.locator('[data-testid="email-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-count"]')).toContainText(/\d+ emails/);
    
    // Should have search functionality
    await expect(page.locator('[data-testid="email-search-input"]')).toBeVisible();
    
    // Should have filtering options
    await expect(page.locator('[data-testid="email-filters"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/ })).toBeVisible();
    
    // Should show email items with key information
    const emailItems = page.locator('[data-testid="archived-email-item"]');
    await expect(emailItems).toHaveCount({ greaterThan: 0 });
    
    // First email should show required fields
    const firstEmail = emailItems.first();
    await expect(firstEmail.locator('[data-testid="email-subject"]')).toBeVisible();
    await expect(firstEmail.locator('[data-testid="email-sender"]')).toBeVisible();
    await expect(firstEmail.locator('[data-testid="email-date"]')).toBeVisible();
  });

  test('searches emails in archive', async ({ page }) => {
    const searchInput = page.locator('[data-testid="email-search-input"]');
    
    // Perform search
    await searchInput.fill('Contract');
    await page.keyboard.press('Enter');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
    
    // Should show filtered results
    const emailItems = page.locator('[data-testid="archived-email-item"]');
    const itemCount = await emailItems.count();
    
    if (itemCount > 0) {
      // Results should contain search term
      const firstResult = emailItems.first();
      const emailContent = await firstResult.textContent();
      expect(emailContent.toLowerCase()).toContain('contract');
    }
    
    // Should show search results indicator
    await expect(page.getByText(/Search results for "Contract"/)).toBeVisible();
    
    // Clear search should restore all emails
    await searchInput.clear();
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(1000); // Wait for results to update
    const allEmails = await page.locator('[data-testid="archived-email-item"]').count();
    expect(allEmails).toBeGreaterThanOrEqual(itemCount);
  });

  test('filters emails by date range', async ({ page }) => {
    // Open filter menu
    await page.getByRole('button', { name: /Filter/ }).click();
    await expect(page.locator('[data-testid="filter-menu"]')).toBeVisible();
    
    // Select date range filter
    await page.getByRole('button', { name: /Last 30 days/ }).click();
    
    // Filter should be applied
    await expect(page.getByText('Showing emails from last 30 days')).toBeVisible();
    
    // Should show filtered emails
    const filteredEmails = page.locator('[data-testid="archived-email-item"]');
    await expect(filteredEmails).toHaveCount({ greaterThan: 0 });
    
    // Try custom date range
    await page.getByRole('button', { name: /Filter/ }).click();
    await page.getByRole('button', { name: /Custom Range/ }).click();
    
    // Date picker should appear
    await expect(page.locator('[data-testid="date-range-picker"]')).toBeVisible();
    
    // Set start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    await page.fill('[data-testid="start-date-input"]', startDate.toISOString().split('T')[0]);
    
    // Set end date (today)
    const endDate = new Date();
    await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);
    
    // Apply filter
    await page.getByRole('button', { name: /Apply Filter/ }).click();
    
    // Should show custom range indicator
    await expect(page.getByText(/Showing emails from/)).toBeVisible();
  });

  test('filters emails by type and status', async ({ page }) => {
    // Open filter menu
    await page.getByRole('button', { name: /Filter/ }).click();
    
    // Filter by email type
    await page.getByLabel('Inbound emails').check();
    await page.getByRole('button', { name: /Apply/ }).click();
    
    // Should show only inbound emails
    await expect(page.getByText('Showing inbound emails only')).toBeVisible();
    
    const emailItems = page.locator('[data-testid="archived-email-item"]');
    const firstEmail = emailItems.first();
    
    if (await emailItems.count() > 0) {
      // Should show inbound indicator
      await expect(firstEmail.locator('[data-testid="inbound-indicator"]')).toBeVisible();
    }
    
    // Clear filters
    await page.getByRole('button', { name: /Clear Filters/ }).click();
    
    // Should show all emails again
    await expect(page.getByText('Showing inbound emails only')).not.toBeVisible();
  });

  test('opens email content viewer', async ({ page }) => {
    const emailItems = page.locator('[data-testid="archived-email-item"]');
    const firstEmail = emailItems.first();
    
    // Get email subject for verification
    const emailSubject = await firstEmail.locator('[data-testid="email-subject"]').textContent();
    
    // Click on email to open viewer
    await firstEmail.click();
    
    // Email content viewer should open
    await expect(page.locator('[data-testid="email-content-viewer"]')).toBeVisible();
    
    // Should show email details
    await expect(page.getByText(emailSubject)).toBeVisible();
    await expect(page.locator('[data-testid="email-from"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-to"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-date-full"]')).toBeVisible();
    
    // Should show email body
    await expect(page.locator('[data-testid="email-body"]')).toBeVisible();
    
    // Should have close button
    await expect(page.getByRole('button', { name: /Close/ })).toBeVisible();
    
    // Close viewer
    await page.getByRole('button', { name: /Close/ }).click();
    await expect(page.locator('[data-testid="email-content-viewer"]')).not.toBeVisible();
  });

  test('handles email with attachments in viewer', async ({ page }) => {
    // Look for email with attachments
    const emailWithAttachments = page.locator('[data-testid="archived-email-item"]:has([data-testid="attachment-icon"])').first();
    
    if (await emailWithAttachments.count() > 0) {
      await emailWithAttachments.click();
      
      // Email viewer should open
      await expect(page.locator('[data-testid="email-content-viewer"]')).toBeVisible();
      
      // Should show attachments section
      await expect(page.locator('[data-testid="email-attachments"]')).toBeVisible();
      await expect(page.getByText('Attachments')).toBeVisible();
      
      // Should list attachments
      const attachments = page.locator('[data-testid="attachment-item"]');
      await expect(attachments).toHaveCount({ greaterThan: 0 });
      
      // First attachment should have download button
      const firstAttachment = attachments.first();
      await expect(firstAttachment.locator('[data-testid="download-attachment"]')).toBeVisible();
      
      // Should show attachment info (name, size, type)
      await expect(firstAttachment.locator('[data-testid="attachment-name"]')).toBeVisible();
      await expect(firstAttachment.locator('[data-testid="attachment-size"]')).toBeVisible();
    }
  });

  test('downloads email attachments', async ({ page }) => {
    // Find email with attachments
    const emailWithAttachments = page.locator('[data-testid="archived-email-item"]:has([data-testid="attachment-icon"])').first();
    
    if (await emailWithAttachments.count() > 0) {
      await emailWithAttachments.click();
      await expect(page.locator('[data-testid="email-content-viewer"]')).toBeVisible();
      
      // Set up download handler
      const downloadPromise = page.waitForEvent('download');
      
      // Click download on first attachment
      const firstAttachment = page.locator('[data-testid="attachment-item"]').first();
      await firstAttachment.locator('[data-testid="download-attachment"]').click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toBeTruthy();
      
      // Should show download success message
      await expect(page.getByText(/Download started/)).toBeVisible({ timeout: 5000 });
    }
  });

  test('exports email archive data', async ({ page }) => {
    // Export button should be visible
    await expect(page.getByRole('button', { name: /Export/ })).toBeVisible();
    
    // Click export button
    await page.getByRole('button', { name: /Export/ }).click();
    
    // Export dialog should open
    await expect(page.locator('[data-testid="export-dialog"]')).toBeVisible();
    await expect(page.getByText('Export Email Archive')).toBeVisible();
    
    // Should have format options
    await expect(page.getByLabel('CSV format')).toBeVisible();
    await expect(page.getByLabel('PDF format')).toBeVisible();
    await expect(page.getByLabel('JSON format')).toBeVisible();
    
    // Should have date range options
    await expect(page.getByLabel('Include date range')).toBeVisible();
    
    // Select CSV format
    await page.getByLabel('CSV format').check();
    
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    // Start export
    await page.getByRole('button', { name: /Start Export/ }).click();
    
    // Should show progress
    await expect(page.getByText('Preparing export...')).toBeVisible();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify export file
    expect(download.suggestedFilename()).toContain('.csv');
    
    // Should show success message
    await expect(page.getByText('Export completed successfully')).toBeVisible({ timeout: 30000 });
  });

  test('handles pagination in email archive', async ({ page }) => {
    // Check if pagination is present (depends on email count)
    const paginationContainer = page.locator('[data-testid="email-pagination"]');
    
    if (await paginationContainer.isVisible()) {
      // Should show current page info
      await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible();
      
      // Should have navigation buttons
      const nextButton = page.getByRole('button', { name: /Next/ });
      const prevButton = page.getByRole('button', { name: /Previous/ });
      
      if (await nextButton.isEnabled()) {
        // Get current email list
        const currentEmails = await page.locator('[data-testid="archived-email-item"]').allTextContents();
        
        // Go to next page
        await nextButton.click();
        
        // Wait for new page to load
        await page.waitForTimeout(1000);
        
        // Should show different emails
        const newEmails = await page.locator('[data-testid="archived-email-item"]').allTextContents();
        expect(newEmails).not.toEqual(currentEmails);
        
        // Previous button should now be enabled
        await expect(prevButton).toBeEnabled();
      }
    }
  });

  test('sorts emails by different criteria', async ({ page }) => {
    // Sort dropdown should be visible
    await expect(page.locator('[data-testid="sort-dropdown"]')).toBeVisible();
    
    // Get current first email subject
    const currentFirstEmail = await page.locator('[data-testid="archived-email-item"]').first()
      .locator('[data-testid="email-subject"]').textContent();
    
    // Change sort to date descending
    await page.locator('[data-testid="sort-dropdown"]').click();
    await page.getByRole('option', { name: /Date (Newest First)/ }).click();
    
    // Wait for sorting to apply
    await page.waitForTimeout(1000);
    
    // Should show different order
    const newFirstEmail = await page.locator('[data-testid="archived-email-item"]').first()
      .locator('[data-testid="email-subject"]').textContent();
    
    // Sort by sender
    await page.locator('[data-testid="sort-dropdown"]').click();
    await page.getByRole('option', { name: /Sender (A-Z)/ }).click();
    
    await page.waitForTimeout(1000);
    
    // Should show alphabetically sorted by sender
    const emailItems = page.locator('[data-testid="archived-email-item"]');
    const firstSender = await emailItems.first().locator('[data-testid="email-sender"]').textContent();
    const secondSender = await emailItems.nth(1).locator('[data-testid="email-sender"]').textContent();
    
    // First sender should come before second alphabetically
    expect(firstSender.localeCompare(secondSender)).toBeLessThanOrEqual(0);
  });

  test('handles keyboard navigation in email archive', async ({ page }) => {
    // Focus on first email
    const emailItems = page.locator('[data-testid="archived-email-item"]');
    await emailItems.first().focus();
    
    // Arrow down should move to next email
    await page.keyboard.press('ArrowDown');
    
    // Second email should be focused
    await expect(emailItems.nth(1)).toBeFocused();
    
    // Arrow up should move back
    await page.keyboard.press('ArrowUp');
    await expect(emailItems.first()).toBeFocused();
    
    // Enter should open email viewer
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="email-content-viewer"]')).toBeVisible();
    
    // Escape should close viewer
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="email-content-viewer"]')).not.toBeVisible();
    
    // Focus should return to email list
    await expect(emailItems.first()).toBeFocused();
  });

  test('shows email thread view when available', async ({ page }) => {
    // Look for email that's part of a thread
    const threadEmail = page.locator('[data-testid="archived-email-item"]:has([data-testid="thread-indicator"])').first();
    
    if (await threadEmail.count() > 0) {
      await threadEmail.click();
      
      // Email viewer should open
      await expect(page.locator('[data-testid="email-content-viewer"]')).toBeVisible();
      
      // Should have thread view option
      await expect(page.getByRole('button', { name: /View Thread/ })).toBeVisible();
      
      // Click to view thread
      await page.getByRole('button', { name: /View Thread/ }).click();
      
      // Thread view should open
      await expect(page.locator('[data-testid="email-thread-view"]')).toBeVisible();
      
      // Should show multiple emails in thread
      const threadEmails = page.locator('[data-testid="thread-email-item"]');
      await expect(threadEmails).toHaveCount({ greaterThan: 1 });
      
      // Should show thread timeline
      await expect(page.locator('[data-testid="thread-timeline"]')).toBeVisible();
    }
  });

  test('handles error states gracefully', async ({ page }) => {
    // Mock API error for email archive
    await page.route('/api/cases/*/emails', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load emails' }),
      });
    });
    
    // Reload the page to trigger error
    await page.reload();
    await page.getByRole('tab', { name: /Email Archive/ }).click();
    
    // Should show error state
    await expect(page.getByText('Failed to load email archive')).toBeVisible();
    await expect(page.getByRole('button', { name: /Retry/ })).toBeVisible();
    
    // Mock successful retry
    await page.unroute('/api/cases/*/emails');
    await page.route('/api/cases/*/emails', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          emails: [
            {
              id: 'retry-email-1',
              subject: 'Test email after retry',
              from: 'test@example.com',
              date: new Date().toISOString(),
              body: 'Test email body',
            },
          ],
          total: 1,
        }),
      });
    });
    
    // Click retry
    await page.getByRole('button', { name: /Retry/ }).click();
    
    // Should load successfully
    await expect(page.locator('[data-testid="email-archive-list"]')).toBeVisible();
    await expect(page.getByText('Test email after retry')).toBeVisible();
  });

  test('maintains search and filter state during navigation', async ({ page }) => {
    // Apply search filter
    const searchInput = page.locator('[data-testid="email-search-input"]');
    await searchInput.fill('Important');
    await page.keyboard.press('Enter');
    
    // Apply date filter
    await page.getByRole('button', { name: /Filter/ }).click();
    await page.getByRole('button', { name: /Last 7 days/ }).click();
    
    // Navigate away from email archive
    await page.getByRole('tab', { name: /Case Info/ }).click();
    
    // Navigate back to email archive
    await page.getByRole('tab', { name: /Email Archive/ }).click();
    
    // Search and filter state should be maintained
    await expect(searchInput).toHaveValue('Important');
    await expect(page.getByText('Showing emails from last 7 days')).toBeVisible();
    await expect(page.getByText(/Search results for "Important"/)).toBeVisible();
  });
});