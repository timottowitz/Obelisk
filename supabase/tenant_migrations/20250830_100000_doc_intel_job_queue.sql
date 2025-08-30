-- DocETL Job Queue Database Schema Migration
-- Create tables for asynchronous document processing job queue
-- Replace {{schema_name}} with the actual tenant schema name when running

SET search_path TO {{schema_name}};

-- =============================================================================
-- DOC INTEL JOB QUEUE TABLES
-- =============================================================================

-- DOC INTEL JOB QUEUE TABLE
-- Manages async processing jobs for docetl operations
CREATE TABLE IF NOT EXISTS doc_intel_job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN ('extract', 'transform', 'pipeline')),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Job configuration
    pipeline_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_data JSONB DEFAULT '{}'::jsonb,
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_step TEXT,
    total_steps INTEGER DEFAULT 1,
    
    -- Results and outputs
    output_data JSONB,
    result_file_path TEXT,
    
    -- Error handling
    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    timeout_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    priority INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DOC INTEL JOB LOGS TABLE
-- Stores detailed logs and events for each job
CREATE TABLE IF NOT EXISTS doc_intel_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES doc_intel_job_queue(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error')),
    message TEXT NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DOC INTEL JOB HEARTBEATS TABLE
-- Tracks job heartbeats for monitoring and timeout detection
CREATE TABLE IF NOT EXISTS doc_intel_job_heartbeats (
    job_id UUID PRIMARY KEY REFERENCES doc_intel_job_queue(id) ON DELETE CASCADE,
    worker_id TEXT,
    last_ping TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status_data JSONB DEFAULT '{}'::jsonb
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Job queue indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_status ON doc_intel_job_queue(status);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_job_type ON doc_intel_job_queue(job_type);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_document_id ON doc_intel_job_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_user_id ON doc_intel_job_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_created_at ON doc_intel_job_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_priority ON doc_intel_job_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_timeout ON doc_intel_job_queue(timeout_at) WHERE status = 'processing';

-- Composite indexes for job processing
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_pending ON doc_intel_job_queue(status, priority DESC, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_queue_processing ON doc_intel_job_queue(status, last_heartbeat) WHERE status = 'processing';

-- Job logs indexes
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_logs_job_id ON doc_intel_job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_logs_timestamp ON doc_intel_job_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_logs_level ON doc_intel_job_logs(level);

-- Heartbeat indexes
CREATE INDEX IF NOT EXISTS idx_doc_intel_job_heartbeats_last_ping ON doc_intel_job_heartbeats(last_ping);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION handle_doc_intel_job_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set timing fields on status changes
CREATE OR REPLACE FUNCTION handle_doc_intel_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when status changes to 'processing'
    IF NEW.status = 'processing' AND OLD.status != 'processing' THEN
        NEW.started_at = CURRENT_TIMESTAMP;
        NEW.last_heartbeat = CURRENT_TIMESTAMP;
        NEW.timeout_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes'; -- 10 minute timeout for Edge Functions
    END IF;
    
    -- Set completed_at when status changes to 'completed', 'failed', or 'cancelled'
    IF NEW.status IN ('completed', 'failed', 'cancelled') AND OLD.status NOT IN ('completed', 'failed', 'cancelled') THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    
    -- Clear timing fields when status changes back to 'pending'
    IF NEW.status = 'pending' AND OLD.status != 'pending' THEN
        NEW.started_at = NULL;
        NEW.completed_at = NULL;
        NEW.last_heartbeat = NULL;
        NEW.timeout_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create a job log entry
CREATE OR REPLACE FUNCTION create_doc_intel_job_log(
    p_job_id UUID,
    p_level TEXT,
    p_message TEXT,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO doc_intel_job_logs (job_id, level, message, details)
    VALUES (p_job_id, p_level, p_message, p_details)
    RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update job heartbeat
CREATE OR REPLACE FUNCTION update_doc_intel_job_heartbeat(
    p_job_id UUID,
    p_worker_id TEXT DEFAULT NULL,
    p_status_data JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO doc_intel_job_heartbeats (job_id, worker_id, last_ping, status_data)
    VALUES (p_job_id, p_worker_id, CURRENT_TIMESTAMP, COALESCE(p_status_data, '{}'::jsonb))
    ON CONFLICT (job_id) 
    DO UPDATE SET
        worker_id = EXCLUDED.worker_id,
        last_ping = EXCLUDED.last_ping,
        status_data = EXCLUDED.status_data;
        
    -- Also update the job's last_heartbeat
    UPDATE doc_intel_job_queue 
    SET last_heartbeat = CURRENT_TIMESTAMP,
        timeout_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
    WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- Function to find and claim next pending job
CREATE OR REPLACE FUNCTION claim_next_doc_intel_job(
    p_worker_id TEXT,
    p_job_types TEXT[] DEFAULT NULL
)
RETURNS TABLE(
    job_id UUID,
    job_type TEXT,
    document_id UUID,
    pipeline_config JSONB,
    input_data JSONB
) AS $$
DECLARE
    claimed_job_id UUID;
BEGIN
    -- Find and claim the next pending job with highest priority
    UPDATE doc_intel_job_queue
    SET status = 'processing',
        started_at = CURRENT_TIMESTAMP,
        last_heartbeat = CURRENT_TIMESTAMP,
        timeout_at = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
    WHERE id = (
        SELECT id FROM doc_intel_job_queue
        WHERE status = 'pending'
        AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING id INTO claimed_job_id;
    
    -- If we claimed a job, set up heartbeat and return job details
    IF claimed_job_id IS NOT NULL THEN
        -- Initialize heartbeat
        PERFORM update_doc_intel_job_heartbeat(claimed_job_id, p_worker_id);
        
        -- Create initial log entry
        PERFORM create_doc_intel_job_log(claimed_job_id, 'info', 'Job claimed by worker', 
            jsonb_build_object('worker_id', p_worker_id));
        
        -- Return job details
        RETURN QUERY
        SELECT 
            q.id,
            q.job_type,
            q.document_id,
            q.pipeline_config,
            q.input_data
        FROM doc_intel_job_queue q
        WHERE q.id = claimed_job_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as completed
CREATE OR REPLACE FUNCTION complete_doc_intel_job(
    p_job_id UUID,
    p_output_data JSONB DEFAULT NULL,
    p_result_file_path TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE doc_intel_job_queue
    SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        output_data = p_output_data,
        result_file_path = p_result_file_path,
        progress_percentage = 100
    WHERE id = p_job_id;
    
    -- Create completion log
    PERFORM create_doc_intel_job_log(p_job_id, 'info', 'Job completed successfully',
        jsonb_build_object('output_data', p_output_data, 'result_file_path', p_result_file_path));
END;
$$ LANGUAGE plpgsql;

-- Function to mark job as failed
CREATE OR REPLACE FUNCTION fail_doc_intel_job(
    p_job_id UUID,
    p_error_message TEXT,
    p_error_details JSONB DEFAULT NULL,
    p_should_retry BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
DECLARE
    current_retry_count INTEGER;
    max_retry_count INTEGER;
BEGIN
    -- Get current retry info
    SELECT retry_count, max_retries INTO current_retry_count, max_retry_count
    FROM doc_intel_job_queue
    WHERE id = p_job_id;
    
    -- Determine if we should retry
    IF p_should_retry AND current_retry_count < max_retry_count THEN
        -- Increment retry count and set back to pending
        UPDATE doc_intel_job_queue
        SET status = 'pending',
            retry_count = retry_count + 1,
            error_message = p_error_message,
            error_details = p_error_details,
            started_at = NULL,
            last_heartbeat = NULL,
            timeout_at = NULL
        WHERE id = p_job_id;
        
        -- Create retry log
        PERFORM create_doc_intel_job_log(p_job_id, 'warning', 
            format('Job failed, retrying (%s/%s): %s', current_retry_count + 1, max_retry_count, p_error_message),
            p_error_details);
    ELSE
        -- Mark as permanently failed
        UPDATE doc_intel_job_queue
        SET status = 'failed',
            completed_at = CURRENT_TIMESTAMP,
            error_message = p_error_message,
            error_details = p_error_details
        WHERE id = p_job_id;
        
        -- Create failure log
        PERFORM create_doc_intel_job_log(p_job_id, 'error', 
            format('Job failed permanently: %s', p_error_message),
            p_error_details);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Triggers for updated_at timestamp
CREATE TRIGGER update_doc_intel_job_queue_updated_at
    BEFORE UPDATE ON doc_intel_job_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_doc_intel_job_updated_at();

-- Trigger for automatic status change handling
CREATE TRIGGER handle_doc_intel_job_status_change_trigger
    BEFORE UPDATE ON doc_intel_job_queue
    FOR EACH ROW
    EXECUTE FUNCTION handle_doc_intel_job_status_change();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on tables
ALTER TABLE doc_intel_job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_intel_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE doc_intel_job_heartbeats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job queue table
-- Users can only see their own jobs
CREATE POLICY doc_intel_job_queue_user_access ON doc_intel_job_queue
    FOR ALL
    USING (user_id = auth.uid());

-- RLS Policies for job logs table
-- Users can only see logs from their own jobs
CREATE POLICY doc_intel_job_logs_user_access ON doc_intel_job_logs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue 
            WHERE doc_intel_job_queue.id = doc_intel_job_logs.job_id 
            AND doc_intel_job_queue.user_id = auth.uid()
        )
    );

-- RLS Policies for heartbeats table
-- Users can only see heartbeats from their own jobs
CREATE POLICY doc_intel_job_heartbeats_user_access ON doc_intel_job_heartbeats
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM doc_intel_job_queue 
            WHERE doc_intel_job_queue.id = doc_intel_job_heartbeats.job_id 
            AND doc_intel_job_queue.user_id = auth.uid()
        )
    );

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant service_role permissions for backend operations
GRANT ALL ON doc_intel_job_queue TO service_role;
GRANT ALL ON doc_intel_job_logs TO service_role;
GRANT ALL ON doc_intel_job_heartbeats TO service_role;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION handle_doc_intel_job_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION handle_doc_intel_job_status_change() TO service_role;
GRANT EXECUTE ON FUNCTION create_doc_intel_job_log(UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION update_doc_intel_job_heartbeat(UUID, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION claim_next_doc_intel_job(TEXT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION complete_doc_intel_job(UUID, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION fail_doc_intel_job(UUID, TEXT, JSONB, BOOLEAN) TO service_role;

-- Grant authenticated user permissions
GRANT SELECT ON doc_intel_job_queue TO authenticated;
GRANT SELECT ON doc_intel_job_logs TO authenticated;
GRANT SELECT ON doc_intel_job_heartbeats TO authenticated;

-- =============================================================================
-- REALTIME PUBLICATIONS
-- =============================================================================

DO $$
BEGIN
    -- Add job queue table to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.doc_intel_job_queue;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.doc_intel_job_queue already in publication';
    END;
    
    -- Add job logs table to realtime publication
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.doc_intel_job_logs;
    EXCEPTION 
        WHEN duplicate_object THEN 
            RAISE NOTICE 'Table {{schema_name}}.doc_intel_job_logs already in publication';
    END;
END $$;

-- Reset search_path
RESET search_path;