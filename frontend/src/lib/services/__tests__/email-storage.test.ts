/**
 * Email Storage Service Tests
 * Tests for Google Cloud Storage integration and email content management
 */

import { emailStorageService } from '../email-storage';
import { testData, testDataFactory } from '@/test-utils/test-data';

// Mock Google Cloud Storage
jest.mock('@google-cloud/storage', () => {
  const mockBucket = {
    file: jest.fn(() => ({
      save: jest.fn(),
      download: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      getMetadata: jest.fn(),
      createWriteStream: jest.fn(),
      createReadStream: jest.fn(),
    })),
    upload: jest.fn(),
    getFiles: jest.fn(),
  };

  const mockStorage = {
    bucket: jest.fn(() => mockBucket),
  };

  return {
    Storage: jest.fn(() => mockStorage),
  };
});

// Mock mailparser for email parsing
jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

// Mock environment variables
process.env.GOOGLE_CLOUD_PROJECT_ID = 'test-project';
process.env.GOOGLE_CLOUD_STORAGE_BUCKET = 'test-email-storage';

describe('Email Storage Service', () => {
  const mockStorage = require('@google-cloud/storage').Storage();
  const mockBucket = mockStorage.bucket();
  const mockFile = mockBucket.file();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeEmailWithAttachments', () => {
    const mockEmail = testDataFactory.email();
    
    it('stores email content successfully', async () => {
      mockFile.save.mockResolvedValue([]);
      mockFile.exists.mockResolvedValue([true]);

      const result = await emailStorageService.storeEmailWithAttachments(mockEmail);

      expect(result).toEqual({
        location: expect.stringContaining(`emails/${mockEmail.id}/content.json`),
        attachments: [],
        size: expect.any(Number),
        timestamp: expect.any(String),
      });

      expect(mockFile.save).toHaveBeenCalledWith(
        expect.stringContaining(mockEmail.subject),
        expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: 'application/json',
          }),
        })
      );
    });

    it('stores email with attachments', async () => {
      const emailWithAttachments = {
        ...mockEmail,
        hasAttachments: true,
        attachments: [
          {
            id: 'attachment-1',
            name: 'document.pdf',
            contentType: 'application/pdf',
            size: 1024000,
            content: Buffer.from('PDF content'),
          },
          {
            id: 'attachment-2',
            name: 'image.jpg',
            contentType: 'image/jpeg',
            size: 512000,
            content: Buffer.from('JPEG content'),
          },
        ],
      };

      mockFile.save.mockResolvedValue([]);
      mockFile.exists.mockResolvedValue([true]);

      const result = await emailStorageService.storeEmailWithAttachments(emailWithAttachments);

      expect(result.attachments).toHaveLength(2);
      expect(result.attachments[0]).toEqual({
        id: 'attachment-1',
        name: 'document.pdf',
        location: expect.stringContaining('attachments/attachment-1'),
        size: 1024000,
        contentType: 'application/pdf',
      });

      // Should save email content + 2 attachments = 3 saves total
      expect(mockFile.save).toHaveBeenCalledTimes(3);
    });

    it('handles large email content efficiently', async () => {
      const largeEmail = {
        ...mockEmail,
        body: 'x'.repeat(10 * 1024 * 1024), // 10MB content
      };

      const mockWriteStream = {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 10);
          }
        }),
      };

      mockFile.createWriteStream.mockReturnValue(mockWriteStream);

      const result = await emailStorageService.storeEmailWithAttachments(largeEmail);

      expect(mockFile.createWriteStream).toHaveBeenCalledWith({
        metadata: expect.objectContaining({
          contentType: 'application/json',
        }),
      });

      expect(result.size).toBeGreaterThan(10 * 1024 * 1024);
    });

    it('compresses large attachments', async () => {
      const emailWithLargeAttachment = {
        ...mockEmail,
        hasAttachments: true,
        attachments: [
          {
            id: 'large-attachment',
            name: 'large-document.pdf',
            contentType: 'application/pdf',
            size: 50 * 1024 * 1024, // 50MB
            content: Buffer.alloc(50 * 1024 * 1024, 'PDF content'),
          },
        ],
      };

      mockFile.save.mockResolvedValue([]);

      const result = await emailStorageService.storeEmailWithAttachments(emailWithLargeAttachment);

      expect(result.attachments[0]).toEqual(
        expect.objectContaining({
          compressed: true,
          originalSize: 50 * 1024 * 1024,
          compressedSize: expect.any(Number),
        })
      );
    });

    it('handles storage failures gracefully', async () => {
      mockFile.save.mockRejectedValue(new Error('Storage service unavailable'));

      await expect(
        emailStorageService.storeEmailWithAttachments(mockEmail)
      ).rejects.toThrow('Failed to store email content');
    });

    it('retries failed uploads', async () => {
      mockFile.save
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce([]); // Success on third attempt

      const result = await emailStorageService.storeEmailWithAttachments(mockEmail);

      expect(result.location).toContain(`emails/${mockEmail.id}`);
      expect(mockFile.save).toHaveBeenCalledTimes(3);
    });

    it('validates email data before storage', async () => {
      const invalidEmail = {
        id: '',
        subject: null,
        // Missing required fields
      };

      await expect(
        emailStorageService.storeEmailWithAttachments(invalidEmail as any)
      ).rejects.toThrow('Invalid email data');
    });

    it('sanitizes file paths for storage', async () => {
      const emailWithUnsafePath = {
        ...mockEmail,
        attachments: [
          {
            id: 'attachment-1',
            name: '../../../etc/passwd',
            contentType: 'text/plain',
            size: 1024,
            content: Buffer.from('content'),
          },
        ],
      };

      mockFile.save.mockResolvedValue([]);

      const result = await emailStorageService.storeEmailWithAttachments(emailWithUnsafePath);

      // Path should be sanitized
      expect(result.attachments[0].location).not.toContain('../');
      expect(result.attachments[0].location).toContain('etc_passwd');
    });
  });

  describe('bulkStoreEmails', () => {
    const mockEmails = testDataFactory.emails(10);

    it('stores multiple emails in parallel', async () => {
      mockFile.save.mockResolvedValue([]);

      const result = await emailStorageService.bulkStoreEmails(
        mockEmails.map(e => e.id),
        { concurrency: 3 }
      );

      expect(result.results).toHaveLength(10);
      expect(result.totalSize).toBeGreaterThan(0);
      expect(result.summary.successful).toBe(10);
      expect(result.summary.failed).toBe(0);

      // Should store all 10 emails
      expect(mockFile.save).toHaveBeenCalledTimes(10);
    });

    it('handles partial failures in bulk operations', async () => {
      // First 3 succeed, next 2 fail, remaining succeed
      mockFile.save
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('Storage error'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue([]); // Remaining succeed

      const result = await emailStorageService.bulkStoreEmails(
        mockEmails.slice(0, 5).map(e => e.id)
      );

      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(2);
      expect(result.failures).toHaveLength(2);
      expect(result.failures[0].error).toContain('Storage error');
    });

    it('respects concurrency limits', async () => {
      let concurrentOperations = 0;
      let maxConcurrent = 0;

      mockFile.save.mockImplementation(() => {
        concurrentOperations++;
        maxConcurrent = Math.max(maxConcurrent, concurrentOperations);
        
        return new Promise(resolve => {
          setTimeout(() => {
            concurrentOperations--;
            resolve([]);
          }, 10);
        });
      });

      await emailStorageService.bulkStoreEmails(
        mockEmails.map(e => e.id),
        { concurrency: 3 }
      );

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('tracks progress during bulk operations', async () => {
      const progressCallback = jest.fn();
      
      mockFile.save.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 10))
      );

      await emailStorageService.bulkStoreEmails(
        mockEmails.slice(0, 5).map(e => e.id),
        { 
          onProgress: progressCallback,
          concurrency: 1 // Sequential for predictable progress
        }
      );

      expect(progressCallback).toHaveBeenCalledTimes(5);
      expect(progressCallback).toHaveBeenLastCalledWith({
        completed: 5,
        total: 5,
        percentage: 100,
      });
    });
  });

  describe('retrieveEmail', () => {
    const mockEmailId = 'test-email-1';

    it('retrieves email content successfully', async () => {
      const storedContent = {
        id: mockEmailId,
        subject: 'Test Email',
        from: { name: 'Sender', address: 'sender@example.com' },
        body: 'Email content',
        receivedAt: new Date().toISOString(),
      };

      mockFile.download.mockResolvedValue([Buffer.from(JSON.stringify(storedContent))]);
      mockFile.exists.mockResolvedValue([true]);

      const result = await emailStorageService.retrieveEmail(mockEmailId);

      expect(result).toEqual(storedContent);
      expect(mockFile.download).toHaveBeenCalled();
    });

    it('handles non-existent emails', async () => {
      mockFile.exists.mockResolvedValue([false]);

      await expect(
        emailStorageService.retrieveEmail('non-existent-email')
      ).rejects.toThrow('Email not found in storage');
    });

    it('handles corrupted email data', async () => {
      mockFile.download.mockResolvedValue([Buffer.from('invalid json')]);
      mockFile.exists.mockResolvedValue([true]);

      await expect(
        emailStorageService.retrieveEmail(mockEmailId)
      ).rejects.toThrow('Failed to parse email content');
    });
  });

  describe('getAttachment', () => {
    const mockEmailId = 'test-email-1';
    const mockAttachmentId = 'attachment-1';

    it('retrieves attachment successfully', async () => {
      const attachmentData = Buffer.from('PDF content');
      
      mockFile.download.mockResolvedValue([attachmentData]);
      mockFile.exists.mockResolvedValue([true]);
      mockFile.getMetadata.mockResolvedValue([{
        contentType: 'application/pdf',
        size: attachmentData.length,
      }]);

      const result = await emailStorageService.getAttachment(mockEmailId, mockAttachmentId);

      expect(result).toEqual({
        content: attachmentData,
        contentType: 'application/pdf',
        size: attachmentData.length,
      });
    });

    it('handles missing attachments', async () => {
      mockFile.exists.mockResolvedValue([false]);

      await expect(
        emailStorageService.getAttachment(mockEmailId, 'non-existent')
      ).rejects.toThrow('Attachment not found');
    });
  });

  describe('deleteEmail', () => {
    const mockEmailId = 'test-email-1';

    it('deletes email and all attachments', async () => {
      mockBucket.getFiles.mockResolvedValue([[
        { name: `emails/${mockEmailId}/content.json` },
        { name: `emails/${mockEmailId}/attachments/attachment-1.pdf` },
        { name: `emails/${mockEmailId}/attachments/attachment-2.jpg` },
      ]]);

      mockFile.delete.mockResolvedValue([]);

      const result = await emailStorageService.deleteEmail(mockEmailId);

      expect(result).toEqual({
        deleted: true,
        filesDeleted: 3,
      });

      expect(mockFile.delete).toHaveBeenCalledTimes(3);
    });

    it('handles deletion failures', async () => {
      mockBucket.getFiles.mockResolvedValue([[
        { name: `emails/${mockEmailId}/content.json` },
      ]]);

      mockFile.delete.mockRejectedValue(new Error('Permission denied'));

      await expect(
        emailStorageService.deleteEmail(mockEmailId)
      ).rejects.toThrow('Failed to delete email');
    });
  });

  describe('getStorageStats', () => {
    it('returns storage statistics', async () => {
      mockBucket.getFiles.mockResolvedValue([[
        { 
          name: 'emails/email-1/content.json',
          metadata: { size: '1024' }
        },
        { 
          name: 'emails/email-1/attachments/doc.pdf',
          metadata: { size: '2048' }
        },
        { 
          name: 'emails/email-2/content.json',
          metadata: { size: '512' }
        },
      ]]);

      const stats = await emailStorageService.getStorageStats();

      expect(stats).toEqual({
        totalEmails: 2,
        totalFiles: 3,
        totalSize: 3584,
        avgEmailSize: 1792,
        attachmentCount: 1,
      });
    });
  });

  describe('Migration and maintenance', () => {
    it('migrates old storage format to new format', async () => {
      const oldFormatEmails = [
        'old-format-email-1',
        'old-format-email-2',
      ];

      const migrationCallback = jest.fn();

      mockFile.download.mockResolvedValue([
        Buffer.from(JSON.stringify({
          version: 1, // Old format
          content: 'Old format content',
        }))
      ]);

      mockFile.save.mockResolvedValue([]);

      const result = await emailStorageService.migrateEmailFormat(
        oldFormatEmails,
        { onProgress: migrationCallback }
      );

      expect(result.migrated).toBe(2);
      expect(result.failed).toBe(0);
      expect(migrationCallback).toHaveBeenCalledWith({
        completed: 2,
        total: 2,
        percentage: 100,
      });
    });

    it('performs storage cleanup', async () => {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

      mockBucket.getFiles.mockResolvedValue([[
        { 
          name: 'emails/old-email/content.json',
          metadata: { 
            timeCreated: new Date(cutoffDate.getTime() - 1000).toISOString()
          }
        },
        { 
          name: 'emails/recent-email/content.json',
          metadata: { 
            timeCreated: new Date().toISOString()
          }
        },
      ]]);

      mockFile.delete.mockResolvedValue([]);

      const result = await emailStorageService.cleanupOldEmails(cutoffDate);

      expect(result.deleted).toBe(1);
      expect(result.retained).toBe(1);
      expect(mockFile.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling and resilience', () => {
    it('implements exponential backoff for retries', async () => {
      const startTime = Date.now();
      
      mockFile.save
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValueOnce([]); // Success on third try

      await emailStorageService.storeEmailWithAttachments(testDataFactory.email());

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should have waited for exponential backoff
      expect(duration).toBeGreaterThan(100); // Initial retry delay
      expect(mockFile.save).toHaveBeenCalledTimes(3);
    });

    it('handles quota exceeded errors', async () => {
      mockFile.save.mockRejectedValue(new Error('Quota exceeded'));

      await expect(
        emailStorageService.storeEmailWithAttachments(testDataFactory.email())
      ).rejects.toThrow('Storage quota exceeded');
    });

    it('handles network timeouts', async () => {
      mockFile.save.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 1000);
        })
      );

      await expect(
        emailStorageService.storeEmailWithAttachments(testDataFactory.email(), {
          timeout: 500 // Shorter than the mock timeout
        })
      ).rejects.toThrow('Operation timed out');
    });
  });
});