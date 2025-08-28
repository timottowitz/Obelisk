import { graphFetch, buildODataParams } from '@/lib/graph';
import {
  EmailContentData,
  EmailMetadata,
  EmailAttachmentData,
  GraphMessageWithAttachments,
  GraphAttachmentWithContent,
  RateLimitConfig,
  RetryConfig,
  EmailStorageError,
  EmailProcessingStatus
} from './types/email-storage';

/**
 * Enhanced Microsoft Graph client for fetching email content and attachments
 * Includes rate limiting, retry logic, and comprehensive error handling
 */
export class MicrosoftGraphEmailClient {
  private accessToken: string;
  private rateLimitConfig: RateLimitConfig;
  private retryConfig: RetryConfig;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;

  constructor(
    accessToken: string,
    rateLimitConfig?: Partial<RateLimitConfig>,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.accessToken = accessToken;
    
    // Default rate limiting: 60 requests per minute
    this.rateLimitConfig = {
      maxRequests: 60,
      windowMs: 60 * 1000,
      requestDelay: 1000,
      ...rateLimitConfig
    };
    
    // Default retry configuration
    this.retryConfig = {
      maxAttempts: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000,
      retryableStatusCodes: [429, 503, 502, 504],
      ...retryConfig
    };
  }

  /**
   * Fetch complete email content including attachments
   * @param messageId - Microsoft Graph message ID
   * @returns Promise with email content and metadata
   */
  async fetchEmailContent(messageId: string): Promise<{
    content: EmailContentData;
    metadata: EmailMetadata;
  }> {
    try {
      // Fetch message with all properties
      const message = await this.fetchMessageWithProperties(messageId);
      
      // Fetch attachments if present
      let attachments: EmailAttachmentData[] = [];
      if (message.hasAttachments) {
        attachments = await this.fetchEmailAttachments(messageId);
      }

      // Extract email content in multiple formats
      const content: EmailContentData = {
        attachments
      };

      // Get HTML body if available
      if (message.body?.contentType === 'html' && message.body.content) {
        content.htmlBody = message.body.content;
      }

      // Try to get plain text version
      try {
        const textBody = await this.fetchEmailBodyAsText(messageId);
        if (textBody) {
          content.textBody = textBody;
        }
      } catch (error) {
        console.warn('Failed to fetch plain text body:', error);
      }

      // Fetch email headers
      try {
        const headers = await this.fetchEmailHeaders(messageId);
        if (headers) {
          content.headers = headers;
        }
      } catch (error) {
        console.warn('Failed to fetch email headers:', error);
      }

      // Extract metadata
      const metadata: EmailMetadata = this.extractEmailMetadata(message);

      return { content, metadata };

    } catch (error) {
      console.error('Error fetching email content:', error);
      throw new EmailStorageError(
        'Failed to fetch email content from Microsoft Graph',
        'GRAPH_FETCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Fetch message with comprehensive properties
   * @param messageId - Microsoft Graph message ID
   * @returns Promise with complete message data
   */
  private async fetchMessageWithProperties(messageId: string): Promise<GraphMessageWithAttachments> {
    const queryParams = buildODataParams({
      select: [
        'id', 'conversationId', 'subject', 'body', 'bodyPreview',
        'from', 'toRecipients', 'ccRecipients', 'bccRecipients',
        'importance', 'isRead', 'isDraft', 'hasAttachments',
        'categories', 'internetMessageId', 'webLink',
        'sentDateTime', 'receivedDateTime', 'createdDateTime',
        'lastModifiedDateTime', 'parentFolderId'
      ]
    });

    return await this.makeRateLimitedRequest(
      () => graphFetch<GraphMessageWithAttachments>(
        `/me/messages/${messageId}${queryParams}`,
        this.accessToken
      )
    );
  }

  /**
   * Fetch email attachments with content
   * @param messageId - Microsoft Graph message ID
   * @returns Promise with array of attachment data
   */
  private async fetchEmailAttachments(messageId: string): Promise<EmailAttachmentData[]> {
    try {
      // First, get list of attachments
      const attachmentsList = await this.makeRateLimitedRequest(
        () => graphFetch<{ value: GraphAttachmentWithContent[] }>(
          `/me/messages/${messageId}/attachments`,
          this.accessToken
        )
      );

      const attachments: EmailAttachmentData[] = [];

      // Fetch each attachment's content
      for (const attachment of attachmentsList.value) {
        try {
          // For file attachments, we need to fetch the content separately
          if (attachment['@odata.type'] === '#microsoft.graph.fileAttachment') {
            const attachmentWithContent = await this.fetchAttachmentContent(
              messageId,
              attachment.id
            );
            
            if (attachmentWithContent) {
              attachments.push({
                id: attachment.id,
                name: attachment.name,
                contentType: attachment.contentType,
                size: attachment.size || 0,
                isInline: attachment.isInline,
                contentId: attachment.contentId,
                contentLocation: attachment.contentLocation,
                content: Buffer.from(attachmentWithContent.contentBytes || '', 'base64')
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to fetch attachment ${attachment.name}:`, error);
        }
      }

      return attachments;

    } catch (error) {
      console.error('Error fetching email attachments:', error);
      throw new EmailStorageError(
        'Failed to fetch email attachments',
        'ATTACHMENT_FETCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Fetch individual attachment content
   * @param messageId - Microsoft Graph message ID
   * @param attachmentId - Attachment ID
   * @returns Promise with attachment content
   */
  private async fetchAttachmentContent(
    messageId: string,
    attachmentId: string
  ): Promise<GraphAttachmentWithContent | null> {
    try {
      return await this.makeRateLimitedRequest(
        () => graphFetch<GraphAttachmentWithContent>(
          `/me/messages/${messageId}/attachments/${attachmentId}`,
          this.accessToken
        )
      );
    } catch (error) {
      console.error(`Failed to fetch attachment content for ${attachmentId}:`, error);
      return null;
    }
  }

  /**
   * Fetch email body as plain text
   * @param messageId - Microsoft Graph message ID
   * @returns Promise with plain text body
   */
  private async fetchEmailBodyAsText(messageId: string): Promise<string | null> {
    try {
      // Try to get text version of body
      const queryParams = buildODataParams({
        select: ['body']
      });

      const response = await this.makeRateLimitedRequest(
        () => graphFetch<{ body: { contentType: string; content: string } }>(
          `/me/messages/${messageId}${queryParams}`,
          this.accessToken
        )
      );

      // If we get HTML, we might need to convert it
      if (response.body?.contentType === 'text' && response.body.content) {
        return response.body.content;
      }

      // For HTML content, we could implement HTML-to-text conversion here
      // For now, return null and let the caller handle it
      return null;

    } catch (error) {
      console.error('Error fetching email body as text:', error);
      return null;
    }
  }

  /**
   * Fetch email headers (Internet headers)
   * @param messageId - Microsoft Graph message ID
   * @returns Promise with email headers
   */
  private async fetchEmailHeaders(messageId: string): Promise<Record<string, string | string[]> | null> {
    try {
      // Microsoft Graph doesn't expose raw headers directly
      // We can get some standard headers through the message properties
      const message = await this.makeRateLimitedRequest(
        () => graphFetch<any>(
          `/me/messages/${messageId}?$select=internetMessageHeaders`,
          this.accessToken
        )
      );

      if (message.internetMessageHeaders && Array.isArray(message.internetMessageHeaders)) {
        const headers: Record<string, string | string[]> = {};
        
        for (const header of message.internetMessageHeaders) {
          if (header.name && header.value) {
            // Handle multiple values for the same header
            if (headers[header.name]) {
              if (Array.isArray(headers[header.name])) {
                (headers[header.name] as string[]).push(header.value);
              } else {
                headers[header.name] = [headers[header.name] as string, header.value];
              }
            } else {
              headers[header.name] = header.value;
            }
          }
        }
        
        return headers;
      }

      return null;

    } catch (error) {
      console.error('Error fetching email headers:', error);
      return null;
    }
  }

  /**
   * Extract metadata from Graph message
   * @param message - Graph message object
   * @returns Email metadata
   */
  private extractEmailMetadata(message: GraphMessageWithAttachments): EmailMetadata {
    return {
      messageId: message.id,
      subject: message.subject,
      from: message.from ? {
        address: message.from.emailAddress.address,
        name: message.from.emailAddress.name
      } : undefined,
      to: message.toRecipients?.map(r => ({
        address: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      cc: message.ccRecipients?.map(r => ({
        address: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      bcc: message.bccRecipients?.map(r => ({
        address: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      sentAt: message.sentDateTime,
      receivedAt: message.receivedDateTime,
      importance: message.importance,
      isRead: message.isRead,
      isDraft: message.isDraft,
      hasAttachments: message.hasAttachments,
      categories: message.categories,
      internetMessageId: message.internetMessageId,
      webLink: message.webLink,
      conversationId: message.conversationId,
      parentFolderId: message.parentFolderId
    };
  }

  /**
   * Make a request with rate limiting and retry logic
   * @param requestFn - Function that makes the actual request
   * @returns Promise with the request result
   */
  private async makeRateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await this.executeWithRetry(requestFn);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        this.processRequestQueue();
      }
    });
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (!request) continue;

      // Enforce rate limiting
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.rateLimitConfig.requestDelay) {
        const delayTime = this.rateLimitConfig.requestDelay - timeSinceLastRequest;
        await this.delay(delayTime);
      }

      this.lastRequestTime = Date.now();
      
      try {
        await request();
      } catch (error) {
        console.error('Request failed:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Execute a function with retry logic
   * @param fn - Function to execute
   * @returns Promise with the function result
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if error is retryable
        const shouldRetry = this.shouldRetryError(lastError, attempt);
        
        if (!shouldRetry) {
          throw lastError;
        }

        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Determine if an error should trigger a retry
   * @param error - The error that occurred
   * @param attempt - Current attempt number
   * @returns Whether to retry the request
   */
  private shouldRetryError(error: Error, attempt: number): boolean {
    // Don't retry on the last attempt
    if (attempt >= this.retryConfig.maxAttempts) {
      return false;
    }

    // Check for specific error patterns
    const errorMessage = error.message.toLowerCase();
    
    // Retry on rate limiting
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return true;
    }

    // Retry on temporary server errors
    if (errorMessage.includes('service unavailable') || 
        errorMessage.includes('bad gateway') ||
        errorMessage.includes('gateway timeout')) {
      return true;
    }

    // Retry on network errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param attempt - Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Utility function to delay execution
   * @param ms - Delay in milliseconds
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get processing status for a batch of emails
   * @param messageIds - Array of message IDs to process
   * @param onProgress - Progress callback
   * @returns Promise with processing results
   */
  async fetchMultipleEmailsContent(
    messageIds: string[],
    onProgress?: (status: EmailProcessingStatus) => void
  ): Promise<Array<{
    messageId: string;
    content?: EmailContentData;
    metadata?: EmailMetadata;
    error?: string;
  }>> {
    const results: Array<{
      messageId: string;
      content?: EmailContentData;
      metadata?: EmailMetadata;
      error?: string;
    }> = [];

    const totalEmails = messageIds.length;
    let processedEmails = 0;
    let totalBytesProcessed = 0;
    
    const startTime = new Date().toISOString();

    for (const messageId of messageIds) {
      try {
        // Update progress
        if (onProgress) {
          onProgress({
            stage: 'fetching',
            progress: Math.round((processedEmails / totalEmails) * 100),
            operation: `Fetching email ${messageId}`,
            timestamps: { started: startTime },
            stats: {
              attachmentsProcessed: 0,
              totalAttachments: 0,
              bytesProcessed: totalBytesProcessed,
              totalBytes: 0
            }
          });
        }

        const { content, metadata } = await this.fetchEmailContent(messageId);
        
        // Calculate bytes processed
        let emailBytes = 0;
        if (content.htmlBody) emailBytes += content.htmlBody.length;
        if (content.textBody) emailBytes += content.textBody.length;
        if (content.attachments) {
          emailBytes += content.attachments.reduce((sum, att) => sum + att.size, 0);
        }
        totalBytesProcessed += emailBytes;

        results.push({
          messageId,
          content,
          metadata
        });

      } catch (error) {
        console.error(`Failed to fetch email ${messageId}:`, error);
        results.push({
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      processedEmails++;
    }

    // Final progress update
    if (onProgress) {
      onProgress({
        stage: 'completed',
        progress: 100,
        operation: 'All emails processed',
        timestamps: { 
          started: startTime,
          completed: new Date().toISOString()
        },
        stats: {
          attachmentsProcessed: 0,
          totalAttachments: 0,
          bytesProcessed: totalBytesProcessed,
          totalBytes: totalBytesProcessed
        }
      });
    }

    return results;
  }
}

/**
 * Factory function to create a MicrosoftGraphEmailClient instance
 * @param accessToken - Microsoft Graph access token
 * @param rateLimitConfig - Optional rate limiting configuration
 * @param retryConfig - Optional retry configuration
 * @returns MicrosoftGraphEmailClient instance
 */
export function createGraphEmailClient(
  accessToken: string,
  rateLimitConfig?: Partial<RateLimitConfig>,
  retryConfig?: Partial<RetryConfig>
): MicrosoftGraphEmailClient {
  return new MicrosoftGraphEmailClient(accessToken, rateLimitConfig, retryConfig);
}