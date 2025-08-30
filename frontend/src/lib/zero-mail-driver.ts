/**
 * Zero Mail Driver for Microsoft Graph Integration
 * 
 * This driver provides a Zero-compatible interface for email operations
 * using Microsoft Graph API, integrating with our existing email provider.
 */

import { MicrosoftGraphEmailProvider } from '@/server/providers/microsoftGraph';
import { ClerkZeroEmailAdapter } from '@/adapters/zero-email-adapter';
import { 
  EmailProvider, 
  EmailFolder, 
  Email, 
  EmailListRequest, 
  EmailListResponse, 
  EmailSearchRequest, 
  EmailSearchResponse, 
  SendEmailRequest, 
  SendEmailResponse,
  EmailAccount
} from '@/types/email';

// Zero-compatible interfaces (mocked since Zero submodule wasn't available)
export interface ZeroMailConfig {
  provider: 'microsoft' | 'google';
  accountId: string;
  refreshToken?: boolean;
  cacheTimeout?: number;
}

export interface ZeroMailFolder {
  id: string;
  name: string;
  parentId?: string;
  type: 'inbox' | 'sent' | 'draft' | 'trash' | 'junk' | 'custom';
  unreadCount: number;
  totalCount: number;
  children?: ZeroMailFolder[];
}

export interface ZeroMailMessage {
  id: string;
  threadId?: string;
  folderId: string;
  subject: string;
  preview: string;
  body?: string;
  bodyType: 'text' | 'html';
  from: { address: string; name?: string };
  to: { address: string; name?: string }[];
  cc?: { address: string; name?: string }[];
  bcc?: { address: string; name?: string }[];
  replyTo?: { address: string; name?: string }[];
  importance: 'low' | 'normal' | 'high';
  isRead: boolean;
  isDraft: boolean;
  hasAttachments: boolean;
  categories: string[];
  sentAt?: Date;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ZeroMailDriver {
  // Configuration
  configure(config: ZeroMailConfig): Promise<void>;
  isConfigured(): boolean;
  getAccount(): Promise<EmailAccount | null>;

  // Folder operations
  getFolders(): Promise<ZeroMailFolder[]>;
  getFolder(id: string): Promise<ZeroMailFolder | null>;

  // Message operations
  getMessages(folderId?: string, options?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    sortBy?: 'received' | 'sent' | 'subject';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    messages: ZeroMailMessage[];
    total: number;
    hasMore: boolean;
  }>;

  getMessage(messageId: string, options?: { includeBody?: boolean }): Promise<ZeroMailMessage | null>;

  searchMessages(query: string, options?: {
    folderId?: string;
    from?: string;
    to?: string;
    subject?: string;
    dateFrom?: Date;
    dateTo?: Date;
    hasAttachments?: boolean;
    isUnread?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    messages: ZeroMailMessage[];
    total: number;
    hasMore: boolean;
    query: string;
  }>;

  sendMessage(message: {
    to: { address: string; name?: string }[];
    cc?: { address: string; name?: string }[];
    bcc?: { address: string; name?: string }[];
    subject: string;
    body: string;
    bodyType?: 'text' | 'html';
    importance?: 'low' | 'normal' | 'high';
    replyToMessageId?: string;
    forwardMessageId?: string;
  }): Promise<{ messageId: string; sentAt: Date }>;

  // Message actions
  markAsRead(messageId: string): Promise<void>;
  markAsUnread(messageId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  moveMessage(messageId: string, targetFolderId: string): Promise<void>;

  // Sync operations
  sync(options?: { fullSync?: boolean; folderIds?: string[] }): Promise<void>;
}

/**
 * Microsoft Graph implementation of Zero Mail Driver
 */
export class MicrosoftGraphZeroMailDriver implements ZeroMailDriver {
  private config?: ZeroMailConfig;
  private provider?: MicrosoftGraphEmailProvider;
  private auth: ClerkZeroEmailAdapter;
  private account?: EmailAccount;

  constructor() {
    this.auth = new ClerkZeroEmailAdapter();
  }

  async configure(config: ZeroMailConfig): Promise<void> {
    this.config = config;

    try {
      // Validate authentication
      if (!(await this.auth.isAuthenticated())) {
        throw new Error('User not authenticated');
      }

      const accessToken = await this.auth.getAccessToken(config.provider);
      if (!accessToken) {
        throw new Error(`No access token found for ${config.provider}`);
      }

      const userId = await this.auth.getUserId();
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Create provider instance
      if (config.provider === 'microsoft') {
        this.provider = new MicrosoftGraphEmailProvider(accessToken, userId);
      } else {
        throw new Error(`Provider ${config.provider} not supported yet`);
      }

      // Get account information
      this.account = (await this.auth.createEmailAccount(config.provider)) || undefined;
    } catch (error) {
      console.error('Error configuring Zero mail driver:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return !!(this.config && this.provider && this.account);
  }

  async getAccount(): Promise<EmailAccount | null> {
    return this.account || null;
  }

  async getFolders(): Promise<ZeroMailFolder[]> {
    if (!this.provider) throw new Error('Driver not configured');

    try {
      const folders = await this.provider.listFolders();
      return folders.map(this.transformFolder);
    } catch (error) {
      console.error('Error getting folders:', error);
      throw error;
    }
  }

  async getFolder(id: string): Promise<ZeroMailFolder | null> {
    const folders = await this.getFolders();
    return folders.find(folder => folder.id === id) || null;
  }

  async getMessages(folderId?: string, options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    sortBy?: 'received' | 'sent' | 'subject';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    messages: ZeroMailMessage[];
    total: number;
    hasMore: boolean;
  }> {
    if (!this.provider) throw new Error('Driver not configured');

    try {
      const listRequest: EmailListRequest = {
        folder_id: folderId,
        page: options.page || 1,
        limit: options.limit || 20,
        unread_only: options.unreadOnly || false,
        sort_by: this.mapSortBy(options.sortBy),
        sort_order: options.sortOrder || 'desc'
      };

      const response = await this.provider.listMessages(folderId, listRequest);

      return {
        messages: response.emails.map(this.transformMessage),
        total: response.total,
        hasMore: response.has_more
      };
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  async getMessage(messageId: string, options: { includeBody?: boolean } = {}): Promise<ZeroMailMessage | null> {
    if (!this.provider) throw new Error('Driver not configured');

    try {
      const email = await this.provider.getMessage(messageId);
      return this.transformMessage(email);
    } catch (error) {
      console.error('Error getting message:', error);
      return null;
    }
  }

  async searchMessages(query: string, options: {
    folderId?: string;
    from?: string;
    to?: string;
    subject?: string;
    dateFrom?: Date;
    dateTo?: Date;
    hasAttachments?: boolean;
    isUnread?: boolean;
    page?: number;
    limit?: number;
  } = {}): Promise<{
    messages: ZeroMailMessage[];
    total: number;
    hasMore: boolean;
    query: string;
  }> {
    if (!this.provider) throw new Error('Driver not configured');

    try {
      const searchRequest: EmailSearchRequest = {
        query,
        folder_id: options.folderId,
        from: options.from,
        to: options.to,
        subject: options.subject,
        date_from: options.dateFrom?.toISOString(),
        date_to: options.dateTo?.toISOString(),
        has_attachments: options.hasAttachments,
        is_unread: options.isUnread,
        page: options.page || 1,
        limit: options.limit || 20
      };

      const response = await this.provider.search(searchRequest);

      return {
        messages: response.emails.map(this.transformMessage),
        total: response.total,
        hasMore: response.has_more,
        query: response.query
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  async sendMessage(message: {
    to: { address: string; name?: string }[];
    cc?: { address: string; name?: string }[];
    bcc?: { address: string; name?: string }[];
    subject: string;
    body: string;
    bodyType?: 'text' | 'html';
    importance?: 'low' | 'normal' | 'high';
    replyToMessageId?: string;
    forwardMessageId?: string;
  }): Promise<{ messageId: string; sentAt: Date }> {
    if (!this.provider) throw new Error('Driver not configured');

    try {
      const sendRequest: SendEmailRequest = {
        to: message.to,
        cc: message.cc,
        bcc: message.bcc,
        subject: message.subject,
        body: message.body,
        body_type: message.bodyType || 'html',
        importance: message.importance || 'normal',
        reply_to_message_id: message.replyToMessageId,
        forward_message_id: message.forwardMessageId
      };

      const response = await this.provider.send(sendRequest);

      return {
        messageId: response.message_id,
        sentAt: new Date(response.sent_at)
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    if (!this.provider) throw new Error('Driver not configured');
    await this.provider.markAsRead(messageId);
  }

  async markAsUnread(messageId: string): Promise<void> {
    if (!this.provider) throw new Error('Driver not configured');
    await this.provider.markAsUnread(messageId);
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.provider) throw new Error('Driver not configured');
    await this.provider.deleteMessage(messageId);
  }

  async moveMessage(messageId: string, targetFolderId: string): Promise<void> {
    if (!this.provider) throw new Error('Driver not configured');
    await this.provider.moveMessage(messageId, targetFolderId);
  }

  async sync(options: { fullSync?: boolean; folderIds?: string[] } = {}): Promise<void> {
    // In a real implementation, this would sync emails to a local database
    // For now, this is a no-op as we're working directly with the Graph API
    console.log('Sync operation requested:', options);
  }

  // Helper methods for data transformation
  private transformFolder(emailFolder: EmailFolder): ZeroMailFolder {
    return {
      id: emailFolder.folder_id,
      name: emailFolder.display_name,
      parentId: emailFolder.parent_folder_id,
      type: this.determineFolderType(emailFolder.display_name.toLowerCase()),
      unreadCount: emailFolder.unread_item_count,
      totalCount: emailFolder.total_item_count
    };
  }

  private transformMessage(email: Email): ZeroMailMessage {
    return {
      id: email.message_id,
      threadId: email.conversation_id,
      folderId: email.folder_id || '',
      subject: email.subject || '',
      preview: email.body_preview || '',
      body: email.body_content,
      bodyType: email.body_type || 'html',
      from: {
        address: email.from_address || '',
        name: email.from_name
      },
      to: email.to_recipients || [],
      cc: email.cc_recipients,
      bcc: email.bcc_recipients,
      replyTo: email.reply_to,
      importance: email.importance || 'normal',
      isRead: email.is_read,
      isDraft: email.is_draft,
      hasAttachments: email.has_attachments,
      categories: email.categories || [],
      sentAt: email.sent_at ? new Date(email.sent_at) : undefined,
      receivedAt: email.received_at ? new Date(email.received_at) : undefined,
      createdAt: new Date(email.created_at),
      updatedAt: new Date(email.updated_at)
    };
  }

  private determineFolderType(displayName: string): ZeroMailFolder['type'] {
    const name = displayName.toLowerCase();
    
    if (name.includes('inbox')) return 'inbox';
    if (name.includes('sent')) return 'sent';
    if (name.includes('draft')) return 'draft';
    if (name.includes('trash') || name.includes('deleted')) return 'trash';
    if (name.includes('junk') || name.includes('spam')) return 'junk';
    
    return 'custom';
  }

  private mapSortBy(sortBy?: string): 'received_at' | 'sent_at' | 'subject' {
    switch (sortBy) {
      case 'sent': return 'sent_at';
      case 'subject': return 'subject';
      case 'received':
      default:
        return 'received_at';
    }
  }
}

/**
 * Factory function to create a Zero mail driver
 */
export async function createZeroMailDriver(config: ZeroMailConfig): Promise<MicrosoftGraphZeroMailDriver> {
  const driver = new MicrosoftGraphZeroMailDriver();
  await driver.configure(config);
  return driver;
}

/**
 * Hook-style interface for React components
 */
export function useZeroMailDriver(config?: ZeroMailConfig) {
  const [driver, setDriver] = React.useState<MicrosoftGraphZeroMailDriver | null>(null);
  const [isConfigured, setIsConfigured] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (config) {
      createZeroMailDriver(config)
        .then(driverInstance => {
          setDriver(driverInstance);
          setIsConfigured(true);
          setError(null);
        })
        .catch(err => {
          console.error('Error creating Zero mail driver:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setDriver(null);
          setIsConfigured(false);
        });
    }
  }, [config]);

  return {
    driver,
    isConfigured,
    error
  };
}

// Import React for the hook
import React from 'react';