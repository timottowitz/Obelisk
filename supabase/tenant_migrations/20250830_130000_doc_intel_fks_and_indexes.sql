-- BE-002: Add Foreign Keys and Performance Indexes for Doc Intel Schema
-- P1 Performance: Add missing FKs and indexes for scalability 
-- Replace {{schema_name}} with the actual tenant schema name when running

SET search_path TO {{schema_name}};

-- =============================================================================
-- ADDITIONAL FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Note: Primary FK (entities.document_id → documents.id) already exists from initial migration
-- Adding any additional FK constraints that may be needed for referential integrity

-- Ensure all job queue FKs are properly set (they already exist, but adding for completeness)
-- doc_intel_job_queue.document_id → documents.id (already exists)
-- doc_intel_job_logs.job_id → doc_intel_job_queue.id (already exists) 
-- doc_intel_job_heartbeats.job_id → doc_intel_job_queue.id (already exists)

-- =============================================================================
-- PERFORMANCE INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- DOCUMENTS TABLE PERFORMANCE INDEXES
-- These indexes support common filtering and sorting patterns

-- Composite index for user-scoped document queries with status filtering
CREATE INDEX IF NOT EXISTS idx_documents_user_status ON documents(user_id, status);

-- Composite index for user-scoped document queries with date ordering
CREATE INDEX IF NOT EXISTS idx_documents_user_uploaded_at ON documents(user_id, uploaded_at DESC);

-- Composite index for user-scoped document queries with completion date
CREATE INDEX IF NOT EXISTS idx_documents_user_completed_at ON documents(user_id, completed_at DESC) WHERE completed_at IS NOT NULL;

-- Index for filename prefix searches (useful for file browsing)
CREATE INDEX IF NOT EXISTS idx_documents_filename_prefix ON documents(filename text_pattern_ops);

-- Index for metadata JSONB queries (if metadata filtering is common)
CREATE INDEX IF NOT EXISTS idx_documents_metadata_gin ON documents USING GIN(metadata);

-- ENTITIES TABLE PERFORMANCE INDEXES
-- These indexes support entity filtering and aggregation queries

-- Enhanced composite index for document + type filtering (more specific than existing)
CREATE INDEX IF NOT EXISTS idx_entities_document_type ON entities(document_id, label);

-- Composite index for document + status filtering (already exists as idx_entities_document_status)
-- CREATE INDEX IF NOT EXISTS idx_entities_document_status ON entities(document_id, status); -- Already exists

-- Index for entity value searches (useful for finding specific entity values)
CREATE INDEX IF NOT EXISTS idx_entities_value ON entities(value);

-- Index for objective truth filtering
CREATE INDEX IF NOT EXISTS idx_entities_objective_truth ON entities(is_objective_truth) WHERE is_objective_truth = TRUE;

-- Composite index for label + value queries (useful for entity type aggregations)
CREATE INDEX IF NOT EXISTS idx_entities_label_value ON entities(label, value);

-- Index for context snippet text searches
CREATE INDEX IF NOT EXISTS idx_entities_context_search ON entities USING GIN(to_tsvector('english', coalesce(context_snippet, '')));

-- DOC INTEL JOB QUEUE PERFORMANCE INDEXES
-- Additional indexes for job processing efficiency

-- Composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_user_status ON doc_intel_job_queue(user_id, status);

-- Composite index for document + job type queries
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_document_type ON doc_intel_job_queue(document_id, job_type);

-- Index for retry count filtering (useful for failed job management)
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_retry_count ON doc_intel_job_queue(retry_count) WHERE status = 'failed';

-- Index for progress tracking queries
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_progress ON doc_intel_job_queue(progress_percentage) WHERE status = 'processing';

-- Composite index for started/completed timing analysis
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_timing ON doc_intel_job_queue(started_at, completed_at) WHERE completed_at IS NOT NULL;

-- Index for metadata JSONB queries
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_metadata_gin ON doc_intel_job_queue USING GIN(metadata);

-- DOC INTEL JOB LOGS PERFORMANCE INDEXES
-- Additional indexes for log analysis

-- Composite index for job + level + timestamp queries
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_logs_job_level_time ON doc_intel_job_logs(job_id, level, timestamp DESC);

-- Index for error log analysis
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_logs_errors ON doc_intel_job_logs(timestamp DESC) WHERE level = 'error';

-- DOC INTEL JOB HEARTBEATS PERFORMANCE INDEXES
-- Additional indexes for heartbeat monitoring

-- Index for worker monitoring
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_heartbeats_worker ON doc_intel_job_heartbeats(worker_id, last_ping DESC);

-- Index for stale heartbeat detection
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_heartbeats_stale ON doc_intel_job_heartbeats(last_ping) WHERE last_ping < NOW() - INTERVAL '15 minutes';

-- =============================================================================
-- SPECIALIZED INDEXES FOR COMMON BUSINESS QUERIES
-- =============================================================================

-- Documents ready for processing (uploaded but not yet processed)
CREATE INDEX IF NOT EXISTS idx_documents_ready_for_processing ON documents(uploaded_at ASC) 
    WHERE status IN ('uploading', 'needs_review');

-- Documents requiring manual review
CREATE INDEX IF NOT EXISTS idx_documents_needs_review ON documents(user_id, uploaded_at DESC) 
    WHERE status = 'needs_review';

-- Recently completed documents for dashboard queries
CREATE INDEX IF NOT EXISTS idx_documents_recently_completed ON documents(completed_at DESC) 
    WHERE status = 'complete' AND completed_at >= NOW() - INTERVAL '30 days';

-- Pending entities by document (for review workflows)
CREATE INDEX IF NOT EXISTS idx_entities_pending_by_document ON entities(document_id, created_at ASC) 
    WHERE status = 'pending';

-- High priority jobs ready for processing
CREATE INDEX IF NOT EXISTS idx_doc_intel_jobs_high_priority ON doc_intel_job_queue(priority DESC, created_at ASC) 
    WHERE status = 'pending' AND priority > 0;

-- Jobs stuck in processing (potential timeouts)
CREATE INDEX IF NOT EXISTS idx_doc_intel_jobs_stuck ON doc_intel_job_queue(last_heartbeat ASC) 
    WHERE status = 'processing' AND last_heartbeat < NOW() - INTERVAL '10 minutes';

-- =============================================================================
-- CONSTRAINT VALIDATIONS
-- =============================================================================

-- Add check constraints to ensure data quality where missing
-- (Most constraints already exist, adding any missing ones)

-- Ensure entities have non-empty labels and values
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'entities_label_not_empty' 
        AND table_name = 'entities'
        AND table_schema = current_schema()
    ) THEN
        ALTER TABLE entities ADD CONSTRAINT entities_label_not_empty 
            CHECK (length(trim(label)) > 0);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'entities_value_not_empty' 
        AND table_name = 'entities'
        AND table_schema = current_schema()
    ) THEN
        ALTER TABLE entities ADD CONSTRAINT entities_value_not_empty 
            CHECK (length(trim(value)) > 0);
    END IF;
END $$;

-- =============================================================================
-- INDEX STATISTICS AND MAINTENANCE
-- =============================================================================

-- Update statistics on all Doc Intel tables for optimal query planning
ANALYZE documents;
ANALYZE entities;
ANALYZE doc_intel_job_queue;
ANALYZE doc_intel_job_logs;
ANALYZE doc_intel_job_heartbeats;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON INDEX idx_documents_user_status IS 'Performance: User-scoped document queries with status filtering';
COMMENT ON INDEX idx_documents_user_uploaded_at IS 'Performance: User document lists ordered by upload date';
COMMENT ON INDEX idx_documents_ready_for_processing IS 'Business Logic: Documents awaiting processing';

COMMENT ON INDEX idx_entities_document_type IS 'Performance: Entity filtering by document and type';
COMMENT ON INDEX idx_entities_label_value IS 'Performance: Entity aggregation queries by label and value';
COMMENT ON INDEX idx_entities_pending_by_document IS 'Business Logic: Review workflow - pending entities per document';

COMMENT ON INDEX idx_doc_intel_job_queue_user_status IS 'Performance: User job querying with status filtering';
COMMENT ON INDEX idx_doc_intel_jobs_high_priority IS 'Business Logic: High priority job processing queue';
COMMENT ON INDEX idx_doc_intel_jobs_stuck IS 'Operations: Timeout detection for stuck jobs';

-- Reset search_path
RESET search_path;

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================

/*
BE-002 Implementation Summary:

FOREIGN KEY CONSTRAINTS:
✅ entities.document_id → documents.id (already existed with CASCADE)
✅ doc_intel_job_queue.document_id → documents.id (already existed)
✅ doc_intel_job_queue.user_id → private.users.id (already existed)
✅ doc_intel_job_logs.job_id → doc_intel_job_queue.id (already existed)
✅ doc_intel_job_heartbeats.job_id → doc_intel_job_queue.id (already existed)

PERFORMANCE INDEXES ADDED:
📈 documents(user_id, status) - User-scoped status filtering
📈 documents(user_id, uploaded_at) - User document chronological listing  
📈 documents(user_id, completed_at) - User completed documents
📈 entities(document_id, label) - Enhanced entity type filtering
📈 entities(label, value) - Entity aggregation queries
📈 doc_intel_job_queue(user_id, status) - User job status queries
📈 doc_intel_job_queue(document_id, job_type) - Document job type filtering

SPECIALIZED BUSINESS INDEXES:
🎯 Documents ready for processing
🎯 Documents needing review  
🎯 Recently completed documents
🎯 Pending entities by document
🎯 High priority jobs
🎯 Stuck/timeout job detection

CONSTRAINT IMPROVEMENTS:
✔️ Non-empty entity labels and values
✔️ Updated table statistics for query optimization

Note: This system uses schema-based multi-tenancy (org_<uuid>) rather than 
tenant_id columns, so tenant-scoped indexes are not applicable.
*/