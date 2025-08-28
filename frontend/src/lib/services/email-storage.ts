import { Storage, Bucket, File } from '@google-cloud/storage';
import { 
  EmailContentData, 
  EmailMetadata, 
  EmailAttachmentData, 
  StorageConfig,
  EmailStorageError,
  EmailStorageResult,
  AttachmentStorageResult,
  EmailRetrievalResult
} from './types/email-storage';

/**
 * Google Cloud Storage service for email content and attachment storage
 * Handles secure storage and retrieval of email data for case assignments
 */
export class EmailStorageService {
  private storage: Storage;
  private bucket: Bucket;
  private bucketName: string;

  constructor(config: StorageConfig) {
    this.bucketName = config.bucketName;
    
    // Initialize Google Cloud Storage client
    this.storage = new Storage({
      projectId: config.projectId,
      credentials: config.credentials || undefined,
      keyFilename: config.keyFilename || undefined,
    });
    
    this.bucket = this.storage.bucket(this.bucketName);
  }

  /**
   * Store email content and attachments in Google Cloud Storage
   * @param emailId - Microsoft Graph email ID
   * @param caseId - Associated case ID
   * @param content - Email content data
   * @param metadata - Email metadata
   * @returns Promise with storage result
   */
  async storeEmailContent(
    emailId: string,
    caseId: string,
    content: EmailContentData,
    metadata: EmailMetadata
  ): Promise<EmailStorageResult> {
    try {
      const basePath = `cases/${caseId}/emails/${emailId}`;
      const timestamp = Date.now();
      
      // Ensure bucket exists
      await this.ensureBucketExists();
      
      const results: EmailStorageResult = {
        success: true,
        emailId,
        caseId,
        storagePath: basePath,
        contentFiles: {},
        attachmentFiles: [],
        metadata: {
          ...metadata,
          storedAt: new Date().toISOString(),
          storageVersion: '1.0'
        }
      };

      // Store email metadata
      const metadataPath = `${basePath}/metadata.json`;
      await this.storeJsonFile(metadataPath, {
        ...metadata,
        storedAt: new Date().toISOString(),
        storageVersion: '1.0',
        emailId,
        caseId
      });
      results.contentFiles.metadata = metadataPath;

      // Store HTML content if available
      if (content.htmlBody) {
        const htmlPath = `${basePath}/content.html`;
        await this.storeTextFile(htmlPath, content.htmlBody, 'text/html');
        results.contentFiles.html = htmlPath;
      }

      // Store plain text content if available
      if (content.textBody) {
        const textPath = `${basePath}/content.txt`;
        await this.storeTextFile(textPath, content.textBody, 'text/plain');
        results.contentFiles.text = textPath;
      }

      // Store RTF content if available
      if (content.rtfBody) {
        const rtfPath = `${basePath}/content.rtf`;
        await this.storeTextFile(rtfPath, content.rtfBody, 'application/rtf');
        results.contentFiles.rtf = rtfPath;
      }

      // Store headers as JSON
      if (content.headers) {
        const headersPath = `${basePath}/headers.json`;
        await this.storeJsonFile(headersPath, content.headers);
        results.contentFiles.headers = headersPath;
      }

      // Store attachments
      if (content.attachments && content.attachments.length > 0) {
        const attachmentResults = await this.storeAttachments(
          basePath,
          content.attachments
        );
        results.attachmentFiles = attachmentResults;
      }

      return results;

    } catch (error) {
      console.error('Error storing email content:', error);
      throw new EmailStorageError(
        'Failed to store email content',
        'STORAGE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Retrieve email content from Google Cloud Storage
   * @param emailId - Microsoft Graph email ID
   * @param caseId - Associated case ID
   * @returns Promise with email content
   */
  async getEmailContent(emailId: string, caseId: string): Promise<EmailRetrievalResult> {
    try {
      const basePath = `cases/${caseId}/emails/${emailId}`;
      
      // Get metadata first
      const metadataPath = `${basePath}/metadata.json`;
      const metadata = await this.getJsonFile(metadataPath);
      
      if (!metadata) {
        throw new EmailStorageError(
          'Email content not found',
          'NOT_FOUND',
          `No metadata found for email ${emailId} in case ${caseId}`
        );
      }

      const result: EmailRetrievalResult = {
        emailId,
        caseId,
        metadata,
        content: {},
        attachments: [],
        storagePath: basePath
      };

      // Retrieve HTML content
      try {
        const htmlContent = await this.getTextFile(`${basePath}/content.html`);
        if (htmlContent) result.content.htmlBody = htmlContent;
      } catch (error) {
        // HTML content might not exist, continue
      }

      // Retrieve plain text content
      try {
        const textContent = await this.getTextFile(`${basePath}/content.txt`);
        if (textContent) result.content.textBody = textContent;
      } catch (error) {
        // Text content might not exist, continue
      }

      // Retrieve RTF content
      try {
        const rtfContent = await this.getTextFile(`${basePath}/content.rtf`);
        if (rtfContent) result.content.rtfBody = rtfContent;
      } catch (error) {
        // RTF content might not exist, continue
      }

      // Retrieve headers
      try {
        const headers = await this.getJsonFile(`${basePath}/headers.json`);
        if (headers) result.content.headers = headers;
      } catch (error) {
        // Headers might not exist, continue
      }

      // List and retrieve attachments
      const attachmentFiles = await this.listFiles(`${basePath}/attachments/`);
      for (const file of attachmentFiles) {
        try {
          const attachmentData = await this.getAttachment(file.name);
          if (attachmentData) {
            result.attachments.push(attachmentData);
          }
        } catch (error) {
          console.warn(`Failed to retrieve attachment ${file.name}:`, error);
        }
      }

      return result;

    } catch (error) {
      if (error instanceof EmailStorageError) {
        throw error;
      }
      
      console.error('Error retrieving email content:', error);
      throw new EmailStorageError(
        'Failed to retrieve email content',
        'RETRIEVAL_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Store multiple attachments
   * @param basePath - Base storage path
   * @param attachments - Array of attachment data
   * @returns Promise with attachment storage results
   */
  private async storeAttachments(
    basePath: string,
    attachments: EmailAttachmentData[]
  ): Promise<AttachmentStorageResult[]> {
    const results: AttachmentStorageResult[] = [];
    
    for (const attachment of attachments) {
      try {
        const result = await this.storeAttachment(basePath, attachment);
        results.push(result);
      } catch (error) {
        console.error(`Failed to store attachment ${attachment.name}:`, error);
        results.push({
          success: false,
          attachmentId: attachment.id,
          name: attachment.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return results;
  }

  /**
   * Store a single attachment
   * @param basePath - Base storage path
   * @param attachment - Attachment data
   * @returns Promise with attachment storage result
   */
  private async storeAttachment(
    basePath: string,
    attachment: EmailAttachmentData
  ): Promise<AttachmentStorageResult> {
    const attachmentPath = `${basePath}/attachments/${attachment.id}`;
    
    // Store attachment content
    const contentPath = `${attachmentPath}/${attachment.name}`;
    const file = this.bucket.file(contentPath);
    
    await file.save(attachment.content, {
      metadata: {
        contentType: attachment.contentType || 'application/octet-stream',
        metadata: {
          originalName: attachment.name,
          attachmentId: attachment.id,
          size: attachment.size.toString(),
          isInline: attachment.isInline.toString()
        }
      }
    });

    // Store attachment metadata
    const metadataPath = `${attachmentPath}/metadata.json`;
    await this.storeJsonFile(metadataPath, {
      id: attachment.id,
      name: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
      isInline: attachment.isInline,
      contentId: attachment.contentId,
      contentLocation: attachment.contentLocation,
      storedAt: new Date().toISOString()
    });

    return {
      success: true,
      attachmentId: attachment.id,
      name: attachment.name,
      storagePath: contentPath,
      metadataPath,
      size: attachment.size,
      contentType: attachment.contentType
    };
  }

  /**
   * Retrieve an attachment by its file path
   * @param filePath - Full path to attachment file
   * @returns Promise with attachment data
   */
  private async getAttachment(filePath: string): Promise<EmailAttachmentData | null> {
    try {
      // Get attachment metadata first
      const pathParts = filePath.split('/');
      const attachmentDir = pathParts.slice(0, -1).join('/');
      const metadataPath = `${attachmentDir}/metadata.json`;
      
      const metadata = await this.getJsonFile(metadataPath);
      if (!metadata) return null;

      // Get attachment content
      const file = this.bucket.file(filePath);
      const [content] = await file.download();

      return {
        id: metadata.id,
        name: metadata.name,
        contentType: metadata.contentType,
        size: metadata.size,
        isInline: metadata.isInline,
        contentId: metadata.contentId,
        contentLocation: metadata.contentLocation,
        content: content
      };
    } catch (error) {
      console.error(`Failed to get attachment from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Store a JSON file in the bucket
   * @param path - File path
   * @param data - Data to store
   */
  private async storeJsonFile(path: string, data: any): Promise<void> {
    const file = this.bucket.file(path);
    const content = JSON.stringify(data, null, 2);
    
    await file.save(content, {
      metadata: {
        contentType: 'application/json'
      }
    });
  }

  /**
   * Store a text file in the bucket
   * @param path - File path
   * @param content - Text content
   * @param contentType - MIME type
   */
  private async storeTextFile(path: string, content: string, contentType: string): Promise<void> {
    const file = this.bucket.file(path);
    
    await file.save(content, {
      metadata: {
        contentType
      }
    });
  }

  /**
   * Retrieve a JSON file from the bucket
   * @param path - File path
   * @returns Parsed JSON data or null if not found
   */
  private async getJsonFile(path: string): Promise<any | null> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      
      if (!exists) return null;
      
      const [content] = await file.download();
      return JSON.parse(content.toString());
    } catch (error) {
      console.error(`Failed to get JSON file ${path}:`, error);
      return null;
    }
  }

  /**
   * Retrieve a text file from the bucket
   * @param path - File path
   * @returns Text content or null if not found
   */
  private async getTextFile(path: string): Promise<string | null> {
    try {
      const file = this.bucket.file(path);
      const [exists] = await file.exists();
      
      if (!exists) return null;
      
      const [content] = await file.download();
      return content.toString();
    } catch (error) {
      console.error(`Failed to get text file ${path}:`, error);
      return null;
    }
  }

  /**
   * List files with a specific prefix
   * @param prefix - File path prefix
   * @returns Array of file metadata
   */
  private async listFiles(prefix: string): Promise<Array<{ name: string; size: number }>> {
    try {
      const [files] = await this.bucket.getFiles({ prefix });
      return files.map(file => ({
        name: file.name,
        size: parseInt(file.metadata.size || '0')
      }));
    } catch (error) {
      console.error(`Failed to list files with prefix ${prefix}:`, error);
      return [];
    }
  }

  /**
   * Ensure the bucket exists, create it if it doesn't
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const [exists] = await this.bucket.exists();
      if (!exists) {
        console.log(`Creating bucket ${this.bucketName}...`);
        await this.bucket.create({
          location: 'US',
          storageClass: 'STANDARD'
        });
        console.log(`Bucket ${this.bucketName} created successfully`);
      }
    } catch (error) {
      console.error('Error ensuring bucket exists:', error);
      throw new EmailStorageError(
        'Failed to ensure bucket exists',
        'BUCKET_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Delete email content and all associated files
   * @param emailId - Microsoft Graph email ID
   * @param caseId - Associated case ID
   * @returns Promise indicating success
   */
  async deleteEmailContent(emailId: string, caseId: string): Promise<void> {
    try {
      const basePath = `cases/${caseId}/emails/${emailId}`;
      
      // List all files with this prefix
      const [files] = await this.bucket.getFiles({ prefix: basePath });
      
      // Delete all files
      const deletePromises = files.map(file => file.delete());
      await Promise.all(deletePromises);
      
      console.log(`Deleted ${files.length} files for email ${emailId} in case ${caseId}`);
    } catch (error) {
      console.error('Error deleting email content:', error);
      throw new EmailStorageError(
        'Failed to delete email content',
        'DELETE_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Get storage usage statistics for a case
   * @param caseId - Case ID to analyze
   * @returns Storage statistics
   */
  async getCaseStorageStats(caseId: string): Promise<{
    totalEmails: number;
    totalSize: number;
    totalAttachments: number;
  }> {
    try {
      const prefix = `cases/${caseId}/emails/`;
      const [files] = await this.bucket.getFiles({ prefix });
      
      let totalEmails = 0;
      let totalSize = 0;
      let totalAttachments = 0;
      
      const emailIds = new Set<string>();
      
      for (const file of files) {
        const size = parseInt(file.metadata.size || '0');
        totalSize += size;
        
        const pathParts = file.name.split('/');
        if (pathParts.length >= 4) {
          const emailId = pathParts[3];
          emailIds.add(emailId);
          
          if (file.name.includes('/attachments/')) {
            totalAttachments++;
          }
        }
      }
      
      totalEmails = emailIds.size;
      
      return {
        totalEmails,
        totalSize,
        totalAttachments
      };
    } catch (error) {
      console.error('Error getting case storage stats:', error);
      return {
        totalEmails: 0,
        totalSize: 0,
        totalAttachments: 0
      };
    }
  }
}

/**
 * Factory function to create an EmailStorageService instance
 * @param config - Storage configuration
 * @returns EmailStorageService instance
 */
export function createEmailStorageService(config: StorageConfig): EmailStorageService {
  return new EmailStorageService(config);
}

/**
 * Default configuration factory using environment variables
 * @returns Default storage configuration
 */
export function getDefaultStorageConfig(): StorageConfig {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  const bucketName = process.env.GOOGLE_CLOUD_EMAIL_BUCKET_NAME || 'obelisk-email-content';
  
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID environment variable is required');
  }
  
  const config: StorageConfig = {
    projectId,
    bucketName
  };
  
  // Use service account key file if provided
  const keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
  if (keyFilename) {
    config.keyFilename = keyFilename;
  }
  
  // Use credentials JSON if provided
  const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS;
  if (credentialsJson) {
    try {
      config.credentials = JSON.parse(credentialsJson);
    } catch (error) {
      console.error('Failed to parse GOOGLE_CLOUD_CREDENTIALS:', error);
    }
  }
  
  return config;
}