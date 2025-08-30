# Email Integration Documentation

## Overview

This document describes the email integration implementation for the Obelisk application, specifically the Zero-compatible email system that works with Microsoft Graph API and Clerk authentication.

## Architecture

The email integration consists of several key components:

### 1. Zero Auth Adapter (`/frontend/src/adapters/zero-email-adapter.ts`)

Provides a bridge between Zero's expected authentication interfaces and Obelisk's Clerk-based authentication system.

**Key Features:**
- Manages OAuth tokens for Microsoft and Google (future)
- Provides Zero-compatible authentication interface
- Handles token refresh and validation
- Creates EmailAccount records from connected providers

**Main Classes:**
- `ClerkZeroEmailAdapter`: Main adapter implementation
- `useZeroEmailAuth()`: React hook for authentication

### 2. Zero Mail Driver (`/frontend/src/lib/zero-mail-driver.ts`)

Implements Zero's mail driver interface using Microsoft Graph API, providing a consistent abstraction layer.

**Key Features:**
- Zero-compatible mail operations interface
- Microsoft Graph API integration
- Message, folder, and search operations
- Send email functionality
- Data transformation between Graph API and Zero formats

**Main Classes:**
- `MicrosoftGraphZeroMailDriver`: Core driver implementation
- `createZeroMailDriver()`: Factory function
- `useZeroMailDriver()`: React hook for driver management

### 3. Zero Mail Shell UI (`/frontend/src/components/email/ZeroMailShell.tsx`)

A comprehensive email interface component that mimics Zero's UI patterns while integrating with Obelisk's design system.

**Key Features:**
- Folder navigation sidebar
- Message list with search
- Message preview pane
- Mobile-responsive design
- Zero-like user experience
- Integration with Obelisk UI components

### 4. Email Hooks (`/frontend/src/hooks/useEmails.ts`)

Provides React hooks for managing email state and operations throughout the application.

**Key Features:**
- Connection status management
- Email folder and message queries
- Search functionality
- Email actions (read, delete, move)
- Send email operations
- Sync functionality

### 5. Feature Flag Integration

Email integration can be enabled/disabled via feature flags.

**Configuration:**
- `emailIntegration`: Master switch for email functionality
- Environment variable: `NEXT_PUBLIC_FEATURE_EMAIL_INTEGRATION`
- Local override: `feature_flag_emailintegration` in localStorage (dev mode)

## Usage

### Basic Setup

1. **Enable the feature flag:**
   ```typescript
   // In development, you can override via localStorage
   localStorage.setItem('feature_flag_emailintegration', 'true');
   ```

2. **Connect Microsoft Account:**
   ```tsx
   import { ConnectMicrosoftButton } from '@/components/email/ConnectMicrosoftButton';
   
   function EmailSetup() {
     return <ConnectMicrosoftButton />;
   }
   ```

3. **Use the Zero Mail Shell:**
   ```tsx
   import { ZeroMailShell } from '@/components/email/ZeroMailShell';
   
   function EmailPage() {
     return (
       <ZeroMailShell
         showFolders={true}
         showPreview={true}
         defaultView="inbox"
         onMessageSelect={(message) => console.log('Selected:', message)}
       />
     );
   }
   ```

### Using Email Hooks

```tsx
import { useEmailSystem, useEmailConnection } from '@/hooks/useEmails';

function EmailComponent() {
  const { connection, folders, emails, actions } = useEmailSystem('inbox');
  
  if (!connection.status.isConnected) {
    return <div>Please connect your email account</div>;
  }
  
  return (
    <div>
      {folders.data?.map(folder => (
        <div key={folder.id}>{folder.name}</div>
      ))}
      
      {emails.data?.messages.map(message => (
        <div key={message.id} onClick={() => actions.markAsRead.mutate(message.id)}>
          {message.subject}
        </div>
      ))}
    </div>
  );
}
```

### Advanced Usage

```tsx
import { useEmailSearch, useSendEmail } from '@/hooks/useEmails';

function AdvancedEmailOperations() {
  const sendEmail = useSendEmail();
  const searchResults = useEmailSearch('urgent', {
    folderId: 'inbox',
    isUnread: true
  });
  
  const handleSendEmail = () => {
    sendEmail.mutate({
      to: [{ address: 'user@example.com', name: 'John Doe' }],
      subject: 'Test Email',
      body: 'Hello from Obelisk!',
      bodyType: 'html'
    });
  };
  
  return (
    <div>
      <button onClick={handleSendEmail}>Send Test Email</button>
      
      {searchResults.data?.messages.map(message => (
        <div key={message.id}>{message.subject}</div>
      ))}
    </div>
  );
}
```

## API Reference

### Zero Auth Adapter

```typescript
interface ZeroEmailAuth {
  getAccessToken(provider: string): Promise<string | null>;
  getUserId(): string | null;
  isAuthenticated(): boolean;
  connectProvider(provider: 'microsoft' | 'google', scopes: string[]): Promise<void>;
  disconnectProvider(provider: 'microsoft' | 'google'): Promise<void>;
  getProviderStatus(provider: 'microsoft' | 'google'): Promise<ProviderStatus>;
}
```

### Zero Mail Driver

```typescript
interface ZeroMailDriver {
  configure(config: ZeroMailConfig): Promise<void>;
  getFolders(): Promise<ZeroMailFolder[]>;
  getMessages(folderId?: string, options?: MessageOptions): Promise<MessageResponse>;
  getMessage(messageId: string): Promise<ZeroMailMessage | null>;
  searchMessages(query: string, options?: SearchOptions): Promise<SearchResponse>;
  sendMessage(message: SendMessageRequest): Promise<SendResponse>;
  markAsRead(messageId: string): Promise<void>;
  markAsUnread(messageId: string): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
  moveMessage(messageId: string, targetFolderId: string): Promise<void>;
}
```

### Email Hooks

```typescript
// Connection status
const { status, loading, error, refresh } = useEmailConnection();

// Email folders
const { data: folders, isLoading, error } = useEmailFolders();

// Email messages
const { data: emailResponse, isLoading, error } = useEmails({
  folderId: 'inbox',
  page: 1,
  limit: 20,
  unreadOnly: false,
  sortBy: 'received',
  sortOrder: 'desc'
});

// Search emails
const { data: searchResponse } = useEmailSearch('query', {
  folderId: 'inbox',
  from: 'sender@example.com',
  hasAttachments: true
});

// Email actions
const { markAsRead, markAsUnread, deleteMessage, moveMessage } = useEmailActions();

// Send email
const sendEmail = useSendEmail();
```

## Data Models

### ZeroMailMessage

```typescript
interface ZeroMailMessage {
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
```

### ZeroMailFolder

```typescript
interface ZeroMailFolder {
  id: string;
  name: string;
  parentId?: string;
  type: 'inbox' | 'sent' | 'draft' | 'trash' | 'junk' | 'custom';
  unreadCount: number;
  totalCount: number;
  children?: ZeroMailFolder[];
}
```

## Configuration

### Environment Variables

```bash
# Feature flag
NEXT_PUBLIC_FEATURE_EMAIL_INTEGRATION=true

# Microsoft Graph API (handled by Clerk)
# These are configured in Clerk Dashboard
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
```

### Required Scopes

The integration requires the following Microsoft Graph scopes:
- `https://graph.microsoft.com/Mail.Read`
- `https://graph.microsoft.com/Mail.Send`
- `https://graph.microsoft.com/Mail.ReadWrite`
- `https://graph.microsoft.com/MailboxSettings.ReadWrite`

## Error Handling

The system includes comprehensive error handling:

1. **Authentication Errors**: Handled by the auth adapter with appropriate error messages
2. **API Errors**: Microsoft Graph API errors are caught and transformed into user-friendly messages
3. **Network Errors**: Retry logic and fallback states for network issues
4. **Permission Errors**: Clear messaging when scopes are insufficient

## Performance Considerations

1. **Caching**: React Query provides intelligent caching of email data
2. **Pagination**: Messages are loaded in pages to avoid large data transfers
3. **Selective Loading**: Message bodies are loaded on-demand
4. **Background Sync**: Optional background synchronization for offline support

## Security

1. **Token Management**: OAuth tokens are managed securely through Clerk
2. **Scope Validation**: Required scopes are validated before operations
3. **Data Sanitization**: Email content is sanitized for display
4. **CORS Compliance**: All API calls respect CORS policies

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check Clerk configuration and Microsoft app registration
2. **Permission Denied**: Ensure required scopes are granted
3. **Token Expired**: Tokens are automatically refreshed, but manual reconnection may be needed
4. **Sync Issues**: Check network connectivity and Microsoft service status

### Debug Mode

Enable debug logging in development:

```typescript
// In your component or hook
console.log('Email driver status:', driver?.isConfigured());
console.log('Connection status:', connection.status);
```

## Future Enhancements

1. **Google Integration**: Add support for Gmail via Google Workspace API
2. **Offline Support**: Enhanced caching and offline message composition
3. **Advanced Search**: Full-text search with filters and sorting
4. **Email Templates**: Predefined templates for common legal communications
5. **Attachment Handling**: Enhanced file upload and management
6. **Email Threading**: Improved conversation view and threading

## Migration Notes

If migrating from an existing email system:

1. Export existing email data if needed
2. Update feature flag configuration
3. Test connection with a limited user group
4. Monitor performance and error rates
5. Gradually roll out to all users

## Support

For technical support or questions about the email integration:

1. Check this documentation first
2. Review error messages in browser console
3. Verify Clerk and Microsoft app configuration
4. Test with a fresh browser session to rule out cache issues

---

*This document is part of the Obelisk email integration system. Last updated: 2025-08-27*