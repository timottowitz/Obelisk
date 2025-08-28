# Email Content Storage Service Documentation

## Overview

The Email Content Storage Service is a comprehensive system for securely storing and retrieving email content and attachments in Google Cloud Storage. This system integrates Microsoft Graph API with Google Cloud Storage to provide a complete email archival solution for case management.

## Architecture

### Components

1. **EmailStorageService** (`/frontend/src/lib/services/email-storage.ts`)
   - Core service for Google Cloud Storage operations
   - Handles email content and attachment storage/retrieval
   - Provides error handling and storage optimization

2. **MicrosoftGraphEmailClient** (`/frontend/src/lib/services/microsoft-graph-client.ts`)
   - Enhanced Microsoft Graph API client
   - Includes rate limiting and retry logic
   - Supports bulk email processing with progress tracking

3. **MicrosoftAuthService** (`/frontend/src/lib/services/microsoft-auth-service.ts`)
   - OAuth token management for Microsoft Graph
   - Automatic token refresh and validation
   - User connection status tracking

4. **API Endpoints**
   - Email assignment with content storage
   - Content retrieval with format options
   - Individual attachment downloads

### Storage Structure

```
Google Cloud Storage Bucket:
└── cases/
    └── {caseId}/
        └── emails/
            └── {emailId}/
                ├── metadata.json          # Email metadata
                ├── content.html          # HTML body content
                ├── content.txt           # Plain text content (if available)
                ├── content.rtf           # RTF content (if available)
                ├── headers.json          # Email headers
                └── attachments/
                    └── {attachmentId}/
                        ├── {filename}    # Attachment content
                        └── metadata.json # Attachment metadata
```

## Features

### Email Content Storage
- **Multiple Formats**: Supports HTML, plain text, and RTF content formats
- **Headers**: Preserves complete email headers for forensic analysis
- **Metadata**: Comprehensive metadata including sender, recipients, timestamps
- **Deduplication**: Prevents duplicate storage of the same email content

### Attachment Handling
- **Binary Content**: Secure storage of all attachment types
- **Metadata Preservation**: Maintains original filename, content type, size
- **Inline Attachments**: Proper handling of embedded images and content
- **Security**: Content-type validation and security headers for downloads

### Error Handling & Reliability
- **Retry Logic**: Automatic retry with exponential backoff for failed operations
- **Rate Limiting**: Microsoft Graph API rate limit compliance
- **Graceful Degradation**: Assignment completes even if storage fails
- **Comprehensive Logging**: Detailed error logging and operation tracking

### Security Features
- **Authentication**: Clerk user authentication required for all operations
- **Authorization**: Organization-level access control
- **Token Management**: Secure OAuth token storage and refresh
- **Content Security**: Proper headers and content type validation

## API Endpoints

### Email Assignment with Storage
```
POST /api/emails/{emailId}/assign
```
- Assigns email to a case and stores content in GCS
- Automatically fetches content from Microsoft Graph
- Returns assignment status and storage details

**Request Body:**
```json
{
  "caseId": "uuid-of-case"
}
```

**Response:**
```json
{
  "success": true,
  "assignment": {
    "id": "assignment-uuid",
    "emailId": "graph-email-id",
    "caseId": "case-uuid",
    "status": "completed",
    "storageLocation": "cases/{caseId}/emails/{emailId}/"
  },
  "storage": {
    "status": "completed",
    "error": null
  }
}
```

### Email Content Retrieval
```
GET /api/emails/{emailId}/content?format=html&attachments=true&metadata=true
```
- Retrieves stored email content from GCS
- Supports format filtering and attachment inclusion

**Query Parameters:**
- `format`: Content format (`html`, `text`, `rtf`, `all`)
- `attachments`: Include attachment metadata (`true`/`false`)
- `metadata`: Include email metadata (`true`/`false`)

**Response:**
```json
{
  "success": true,
  "data": {
    "emailId": "graph-email-id",
    "caseId": "case-uuid",
    "metadata": { /* email metadata */ },
    "content": {
      "htmlBody": "email HTML content",
      "headers": { /* email headers */ }
    },
    "attachments": [
      {
        "id": "attachment-id",
        "name": "filename.pdf",
        "contentType": "application/pdf",
        "size": 1024,
        "isInline": false,
        "hasContent": true
      }
    ],
    "stats": {
      "hasHtmlContent": true,
      "attachmentCount": 1,
      "totalAttachmentSize": 1024
    }
  }
}
```

### Attachment Download
```
GET /api/emails/{emailId}/attachments/{attachmentId}?download=true
```
- Downloads individual attachment from GCS
- Supports inline viewing and forced download

**Query Parameters:**
- `download`: Force download (`true`/`false`)
- `inline`: Display inline (`true`/`false`)

**Response:** Binary attachment content with appropriate headers

## Configuration

### Environment Variables

**Required:**
```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
MICROSOFT_CLIENT_ID=your-app-id
MICROSOFT_CLIENT_SECRET=your-app-secret
```

**Optional:**
```env
GOOGLE_CLOUD_EMAIL_BUCKET_NAME=obelisk-email-content
GOOGLE_CLOUD_KEY_FILE=/path/to/service-account.json
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account",...}
MICROSOFT_TENANT_ID=common
```

### Google Cloud Storage Setup

1. **Create Service Account**
   ```bash
   gcloud iam service-accounts create email-storage-service \
     --display-name="Email Storage Service"
   ```

2. **Grant Permissions**
   ```bash
   gcloud projects add-iam-policy-binding PROJECT_ID \
     --member="serviceAccount:email-storage-service@PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"
   ```

3. **Create and Download Key**
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=email-storage-service@PROJECT_ID.iam.gserviceaccount.com
   ```

### Microsoft Graph API Setup

1. **Register Application** in Azure Portal
2. **Configure Permissions**:
   - `Mail.ReadWrite` (Delegated)
   - `Mail.Send` (Delegated)
   - `User.Read` (Delegated)
3. **Set Redirect URIs** for your application
4. **Generate Client Secret**

## Usage Examples

### Initialize Services

```typescript
import { createEmailStorageService, getDefaultStorageConfig } from '@/lib/services/email-storage';
import { createGraphEmailClient } from '@/lib/services/microsoft-graph-client';
import { getMicrosoftGraphToken } from '@/lib/services/microsoft-auth-service';

// Initialize storage service
const storageConfig = getDefaultStorageConfig();
const storageService = createEmailStorageService(storageConfig);

// Get user's access token
const accessToken = await getMicrosoftGraphToken(userId, orgId);

// Initialize Graph client
const graphClient = createGraphEmailClient(accessToken);
```

### Store Email Content

```typescript
// Fetch email from Microsoft Graph
const { content, metadata } = await graphClient.fetchEmailContent(emailId);

// Store in Google Cloud Storage
const result = await storageService.storeEmailContent(
  emailId,
  caseId,
  content,
  metadata
);

if (result.success) {
  console.log('Email stored successfully:', result.storagePath);
  console.log('Attachments stored:', result.attachmentFiles.length);
}
```

### Retrieve Email Content

```typescript
// Retrieve from Google Cloud Storage
const emailContent = await storageService.getEmailContent(emailId, caseId);

console.log('Email subject:', emailContent.metadata.subject);
console.log('HTML content:', emailContent.content.htmlBody);
console.log('Attachments:', emailContent.attachments.length);
```

### Batch Processing

```typescript
const results = await graphClient.fetchMultipleEmailsContent(
  messageIds,
  (status) => {
    console.log(`Progress: ${status.progress}% - ${status.operation}`);
  }
);

for (const result of results) {
  if (result.content && result.metadata) {
    await storageService.storeEmailContent(
      result.messageId,
      caseId,
      result.content,
      result.metadata
    );
  }
}
```

## Error Handling

### Storage Errors

```typescript
try {
  const result = await storageService.storeEmailContent(emailId, caseId, content, metadata);
} catch (error) {
  if (error instanceof EmailStorageError) {
    switch (error.code) {
      case 'BUCKET_ERROR':
        // Handle bucket access issues
        break;
      case 'STORAGE_ERROR':
        // Handle storage operation failures
        break;
      case 'NOT_FOUND':
        // Handle missing content
        break;
    }
  }
}
```

### Graph API Errors

```typescript
try {
  const { content, metadata } = await graphClient.fetchEmailContent(emailId);
} catch (error) {
  console.error('Graph API error:', error.message);
  // Automatic retry logic is built into the client
}
```

## Performance Considerations

### Rate Limiting
- Default: 60 requests per minute to Microsoft Graph
- Configurable delay between requests
- Automatic backoff on rate limit errors

### Storage Optimization
- Content compression for large emails
- Attachment deduplication
- Lifecycle policies for old content

### Bulk Operations
- Parallel processing with concurrency limits
- Progress tracking for long-running operations
- Graceful handling of partial failures

## Monitoring & Troubleshooting

### Logging
- Comprehensive error logging with context
- Operation tracking with timestamps
- Performance metrics collection

### Database Tracking
- Assignment status in `email_assignments` table
- Error details in `error_message` field
- Audit trail in `email_assignment_logs` table

### Health Checks
- Storage service connectivity
- Microsoft Graph API availability
- Token validity and refresh status

## Security Best Practices

1. **Token Security**
   - Encrypted token storage
   - Automatic token rotation
   - Secure token transmission

2. **Access Control**
   - Organization-level isolation
   - User authentication required
   - Case-based access restrictions

3. **Content Security**
   - Virus scanning for attachments
   - Content type validation
   - Secure download headers

4. **Data Privacy**
   - GDPR compliance features
   - Data retention policies
   - Secure deletion capabilities

## Future Enhancements

1. **Advanced Features**
   - Full-text search in stored content
   - Email thread reconstruction
   - Advanced attachment processing

2. **Performance Improvements**
   - CDN integration for faster downloads
   - Caching layer for frequently accessed content
   - Background processing queues

3. **Analytics**
   - Storage usage analytics
   - Email processing metrics
   - User activity tracking

## Support & Maintenance

### Regular Maintenance
- Token refresh monitoring
- Storage usage optimization
- Error rate analysis

### Troubleshooting
- Check Microsoft Graph API connectivity
- Verify Google Cloud Storage permissions
- Monitor token expiration and refresh
- Review error logs for patterns

For technical support, consult the error codes and detailed logging output provided by each service component.