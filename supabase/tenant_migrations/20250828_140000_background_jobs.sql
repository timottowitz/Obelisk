-- Background Job Processing System Migration
-- Creates tables and functions for job queue processing
-- This migration is applied to each tenant schema

-- Create job status enum type
CREATE TYPE job_status AS ENUM (
    'pending',
    'queued', 
    'running',
    'completed',
    'failed',
    'cancelled',
    'retry',
    'stalled'
);

-- Create job priority enum type
CREATE TYPE job_priority AS ENUM (
    'low',
    'normal', 
    'high',
    'urgent'
);

-- Create job type enum type
CREATE TYPE job_type AS ENUM (
    'email_storage',
    'email_bulk_assignment',
    'email_content_analysis',
    'cleanup_storage',
    'maintenance_task',
    'export_case_data'
);

-- Create jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    priority job_priority NOT NULL DEFAULT 'normal',
    data JSONB NOT NULL,
    progress JSONB,
    error JSONB,
    result JSONB,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    timeout INTEGER NOT NULL DEFAULT 300000, -- 5 minutes in milliseconds
    timestamps JSONB NOT NULL DEFAULT '{}',
    worker_id TEXT,
    metadata JSONB DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient job querying
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);
CREATE INDEX idx_jobs_priority ON jobs(priority);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);
CREATE INDEX idx_jobs_scheduled_for ON jobs(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_jobs_worker_id ON jobs(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX idx_jobs_status_priority_created ON jobs(status, priority DESC, created_at ASC) 
    WHERE status IN ('queued', 'pending');

-- Composite index for job queue operations
CREATE INDEX idx_jobs_queue_processing ON jobs(type, status, priority DESC, created_at ASC)
    WHERE status = 'queued' AND worker_id IS NULL;

-- Index for cleanup operations
CREATE INDEX idx_jobs_cleanup ON jobs(status, (timestamps->>'completed'))
    WHERE status IN ('completed', 'failed');

-- GIN index for searching in job data and metadata
CREATE INDEX idx_jobs_data_gin ON jobs USING GIN (data);
CREATE INDEX idx_jobs_metadata_gin ON jobs USING GIN (metadata);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create job workers table for tracking active workers
CREATE TABLE job_workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id TEXT NOT NULL UNIQUE,
    supported_job_types job_type[] NOT NULL,
    max_concurrency INTEGER NOT NULL DEFAULT 1,
    current_jobs TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'idle', -- idle, busy, stopped, error
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job workers
CREATE INDEX idx_job_workers_worker_id ON job_workers(worker_id);
CREATE INDEX idx_job_workers_status ON job_workers(status);
CREATE INDEX idx_job_workers_last_heartbeat ON job_workers(last_heartbeat);

-- Create trigger for job workers updated_at
CREATE TRIGGER update_job_workers_updated_at 
    BEFORE UPDATE ON job_workers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create job schedules table for recurring jobs
CREATE TABLE job_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    active BOOLEAN NOT NULL DEFAULT true,
    data_overrides JSONB DEFAULT '{}',
    next_execution TIMESTAMP WITH TIME ZONE,
    last_execution TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job schedules
CREATE INDEX idx_job_schedules_active ON job_schedules(active);
CREATE INDEX idx_job_schedules_next_execution ON job_schedules(next_execution) WHERE active = true;

-- Create trigger for job schedules updated_at
CREATE TRIGGER update_job_schedules_updated_at 
    BEFORE UPDATE ON job_schedules 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to get next available job for a worker
CREATE OR REPLACE FUNCTION get_next_job_for_worker(
    p_worker_id TEXT,
    p_supported_types job_type[]
)
RETURNS TABLE(
    job_id UUID,
    job_type job_type,
    job_priority job_priority,
    job_data JSONB,
    job_timeout INTEGER,
    job_max_retries INTEGER,
    job_attempts INTEGER,
    job_timestamps JSONB,
    job_metadata JSONB
) AS $$
DECLARE
    job_record RECORD;
BEGIN
    -- Find and claim the next available job
    SELECT j.* INTO job_record
    FROM jobs j
    WHERE j.type = ANY(p_supported_types)
        AND j.status = 'queued'
        AND j.worker_id IS NULL
        AND (j.scheduled_for IS NULL OR j.scheduled_for <= NOW())
    ORDER BY j.priority DESC, j.created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    -- If no job found, return empty result
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Claim the job by updating it
    UPDATE jobs 
    SET 
        status = 'running',
        worker_id = p_worker_id,
        timestamps = jsonb_set(
            jsonb_set(job_record.timestamps, '{started}', to_jsonb(NOW())),
            '{lastAttempt}', to_jsonb(NOW())
        ),
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id = job_record.id;

    -- Return the job details
    RETURN QUERY
    SELECT 
        job_record.id,
        job_record.type,
        job_record.priority,
        job_record.data,
        job_record.timeout,
        job_record.max_retries,
        job_record.attempts + 1, -- Return updated attempts count
        jsonb_set(
            jsonb_set(job_record.timestamps, '{started}', to_jsonb(NOW())),
            '{lastAttempt}', to_jsonb(NOW())
        ),
        job_record.metadata;
END;
$$ LANGUAGE plpgsql;

-- Create function to get job queue statistics
CREATE OR REPLACE FUNCTION get_job_queue_stats()
RETURNS TABLE(
    status_counts JSONB,
    type_counts JSONB,
    priority_counts JSONB,
    avg_processing_times JSONB,
    queue_health JSONB
) AS $$
DECLARE
    status_stats JSONB;
    type_stats JSONB;
    priority_stats JSONB;
    processing_stats JSONB;
    health_stats JSONB;
BEGIN
    -- Get counts by status
    SELECT jsonb_object_agg(status, count)
    INTO status_stats
    FROM (
        SELECT status, COUNT(*) as count
        FROM jobs
        GROUP BY status
    ) s;

    -- Get counts by type (last 24 hours)
    SELECT jsonb_object_agg(type, count)
    INTO type_stats
    FROM (
        SELECT type, COUNT(*) as count
        FROM jobs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY type
    ) t;

    -- Get counts by priority (last 24 hours)
    SELECT jsonb_object_agg(priority, count)
    INTO priority_stats
    FROM (
        SELECT priority, COUNT(*) as count
        FROM jobs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY priority
    ) p;

    -- Get average processing times by type (completed jobs in last 7 days)
    SELECT jsonb_object_agg(type, avg_duration)
    INTO processing_stats
    FROM (
        SELECT 
            type, 
            AVG(
                EXTRACT(EPOCH FROM (timestamps->>'completed')::timestamp - (timestamps->>'started')::timestamp) * 1000
            ) as avg_duration
        FROM jobs
        WHERE status = 'completed' 
            AND timestamps->>'completed' IS NOT NULL 
            AND timestamps->>'started' IS NOT NULL
            AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY type
    ) avg_times;

    -- Calculate queue health metrics
    WITH queue_metrics AS (
        SELECT 
            COUNT(*) FILTER (WHERE status = 'queued') as queued_jobs,
            COUNT(*) FILTER (WHERE status = 'running') as running_jobs,
            COUNT(*) FILTER (WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '1 hour') as recent_failures,
            COUNT(*) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 hour') as recent_completions,
            AVG(
                EXTRACT(EPOCH FROM (timestamps->>'started')::timestamp - created_at) * 1000
            ) FILTER (WHERE status != 'pending' AND timestamps->>'started' IS NOT NULL AND created_at >= NOW() - INTERVAL '1 hour') as avg_wait_time
        FROM jobs
    )
    SELECT jsonb_build_object(
        'queuedJobs', queued_jobs,
        'runningJobs', running_jobs,
        'throughput', COALESCE(recent_completions, 0),
        'errorRate', CASE 
            WHEN (recent_completions + recent_failures) > 0 
            THEN (recent_failures::float / (recent_completions + recent_failures)) * 100 
            ELSE 0 
        END,
        'avgWaitTime', COALESCE(avg_wait_time, 0)
    )
    INTO health_stats
    FROM queue_metrics;

    RETURN QUERY
    SELECT 
        COALESCE(status_stats, '{}'::jsonb),
        COALESCE(type_stats, '{}'::jsonb),
        COALESCE(priority_stats, '{}'::jsonb),
        COALESCE(processing_stats, '{}'::jsonb),
        COALESCE(health_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old jobs
CREATE OR REPLACE FUNCTION cleanup_old_jobs(
    completed_age_hours INTEGER DEFAULT 168, -- 7 days
    failed_age_hours INTEGER DEFAULT 720     -- 30 days
)
RETURNS TABLE(
    deleted_completed INTEGER,
    deleted_failed INTEGER
) AS $$
DECLARE
    completed_count INTEGER;
    failed_count INTEGER;
BEGIN
    -- Delete old completed jobs
    DELETE FROM jobs
    WHERE status = 'completed' 
        AND (timestamps->>'completed')::timestamp < NOW() - (completed_age_hours || ' hours')::interval;
    GET DIAGNOSTICS completed_count = ROW_COUNT;

    -- Delete old failed jobs
    DELETE FROM jobs
    WHERE status = 'failed' 
        AND (timestamps->>'completed')::timestamp < NOW() - (failed_age_hours || ' hours')::interval;
    GET DIAGNOSTICS failed_count = ROW_COUNT;

    RETURN QUERY SELECT completed_count, failed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle stalled jobs
CREATE OR REPLACE FUNCTION handle_stalled_jobs(
    stalled_timeout_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(
    stalled_job_id UUID,
    job_type job_type
) AS $$
BEGIN
    -- Update stalled jobs
    UPDATE jobs 
    SET 
        status = 'stalled',
        error = jsonb_build_object(
            'code', 'STALLED',
            'message', 'Job has been running too long without progress updates',
            'retryable', true,
            'occurredAt', NOW()
        ),
        updated_at = NOW()
    WHERE status = 'running' 
        AND (timestamps->>'started')::timestamp < NOW() - (stalled_timeout_minutes || ' minutes')::interval;

    -- Return the stalled jobs
    RETURN QUERY
    SELECT id, type
    FROM jobs
    WHERE status = 'stalled' 
        AND updated_at >= NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

-- Create function to update worker heartbeat
CREATE OR REPLACE FUNCTION update_worker_heartbeat(
    p_worker_id TEXT,
    p_status TEXT DEFAULT 'idle',
    p_current_jobs TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO job_workers (worker_id, status, current_jobs, last_heartbeat)
    VALUES (p_worker_id, p_status, p_current_jobs, NOW())
    ON CONFLICT (worker_id) 
    DO UPDATE SET
        status = EXCLUDED.status,
        current_jobs = EXCLUDED.current_jobs,
        last_heartbeat = EXCLUDED.last_heartbeat,
        updated_at = NOW();
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create view for active jobs with extended information
CREATE VIEW active_jobs_view AS
SELECT 
    j.id,
    j.type,
    j.status,
    j.priority,
    j.data->>'orgId' as org_id,
    j.data->>'userId' as user_id,
    j.data->>'caseId' as case_id,
    j.data->>'emailId' as email_id,
    j.attempts,
    j.max_retries,
    j.timeout,
    j.worker_id,
    j.created_at,
    (j.timestamps->>'started')::timestamp as started_at,
    (j.timestamps->>'completed')::timestamp as completed_at,
    CASE 
        WHEN j.status = 'running' AND j.timestamps->>'started' IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (NOW() - (j.timestamps->>'started')::timestamp)) * 1000
        ELSE NULL 
    END as running_duration_ms,
    j.progress,
    j.error,
    j.result
FROM jobs j
WHERE j.status IN ('queued', 'running', 'retry', 'stalled')
ORDER BY j.priority DESC, j.created_at ASC;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_workers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON job_schedules TO authenticated;
GRANT SELECT ON active_jobs_view TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_next_job_for_worker(TEXT, job_type[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_queue_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_jobs(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_stalled_jobs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_worker_heartbeat(TEXT, TEXT, TEXT[]) TO authenticated;

-- Create RLS policies for jobs table
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access jobs for their organization
CREATE POLICY jobs_org_isolation ON jobs
    FOR ALL
    USING (data->>'orgId' = current_setting('app.current_org_id', true));

-- Policy: Service role can access all jobs (for worker processes)
CREATE POLICY jobs_service_role_access ON jobs
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Create RLS policies for job_workers table
ALTER TABLE job_workers ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read worker status
CREATE POLICY job_workers_read ON job_workers
    FOR SELECT
    USING (true);

-- Policy: Only service role can modify workers
CREATE POLICY job_workers_service_role_modify ON job_workers
    FOR ALL
    USING (current_setting('role') = 'service_role');

-- Create RLS policies for job_schedules table
ALTER TABLE job_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage schedules (add org_id to schedules if needed)
CREATE POLICY job_schedules_access ON job_schedules
    FOR ALL
    USING (true); -- Adjust based on your tenant isolation needs

-- Add storage_job_id column to email_assignments table (if it exists)
-- This links email assignments to their background storage jobs
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_assignments') THEN
        -- Add storage_job_id column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'email_assignments' 
                      AND column_name = 'storage_job_id') THEN
            ALTER TABLE email_assignments 
            ADD COLUMN storage_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
            
            -- Add index for storage job lookups
            CREATE INDEX IF NOT EXISTS idx_email_assignments_storage_job_id 
            ON email_assignments(storage_job_id);
            
            -- Add comment
            COMMENT ON COLUMN email_assignments.storage_job_id IS 'ID of the background job processing email content storage';
        END IF;
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE jobs IS 'Background job processing queue with status tracking and retry logic';
COMMENT ON TABLE job_workers IS 'Active job workers for monitoring and load balancing';
COMMENT ON TABLE job_schedules IS 'Scheduled/recurring job configurations';
COMMENT ON FUNCTION get_next_job_for_worker(TEXT, job_type[]) IS 'Atomically claims and returns the next available job for a worker';
COMMENT ON FUNCTION get_job_queue_stats() IS 'Returns comprehensive job queue statistics and health metrics';
COMMENT ON FUNCTION cleanup_old_jobs(INTEGER, INTEGER) IS 'Removes old completed and failed jobs based on age thresholds';
COMMENT ON FUNCTION handle_stalled_jobs(INTEGER) IS 'Identifies and marks jobs that have been running too long as stalled';
COMMENT ON VIEW active_jobs_view IS 'Convenient view of currently active jobs with computed fields';