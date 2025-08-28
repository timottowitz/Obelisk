/**
 * TypeScript interfaces for Email Storage Service
 * Defines all data structures used for storing and retrieving email content
 */

/**
 * Configuration for Google Cloud Storage
 */
export interface StorageConfig {
  projectId: string;
  bucketName: string;
  keyFilename?: string;
  credentials?: object;
}

/**
 * Email content data structure for storage
 */
export interface EmailContentData {
  /** HTML body content */
  htmlBody?: string;
  
  /** Plain text body content */
  textBody?: string;
  
  /** RTF body content */
  rtfBody?: string;
  
  /** Email headers as key-value pairs */
  headers?: Record<string, string | string[]>;
  
  /** Email attachments */
  attachments?: EmailAttachmentData[];
}

/**
 * Email metadata for storage
 */
export interface EmailMetadata {
  /** Microsoft Graph message ID */
  messageId: string;
  
  /** Email subject */
  subject?: string;
  
  /** Sender information */
  from?: {
    address: string;
    name?: string;
  };
  
  /** Recipients */
  to?: Array<{
    address: string;
    name?: string;
  }>;
  
  /** CC recipients */
  cc?: Array<{
    address: string;
    name?: string;
  }>;
  
  /** BCC recipients */
  bcc?: Array<{
    address: string;
    name?: string;
  }>;
  
  /** Email sent date/time */
  sentAt?: string;
  
  /** Email received date/time */
  receivedAt?: string;
  
  /** Email importance level */
  importance?: 'low' | 'normal' | 'high';
  
  /** Whether email has been read */
  isRead: boolean;
  
  /** Whether email is a draft */
  isDraft: boolean;
  
  /** Whether email has attachments */
  hasAttachments: boolean;
  
  /** Email categories/labels */
  categories?: string[];
  
  /** Internet Message ID */
  internetMessageId?: string;
  
  /** Web link to email in Outlook */
  webLink?: string;
  
  /** Conversation ID for threading */
  conversationId?: string;
  
  /** Parent folder ID */
  parentFolderId?: string;
  
  /** Additional custom metadata */
  customMetadata?: Record<string, any>;
}

/**
 * Email attachment data structure
 */
export interface EmailAttachmentData {
  /** Attachment ID from Microsoft Graph */
  id: string;
  
  /** Attachment filename */
  name: string;
  
  /** MIME content type */
  contentType?: string;
  
  /** File size in bytes */
  size: number;
  
  /** Whether attachment is inline */
  isInline: boolean;
  
  /** Content ID for inline attachments */
  contentId?: string;
  
  /** Content location for inline attachments */
  contentLocation?: string;
  
  /** Raw attachment content */
  content: Buffer;
}

/**
 * Result structure for email storage operations
 */
export interface EmailStorageResult {
  /** Whether operation was successful */
  success: boolean;
  
  /** Microsoft Graph email ID */
  emailId: string;
  
  /** Associated case ID */
  caseId: string;
  
  /** Base storage path */
  storagePath: string;
  
  /** Paths to stored content files */
  contentFiles: {
    metadata?: string;
    html?: string;
    text?: string;
    rtf?: string;
    headers?: string;
  };
  
  /** Results for stored attachments */
  attachmentFiles: AttachmentStorageResult[];
  
  /** Updated metadata with storage information */
  metadata: EmailMetadata & {
    storedAt: string;
    storageVersion: string;
  };
  
  /** Error information if operation failed */
  error?: string;
}

/**
 * Result structure for attachment storage operations
 */
export interface AttachmentStorageResult {
  /** Whether operation was successful */
  success: boolean;
  
  /** Attachment ID */
  attachmentId: string;
  
  /** Attachment filename */
  name: string;
  
  /** Storage path if successful */
  storagePath?: string;
  
  /** Metadata path if successful */
  metadataPath?: string;
  
  /** File size */
  size?: number;
  
  /** Content type */
  contentType?: string;
  
  /** Error message if operation failed */
  error?: string;
}

/**
 * Result structure for email retrieval operations
 */
export interface EmailRetrievalResult {
  /** Microsoft Graph email ID */
  emailId: string;
  
  /** Associated case ID */
  caseId: string;
  
  /** Email metadata */
  metadata: EmailMetadata & {
    storedAt: string;
    storageVersion: string;
  };
  
  /** Retrieved email content */
  content: {
    htmlBody?: string;
    textBody?: string;
    rtfBody?: string;
    headers?: Record<string, any>;
  };
  
  /** Retrieved attachments */
  attachments: EmailAttachmentData[];
  
  /** Storage path */
  storagePath: string;
}

/**
 * Custom error class for email storage operations
 */
export class EmailStorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'EmailStorageError';
  }
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  maxRequests: number;
  
  /** Time window in milliseconds */
  windowMs: number;
  
  /** Delay between requests in milliseconds */
  requestDelay?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Initial delay in milliseconds */
  initialDelay: number;
  
  /** Backoff multiplier */
  backoffMultiplier: number;
  
  /** Maximum delay in milliseconds */
  maxDelay: number;
  
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes: number[];
}

/**
 * Microsoft Graph API response for message with attachments
 */
export interface GraphMessageWithAttachments {
  id: string;
  conversationId?: string;
  subject?: string;
  body?: {
    contentType: 'text' | 'html';
    content: string;
  };
  from?: {
    emailAddress: {
      address: string;
      name?: string;
    };
  };
  toRecipients?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  bccRecipients?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
  }>;
  importance?: 'low' | 'normal' | 'high';
  isRead: boolean;
  isDraft: boolean;
  hasAttachments: boolean;
  categories?: string[];
  internetMessageId?: string;
  webLink?: string;
  sentDateTime?: string;
  receivedDateTime?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  parentFolderId?: string;
  attachments?: GraphAttachmentWithContent[];
}

/**
 * Microsoft Graph API attachment with content
 */
export interface GraphAttachmentWithContent {
  '@odata.type': string;
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  isInline: boolean;
  contentId?: string;
  contentLocation?: string;
  contentBytes?: string; // Base64 encoded content
}

/**
 * Email processing status for tracking
 */
export interface EmailProcessingStatus {
  /** Processing stage */
  stage: 'fetching' | 'storing' | 'completed' | 'failed';
  
  /** Progress percentage (0-100) */
  progress: number;
  
  /** Current operation description */
  operation: string;
  
  /** Error information if failed */
  error?: {
    message: string;
    code: string;
    details?: string;
  };
  
  /** Processing timestamps */
  timestamps: {
    started: string;
    completed?: string;
  };
  
  /** Processing statistics */
  stats: {
    attachmentsProcessed: number;
    totalAttachments: number;
    bytesProcessed: number;
    totalBytes: number;
  };
}

/**
 * Batch processing configuration
 */
export interface BatchProcessingConfig {
  /** Maximum number of emails to process in parallel */
  maxConcurrency: number;
  
  /** Maximum total size in bytes for a batch */
  maxBatchSize: number;
  
  /** Timeout for individual email processing */
  emailTimeout: number;
  
  /** Timeout for entire batch */
  batchTimeout: number;
}

/**
 * Storage optimization settings
 */
export interface StorageOptimizationConfig {
  /** Compress email content */
  compressContent: boolean;
  
  /** Deduplicate identical attachments */
  deduplicateAttachments: boolean;
  
  /** Storage class for different file types */
  storageClasses: {
    email: string;
    attachments: string;
    metadata: string;
  };
  
  /** Lifecycle policies */
  lifecyclePolicies: {
    deleteAfterDays?: number;
    archiveAfterDays?: number;
    coldStorageAfterDays?: number;
  };
}