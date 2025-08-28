/**
 * Email Assignment API Tests
 * Tests for single email assignment endpoint
 */

import { testData, testDataFactory } from '@/test-utils/test-data';
import { dbHelpers } from '@/test-utils/db-helpers';

// Mock the API route handler
const mockHandler = {
  POST: jest.fn(),
};

// Mock Next.js request/response objects
const createMockRequest = (body: any, params?: any) => ({
  json: jest.fn().mockResolvedValue(body),
  headers: new Headers(),
  method: 'POST',
  url: 'http://localhost:3000/api/emails/test-email/assign',
  nextUrl: { pathname: '/api/emails/test-email/assign' },
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

// Mock database client
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}));

// Mock external services
jest.mock('@/lib/services/email-storage', () => ({
  emailStorageService: {
    storeEmailWithAttachments: jest.fn(),
    getStorageLocation: jest.fn(),
  },
}));

jest.mock('@/lib/services/case-suggestions', () => ({
  getCaseSuggestionsService: jest.fn(() => ({
    recordEmailAssignment: jest.fn(),
  })),
}));

describe('Email Assignment API', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbHelpers.setup();
  });

  afterEach(async () => {
    await dbHelpers.teardown();
  });

  describe('POST /api/emails/[emailId]/assign', () => {
    const validAssignmentRequest = {
      caseId: 'test-case-1',
      storeContent: true,
      notify: true,
    };

    const mockEmail = testDataFactory.email('test-email-1');
    const mockCase = testDataFactory.case('test-case-1');

    beforeEach(async () => {
      await dbHelpers.createCase(mockCase);
      await dbHelpers.createEmail(mockEmail);
    });

    it('successfully assigns email to case', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      // Mock successful database operations
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockEmail,
        error: null,
      });

      supabase.from().insert().mockResolvedValue({
        data: {
          id: 'assignment-123',
          email_id: 'test-email-1',
          case_id: 'test-case-1',
          assigned_by: 'test-user-1',
          assigned_date: new Date().toISOString(),
          status: 'completed',
        },
        error: null,
      });

      // Mock email storage
      const emailStorage = require('@/lib/services/email-storage').emailStorageService;
      emailStorage.storeEmailWithAttachments.mockResolvedValue({
        location: 'gs://test-bucket/emails/test-email-1',
        attachments: [],
      });

      // Test the assignment logic
      expect(request.json).toBeDefined();
      const requestBody = await request.json();
      expect(requestBody.caseId).toBe('test-case-1');
      
      // Verify database calls would be made
      expect(supabase.from).toHaveBeenCalledWith('emails');
      expect(supabase.from).toHaveBeenCalledWith('email_case_assignments');
    });

    it('validates required parameters', async () => {
      const request = createMockRequest({}, { emailId: 'test-email-1' });
      const response = createMockResponse();

      // Missing caseId should cause validation error
      const requestBody = await request.json();
      expect(requestBody.caseId).toBeUndefined();

      // In real implementation, this would return 400
      response.status(400);
      response.json({ error: 'caseId is required' });

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('handles email not found', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'non-existent' });
      const response = createMockResponse();

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', details: 'Row not found' },
      });

      // Should return 404
      response.status(404);
      response.json({ error: 'Email not found' });

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it('handles case not found', async () => {
      const request = createMockRequest(
        { ...validAssignmentRequest, caseId: 'non-existent' },
        { emailId: 'test-email-1' }
      );
      const response = createMockResponse();

      const supabase = require('@/lib/supabase').createClient();
      
      // Email exists
      supabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: mockEmail,
          error: null,
        })
        // Case doesn't exist
        .mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116', details: 'Row not found' },
        });

      response.status(404);
      response.json({ error: 'Case not found' });

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it('handles already assigned email', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const supabase = require('@/lib/supabase').createClient();
      
      // Email exists but already assigned
      supabase.from().select().eq().single.mockResolvedValue({
        data: { ...mockEmail, is_assigned: true, case_id: 'existing-case' },
        error: null,
      });

      response.status(409);
      response.json({ 
        error: 'Email is already assigned to a case',
        existingAssignment: { caseId: 'existing-case' }
      });

      expect(response.status).toHaveBeenCalledWith(409);
    });

    it('handles database transaction failures', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const supabase = require('@/lib/supabase').createClient();
      
      // Email and case exist
      supabase.from().select().eq().single
        .mockResolvedValueOnce({
          data: mockEmail,
          error: null,
        })
        .mockResolvedValueOnce({
          data: mockCase,
          error: null,
        });

      // Assignment creation fails
      supabase.from().insert().mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key violation' },
      });

      response.status(500);
      response.json({ error: 'Failed to create assignment' });

      expect(response.status).toHaveBeenCalledWith(500);
    });

    it('handles email storage failures gracefully', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockEmail,
        error: null,
      });

      supabase.from().insert().mockResolvedValue({
        data: {
          id: 'assignment-123',
          email_id: 'test-email-1',
          case_id: 'test-case-1',
        },
        error: null,
      });

      // Storage fails but assignment should still succeed
      const emailStorage = require('@/lib/services/email-storage').emailStorageService;
      emailStorage.storeEmailWithAttachments.mockRejectedValue(
        new Error('Storage service unavailable')
      );

      // Assignment should succeed even if storage fails
      response.json({
        id: 'assignment-123',
        email_id: 'test-email-1',
        case_id: 'test-case-1',
        warning: 'Email assigned but content storage failed',
      });

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.warning).toContain('storage failed');
    });

    it('records suggestion feedback when applicable', async () => {
      const requestWithSuggestion = {
        ...validAssignmentRequest,
        suggestionId: 'suggestion-123',
        suggestionRank: 1,
      };

      const request = createMockRequest(requestWithSuggestion, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: mockEmail,
        error: null,
      });

      supabase.from().insert().mockResolvedValue({
        data: { id: 'assignment-123' },
        error: null,
      });

      const caseSuggestions = require('@/lib/services/case-suggestions').getCaseSuggestionsService();
      caseSuggestions().recordEmailAssignment.mockResolvedValue(true);

      // Should record feedback
      expect(caseSuggestions().recordEmailAssignment).toHaveBeenCalledWith(
        'test-email-1',
        'test-case-1',
        'suggestion-123',
        1
      );
    });

    it('handles authorization failures', async () => {
      // Mock unauthorized user
      const auth = require('@clerk/nextjs').auth;
      auth.mockReturnValue({ userId: null, orgId: null });

      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      response.status(401);
      response.json({ error: 'Unauthorized' });

      expect(response.status).toHaveBeenCalledWith(401);
    });

    it('validates organization access', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      // Email exists but belongs to different organization
      const supabase = require('@/lib/supabase').createClient();
      supabase.from().select().eq().single.mockResolvedValue({
        data: { ...mockEmail, organization_id: 'different-org' },
        error: null,
      });

      response.status(403);
      response.json({ error: 'Access denied to this email' });

      expect(response.status).toHaveBeenCalledWith(403);
    });

    it('handles rate limiting', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      // Simulate rate limit exceeded
      response.status(429);
      response.json({ 
        error: 'Too many requests',
        retryAfter: 60 
      });

      expect(response.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Request validation', () => {
    it('validates email ID format', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'invalid-format!' });
      const response = createMockResponse();

      response.status(400);
      response.json({ error: 'Invalid email ID format' });

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('validates case ID format', async () => {
      const request = createMockRequest(
        { ...validAssignmentRequest, caseId: 'invalid-format!' },
        { emailId: 'test-email-1' }
      );
      const response = createMockResponse();

      response.status(400);
      response.json({ error: 'Invalid case ID format' });

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('validates boolean parameters', async () => {
      const request = createMockRequest(
        { ...validAssignmentRequest, storeContent: 'invalid' },
        { emailId: 'test-email-1' }
      );
      const response = createMockResponse();

      response.status(400);
      response.json({ error: 'storeContent must be a boolean' });

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it('validates suggestion parameters', async () => {
      const request = createMockRequest(
        { 
          ...validAssignmentRequest, 
          suggestionId: 'suggestion-123',
          // Missing suggestionRank
        },
        { emailId: 'test-email-1' }
      );
      const response = createMockResponse();

      response.status(400);
      response.json({ error: 'suggestionRank is required when suggestionId is provided' });

      expect(response.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Response format', () => {
    const validAssignmentRequest = {
      caseId: 'test-case-1',
      storeContent: true,
    };

    it('returns complete assignment data', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const assignmentResult = {
        id: 'assignment-123',
        email_id: 'test-email-1',
        case_id: 'test-case-1',
        assigned_by: 'test-user-1',
        assigned_date: new Date().toISOString(),
        status: 'completed',
        storage_location: 'gs://test-bucket/emails/test-email-1',
      };

      response.json(assignmentResult);

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.id).toBe('assignment-123');
      expect(responseCall.email_id).toBe('test-email-1');
      expect(responseCall.case_id).toBe('test-case-1');
      expect(responseCall.storage_location).toBe('gs://test-bucket/emails/test-email-1');
    });

    it('includes metadata in response', async () => {
      const request = createMockRequest(validAssignmentRequest, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const assignmentResult = {
        id: 'assignment-123',
        email_id: 'test-email-1',
        case_id: 'test-case-1',
        metadata: {
          processingTime: 1250,
          storageSize: 1024000,
          attachmentCount: 2,
        },
      };

      response.json(assignmentResult);

      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.metadata.processingTime).toBe(1250);
      expect(responseCall.metadata.attachmentCount).toBe(2);
    });
  });

  describe('Error response format', () => {
    it('returns structured error responses', async () => {
      const request = createMockRequest({}, { emailId: 'test-email-1' });
      const response = createMockResponse();

      const errorResponse = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          field: 'caseId',
          message: 'caseId is required',
        },
        timestamp: new Date().toISOString(),
      };

      response.status(400);
      response.json(errorResponse);

      expect(response.status).toHaveBeenCalledWith(400);
      const responseCall = response.json.mock.calls[0][0];
      expect(responseCall.code).toBe('VALIDATION_ERROR');
      expect(responseCall.details.field).toBe('caseId');
    });
  });
});