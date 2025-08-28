import { http, HttpResponse } from 'msw';
import { testData } from '../test-data';

export const handlers = [
  // Email assignment endpoints
  http.post('/api/emails/:emailId/assign', ({ request, params }) => {
    const { emailId } = params;
    return HttpResponse.json({
      id: `assignment-${Date.now()}`,
      emailId,
      caseId: 'case-123',
      assignedBy: 'user-123',
      assignedDate: new Date().toISOString(),
      status: 'completed',
      storageLocation: 'gs://test-bucket/emails/email-123',
    });
  }),

  // Bulk assignment endpoint
  http.post('/api/emails/bulk-assign', async ({ request }) => {
    const body = await request.json() as { emailIds: string[]; caseId: string };
    return HttpResponse.json({
      jobId: `job-${Date.now()}`,
      status: 'started',
      totalEmails: body.emailIds.length,
      processedCount: 0,
      failedCount: 0,
      estimatedCompletion: new Date(Date.now() + 30000).toISOString(),
    });
  }),

  // Case search endpoints
  http.get('/api/cases/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '10');
    
    return HttpResponse.json({
      cases: testData.mockCases.slice(0, limit),
      total: testData.mockCases.length,
      hasMore: testData.mockCases.length > limit,
    });
  }),

  // Email suggestions endpoint
  http.get('/api/emails/:emailId/suggestions', ({ params }) => {
    return HttpResponse.json({
      suggestions: testData.mockSuggestions,
      totalCount: testData.mockSuggestions.length,
      analysisResult: testData.mockEmailAnalysis,
    });
  }),

  // Job monitoring endpoints
  http.get('/api/jobs/:jobId', ({ params }) => {
    const { jobId } = params;
    return HttpResponse.json({
      id: jobId,
      type: 'bulk_email_assignment',
      status: 'in_progress',
      progress: 0.5,
      totalItems: 10,
      processedItems: 5,
      failedItems: 0,
      startedAt: new Date(Date.now() - 15000).toISOString(),
      estimatedCompletion: new Date(Date.now() + 15000).toISOString(),
    });
  }),

  // Email content storage
  http.post('/api/emails/bulk-store', async ({ request }) => {
    const body = await request.json() as { emailIds: string[] };
    return HttpResponse.json({
      jobId: `storage-job-${Date.now()}`,
      status: 'started',
      totalEmails: body.emailIds.length,
    });
  }),

  // Suggestion feedback endpoint
  http.post('/api/suggestions/feedback', async ({ request }) => {
    return HttpResponse.json({ success: true });
  }),

  // Microsoft Graph API mock
  http.get('https://graph.microsoft.com/v1.0/me/messages', () => {
    return HttpResponse.json({
      value: testData.mockEmails,
      '@odata.nextLink': null,
    });
  }),

  // Error scenarios for testing
  http.post('/api/emails/error-test/assign', () => {
    return HttpResponse.json(
      { error: 'Test error: Assignment failed' },
      { status: 500 }
    );
  }),

  http.get('/api/cases/search-error', () => {
    return HttpResponse.json(
      { error: 'Search service unavailable' },
      { status: 503 }
    );
  }),

  // Network timeout simulation
  http.post('/api/emails/timeout-test/assign', () => {
    return new Promise(() => {}); // Never resolves, simulates timeout
  }),
];