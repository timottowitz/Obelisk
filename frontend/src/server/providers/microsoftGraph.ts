import { auth } from '@clerk/nextjs/server';
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
  GraphMessage,
  GraphFolder,
  GraphUser,
  EmailRecipient 
} from '@/types/email';
import { graphFetch, graphFetchPaginated, buildODataParams, GraphListResponse } from '@/lib/graph';

export class MicrosoftGraphEmailProvider implements EmailProvider {
  private accessToken: string;
  private userId: string;
  
  constructor(accessToken: string, userId: string) {
    this.accessToken = accessToken;
    this.userId = userId;
  }
  
  static async create(): Promise<MicrosoftGraphEmailProvider> {
    const { userId } = auth();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    
    // Get Microsoft access token from Clerk
    const token = await auth().sessionClaims?.then(claims => 
      (claims as any)?.microsoft_access_token
    );
    
    if (!token) {
      throw new Error('Microsoft access token not found. Please reconnect your Microsoft account.');
    }
    
    return new MicrosoftGraphEmailProvider(token, userId);
  }

  async listFolders(): Promise<EmailFolder[]> {
    try {
      const response = await graphFetch<GraphListResponse<GraphFolder>>(
        '/me/mailFolders',
        this.accessToken
      );
      
      return response.value.map(this.transformFolder);
    } catch (error) {
      console.error('Error fetching folders:', error);
      throw new Error(`Failed to fetch folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listMessages(folderId?: string, options: EmailListRequest = {}): Promise<EmailListResponse> {
    const {
      page = 1,
      limit = 20,
      unread_only = false,
      sort_by = 'received_at',
      sort_order = 'desc'
    } = options;

    try {
      // Build folder path
      const folderPath = folderId ? `/me/mailFolders/${folderId}/messages` : '/me/messages';
      
      // Build filters
      const filters: string[] = [];
      if (unread_only) {
        filters.push('isRead eq false');
      }
      
      // Build sort order
      const sortField = sort_by === 'sent_at' ? 'sentDateTime' : 
                       sort_by === 'subject' ? 'subject' : 'receivedDateTime';
      const orderBy = `${sortField} ${sort_order}`;
      
      const queryParams = buildODataParams({
        select: [
          'id', 'conversationId', 'subject', 'bodyPreview', 'from', 
          'toRecipients', 'ccRecipients', 'importance', 'isRead', 
          'isDraft', 'hasAttachments', 'categories', 'flag',
          'internetMessageId', 'webLink', 'sentDateTime', 
          'receivedDateTime', 'createdDateTime', 'parentFolderId'
        ],
        filter: filters.length > 0 ? filters.join(' and ') : undefined,
        orderby: orderBy,
        top: limit,
        skip: (page - 1) * limit
      });

      const response = await graphFetch<GraphListResponse<GraphMessage>>(
        `${folderPath}${queryParams}`,
        this.accessToken
      );

      // Get total count (this is approximate as Graph API doesn't always provide exact counts)
      const total = response.value.length === limit ? (page * limit) + 1 : (page - 1) * limit + response.value.length;

      return {
        emails: response.value.map(msg => this.transformMessage(msg)),
        total,
        page,
        limit,
        has_more: response.value.length === limit
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error(`Failed to fetch messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessage(messageId: string): Promise<Email> {
    try {
      const response = await graphFetch<GraphMessage>(
        `/me/messages/${messageId}`,
        this.accessToken,
        {},
        { eventual: false }
      );

      // Get full message body
      const bodyResponse = await graphFetch<{ body: { contentType: string; content: string } }>(
        `/me/messages/${messageId}?$select=body`,
        this.accessToken
      );

      response.body = bodyResponse.body;

      return this.transformMessage(response);
    } catch (error) {
      console.error('Error fetching message:', error);
      throw new Error(`Failed to fetch message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async search(searchOptions: EmailSearchRequest): Promise<EmailSearchResponse> {
    const {
      query,
      folder_id,
      from,
      to,
      subject,
      date_from,
      date_to,
      has_attachments,
      is_unread,
      page = 1,
      limit = 20
    } = searchOptions;

    try {
      // Build search query
      let searchQuery = query;
      
      // Add additional search filters
      if (from) searchQuery += ` from:${from}`;
      if (to) searchQuery += ` to:${to}`;
      if (subject) searchQuery += ` subject:${subject}`;
      if (has_attachments !== undefined) searchQuery += ` hasattachments:${has_attachments}`;
      if (is_unread !== undefined) searchQuery += ` isread:${!is_unread}`;
      
      // Build date filters
      const filters: string[] = [];
      if (date_from) {
        filters.push(`receivedDateTime ge ${new Date(date_from).toISOString()}`);
      }
      if (date_to) {
        filters.push(`receivedDateTime le ${new Date(date_to).toISOString()}`);
      }

      const queryParams = buildODataParams({
        search: searchQuery,
        filter: filters.length > 0 ? filters.join(' and ') : undefined,
        select: [
          'id', 'conversationId', 'subject', 'bodyPreview', 'from',
          'toRecipients', 'ccRecipients', 'importance', 'isRead',
          'isDraft', 'hasAttachments', 'categories', 'flag',
          'internetMessageId', 'webLink', 'sentDateTime',
          'receivedDateTime', 'createdDateTime', 'parentFolderId'
        ],
        orderby: 'receivedDateTime desc',
        top: limit,
        skip: (page - 1) * limit,
        count: true
      });

      const searchPath = folder_id ? 
        `/me/mailFolders/${folder_id}/messages${queryParams}` : 
        `/me/messages${queryParams}`;

      const response = await graphFetch<GraphListResponse<GraphMessage>>(
        searchPath,
        this.accessToken,
        {},
        { eventual: true } // Search operations need eventual consistency
      );

      const total = response.value.length === limit ? (page * limit) + 1 : (page - 1) * limit + response.value.length;

      return {
        emails: response.value.map(msg => this.transformMessage(msg)),
        total,
        page,
        limit,
        has_more: response.value.length === limit,
        query: searchQuery
      };
    } catch (error) {
      console.error('Error searching messages:', error);
      throw new Error(`Failed to search messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async send(messageData: SendEmailRequest): Promise<SendEmailResponse> {
    const {
      to,
      cc,
      bcc,
      subject,
      body,
      body_type = 'html',
      importance = 'normal',
      save_to_sent_items = true,
      reply_to_message_id,
      forward_message_id
    } = messageData;

    try {
      const message = {
        subject,
        body: {
          contentType: body_type,
          content: body
        },
        toRecipients: to.map(recipient => ({
          emailAddress: {
            address: recipient.address,
            name: recipient.name
          }
        })),
        ccRecipients: cc?.map(recipient => ({
          emailAddress: {
            address: recipient.address,
            name: recipient.name
          }
        })),
        bccRecipients: bcc?.map(recipient => ({
          emailAddress: {
            address: recipient.address,
            name: recipient.name
          }
        })),
        importance
      };

      let endpoint = '/me/sendMail';
      let body_data: any = {
        message,
        saveToSentItems: save_to_sent_items
      };

      // Handle reply or forward
      if (reply_to_message_id) {
        endpoint = `/me/messages/${reply_to_message_id}/reply`;
        body_data = {
          message,
          comment: body
        };
      } else if (forward_message_id) {
        endpoint = `/me/messages/${forward_message_id}/forward`;
        body_data = {
          message,
          comment: body
        };
      }

      await graphFetch(
        endpoint,
        this.accessToken,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body_data)
        }
      );

      return {
        message_id: `sent_${Date.now()}`, // Graph API doesn't return message ID for sent messages
        sent_at: new Date().toISOString(),
        success: true
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    try {
      await graphFetch(
        `/me/messages/${messageId}`,
        this.accessToken,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isRead: true })
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw new Error(`Failed to mark message as read: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async markAsUnread(messageId: string): Promise<void> {
    try {
      await graphFetch(
        `/me/messages/${messageId}`,
        this.accessToken,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ isRead: false })
        }
      );
    } catch (error) {
      console.error('Error marking message as unread:', error);
      throw new Error(`Failed to mark message as unread: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await graphFetch(
        `/me/messages/${messageId}`,
        this.accessToken,
        {
          method: 'DELETE'
        }
      );
    } catch (error) {
      console.error('Error deleting message:', error);
      throw new Error(`Failed to delete message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async moveMessage(messageId: string, targetFolderId: string): Promise<void> {
    try {
      await graphFetch(
        `/me/messages/${messageId}/move`,
        this.accessToken,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            destinationId: targetFolderId
          })
        }
      );
    } catch (error) {
      console.error('Error moving message:', error);
      throw new Error(`Failed to move message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods for transforming Graph API data
  private transformFolder(graphFolder: GraphFolder): EmailFolder {
    return {
      id: crypto.randomUUID(), // Generate local UUID
      account_id: this.userId,
      folder_id: graphFolder.id,
      display_name: graphFolder.displayName,
      parent_folder_id: graphFolder.parentFolderId,
      child_folder_count: graphFolder.childFolderCount,
      unread_item_count: graphFolder.unreadItemCount,
      total_item_count: graphFolder.totalItemCount,
      is_hidden: graphFolder.isHidden || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private transformMessage(graphMessage: GraphMessage): Email {
    const transformRecipients = (recipients?: Array<{ emailAddress: { address: string; name?: string } }>): EmailRecipient[] => {
      return recipients?.map(r => ({
        address: r.emailAddress.address,
        name: r.emailAddress.name
      })) || [];
    };

    return {
      id: crypto.randomUUID(), // Generate local UUID
      account_id: this.userId,
      message_id: graphMessage.id,
      conversation_id: graphMessage.conversationId,
      folder_id: graphMessage.parentFolderId,
      subject: graphMessage.subject,
      body_preview: graphMessage.bodyPreview,
      body_content: graphMessage.body?.content,
      body_type: graphMessage.body?.contentType,
      from_address: graphMessage.from?.emailAddress.address,
      from_name: graphMessage.from?.emailAddress.name,
      to_recipients: transformRecipients(graphMessage.toRecipients),
      cc_recipients: transformRecipients(graphMessage.ccRecipients),
      bcc_recipients: transformRecipients(graphMessage.bccRecipients),
      reply_to: transformRecipients(graphMessage.replyTo),
      importance: graphMessage.importance,
      is_read: graphMessage.isRead,
      is_draft: graphMessage.isDraft,
      has_attachments: graphMessage.hasAttachments,
      categories: graphMessage.categories,
      flag_status: graphMessage.flag?.flagStatus,
      internet_message_id: graphMessage.internetMessageId,
      web_link: graphMessage.webLink,
      sent_at: graphMessage.sentDateTime,
      received_at: graphMessage.receivedDateTime,
      created_at: graphMessage.createdDateTime || new Date().toISOString(),
      updated_at: graphMessage.lastModifiedDateTime || new Date().toISOString()
    };
  }
}