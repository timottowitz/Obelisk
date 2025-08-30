# DocETL Processor - Asynchronous Task Queue Implementation

This implementation provides a robust asynchronous task queue system for document intelligence processing using Supabase Edge Functions, designed to handle long-running docetl operations that exceed the 60-second Edge Function timeout limit.

## Architecture Overview

The system implements a job queue pattern with the following components:

### 1. Database Schema (`20250830_100000_doc_intel_job_queue.sql`)
- **doc_intel_job_queue**: Main job queue table with status tracking, progress monitoring, and retry logic
- **doc_intel_job_logs**: Detailed logging for each job execution
- **doc_intel_job_heartbeats**: Worker heartbeat monitoring for timeout detection
- Database functions for job claiming, completion, and failure handling
- Row Level Security (RLS) policies for tenant isolation

### 2. Edge Function Components

#### Main Handler (`index.ts`)
- REST API endpoints for job management
- Job creation, status checking, and cancellation
- Cross-tenant job processing with schema isolation
- Worker-based job claiming mechanism

#### Job Processor (`job-processor.ts`)
- Core processing logic for extract, transform, and pipeline operations
- Heartbeat monitoring and progress tracking
- Integration with error handling and webhook systems
- Mock DocETL operations (ready for real DocETL integration)

#### Error Handling (`error-handler.ts`)
- Comprehensive error classification system
- Retry logic with exponential backoff
- Error recovery strategies
- Support for different error categories (network, timeout, resource, etc.)

#### Webhook Handler (`webhook-handler.ts`)
- Real-time job status notifications
- Long-running task coordination
- Polling mechanism for timeout detection
- HMAC signature verification for webhook security

## API Endpoints

### Job Management
- `GET /doc-intel-processor/jobs` - List jobs for user
- `POST /doc-intel-processor/jobs` - Create new job
- `GET /doc-intel-processor/status/:id` - Get job status and logs
- `PUT /doc-intel-processor/jobs/:id/cancel` - Cancel pending job

### Processing
- `POST /doc-intel-processor/process` - Process next available job
- `GET /doc-intel-processor/health` - Health check

## Job Types

### Extract Job
- Extracts entities from documents using DocETL
- Updates the `entities` table with extracted data
- Provides confidence scores and metadata

### Transform Job
- Transforms extracted data according to pipeline configuration
- Applies normalization and relationship mapping
- Updates document metadata

### Pipeline Job
- Combines extraction and transformation in sequence
- Provides comprehensive document processing
- Stores both extraction and transformation results

## Usage Examples

### Creating a Job
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/doc-intel-processor/jobs" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_type": "extract",
    "document_id": "document-uuid",
    "pipeline_config": {
      "extraction_type": "entities",
      "confidence_threshold": 0.8
    },
    "priority": 1,
    "metadata": {
      "webhook": {
        "url": "https://your-app.com/webhooks/docetl",
        "secret": "your-webhook-secret"
      }
    }
  }'
```

### Checking Job Status
```bash
curl -X GET "${SUPABASE_URL}/functions/v1/doc-intel-processor/status/${JOB_ID}" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Processing Jobs (Worker)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/doc-intel-processor/process" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "job_types": ["extract", "transform"]
  }'
```

## Configuration

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database operations

### Job Configuration
Jobs are configured via the `pipeline_config` field:

```json
{
  "extraction_type": "entities|relationships|both",
  "confidence_threshold": 0.8,
  "model_settings": {
    "temperature": 0.1,
    "max_tokens": 1000
  },
  "transformation_rules": [
    {
      "field": "entity_value",
      "operation": "normalize",
      "params": {"case": "upper"}
    }
  ]
}
```

### Webhook Configuration
Enable real-time notifications by adding webhook configuration to job metadata:

```json
{
  "webhook": {
    "url": "https://your-app.com/webhook",
    "secret": "your-hmac-secret",
    "headers": {
      "X-Custom-Header": "value"
    },
    "retryAttempts": 3,
    "retryDelay": 1000
  }
}
```

## Error Handling and Retry Logic

### Error Categories
- **Network**: Connection issues, timeouts
- **Resource**: Memory, disk space limitations
- **Validation**: Invalid input data
- **Permission**: Access denied errors
- **Rate Limit**: API quota exceeded
- **Processing**: DocETL-specific errors
- **System**: Internal server errors

### Retry Strategy
- Exponential backoff with jitter
- Category-specific retry policies
- Maximum retry limits per error type
- Error recovery mechanisms

## Monitoring and Logging

### Job Logs
All job operations are logged with different levels:
- `info`: Normal operations, progress updates
- `warning`: Recoverable errors, retries
- `error`: Failed operations, critical issues
- `debug`: Detailed execution information

### Heartbeat Monitoring
- Workers send heartbeats every 30 seconds
- Jobs are marked as stale if no heartbeat for 3 minutes
- Automatic job recovery for stale processes

### Progress Tracking
- Real-time progress percentage updates
- Current step descriptions
- Estimated completion times

## Integration with DocETL

### Enhanced Document Processing Implementation

The system now includes a comprehensive document processing pipeline with:

1. **Real DocETL Integration**: Subprocess execution of DocETL with fallback to mock implementation
2. **Legal Document Configuration**: Pre-configured YAML pipeline for legal document entity extraction
3. **Document Status Management**: Automatic status updates (processing → needs_review/failed)
4. **Entity Storage**: Enhanced entity extraction with coordinates, context snippets, and confidence scores
5. **Google Cloud Storage Integration**: Document file fetching with local file fallback

### DocETL Configuration (`docetl-config.yaml`)

The system includes a pre-configured DocETL pipeline for legal documents that extracts:
- **PARTIES**: Legal entities, individuals, companies
- **DATES**: Contract dates, deadlines, effective dates
- **AMOUNTS**: Monetary values, percentages, quantities
- **CLAUSES**: Key legal provisions and terms
- **LOCATIONS**: Addresses, jurisdictions, venues
- **OBLIGATIONS**: Party responsibilities and requirements

### Processing Flow

1. **Document Fetching**: Retrieves PDF from Google Cloud Storage
2. **Temp Directory Setup**: Creates isolated processing environment
3. **DocETL Execution**: Runs Python subprocess or mock extraction
4. **Entity Processing**: Stores entities with full coordinate information
5. **Status Updates**: Updates document status throughout pipeline
6. **Cleanup**: Removes temporary files and directories

### Mock vs Real DocETL

The implementation automatically detects DocETL availability:
- **Real DocETL**: Runs Python subprocess with YAML configuration
- **Mock Implementation**: Realistic legal document entity extraction
- **Error Handling**: Automatic fallback on DocETL failures

To enable real DocETL processing:
1. Install Python 3 and DocETL: `pip install docetl`
2. Ensure DocETL is available in the PATH
3. The system will automatically use real DocETL when available

## Deployment

1. **Deploy the migration**:
   ```sql
   -- Run the migration for each tenant schema
   -- Replace {{schema_name}} with actual tenant schema name
   ```

2. **Deploy the Edge Function**:
   ```bash
   supabase functions deploy doc-intel-processor
   ```

3. **Configure environment variables** in Supabase dashboard

4. **Set up monitoring** and alerting for job queue health

## Security Considerations

- All database operations use Row Level Security (RLS)
- Webhook signatures verified using HMAC-SHA256
- Service role key required for cross-tenant operations
- Job isolation by tenant schema

## Performance Optimization

- Database indexes for efficient job querying
- Worker-based job claiming with SELECT FOR UPDATE SKIP LOCKED
- Heartbeat-based timeout detection
- Configurable retry and backoff strategies
- Real-time notifications to reduce polling overhead

This implementation provides a solid foundation for handling long-running document processing tasks while maintaining reliability, observability, and security in a multi-tenant environment.