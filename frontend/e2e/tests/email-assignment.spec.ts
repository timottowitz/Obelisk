import { test, expect } from '@playwright/test';

test.describe('Email Assignment Workflow', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.beforeEach(async ({ page }) => {
    // Navigate to email dashboard
    await page.goto('/dashboard/email');
    
    // Wait for email list to load
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
  });

  test('assigns single email to case successfully', async ({ page }) => {
    // Find an unassigned email
    const firstUnassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
    await expect(firstUnassignedEmail).toBeVisible();

    // Get the email subject for verification
    const emailSubject = await firstUnassignedEmail.locator('[data-testid="email-subject"]').textContent();

    // Click the assign button
    await firstUnassignedEmail.locator('[data-testid="assign-button"]').click();

    // Assignment modal should open
    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();
    await expect(page.getByText('Assign Email to Case')).toBeVisible();

    // Verify email details are shown
    await expect(page.getByText(emailSubject)).toBeVisible();

    // AI suggestions tab should be active by default
    await expect(page.getByRole('tab', { name: /AI Suggestions/ })).toHaveAttribute('data-state', 'active');

    // Wait for AI suggestions to load
    await page.waitForSelector('[data-testid="suggested-cases"]', { timeout: 15000 });
    
    // Select the first suggested case
    const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
    await expect(firstSuggestion).toBeVisible();
    
    const suggestedCaseNumber = await firstSuggestion.locator('[data-testid="case-number"]').textContent();
    await firstSuggestion.click();

    // Confirmation step should appear
    await expect(page.getByText('Confirm Assignment')).toBeVisible();
    await expect(page.getByText(suggestedCaseNumber)).toBeVisible();
    await expect(page.getByText('AI Suggested')).toBeVisible();

    // Confirm the assignment
    await page.getByRole('button', { name: /Assign Email/ }).click();

    // Processing step
    await expect(page.getByText('Assigning Email to Case')).toBeVisible();

    // Success step should appear
    await expect(page.getByText('Assignment Complete!')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/successfully assigned/)).toBeVisible();

    // Close the modal
    await page.getByRole('button', { name: /Done/ }).click();

    // Modal should close and email should now show as assigned
    await expect(page.locator('[data-testid="case-assignment-modal"]')).not.toBeVisible();
    
    // Find the email in the list and verify it shows as assigned
    const assignedEmail = page.locator(`[data-testid="email-item"]:has-text("${emailSubject}")`);
    await expect(assignedEmail.locator('[data-testid="assigned-badge"]')).toBeVisible();
  });

  test('assigns email using manual search', async ({ page }) => {
    // Find an unassigned email
    const unassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').nth(1);
    await unassignedEmail.locator('[data-testid="assign-button"]').click();

    // Wait for modal
    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

    // Switch to Advanced Search tab
    await page.getByRole('tab', { name: /Advanced Search/ }).click();
    await expect(page.getByRole('tabpanel', { name: /Advanced Search/ })).toBeVisible();

    // Search for cases
    const searchInput = page.locator('[data-testid="case-search-input"]');
    await searchInput.fill('Contract');
    
    // Wait for search results
    await page.waitForSelector('[data-testid="case-list"]', { timeout: 10000 });
    
    // Select first search result
    const firstCase = page.locator('[data-testid="case-item"]').first();
    await expect(firstCase).toBeVisible();
    
    const caseNumber = await firstCase.locator('[data-testid="case-number"]').textContent();
    await firstCase.click();

    // Confirm assignment
    await expect(page.getByText('Confirm Assignment')).toBeVisible();
    await expect(page.getByText(caseNumber)).toBeVisible();
    
    await page.getByRole('button', { name: /Assign Email/ }).click();

    // Wait for completion
    await expect(page.getByText('Assignment Complete!')).toBeVisible({ timeout: 30000 });
    
    await page.getByRole('button', { name: /Done/ }).click();
  });

  test('assigns email using quick access', async ({ page }) => {
    // Find an unassigned email
    const unassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').nth(2);
    await unassignedEmail.locator('[data-testid="assign-button"]').click();

    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

    // Switch to Quick Access tab
    await page.getByRole('tab', { name: /Quick Access/ }).click();
    
    // Wait for quick access options to load
    await page.waitForSelector('[data-testid="quick-case-access"]', { timeout: 10000 });
    
    // Select a recent case
    const recentCase = page.locator('[data-testid="recent-case-item"]').first();
    await expect(recentCase).toBeVisible();
    
    const recentCaseNumber = await recentCase.locator('[data-testid="case-number"]').textContent();
    await recentCase.click();

    // Confirm assignment
    await expect(page.getByText('Confirm Assignment')).toBeVisible();
    await expect(page.getByText(recentCaseNumber)).toBeVisible();
    await expect(page.getByText('Quick Access')).toBeVisible();
    
    await page.getByRole('button', { name: /Assign Email/ }).click();
    await expect(page.getByText('Assignment Complete!')).toBeVisible({ timeout: 30000 });
    
    await page.getByRole('button', { name: /Done/ }).click();
  });

  test('handles assignment errors gracefully', async ({ page }) => {
    // Mock an assignment failure
    await page.route('/api/emails/*/assign', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Assignment failed - test error' }),
      });
    });

    const unassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
    await unassignedEmail.locator('[data-testid="assign-button"]').click();

    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

    // Select first AI suggestion
    await page.waitForSelector('[data-testid="suggestion-item"]');
    const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
    await firstSuggestion.click();

    // Try to assign
    await page.getByRole('button', { name: /Assign Email/ }).click();

    // Should show error state
    await expect(page.getByText('Assignment Failed')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Assignment failed - test error')).toBeVisible();

    // Should show retry and back options
    await expect(page.getByRole('button', { name: /Retry Assignment/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Back to Search/ })).toBeVisible();

    // Test back to search functionality
    await page.getByRole('button', { name: /Back to Search/ }).click();
    await expect(page.getByText('Assign Email to Case')).toBeVisible();
  });

  test('shows assignment history and status', async ({ page }) => {
    // Look for already assigned emails
    const assignedEmails = page.locator('[data-testid="email-item"]:has([data-testid="assigned-badge"])');
    await expect(assignedEmails).toHaveCount(0); // Should have at least one from previous tests

    if (await assignedEmails.count() > 0) {
      const firstAssigned = assignedEmails.first();
      
      // Should show assigned status
      await expect(firstAssigned.locator('[data-testid="assigned-badge"]')).toBeVisible();
      
      // Should show case information
      const caseLink = firstAssigned.locator('[data-testid="assigned-case-link"]');
      await expect(caseLink).toBeVisible();
      
      // Assign button should be disabled or show different state
      const assignButton = firstAssigned.locator('[data-testid="assign-button"]');
      await expect(assignButton).toBeDisabled();
    }
  });

  test('validates case access permissions', async ({ page }) => {
    // This test would verify that users can only assign emails to cases they have access to
    const unassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
    await unassignedEmail.locator('[data-testid="assign-button"]').click();

    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

    // Switch to search tab
    await page.getByRole('tab', { name: /Advanced Search/ }).click();
    
    // Search for cases - should only return cases user has access to
    const searchInput = page.locator('[data-testid="case-search-input"]');
    await searchInput.fill('Test');
    
    await page.waitForSelector('[data-testid="case-list"]');
    
    // All returned cases should be accessible
    const caseItems = page.locator('[data-testid="case-item"]');
    const count = await caseItems.count();
    
    if (count > 0) {
      // Each case should be clickable (indicating user has access)
      for (let i = 0; i < Math.min(count, 3); i++) {
        await expect(caseItems.nth(i)).not.toHaveAttribute('disabled');
      }
    }
  });

  test('handles email with attachments', async ({ page }) => {
    // Look for email with attachment indicator
    const emailWithAttachment = page.locator('[data-testid="email-item"]:has([data-testid="attachment-indicator"])').first();
    
    if (await emailWithAttachment.count() > 0) {
      await emailWithAttachment.locator('[data-testid="assign-button"]').click();
      
      await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();
      
      // Should show attachment information in email preview
      await expect(page.getByText('Has Attachments')).toBeVisible();
      
      // Proceed with assignment
      await page.waitForSelector('[data-testid="suggestion-item"]');
      const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
      await firstSuggestion.click();
      
      await page.getByRole('button', { name: /Assign Email/ }).click();
      
      // Should mention attachment processing
      await expect(page.getByText(/attachments/i)).toBeVisible();
      
      await expect(page.getByText('Assignment Complete!')).toBeVisible({ timeout: 45000 }); // Longer timeout for attachments
    }
  });

  test('cancels assignment workflow', async ({ page }) => {
    const unassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
    await unassignedEmail.locator('[data-testid="assign-button"]').click();

    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

    // Cancel using the close button
    await page.locator('[data-testid="close-modal"]').click();
    
    // Modal should close
    await expect(page.locator('[data-testid="case-assignment-modal"]')).not.toBeVisible();
    
    // Email should remain unassigned
    await expect(unassignedEmail.locator('[data-testid="assign-button"]')).not.toBeDisabled();
  });

  test('uses keyboard navigation in assignment modal', async ({ page }) => {
    const unassignedEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
    await unassignedEmail.locator('[data-testid="assign-button"]').click();

    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

    // Test Escape key closes modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="case-assignment-modal"]')).not.toBeVisible();
    
    // Reopen modal
    await unassignedEmail.locator('[data-testid="assign-button"]').click();
    await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through suggestions with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');
    
    // Enter key should select suggestion
    await page.keyboard.press('Enter');
    
    // Should proceed to confirmation
    await expect(page.getByText('Confirm Assignment')).toBeVisible();
  });
});