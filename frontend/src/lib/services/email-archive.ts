/**
 * Email Archive Service
 * Handles email content retrieval, management, and export operations
 * Works with the email storage service to provide a complete archive solution
 */

import { EmailStorageService, createEmailStorageService, getDefaultStorageConfig } from './email-storage';
import { EmailRetrievalResult, EmailContentData, EmailMetadata } from './types/email-storage';

export interface EmailArchiveItem {
  id: string;
  emailId: string;
  assignmentId: string;
  caseId: string;
  subject?: string;
  senderEmail: string;
  senderName?: string;
  recipientEmails: string[];
  recipientNames: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  sentAt?: string;
  receivedAt: string;
  messageId?: string;
  conversationId?: string;
  threadTopic?: string;
  importance: 'low' | 'normal' | 'high';
  isRead: boolean;
  isDraft: boolean;
  hasAttachments: boolean;
  attachmentCount: number;
  totalAttachmentSize: number;
  customTags: string[];
  customMetadata: Record<string, any>;
  archiveStatus: 'active' | 'archived' | 'deleted';
  lastAccessedAt?: string;
  exportCount: number;
  threadEmailCount: number;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  attachmentId: string;
  filename: string;
  originalFilename: string;
  contentType?: string;
  sizeBytes: number;
  isInline: boolean;
  contentId?: string;
  hasPreview: boolean;
  isSearchable: boolean;
  downloadCount: number;
  lastDownloadedAt?: string;
}

export interface EmailSearchFilters {
  query?: string;
  senderFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachments?: boolean;
  importance?: 'low' | 'normal' | 'high';
  tags?: string[];
  conversationId?: string;
}

export interface EmailSearchResult {
  emails: EmailArchiveItem[];
  totalCount: number;
  hasMore: boolean;
  searchRank?: number;
}

export interface EmailExportRequest {
  caseId: string;
  emailIds: string[];
  exportType: 'pdf' | 'eml' | 'zip' | 'csv';
  includeAttachments: boolean;
  includeHeaders: boolean;
  formatOptions?: Record<string, any>;
  passwordProtected?: boolean;
}

export interface EmailExportStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  downloadUrl?: string;
  fileSize?: number;
  expiresAt: string;
  totalEmails: number;
  processedEmails: number;
  errorMessage?: string;
  downloadCount: number;
  maxDownloads: number;
}

export interface ThreadEmail {
  id: string;
  emailId: string;
  subject?: string;
  senderName?: string;
  senderEmail: string;
  receivedAt: string;
  sentAt?: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachmentCount: number;
  messageId?: string;
  inReplyTo?: string;
}

export interface EmailThread {
  conversationId: string;
  threadTopic?: string;
  emails: ThreadEmail[];
  totalCount: number;
  participants: Array<{
    email: string;
    name?: string;
    messageCount: number;
  }>;
}

export class EmailArchiveService {
  private storageService: EmailStorageService;

  constructor() {
    try {
      const config = getDefaultStorageConfig();
      this.storageService = createEmailStorageService(config);
    } catch (error) {
      console.warn('Email storage service not available:', error);
    }
  }

  /**
   * Get email archive for a case with search and filtering
   */
  async getCaseEmails(
    caseId: string,
    filters: EmailSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<EmailSearchResult> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails?` + new URLSearchParams({
        ...(filters.query && { q: filters.query }),
        ...(filters.senderFilter && { sender: filters.senderFilter }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo }),
        ...(filters.hasAttachments !== undefined && { has_attachments: filters.hasAttachments.toString() }),
        ...(filters.importance && { importance: filters.importance }),
        ...(filters.tags && { tags: filters.tags.join(',') }),
        ...(filters.conversationId && { conversation_id: filters.conversationId }),
        limit: limit.toString(),
        offset: offset.toString(),
      }));

      if (!response.ok) {
        throw new Error(`Failed to fetch case emails: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching case emails:', error);
      throw error;
    }
  }

  /**
   * Get a specific email's content and metadata
   */
  async getEmailContent(caseId: string, emailId: string): Promise<EmailArchiveItem & {
    content: {
      htmlBody?: string;
      textBody?: string;
      rtfBody?: string;
      headers?: Record<string, any>;
    };
  }> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/${emailId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch email content: ${response.statusText}`);
      }

      const result = await response.json();

      // Log access for audit trail
      await this.logEmailAccess(caseId, emailId, 'view');

      return result;
    } catch (error) {
      console.error('Error fetching email content:', error);
      throw error;
    }
  }

  /**
   * Get email thread/conversation
   */
  async getEmailThread(caseId: string, conversationId: string): Promise<EmailThread> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails?conversation_id=${conversationId}&limit=100`);

      if (!response.ok) {
        throw new Error(`Failed to fetch email thread: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Process emails into thread structure
      const emails = result.emails.sort((a: any, b: any) => 
        new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
      );

      // Get unique participants
      const participantMap = new Map();
      emails.forEach((email: any) => {
        const sender = email.senderEmail;
        if (!participantMap.has(sender)) {
          participantMap.set(sender, {
            email: sender,
            name: email.senderName,
            messageCount: 0
          });
        }
        participantMap.get(sender).messageCount++;
      });

      return {
        conversationId,
        threadTopic: emails[0]?.threadTopic || emails[0]?.subject,
        emails: emails.map((email: any) => ({
          id: email.id,
          emailId: email.emailId,
          subject: email.subject,
          senderName: email.senderName,
          senderEmail: email.senderEmail,
          receivedAt: email.receivedAt,
          sentAt: email.sentAt,
          isRead: email.isRead,
          hasAttachments: email.hasAttachments,
          attachmentCount: email.attachmentCount,
          messageId: email.messageId,
        })),
        totalCount: emails.length,
        participants: Array.from(participantMap.values())
      };
    } catch (error) {
      console.error('Error fetching email thread:', error);
      throw error;
    }
  }

  /**
   * Download attachment
   */
  async downloadAttachment(
    caseId: string, 
    emailId: string, 
    attachmentId: string
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/${emailId}/attachments/${attachmentId}`);

      if (!response.ok) {
        throw new Error(`Failed to download attachment: ${response.statusText}`);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'attachment';
      const contentType = response.headers.get('Content-Type') || 'application/octet-stream';

      // Log access for audit trail
      await this.logEmailAccess(caseId, emailId, 'download_attachment', { attachmentId });

      return { blob, filename, contentType };
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  /**
   * Request email export
   */
  async requestEmailExport(exportRequest: EmailExportRequest): Promise<EmailExportStatus> {
    try {
      const response = await fetch(`/api/cases/${exportRequest.caseId}/emails/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      if (!response.ok) {
        throw new Error(`Failed to request email export: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error requesting email export:', error);
      throw error;
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(exportId: string): Promise<EmailExportStatus> {
    try {
      const response = await fetch(`/api/exports/${exportId}`);

      if (!response.ok) {
        throw new Error(`Failed to get export status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting export status:', error);
      throw error;
    }
  }

  /**
   * Search emails within a case
   */
  async searchEmails(
    caseId: string,
    query: string,
    filters: EmailSearchFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<EmailSearchResult> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          filters,
          limit,
          offset
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search emails: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching emails:', error);
      throw error;
    }
  }

  /**
   * Update email tags
   */
  async updateEmailTags(caseId: string, emailId: string, tags: string[]): Promise<void> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/${emailId}/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update email tags: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating email tags:', error);
      throw error;
    }
  }

  /**
   * Archive or restore emails
   */
  async updateEmailArchiveStatus(
    caseId: string, 
    emailIds: string[], 
    status: 'active' | 'archived'
  ): Promise<void> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/archive-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailIds, status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update email archive status: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating email archive status:', error);
      throw error;
    }
  }

  /**
   * Soft delete emails
   */
  async deleteEmails(caseId: string, emailIds: string[]): Promise<void> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete emails: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting emails:', error);
      throw error;
    }
  }

  /**
   * Get case email statistics
   */
  async getCaseEmailStats(caseId: string): Promise<{
    totalEmails: number;
    totalSize: number;
    totalAttachments: number;
    recentActivity: number;
    topSenders: Array<{
      email: string;
      name?: string;
      count: number;
    }>;
    monthlyStats: Array<{
      month: string;
      count: number;
      size: number;
    }>;
  }> {
    try {
      const response = await fetch(`/api/cases/${caseId}/emails/stats`);

      if (!response.ok) {
        throw new Error(`Failed to get case email stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting case email stats:', error);
      throw error;
    }
  }

  /**
   * Log email access for audit trail
   */
  private async logEmailAccess(
    caseId: string,
    emailId: string,
    accessType: 'view' | 'download_attachment' | 'export' | 'search' | 'list',
    details: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Fire and forget - don't block user operations
      fetch(`/api/cases/${caseId}/emails/${emailId}/access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessType,
          details
        }),
      }).catch(error => {
        console.warn('Failed to log email access:', error);
      });
    } catch (error) {
      console.warn('Failed to log email access:', error);
    }
  }

  /**
   * Get email content from GCS if available
   */
  async getEmailContentFromStorage(emailId: string, caseId: string): Promise<EmailRetrievalResult | null> {
    if (!this.storageService) {
      return null;
    }

    try {
      return await this.storageService.getEmailContent(emailId, caseId);
    } catch (error) {
      console.error('Error fetching email content from storage:', error);
      return null;
    }
  }

  /**
   * Generate email permalink
   */
  generateEmailPermalink(caseId: string, emailId: string): string {
    return `${window.location.origin}/dashboard/cases/${caseId}?tab=emails&email=${emailId}`;
  }

  /**
   * Format email for display
   */
  formatEmailForDisplay(email: EmailArchiveItem): {
    displaySender: string;
    displaySubject: string;
    displayDate: string;
    displaySize: string;
    priorityIndicator?: 'high' | 'low';
  } {
    const displaySender = email.senderName 
      ? `${email.senderName} <${email.senderEmail}>`
      : email.senderEmail;
    
    const displaySubject = email.subject || '(No Subject)';
    
    const displayDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(email.receivedAt));

    const displaySize = this.formatBytes(email.totalAttachmentSize);

    const priorityIndicator = email.importance !== 'normal' ? email.importance : undefined;

    return {
      displaySender,
      displaySubject,
      displayDate,
      displaySize,
      priorityIndicator
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const emailArchiveService = new EmailArchiveService();