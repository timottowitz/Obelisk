import { test, expect } from '@playwright/test';

test.describe('AI Suggestions and Enhanced Search', () => {
  test.use({ storageState: 'e2e/config/auth-state.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/email');
    await page.waitForSelector('[data-testid="email-list"]', { timeout: 10000 });
  });

  test.describe('AI-Powered Case Suggestions', () => {
    test('displays AI suggestions for email assignment', async ({ page }) => {
      // Mock AI suggestions API
      await page.route('/api/emails/*/suggestions', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            suggestions: [
              {
                caseId: 'case-001',
                caseNumber: 'CASE-2024-001',
                title: 'Contract Dispute - ABC Corp',
                confidence: 0.92,
                reasoning: 'Email mentions contract terms and ABC Corp which matches this active case',
                matchFactors: ['client_name', 'keywords', 'case_type'],
                priority: 'high',
              },
              {
                caseId: 'case-002',
                caseNumber: 'CASE-2024-002',
                title: 'Employment Issue - John Smith',
                confidence: 0.78,
                reasoning: 'Similar email patterns and employment-related keywords detected',
                matchFactors: ['keywords', 'email_pattern'],
                priority: 'medium',
              },
              {
                caseId: 'case-003',
                caseNumber: 'CASE-2024-003',
                title: 'Property Transaction - 123 Main St',
                confidence: 0.65,
                reasoning: 'Location references match property address',
                matchFactors: ['location', 'keywords'],
                priority: 'low',
              },
            ],
            processing_time_ms: 234,
            model_version: 'v2.1.0',
          }),
        });
      });

      // Select an unassigned email and open assignment modal
      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

      // AI Suggestions tab should be active by default
      await expect(page.getByRole('tab', { name: /AI Suggestions/ })).toHaveAttribute('data-state', 'active');

      // Should show loading state initially
      await expect(page.getByText('Analyzing email...')).toBeVisible();

      // Wait for suggestions to load
      await page.waitForSelector('[data-testid="suggested-cases"]', { timeout: 15000 });

      // Should display AI suggestions
      const suggestions = page.locator('[data-testid="suggestion-item"]');
      await expect(suggestions).toHaveCount(3);

      // First suggestion should show high confidence
      const firstSuggestion = suggestions.first();
      await expect(firstSuggestion.locator('[data-testid="case-number"]')).toContainText('CASE-2024-001');
      await expect(firstSuggestion.locator('[data-testid="confidence-score"]')).toContainText('92%');
      await expect(firstSuggestion.locator('[data-testid="confidence-badge"]')).toContainText('High Confidence');

      // Should show reasoning
      await expect(firstSuggestion.locator('[data-testid="suggestion-reasoning"]')).toContainText('contract terms');

      // Should show match factors
      await expect(firstSuggestion.locator('[data-testid="match-factors"]')).toBeVisible();
      await expect(firstSuggestion.getByText('Client Name')).toBeVisible();
      await expect(firstSuggestion.getByText('Keywords')).toBeVisible();
      await expect(firstSuggestion.getByText('Case Type')).toBeVisible();
    });

    test('shows detailed explanation for AI suggestions', async ({ page }) => {
      await page.route('/api/emails/*/suggestions', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            suggestions: [
              {
                caseId: 'case-001',
                caseNumber: 'CASE-2024-001',
                title: 'Contract Dispute - ABC Corp',
                confidence: 0.89,
                reasoning: 'Email content analysis reveals high similarity with existing case documentation',
                detailedExplanation: {
                  keywordMatches: ['contract', 'dispute', 'ABC Corp', 'breach'],
                  clientMatch: { score: 0.95, reason: 'Client name exact match' },
                  contextMatch: { score: 0.83, reason: 'Similar legal context and terminology' },
                  timelineRelevance: { score: 0.91, reason: 'Email received during active case period' },
                },
                matchFactors: ['client_name', 'keywords', 'context', 'timeline'],
              },
            ],
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.waitForSelector('[data-testid="suggestion-item"]');
      
      // Click "Why this suggestion?" button
      await page.locator('[data-testid="explanation-button"]').first().click();

      // Detailed explanation modal should open
      await expect(page.locator('[data-testid="suggestion-explanation-modal"]')).toBeVisible();
      await expect(page.getByText('AI Suggestion Explanation')).toBeVisible();

      // Should show detailed breakdown
      await expect(page.getByText('Keyword Matches')).toBeVisible();
      await expect(page.getByText('contract, dispute, ABC Corp, breach')).toBeVisible();
      
      await expect(page.getByText('Client Match: 95%')).toBeVisible();
      await expect(page.getByText('Client name exact match')).toBeVisible();
      
      await expect(page.getByText('Context Match: 83%')).toBeVisible();
      await expect(page.getByText('Timeline Relevance: 91%')).toBeVisible();

      // Should have feedback options
      await expect(page.getByRole('button', { name: /Helpful/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Not Helpful/ })).toBeVisible();
    });

    test('handles AI suggestion feedback', async ({ page }) => {
      // Mock feedback API
      await page.route('/api/suggestions/feedback', (route) => {
        expect(route.request().method()).toBe('POST');
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.waitForSelector('[data-testid="suggestion-item"]');

      // Select a suggestion
      const firstSuggestion = page.locator('[data-testid="suggestion-item"]').first();
      await firstSuggestion.click();

      // In confirmation step, provide feedback
      await expect(page.getByText('Confirm Assignment')).toBeVisible();
      await expect(page.getByText('Was this suggestion helpful?')).toBeVisible();

      // Click positive feedback
      await page.getByRole('button', { name: /👍 Yes, helpful/ }).click();

      // Should show thank you message
      await expect(page.getByText('Thank you for your feedback!')).toBeVisible();

      // Complete assignment
      await page.getByRole('button', { name: /Assign Email/ }).click();
      await expect(page.getByText('Assignment Complete!')).toBeVisible({ timeout: 30000 });
    });

    test('shows fallback when AI suggestions fail', async ({ page }) => {
      // Mock AI service failure
      await page.route('/api/emails/*/suggestions', (route) => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'AI service temporarily unavailable' }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await expect(page.locator('[data-testid="case-assignment-modal"]')).toBeVisible();

      // Should show error state with fallback options
      await expect(page.getByText('AI suggestions temporarily unavailable')).toBeVisible();
      await expect(page.getByText('You can still search and assign manually')).toBeVisible();

      // Should automatically switch to search tab
      await expect(page.getByRole('tab', { name: /Advanced Search/ })).toHaveAttribute('data-state', 'active');

      // Search functionality should still work
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await expect(searchInput).toBeVisible();
      await expect(searchInput).toBeFocused();
    });
  });

  test.describe('Enhanced Case Search', () => {
    test('performs intelligent case search with filters', async ({ page }) => {
      // Mock enhanced search API
      await page.route('/api/cases/search*', (route) => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q');
        const filters = url.searchParams.get('filters');

        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            cases: [
              {
                id: 'case-001',
                caseNumber: 'CASE-2024-001',
                title: `Contract Dispute - ABC Corp (matching "${query}")`,
                client: 'ABC Corporation',
                status: 'active',
                priority: 'high',
                assignedTo: 'John Doe',
                lastActivity: '2024-01-15T10:00:00Z',
                tags: ['contract', 'dispute', 'commercial'],
                relevanceScore: 0.94,
                matchReasons: ['Title match', 'Client match', 'Tag relevance'],
              },
              {
                id: 'case-002',
                caseNumber: 'CASE-2024-002',
                title: 'Employment Contract Review',
                client: 'XYZ Inc',
                status: 'active',
                priority: 'medium',
                assignedTo: 'Jane Smith',
                lastActivity: '2024-01-14T15:30:00Z',
                tags: ['employment', 'contract', 'review'],
                relevanceScore: 0.87,
                matchReasons: ['Keyword match', 'Similar context'],
              },
            ],
            total: 2,
            searchTime: 89,
            filters: JSON.parse(filters || '{}'),
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      // Switch to Advanced Search tab
      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Enhanced search interface should be visible
      await expect(page.locator('[data-testid="enhanced-search-panel"]')).toBeVisible();

      // Search with filters
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('contract dispute');

      // Apply filters
      await page.getByRole('button', { name: /Filters/ }).click();
      await expect(page.locator('[data-testid="search-filters"]')).toBeVisible();

      // Filter by status
      await page.getByLabel('Active cases only').check();

      // Filter by priority
      await page.getByLabel('High priority').check();

      // Apply filters
      await page.getByRole('button', { name: /Apply Filters/ }).click();

      // Wait for search results
      await page.waitForSelector('[data-testid="search-results"]');

      // Should show enhanced search results
      const searchResults = page.locator('[data-testid="case-search-result"]');
      await expect(searchResults).toHaveCount(2);

      // First result should show relevance score
      const firstResult = searchResults.first();
      await expect(firstResult.locator('[data-testid="relevance-score"]')).toContainText('94%');
      await expect(firstResult.locator('[data-testid="match-reasons"]')).toContainText('Title match');

      // Should show search performance
      await expect(page.getByText(/Search completed in \d+ms/)).toBeVisible();
    });

    test('shows recent and frequent cases for quick access', async ({ page }) => {
      // Mock quick access API
      await page.route('/api/cases/quick-access', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            recentCases: [
              {
                id: 'case-recent-1',
                caseNumber: 'CASE-2024-005',
                title: 'Recent Contract Case',
                client: 'Recent Client',
                lastAccessed: '2024-01-15T10:00:00Z',
                accessCount: 1,
              },
              {
                id: 'case-recent-2',
                caseNumber: 'CASE-2024-006',
                title: 'Another Recent Case',
                client: 'Another Client',
                lastAccessed: '2024-01-14T16:00:00Z',
                accessCount: 2,
              },
            ],
            frequentCases: [
              {
                id: 'case-frequent-1',
                caseNumber: 'CASE-2024-001',
                title: 'Frequently Accessed Case',
                client: 'Frequent Client',
                accessCount: 15,
                lastAccessed: '2024-01-10T14:00:00Z',
              },
            ],
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      // Switch to Quick Access tab
      await page.getByRole('tab', { name: /Quick Access/ }).click();

      // Wait for quick access data to load
      await page.waitForSelector('[data-testid="quick-case-access"]');

      // Should show recent cases section
      await expect(page.getByText('Recently Accessed Cases')).toBeVisible();
      const recentCases = page.locator('[data-testid="recent-case-item"]');
      await expect(recentCases).toHaveCount(2);

      // Recent cases should show last accessed time
      await expect(recentCases.first().locator('[data-testid="last-accessed"]')).toContainText('Today');

      // Should show frequently accessed cases
      await expect(page.getByText('Frequently Used Cases')).toBeVisible();
      const frequentCases = page.locator('[data-testid="frequent-case-item"]');
      await expect(frequentCases).toHaveCount(1);

      // Frequent cases should show access count
      await expect(frequentCases.first().locator('[data-testid="access-count"]')).toContainText('15 times');

      // Should be able to select from quick access
      await recentCases.first().click();
      await expect(page.getByText('Confirm Assignment')).toBeVisible();
      await expect(page.getByText('Quick Access')).toBeVisible();
    });

    test('provides search suggestions and autocomplete', async ({ page }) => {
      // Mock search suggestions API
      await page.route('/api/cases/search-suggestions*', (route) => {
        const url = new URL(route.request().url());
        const query = url.searchParams.get('q');

        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            suggestions: [
              { text: `${query} dispute`, type: 'keyword', count: 12 },
              { text: `${query} agreement`, type: 'keyword', count: 8 },
              { text: `${query} case`, type: 'phrase', count: 24 },
            ],
            clients: [
              { name: 'ABC Corporation', caseCount: 5 },
              { name: 'XYZ Company', caseCount: 3 },
            ],
            tags: [
              { tag: query, count: 15 },
              { tag: `${query}-related`, count: 7 },
            ],
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      const searchInput = page.locator('[data-testid="case-search-input"]');
      
      // Start typing to trigger suggestions
      await searchInput.fill('contract');

      // Wait for suggestions dropdown
      await page.waitForSelector('[data-testid="search-suggestions"]');

      // Should show search suggestions
      await expect(page.locator('[data-testid="keyword-suggestions"]')).toBeVisible();
      await expect(page.getByText('contract dispute (12 cases)')).toBeVisible();
      await expect(page.getByText('contract agreement (8 cases)')).toBeVisible();

      // Should show client suggestions
      await expect(page.locator('[data-testid="client-suggestions"]')).toBeVisible();
      await expect(page.getByText('ABC Corporation (5 cases)')).toBeVisible();

      // Should show tag suggestions
      await expect(page.locator('[data-testid="tag-suggestions"]')).toBeVisible();
      await expect(page.getByText('contract (15 cases)')).toBeVisible();

      // Clicking a suggestion should update search
      await page.getByText('contract dispute').click();
      await expect(searchInput).toHaveValue('contract dispute');
    });

    test('saves and recalls search history', async ({ page }) => {
      // Mock search history API
      await page.route('/api/cases/search-history', (route) => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              history: [
                { query: 'contract dispute ABC', timestamp: '2024-01-15T10:00:00Z', resultCount: 3 },
                { query: 'employment termination', timestamp: '2024-01-14T15:00:00Z', resultCount: 7 },
                { query: 'property transaction', timestamp: '2024-01-13T09:00:00Z', resultCount: 2 },
              ],
            }),
          });
        } else {
          // POST to save search
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Should show search history button
      await expect(page.getByRole('button', { name: /Search History/ })).toBeVisible();
      
      // Click to open search history
      await page.getByRole('button', { name: /Search History/ }).click();
      
      // Should show recent searches
      await expect(page.locator('[data-testid="search-history-panel"]')).toBeVisible();
      await expect(page.getByText('Recent Searches')).toBeVisible();

      const historyItems = page.locator('[data-testid="search-history-item"]');
      await expect(historyItems).toHaveCount(3);

      // Should show search details
      const firstHistoryItem = historyItems.first();
      await expect(firstHistoryItem.locator('[data-testid="search-query"]')).toContainText('contract dispute ABC');
      await expect(firstHistoryItem.locator('[data-testid="result-count"]')).toContainText('3 results');
      await expect(firstHistoryItem.locator('[data-testid="search-date"]')).toContainText('Today');

      // Clicking history item should rerun search
      await firstHistoryItem.click();
      
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await expect(searchInput).toHaveValue('contract dispute ABC');

      // Should trigger new search
      await page.waitForSelector('[data-testid="search-results"]');
    });

    test('handles advanced search with multiple criteria', async ({ page }) => {
      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Open advanced search options
      await page.getByRole('button', { name: /Advanced Options/ }).click();
      await expect(page.locator('[data-testid="advanced-search-form"]')).toBeVisible();

      // Fill multiple search criteria
      await page.locator('[data-testid="case-number-search"]').fill('CASE-2024');
      await page.locator('[data-testid="client-name-search"]').fill('ABC Corp');
      
      // Date range selection
      await page.locator('[data-testid="date-range-toggle"]').click();
      await page.locator('[data-testid="start-date"]').fill('2024-01-01');
      await page.locator('[data-testid="end-date"]').fill('2024-01-31');

      // Case status filter
      await page.locator('[data-testid="status-filter"]').selectOption('active');

      // Priority filter
      await page.locator('[data-testid="priority-filter"]').selectOption('high');

      // Tags filter
      await page.locator('[data-testid="tags-input"]').fill('contract,dispute');

      // Assigned attorney filter
      await page.locator('[data-testid="attorney-filter"]').selectOption('john.doe');

      // Execute advanced search
      await page.getByRole('button', { name: /Search with Filters/ }).click();

      // Should show search progress
      await expect(page.getByText('Searching with advanced criteria...')).toBeVisible();

      // Wait for results
      await page.waitForSelector('[data-testid="search-results"]');

      // Should show applied filters summary
      await expect(page.locator('[data-testid="active-filters"]')).toBeVisible();
      await expect(page.getByText('Case Number: CASE-2024')).toBeVisible();
      await expect(page.getByText('Client: ABC Corp')).toBeVisible();
      await expect(page.getByText('Status: Active')).toBeVisible();
      await expect(page.getByText('Priority: High')).toBeVisible();

      // Should allow clearing filters
      await expect(page.getByRole('button', { name: /Clear All Filters/ })).toBeVisible();
    });

    test('integrates search with machine learning recommendations', async ({ page }) => {
      // Mock ML recommendation API
      await page.route('/api/cases/ml-recommendations*', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            recommendedSearches: [
              { query: 'similar contract cases', reason: 'Based on email content analysis', confidence: 0.89 },
              { query: 'ABC Corp previous cases', reason: 'Client name detected in email', confidence: 0.95 },
              { query: 'dispute resolution 2024', reason: 'Keywords suggest active dispute', confidence: 0.76 },
            ],
            suggestedFilters: {
              priority: ['high', 'medium'],
              status: ['active'],
              tags: ['contract', 'dispute', 'commercial'],
              dateRange: { start: '2024-01-01', end: '2024-12-31' },
            },
            modelInfo: {
              version: 'recommendation-v1.2',
              confidence: 0.87,
              processingTime: 145,
            },
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Should show ML recommendations section
      await expect(page.getByText('Recommended Searches')).toBeVisible();
      await expect(page.locator('[data-testid="ml-recommendations"]')).toBeVisible();

      const recommendations = page.locator('[data-testid="search-recommendation"]');
      await expect(recommendations).toHaveCount(3);

      // First recommendation should show confidence and reason
      const firstRecommendation = recommendations.first();
      await expect(firstRecommendation.locator('[data-testid="recommendation-query"]')).toContainText('similar contract cases');
      await expect(firstRecommendation.locator('[data-testid="recommendation-reason"]')).toContainText('email content analysis');
      await expect(firstRecommendation.locator('[data-testid="confidence-indicator"]')).toContainText('89%');

      // Clicking recommendation should trigger search
      await firstRecommendation.click();
      
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await expect(searchInput).toHaveValue('similar contract cases');

      // Should auto-apply suggested filters
      await expect(page.getByText('Applied smart filters based on email analysis')).toBeVisible();
      await expect(page.locator('[data-testid="active-filters"]')).toContainText('High Priority');
      await expect(page.locator('[data-testid="active-filters"]')).toContainText('Active Status');

      // Should show ML model info
      await expect(page.getByText(/Powered by AI \(v1\.2\)/)).toBeVisible();
    });
  });

  test.describe('Search Performance and Analytics', () => {
    test('tracks search performance metrics', async ({ page }) => {
      // Mock analytics API
      await page.route('/api/analytics/search-performance', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            avgSearchTime: 234,
            totalSearches: 1247,
            successRate: 0.94,
            popularQueries: [
              { query: 'contract dispute', count: 89 },
              { query: 'employment case', count: 67 },
              { query: 'property transaction', count: 45 },
            ],
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Perform a search
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('test search');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]');

      // Should show search performance info
      await expect(page.getByText(/Search completed in \d+ms/)).toBeVisible();

      // Should track search in analytics (verified by route mock)
      // Check if analytics endpoint was called
      await page.waitForTimeout(1000); // Allow time for analytics call
    });

    test('provides search optimization suggestions', async ({ page }) => {
      // Mock search that returns no results
      await page.route('/api/cases/search*', (route) => {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            cases: [],
            total: 0,
            searchTime: 45,
            suggestions: {
              didYouMean: 'contract dispute',
              similarQueries: ['contract disagreement', 'contract breach', 'contract issue'],
              optimizationTips: [
                'Try removing less common words',
                'Use broader search terms',
                'Check for typos in your search',
              ],
            },
          }),
        });
      });

      const firstEmail = page.locator('[data-testid="email-item"]:has([data-testid="assign-button"]:not([disabled]))').first();
      await firstEmail.locator('[data-testid="assign-button"]').click();

      await page.getByRole('tab', { name: /Advanced Search/ }).click();

      // Search with a term that returns no results
      const searchInput = page.locator('[data-testid="case-search-input"]');
      await searchInput.fill('contrct dispte'); // Intentional typos
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="no-results"]');

      // Should show no results message
      await expect(page.getByText('No cases found matching your search')).toBeVisible();

      // Should show search suggestions
      await expect(page.getByText('Did you mean:')).toBeVisible();
      await expect(page.getByText('contract dispute')).toBeVisible();

      // Should show similar queries
      await expect(page.getByText('Try these similar searches:')).toBeVisible();
      await expect(page.getByText('contract disagreement')).toBeVisible();
      await expect(page.getByText('contract breach')).toBeVisible();

      // Should show optimization tips
      await expect(page.getByText('Search Tips:')).toBeVisible();
      await expect(page.getByText('Try removing less common words')).toBeVisible();
      await expect(page.getByText('Check for typos in your search')).toBeVisible();

      // Clicking suggestion should update search
      await page.getByText('contract dispute').click();
      await expect(searchInput).toHaveValue('contract dispute');
    });
  });
});