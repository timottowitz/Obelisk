// Email integration types for Microsoft Graph API

export interface EmailAccount {
  id: string;
  user_id: string;
  organization_id: string;
  provider: 'microsoft';
  provider_account_id: string;
  email_address: string;
  display_name?: string;
  scopes: string[];
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  sync_status: 'idle' | 'syncing' | 'failed';
  sync_error?: string;
}

export interface EmailFolder {
  id: string;
  account_id: string;
  folder_id: string;
  display_name: string;
  parent_folder_id?: string;
  child_folder_count: number;
  unread_item_count: number;
  total_item_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailRecipient {
  address: string;
  name?: string;
}

export interface Email {
  id: string;
  account_id: string;
  message_id: string;
  conversation_id?: string;
  folder_id?: string;
  subject?: string;
  body_preview?: string;
  body_content?: string;
  body_type?: 'text' | 'html';
  from_address?: string;
  from_name?: string;
  to_recipients?: EmailRecipient[];
  cc_recipients?: EmailRecipient[];
  bcc_recipients?: EmailRecipient[];
  reply_to?: EmailRecipient[];
  importance?: 'low' | 'normal' | 'high';
  is_read: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  categories?: string[];
  flag_status?: string;
  internet_message_id?: string;
  web_link?: string;
  sent_at?: string;
  received_at?: string;
  created_at: string;
  updated_at: string;
  case_id?: string;
  contact_ids?: string[];
}

export interface EmailAttachment {
  id: string;
  email_id: string;
  attachment_id: string;
  name: string;
  content_type?: string;
  size?: number;
  is_inline: boolean;
  content_id?: string;
  content_location?: string;
  storage_file_id?: string;
  created_at: string;
}

export interface EmailLabel {
  id: string;
  name: string;
  color?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailLabelAssignment {
  id: string;
  email_id: string;
  label_id: string;
  assigned_by: string;
  assigned_at: string;
}

export interface EmailRule {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Microsoft Graph API types
export interface GraphMessage {
  id: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
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
  replyTo?: Array<{
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
  flag?: {
    flagStatus: string;
  };
  internetMessageId?: string;
  webLink?: string;
  sentDateTime?: string;
  receivedDateTime?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  parentFolderId?: string;
  attachments?: GraphAttachment[];
}

export interface GraphFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden?: boolean;
}

export interface GraphAttachment {
  id: string;
  name: string;
  contentType?: string;
  size?: number;
  isInline: boolean;
  contentId?: string;
  contentLocation?: string;
}

export interface GraphUser {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

// API Request/Response types
export interface EmailStatusResponse {
  connected: boolean;
  account?: EmailAccount;
  folders?: EmailFolder[];
}

export interface EmailListRequest {
  folder_id?: string;
  page?: number;
  limit?: number;
  unread_only?: boolean;
  sort_by?: 'received_at' | 'sent_at' | 'subject';
  sort_order?: 'asc' | 'desc';
}

export interface EmailListResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface EmailSearchRequest {
  query: string;
  folder_id?: string;
  from?: string;
  to?: string;
  subject?: string;
  date_from?: string;
  date_to?: string;
  has_attachments?: boolean;
  is_unread?: boolean;
  page?: number;
  limit?: number;
}

export interface EmailSearchResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
  query: string;
}

export interface SendEmailRequest {
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject: string;
  body: string;
  body_type?: 'text' | 'html';
  importance?: 'low' | 'normal' | 'high';
  save_to_sent_items?: boolean;
  reply_to_message_id?: string;
  forward_message_id?: string;
  case_id?: string;
  contact_ids?: string[];
}

export interface SendEmailResponse {
  message_id: string;
  sent_at: string;
  success: boolean;
}

export interface EmailSyncOptions {
  full_sync?: boolean;
  folder_ids?: string[];
  since?: string;
}

export interface EmailSyncResponse {
  synced_folders: number;
  synced_messages: number;
  errors: string[];
  completed_at: string;
}

// Provider interface
export interface EmailProvider {
  listFolders(): Promise<EmailFolder[]>;
  listMessages(folderId?: string, options?: EmailListRequest): Promise<EmailListResponse>;
  getMessage(messageId: string): Promise<Email>;
  search(query: EmailSearchRequest): Promise<EmailSearchResponse>;
  send(message: SendEmailRequest): Promise<SendEmailResponse>;
  markAsRead(messageId: string): Promise<void>;
  markAsUnread(messageId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  moveMessage(messageId: string, targetFolderId: string): Promise<void>;
}