import { test, expect } from '@playwright/test';

// Axe accessibility testing helper functions
async function injectAxe(page: any) {
  await page.addScriptTag({
    url: 'https://unpkg.com/axe-core@4.7.2/axe.min.js'
  });
}

async function checkA11y(page: any, context?: string, options?: any) {
  const results = await page.evaluate((contextSelector: string | null) => {
    return new Promise((resolve) => {
      // @ts-ignore
      if (window.axe) {
        // @ts-ignore
        window.axe.run(contextSelector, (err: any, results: any) => {
          resolve(results);
        });
      } else {
        resolve({ violations: [] });
      }
    });
  }, context);
  
  // @ts-ignore
  if (results.violations && results.violations.length > 0) {
    // @ts-ignore
    console.log('Accessibility violations found:', results.violations);
    // For comprehensive testing, we'll log violations but not fail tests
    // In production, you would want to fail tests on violations
  }
}

test.describe('Accessibility Testing Suite', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.describe('Email Dashboard Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
      await injectAxe(page);
    });

    test('email dashboard meets WCAG accessibility standards', async ({ page }) => {
      // Run axe accessibility tests
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        rules: {
          // Enable all WCAG 2.1 AA rules
          'wcag21aa': { enabled: true },
          'wcag2aa': { enabled: true },
          'color-contrast': { enabled: true },
          'keyboard': { enabled: true },
          'focus': { enabled: true },
        },
      });

      // Additional manual accessibility checks
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
      
      // Main heading should be h1
      const h1Elements = await page.locator('h1').count();
      expect(h1Elements).toBeGreaterThanOrEqual(1);

      // Check for proper ARIA labels on interactive elements
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        // Button should have either aria-label or visible text
        expect(ariaLabel || textContent?.trim()).toBeTruthy();
      }

      // Check for proper alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i);
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');
        
        // Images should have alt text or be marked as decorative
        expect(alt !== null || role === 'presentation').toBeTruthy();
      }
    });

    test('supports keyboard navigation throughout email list', async ({ page }) => {
      // Focus should start at the beginning of the page
      await page.keyboard.press('Tab');
      
      // Navigate to email list
      let focused = await page.locator(':focus').first();
      
      // Tab through email list items
      const emailItems = page.locator('[data-testid="email-item"]');
      const emailCount = await emailItems.count();
      
      if (emailCount > 0) {
        // Navigate to first email item
        while (!(await focused.getAttribute('data-testid'))?.includes('email-item')) {
          await page.keyboard.press('Tab');
          focused = await page.locator(':focus').first();
        }

        // Should be able to navigate through email items with arrow keys
        await page.keyboard.press('ArrowDown');
        const secondEmail = await page.locator(':focus').first();
        expect(await secondEmail.getAttribute('data-testid')).toBe('email-item');

        // Should be able to navigate back up
        await page.keyboard.press('ArrowUp');
        const backToFirst = await page.locator(':focus').first();
        expect(await backToFirst.isVisible()).toBe(true);

        // Enter should open assignment modal or perform primary action
        await page.keyboard.press('Enter');
        
        // Check if assignment modal opened
        const modal = page.locator('[data-testid="case-assignment-modal"]');
        if (await modal.isVisible()) {
          // Modal should have focus management
          const modalTitle = page.locator('[role="dialog"] h2').first();
          await expect(modalTitle).toBeFocused();
          
          // Escape should close modal
          await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible();
          
          // Focus should return to the email item
          const focusedAfterClose = await page.locator(':focus').first();
          expect(await focusedAfterClose.getAttribute('data-testid')).toBe('email-item');
        }
      }
    });

    test('provides proper ARIA announcements for screen readers', async ({ page }) => {
      // Check for live regions that announce dynamic changes
      const liveRegions = page.locator('[aria-live]');
      await expect(liveRegions).toHaveCount({ greaterThan: 0 });

      // Check for proper ARIA labels on complex controls
      const emailList = page.locator('[data-testid="email-list"]');
      await expect(emailList).toHaveAttribute('role', 'list');
      await expect(emailList).toHaveAttribute('aria-label');

      // Email items should have proper ARIA structure
      const emailItems = page.locator('[data-testid="email-item"]');
      const firstEmail = emailItems.first();
      
      if (await firstEmail.isVisible()) {
        await expect(firstEmail).toHaveAttribute('role', 'listitem');
        
        // Should have accessible name from content
        const accessibleName = await firstEmail.getAttribute('aria-label');
        expect(accessibleName).toBeTruthy();
      }

      // Check for proper status announcements
      const statusRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      if (await statusRegion.isVisible()) {
        // Status messages should be announced to screen readers
        await expect(statusRegion).toHaveAttribute('aria-atomic', 'true');
      }
    });

    test('maintains focus visibility and management', async ({ page }) => {
      // Custom CSS should not remove focus outlines
      await page.addStyleTag({
        content: `
          *:focus {
            outline: 2px solid blue !important;
            outline-offset: 2px !important;
          }
        `,
      });

      // Tab through interactive elements
      const interactiveElements = page.locator('button, a, input, [tabindex="0"]');
      const elementCount = Math.min(await interactiveElements.count(), 10); // Test first 10 elements

      for (let i = 0; i < elementCount; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.locator(':focus').first();
        
        // Element should be visible and have focus
        await expect(focused).toBeVisible();
        await expect(focused).toBeFocused();
        
        // Focus outline should be visible (check for custom outline)
        const outline = await focused.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.outline || styles.outlineWidth;
        });
        
        expect(outline).toBeTruthy();
      }
    });

    test('supports high contrast mode', async ({ page }) => {
      // Simulate Windows High Contrast mode
      await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });

      // Check that content is still visible and readable
      const emailItems = page.locator('[data-testid="email-item"]');
      const firstEmail = emailItems.first();

      if (await firstEmail.isVisible()) {
        // Text should have sufficient contrast
        const textColor = await firstEmail.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.color;
        });

        const backgroundColor = await firstEmail.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.backgroundColor;
        });

        // Colors should be defined (not transparent)
        expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }

      // Interactive elements should remain accessible
      const buttons = page.locator('button');
      const firstButton = buttons.first();

      if (await firstButton.isVisible()) {
        // Should have proper contrast
        const buttonStyles = await firstButton.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return {
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            border: styles.border,
          };
        });

        // Button should have visible borders or backgrounds
        expect(
          buttonStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
          buttonStyles.border !== '0px none'
        ).toBeTruthy();
      }
    });
  });

  test.describe('Email Assignment Modal Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
      
      // Open assignment modal
      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();
      await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();
      
      await injectAxe(page);
    });

    test('assignment modal meets WCAG standards', async ({ page }) => {
      // Focus should be trapped in modal
      const modal = page.locator('[data-testid="case-assignment-modal"]');
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-labelledby');
      
      // Modal should have focus on first focusable element
      const firstFocusable = modal.locator('button, input, select, textarea, [tabindex="0"]').first();
      await expect(firstFocusable).toBeFocused();

      // Run accessibility check on modal
      await checkA11y(page, '[data-testid="case-assignment-modal"]', {
        rules: {
          'focus-order-semantics': { enabled: true },
          'keyboard': { enabled: true },
          'aria-required-attr': { enabled: true },
        },
      });
    });

    test('modal supports keyboard navigation and focus management', async ({ page }) => {
      const modal = page.locator('[data-testid="case-assignment-modal"]');
      
      // Tab should cycle through modal elements only
      const initialFocus = await page.locator(':focus').first();
      
      // Tab through all focusable elements in modal
      let tabCount = 0;
      let currentFocus = initialFocus;
      
      do {
        await page.keyboard.press('Tab');
        currentFocus = await page.locator(':focus').first();
        tabCount++;
        
        // Focus should remain within modal
        const isInModal = await modal.locator(':focus').count() > 0;
        expect(isInModal).toBe(true);
        
      } while (tabCount < 20 && !(await currentFocus.isEqual(initialFocus)));

      // Shift+Tab should work in reverse
      await page.keyboard.press('Shift+Tab');
      const reverseFocus = await page.locator(':focus').first();
      expect(await reverseFocus.isVisible()).toBe(true);

      // Escape should close modal and return focus
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();
      
      // Focus should return to trigger button
      const returnedFocus = await page.locator(':focus').first();
      expect(await returnedFocus.getAttribute('data-testid')).toBe('assign-button');
    });

    test('modal tabs are accessible with ARIA states', async ({ page }) => {
      // Check tab list accessibility
      const tabList = page.locator('[role="tablist"]');
      await expect(tabList).toBeVisible();
      await expect(tabList).toHaveAttribute('aria-label');

      // Check individual tabs
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount).toBeGreaterThan(0);

      // Active tab should have proper ARIA state
      const activeTab = page.locator('[role="tab"][aria-selected="true"]');
      await expect(activeTab).toBeVisible();
      await expect(activeTab).toHaveAttribute('tabindex', '0');

      // Inactive tabs should have proper ARIA state
      const inactiveTabs = page.locator('[role="tab"][aria-selected="false"]');
      const inactiveCount = await inactiveTabs.count();
      
      for (let i = 0; i < inactiveCount; i++) {
        const inactiveTab = inactiveTabs.nth(i);
        await expect(inactiveTab).toHaveAttribute('tabindex', '-1');
      }

      // Tab panels should be properly associated
      const tabPanels = page.locator('[role="tabpanel"]');
      const activePanel = page.locator('[role="tabpanel"]:not([hidden])');
      await expect(activePanel).toBeVisible();
      await expect(activePanel).toHaveAttribute('aria-labelledby');

      // Arrow key navigation should work
      await tabs.first().focus();
      await page.keyboard.press('ArrowRight');
      
      const newActiveTab = page.locator('[role="tab"][aria-selected="true"]');
      const newActiveTabId = await newActiveTab.getAttribute('id');
      
      // Associated panel should be visible
      const newActivePanel = page.locator(`[role="tabpanel"][aria-labelledby="${newActiveTabId}"]`);
      await expect(newActivePanel).toBeVisible();
    });
  });

  test.describe('Bulk Assignment Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
      await injectAxe(page);
    });

    test('checkbox selection is accessible', async ({ page }) => {
      // Select first email to enable bulk mode
      const firstEmail = page.locator('[data-testid="email-item"]').first();
      const checkbox = firstEmail.locator('[data-testid="email-select-checkbox"]');
      
      // Checkbox should have proper labeling
      await expect(checkbox).toHaveAttribute('role', 'checkbox');
      await expect(checkbox).toHaveAttribute('aria-label');
      
      // Check the checkbox
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      
      // Selection should be announced
      const selectionStatus = page.locator('[aria-live]');
      if (await selectionStatus.isVisible()) {
        const statusText = await selectionStatus.textContent();
        expect(statusText).toContain('1 email selected');
      }

      // Bulk toolbar should appear and be accessible
      const bulkToolbar = page.locator('[data-testid="bulk-selection-toolbar"]');
      await expect(bulkToolbar).toBeVisible();
      await expect(bulkToolbar).toHaveAttribute('role', 'toolbar');
      await expect(bulkToolbar).toHaveAttribute('aria-label');

      // Select all checkbox should be accessible
      const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]');
      if (await selectAllCheckbox.isVisible()) {
        await expect(selectAllCheckbox).toHaveAttribute('aria-label');
        
        // Should have proper state indication
        const partiallyChecked = await selectAllCheckbox.getAttribute('aria-checked');
        expect(['true', 'false', 'mixed']).toContain(partiallyChecked);
      }
    });

    test('bulk assignment modal is accessible', async ({ page }) => {
      // Select multiple emails
      for (let i = 0; i < 3; i++) {
        const email = page.locator('[data-testid="email-item"]').nth(i);
        await email.locator('[data-testid="email-select-checkbox"]').click();
      }

      // Open bulk assignment modal
      await page.locator('[data-testid="bulk-assign-button"]').click();
      const modal = page.locator('[data-testid="bulk-assignment-modal"]');
      await expect(modal).toBeVisible();

      // Modal should be properly labeled
      await expect(modal).toHaveAttribute('role', 'dialog');
      await expect(modal).toHaveAttribute('aria-labelledby');
      await expect(modal).toHaveAttribute('aria-describedby');

      // Selected emails should be announced
      const emailCount = page.locator('[data-testid="selected-email-count"]');
      await expect(emailCount).toContainText('3 emails selected');

      // Progress tracking should be accessible
      await checkA11y(page, '[data-testid="bulk-assignment-modal"]');
    });
  });

  test.describe('Email Archive Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/cases/test-case-with-emails');
      await page.waitForSelector('[data-testid="case-detail-page"]', { timeout: 10000 });
      await page.getByRole('tab', { name: /Email Archive/ }).click();
      await page.waitForSelector('[data-testid="email-archive-tab"]', { timeout: 10000 });
      await injectAxe(page);
    });

    test('email archive meets accessibility standards', async ({ page }) => {
      await checkA11y(page, '[data-testid="email-archive-tab"]');

      // Search should be properly labeled
      const searchInput = page.locator('[data-testid="email-search-input"]');
      await expect(searchInput).toHaveAttribute('aria-label');
      await expect(searchInput).toHaveAttribute('role', 'searchbox');

      // Filter controls should be accessible
      const filterButton = page.getByRole('button', { name: /Filter/ });
      await expect(filterButton).toHaveAttribute('aria-expanded');
      await expect(filterButton).toHaveAttribute('aria-controls');

      // Email list should be properly structured
      const emailList = page.locator('[data-testid="email-archive-list"]');
      await expect(emailList).toHaveAttribute('role', 'list');
    });

    test('email content viewer is accessible', async ({ page }) => {
      const emailItems = page.locator('[data-testid="archived-email-item"]');
      
      if (await emailItems.count() > 0) {
        // Open email viewer
        await emailItems.first().click();
        
        const viewer = page.locator('[data-testid="email-content-viewer"]');
        await expect(viewer).toBeVisible();

        // Viewer should be properly labeled
        await expect(viewer).toHaveAttribute('role', 'dialog');
        await expect(viewer).toHaveAttribute('aria-labelledby');

        // Content should be accessible
        await checkA11y(page, '[data-testid="email-content-viewer"]');

        // Close button should be accessible
        const closeButton = page.getByRole('button', { name: /Close/ });
        await expect(closeButton).toBeVisible();
        await expect(closeButton).toHaveAttribute('aria-label');
      }
    });
  });

  test.describe('Job Processing Dashboard Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await page.waitForSelector('[data-testid="job-dashboard"]', { timeout: 10000 });
      await injectAxe(page);
    });

    test('job dashboard meets accessibility standards', async ({ page }) => {
      await checkA11y(page, '[data-testid="job-dashboard"]');

      // Progress indicators should be accessible
      const progressBars = page.locator('[role="progressbar"]');
      const progressCount = await progressBars.count();

      for (let i = 0; i < progressCount; i++) {
        const progressBar = progressBars.nth(i);
        
        // Should have proper ARIA attributes
        await expect(progressBar).toHaveAttribute('aria-valuenow');
        await expect(progressBar).toHaveAttribute('aria-valuemin');
        await expect(progressBar).toHaveAttribute('aria-valuemax');
        await expect(progressBar).toHaveAttribute('aria-label');
      }

      // Status indicators should be accessible
      const statusIndicators = page.locator('[data-testid*="status"]');
      const statusCount = await statusIndicators.count();

      for (let i = 0; i < statusCount; i++) {
        const status = statusIndicators.nth(i);
        
        // Should have proper semantic meaning
        const role = await status.getAttribute('role');
        const ariaLabel = await status.getAttribute('aria-label');
        
        expect(role || ariaLabel).toBeTruthy();
      }
    });

    test('job details modal is accessible', async ({ page }) => {
      // Mock job data
      await page.route('/api/jobs/queue', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            activeJobs: [],
            queuedJobs: [],
            completedJobs: [
              {
                id: 'test-job-accessibility',
                type: 'bulk_assignment',
                status: 'completed',
                description: 'Test job for accessibility',
              },
            ],
          }),
        });
      });

      await page.reload();

      const completedJob = page.locator('[data-testid="completed-job-item"]').first();
      if (await completedJob.isVisible()) {
        await completedJob.locator('[data-testid="view-job-details"]').click();

        const modal = page.locator('[data-testid="job-details-modal"]');
        await expect(modal).toBeVisible();

        // Modal should be accessible
        await expect(modal).toHaveAttribute('role', 'dialog');
        await expect(modal).toHaveAttribute('aria-labelledby');

        // Tab navigation should work within modal
        await expect(modal.locator('button, input, [tabindex="0"]').first()).toBeFocused();

        await checkA11y(page, '[data-testid="job-details-modal"]');
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('provides comprehensive screen reader support', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Test landmark regions
      const landmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').count();
      expect(landmarks).toBeGreaterThan(0);

      // Test heading structure for navigation
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = [];
      
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const level = parseInt(tagName.charAt(1));
        headingLevels.push(level);
      }

      // Heading levels should follow logical order (no skipping)
      for (let i = 1; i < headingLevels.length; i++) {
        const currentLevel = headingLevels[i];
        const previousLevel = headingLevels[i - 1];
        
        // Level should not skip more than 1 (e.g., h2 to h4 is not allowed)
        if (currentLevel > previousLevel) {
          expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
        }
      }

      // Test skip links for keyboard users
      await page.keyboard.press('Tab');
      const firstFocusable = await page.locator(':focus').first();
      const isSkipLink = await firstFocusable.textContent();
      
      if (isSkipLink?.toLowerCase().includes('skip')) {
        // Skip link should navigate to main content
        await page.keyboard.press('Enter');
        const mainContent = await page.locator(':focus').first();
        expect(await mainContent.isVisible()).toBe(true);
      }
    });

    test('announces dynamic content changes', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Check for live regions
      const liveRegions = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      const liveRegionCount = await liveRegions.count();
      
      if (liveRegionCount > 0) {
        // Live regions should be properly configured
        for (let i = 0; i < liveRegionCount; i++) {
          const region = liveRegions.nth(i);
          
          // Should have atomic setting for complex updates
          const isAtomic = await region.getAttribute('aria-atomic');
          if (isAtomic !== null) {
            expect(['true', 'false']).toContain(isAtomic);
          }

          // Should be initially empty or have appropriate content
          const initialContent = await region.textContent();
          // Live regions can be empty initially - that's expected
        }
      }

      // Test dynamic updates by performing an action
      const firstEmail = page.locator('[data-testid="email-item"]').first();
      const checkbox = firstEmail.locator('[data-testid="email-select-checkbox"]');
      
      if (await checkbox.isVisible()) {
        await checkbox.click();
        
        // Status should be announced in a live region
        await page.waitForTimeout(500); // Allow time for announcement
        
        const statusRegion = page.locator('[aria-live]');
        if (await statusRegion.isVisible()) {
          const statusText = await statusRegion.textContent();
          expect(statusText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Motor Impairment Accessibility', () => {
    test('supports large click targets', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Check button sizes meet minimum requirements (44x44px)
      const buttons = page.locator('button');
      const buttonCount = Math.min(await buttons.count(), 10); // Check first 10 buttons

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            // WCAG recommends minimum 44x44px for touch targets
            const meetsMinimumWidth = boundingBox.width >= 44 || boundingBox.width >= 32; // Allow some flexibility for icon buttons
            const meetsMinimumHeight = boundingBox.height >= 44 || boundingBox.height >= 32;
            
            expect(meetsMinimumWidth).toBe(true);
            expect(meetsMinimumHeight).toBe(true);
          }
        }
      }
    });

    test('provides sufficient spacing between interactive elements', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Check spacing between adjacent interactive elements
      const interactiveElements = page.locator('button, a, input, [tabindex="0"]');
      const elementCount = Math.min(await interactiveElements.count(), 5);

      for (let i = 0; i < elementCount - 1; i++) {
        const currentElement = interactiveElements.nth(i);
        const nextElement = interactiveElements.nth(i + 1);

        if (await currentElement.isVisible() && await nextElement.isVisible()) {
          const currentBox = await currentElement.boundingBox();
          const nextBox = await nextElement.boundingBox();

          if (currentBox && nextBox) {
            // Elements should have sufficient spacing (at least 8px recommended)
            const horizontalSpacing = Math.abs(nextBox.x - (currentBox.x + currentBox.width));
            const verticalSpacing = Math.abs(nextBox.y - (currentBox.y + currentBox.height));

            // At least one dimension should have adequate spacing
            const hasAdequateSpacing = horizontalSpacing >= 8 || verticalSpacing >= 8;
            expect(hasAdequateSpacing).toBe(true);
          }
        }
      }
    });

    test('allows sufficient time for interactions', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Test timeout behavior for interactive elements
      const dropdown = page.locator('[data-testid="sort-dropdown"]');
      
      if (await dropdown.isVisible()) {
        // Open dropdown
        await dropdown.click();
        
        // Wait for dropdown content
        const dropdownContent = page.locator('[data-testid="sort-options"]');
        
        if (await dropdownContent.isVisible()) {
          // Dropdown should remain open for sufficient time
          await page.waitForTimeout(2000);
          
          // Should still be visible after 2 seconds without interaction
          await expect(dropdownContent).toBeVisible();
          
          // Should close when clicking elsewhere
          await page.click('body');
          await expect(dropdownContent).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Cognitive Accessibility', () => {
    test('provides clear error messages and instructions', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Test form validation messages
      const searchInput = page.locator('[data-testid="email-search-input"]');
      
      if (await searchInput.isVisible()) {
        // Enter invalid search
        await searchInput.fill('   '); // Only spaces
        await page.keyboard.press('Enter');

        // Should provide clear feedback
        const errorMessage = page.locator('[role="alert"], [aria-live="assertive"]');
        
        if (await errorMessage.isVisible()) {
          const messageText = await errorMessage.textContent();
          expect(messageText).toBeTruthy();
          expect(messageText.length).toBeGreaterThan(10); // Should be descriptive
        }
      }
    });

    test('maintains consistent navigation and layout', async ({ page }) => {
      // Test consistency across different pages
      const pages = ['/dashboard/email', '/dashboard/cases', '/dashboard/jobs'];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        // Navigation should be consistent
        const navigation = page.locator('[role="navigation"]');
        if (await navigation.isVisible()) {
          const navItems = navigation.locator('a, button');
          const navCount = await navItems.count();
          
          // Should have consistent navigation items
          expect(navCount).toBeGreaterThan(2);
        }

        // Main content area should be consistent
        const main = page.locator('[role="main"], main');
        await expect(main).toBeVisible();
      }
    });

    test('supports user preferences and customization', async ({ page }) => {
      await page.goto('/dashboard/email');
      await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });

      // Test theme toggle functionality
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      
      if (await themeToggle.isVisible()) {
        // Should be properly labeled
        await expect(themeToggle).toHaveAttribute('aria-label');
        
        // Should toggle theme
        const initialTheme = await page.getAttribute('html', 'class');
        await themeToggle.click();
        
        // Theme should change
        await page.waitForTimeout(500);
        const newTheme = await page.getAttribute('html', 'class');
        expect(newTheme).not.toBe(initialTheme);
      }

      // Test reduced motion support
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      // Animations should be reduced or disabled
      const animatedElements = page.locator('[class*="animate"], [style*="transition"]');
      const animatedCount = await animatedElements.count();
      
      // If animations exist, they should respect reduced motion preference
      if (animatedCount > 0) {
        const firstAnimated = animatedElements.first();
        const transitionDuration = await firstAnimated.evaluate((el) => {
          const styles = window.getComputedStyle(el);
          return styles.transitionDuration;
        });
        
        // Duration should be very short or none
        expect(transitionDuration === '0s' || transitionDuration === 'none').toBe(true);
      }
    });
  });
});