-- Email Archive Management System
-- This migration creates the comprehensive email archive system for case management
-- Builds upon the existing email_assignments table to provide full email content storage and retrieval

-- Create email content table for storing email metadata and GCS references
CREATE TABLE IF NOT EXISTS email_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id TEXT NOT NULL UNIQUE, -- Microsoft Graph email ID
    assignment_id UUID NOT NULL REFERENCES email_assignments(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- Email metadata for quick access and search
    subject TEXT,
    sender_email TEXT NOT NULL,
    sender_name TEXT,
    recipient_emails TEXT[], -- Array of recipient email addresses
    recipient_names TEXT[], -- Array of recipient names
    cc_emails TEXT[], -- CC recipients
    bcc_emails TEXT[], -- BCC recipients
    
    -- Email dates and timing
    sent_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ NOT NULL,
    
    -- Email properties
    message_id TEXT, -- Internet Message ID for threading
    conversation_id TEXT, -- Microsoft Graph conversation ID
    thread_topic TEXT, -- Email thread topic
    importance TEXT DEFAULT 'normal' CHECK (importance IN ('low', 'normal', 'high')),
    is_read BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    
    -- Storage references
    gcs_base_path TEXT NOT NULL, -- Base path in GCS for this email
    html_content_path TEXT, -- Path to HTML content in GCS
    text_content_path TEXT, -- Path to plain text content in GCS
    rtf_content_path TEXT, -- Path to RTF content in GCS
    headers_path TEXT, -- Path to email headers JSON in GCS
    
    -- Full text search content (tsvector for PostgreSQL full-text search)
    search_content TSVECTOR,
    
    -- Email size and processing info
    content_size BIGINT DEFAULT 0, -- Total content size in bytes
    attachment_count INTEGER DEFAULT 0,
    total_attachment_size BIGINT DEFAULT 0,
    
    -- Archive management
    archive_status TEXT DEFAULT 'active' CHECK (archive_status IN ('active', 'archived', 'deleted')),
    deleted_at TIMESTAMPTZ, -- Soft delete timestamp
    deleted_by UUID, -- User who deleted the email
    export_count INTEGER DEFAULT 0, -- Number of times this email has been exported
    last_accessed_at TIMESTAMPTZ, -- Last time email content was accessed
    
    -- Custom metadata and tags
    custom_tags TEXT[], -- User-defined tags for categorization
    custom_metadata JSONB DEFAULT '{}', -- Additional custom metadata
    
    -- Processing status
    processing_status TEXT DEFAULT 'completed' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL, -- User who created this record
    updated_by UUID -- User who last updated this record
);

-- Create comprehensive indexes for email content
CREATE INDEX idx_email_content_email_id ON email_content(email_id);
CREATE INDEX idx_email_content_assignment_id ON email_content(assignment_id);
CREATE INDEX idx_email_content_case_id ON email_content(case_id);
CREATE INDEX idx_email_content_sender_email ON email_content(sender_email);
CREATE INDEX idx_email_content_received_at ON email_content(received_at DESC);
CREATE INDEX idx_email_content_sent_at ON email_content(sent_at DESC);
CREATE INDEX idx_email_content_subject ON email_content USING gin(to_tsvector('english', subject));
CREATE INDEX idx_email_content_search ON email_content USING gin(search_content);
CREATE INDEX idx_email_content_conversation_id ON email_content(conversation_id);
CREATE INDEX idx_email_content_message_id ON email_content(message_id);
CREATE INDEX idx_email_content_archive_status ON email_content(archive_status) WHERE archive_status != 'deleted';
CREATE INDEX idx_email_content_has_attachments ON email_content(has_attachments) WHERE has_attachments = true;
CREATE INDEX idx_email_content_importance ON email_content(importance) WHERE importance != 'normal';
CREATE INDEX idx_email_content_tags ON email_content USING gin(custom_tags);
CREATE INDEX idx_email_content_last_accessed ON email_content(last_accessed_at DESC);

-- Create partial indexes for common queries
CREATE INDEX idx_email_content_active_case ON email_content(case_id, received_at DESC) 
    WHERE archive_status = 'active';
CREATE INDEX idx_email_content_case_sender ON email_content(case_id, sender_email, received_at DESC)
    WHERE archive_status = 'active';

-- Add updated_at trigger
CREATE TRIGGER update_email_content_updated_at
    BEFORE UPDATE ON email_content
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enhanced email attachments table with archive capabilities
CREATE TABLE IF NOT EXISTS email_content_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_content_id UUID NOT NULL REFERENCES email_content(id) ON DELETE CASCADE,
    attachment_id TEXT NOT NULL, -- Microsoft Graph attachment ID
    
    -- Attachment metadata
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL, -- Original filename as received
    content_type TEXT,
    size_bytes BIGINT NOT NULL,
    is_inline BOOLEAN DEFAULT false,
    content_id TEXT, -- For inline attachments
    content_location TEXT,
    
    -- Storage information
    gcs_blob_path TEXT NOT NULL, -- Full path to attachment in GCS
    gcs_metadata_path TEXT, -- Path to attachment metadata in GCS
    download_url TEXT, -- Signed URL for download (if applicable)
    
    -- Processing and status
    download_status TEXT DEFAULT 'completed' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
    virus_scan_status TEXT DEFAULT 'not_scanned' CHECK (virus_scan_status IN ('not_scanned', 'scanning', 'clean', 'infected', 'failed')),
    virus_scan_details JSONB DEFAULT '{}',
    
    -- Preview and indexing
    has_preview BOOLEAN DEFAULT false,
    preview_path TEXT, -- Path to preview image/thumbnail in GCS
    is_searchable BOOLEAN DEFAULT false, -- Whether content is text-searchable
    extracted_text TEXT, -- Extracted text content for search
    
    -- Access and audit
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    downloaded_by UUID[], -- Array of user IDs who downloaded this attachment
    
    -- Archive status
    archive_status TEXT DEFAULT 'active' CHECK (archive_status IN ('active', 'archived', 'deleted')),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL,
    updated_by UUID,
    
    -- Ensure unique attachment per email
    UNIQUE(email_content_id, attachment_id)
);

-- Create indexes for attachments
CREATE INDEX idx_email_attachments_email_content_id ON email_content_attachments(email_content_id);
CREATE INDEX idx_email_attachments_attachment_id ON email_content_attachments(attachment_id);
CREATE INDEX idx_email_attachments_filename ON email_content_attachments(filename);
CREATE INDEX idx_email_attachments_content_type ON email_content_attachments(content_type);
CREATE INDEX idx_email_attachments_size ON email_content_attachments(size_bytes);
CREATE INDEX idx_email_attachments_status ON email_content_attachments(download_status);
CREATE INDEX idx_email_attachments_archive_status ON email_content_attachments(archive_status) WHERE archive_status != 'deleted';
CREATE INDEX idx_email_attachments_searchable ON email_content_attachments USING gin(to_tsvector('english', extracted_text)) 
    WHERE is_searchable = true;

-- Add updated_at trigger for attachments
CREATE TRIGGER update_email_content_attachments_updated_at
    BEFORE UPDATE ON email_content_attachments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Email export tracking table
CREATE TABLE IF NOT EXISTS email_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    email_ids TEXT[] NOT NULL, -- Array of email IDs included in export
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'eml', 'zip', 'csv')),
    
    -- Export configuration
    include_attachments BOOLEAN DEFAULT true,
    include_headers BOOLEAN DEFAULT false,
    export_format_options JSONB DEFAULT '{}', -- PDF formatting, etc.
    
    -- Export status and location
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    gcs_export_path TEXT, -- Path to export file in GCS
    download_url TEXT, -- Signed URL for download
    file_size BIGINT,
    
    -- Access control and expiration
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    download_count INTEGER DEFAULT 0,
    max_downloads INTEGER DEFAULT 10,
    password_protected BOOLEAN DEFAULT false,
    access_token TEXT, -- Random token for secure access
    
    -- Processing details
    total_emails INTEGER NOT NULL,
    processed_emails INTEGER DEFAULT 0,
    error_message TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    
    -- Audit and metadata
    requested_by UUID NOT NULL,
    approved_by UUID, -- For workflow approval if required
    approval_status TEXT DEFAULT 'auto_approved' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'auto_approved')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for exports
CREATE INDEX idx_email_exports_case_id ON email_exports(case_id);
CREATE INDEX idx_email_exports_requested_by ON email_exports(requested_by);
CREATE INDEX idx_email_exports_status ON email_exports(status);
CREATE INDEX idx_email_exports_expires_at ON email_exports(expires_at);
CREATE INDEX idx_email_exports_created_at ON email_exports(created_at DESC);

-- Add updated_at trigger for exports
CREATE TRIGGER update_email_exports_updated_at
    BEFORE UPDATE ON email_exports
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Email access audit table
CREATE TABLE IF NOT EXISTS email_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_content_id UUID REFERENCES email_content(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Access details
    access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download_attachment', 'export', 'search', 'list')),
    access_details JSONB DEFAULT '{}', -- Additional context about the access
    
    -- Client information
    ip_address INET,
    user_agent TEXT,
    
    -- Timing
    accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_time_ms INTEGER -- How long the request took
);

-- Create indexes for access logs
CREATE INDEX idx_email_access_logs_email_content_id ON email_access_logs(email_content_id);
CREATE INDEX idx_email_access_logs_case_id ON email_access_logs(case_id);
CREATE INDEX idx_email_access_logs_user_id ON email_access_logs(user_id);
CREATE INDEX idx_email_access_logs_accessed_at ON email_access_logs(accessed_at DESC);
CREATE INDEX idx_email_access_logs_access_type ON email_access_logs(access_type);

-- Function to update search content tsvector
CREATE OR REPLACE FUNCTION update_email_search_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Build search content from subject, sender, and any extracted text
    NEW.search_content := to_tsvector('english', 
        COALESCE(NEW.subject, '') || ' ' ||
        COALESCE(NEW.sender_name, '') || ' ' ||
        COALESCE(NEW.sender_email, '') || ' ' ||
        COALESCE(array_to_string(NEW.recipient_names, ' '), '') || ' ' ||
        COALESCE(array_to_string(NEW.recipient_emails, ' '), '') || ' ' ||
        COALESCE(NEW.thread_topic, '') || ' ' ||
        COALESCE(array_to_string(NEW.custom_tags, ' '), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search content
CREATE TRIGGER update_email_search_content_trigger
    BEFORE INSERT OR UPDATE ON email_content
    FOR EACH ROW
    EXECUTE FUNCTION update_email_search_content();

-- Function to log email access
CREATE OR REPLACE FUNCTION log_email_access(
    p_email_content_id UUID,
    p_case_id UUID,
    p_user_id UUID,
    p_access_type TEXT,
    p_access_details JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO email_access_logs (
        email_content_id, case_id, user_id, access_type, 
        access_details, ip_address, user_agent
    ) VALUES (
        p_email_content_id, p_case_id, p_user_id, p_access_type, 
        p_access_details, p_ip_address, p_user_agent
    );
    
    -- Update last_accessed_at in email_content
    UPDATE email_content 
    SET last_accessed_at = NOW()
    WHERE id = p_email_content_id;
END;
$$ LANGUAGE plpgsql;

-- Comprehensive view for email archive with all related data
CREATE OR REPLACE VIEW email_archive_view AS
SELECT 
    ec.id,
    ec.email_id,
    ec.assignment_id,
    ec.case_id,
    ec.subject,
    ec.sender_email,
    ec.sender_name,
    ec.recipient_emails,
    ec.recipient_names,
    ec.cc_emails,
    ec.bcc_emails,
    ec.sent_at,
    ec.received_at,
    ec.message_id,
    ec.conversation_id,
    ec.thread_topic,
    ec.importance,
    ec.is_read,
    ec.is_draft,
    ec.has_attachments,
    ec.gcs_base_path,
    ec.html_content_path,
    ec.text_content_path,
    ec.rtf_content_path,
    ec.headers_path,
    ec.content_size,
    ec.attachment_count,
    ec.total_attachment_size,
    ec.archive_status,
    ec.deleted_at,
    ec.deleted_by,
    ec.export_count,
    ec.last_accessed_at,
    ec.custom_tags,
    ec.custom_metadata,
    ec.processing_status,
    ec.error_message,
    ec.created_at,
    ec.updated_at,
    ec.created_by,
    ec.updated_by,
    
    -- Case information
    c.case_number,
    c.full_name as case_title,
    c.status as case_status,
    ct.display_name as case_type_name,
    
    -- Assignment information
    ea.assigned_by,
    ea.assigned_date,
    ea.status as assignment_status,
    
    -- Attachment summary
    (
        SELECT json_agg(json_build_object(
            'id', eca.id,
            'filename', eca.filename,
            'content_type', eca.content_type,
            'size_bytes', eca.size_bytes,
            'is_inline', eca.is_inline,
            'has_preview', eca.has_preview,
            'download_count', eca.download_count
        ))
        FROM email_content_attachments eca 
        WHERE eca.email_content_id = ec.id 
        AND eca.archive_status = 'active'
    ) as attachments,
    
    -- Thread information
    (
        SELECT COUNT(*)
        FROM email_content ec2
        WHERE ec2.conversation_id = ec.conversation_id
        AND ec2.case_id = ec.case_id
        AND ec2.archive_status = 'active'
        AND ec2.id != ec.id
    ) as thread_email_count,
    
    -- Access statistics
    (
        SELECT COUNT(*)
        FROM email_access_logs eal
        WHERE eal.email_content_id = ec.id
        AND eal.access_type = 'view'
        AND eal.accessed_at > NOW() - INTERVAL '30 days'
    ) as recent_access_count

FROM email_content ec
LEFT JOIN email_assignments ea ON ec.assignment_id = ea.id
LEFT JOIN cases c ON ec.case_id = c.id
LEFT JOIN case_types ct ON c.case_type_id = ct.id
WHERE ec.archive_status != 'deleted';

-- Function for email search with ranking
CREATE OR REPLACE FUNCTION search_case_emails(
    p_case_id UUID,
    p_search_query TEXT,
    p_sender_filter TEXT DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_has_attachments BOOLEAN DEFAULT NULL,
    p_importance_filter TEXT DEFAULT NULL,
    p_tags_filter TEXT[] DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    email_id TEXT,
    subject TEXT,
    sender_email TEXT,
    sender_name TEXT,
    received_at TIMESTAMPTZ,
    has_attachments BOOLEAN,
    attachment_count INTEGER,
    importance TEXT,
    custom_tags TEXT[],
    search_rank REAL,
    thread_email_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eav.id,
        eav.email_id,
        eav.subject,
        eav.sender_email,
        eav.sender_name,
        eav.received_at,
        eav.has_attachments,
        eav.attachment_count,
        eav.importance,
        eav.custom_tags,
        CASE 
            WHEN p_search_query IS NOT NULL AND p_search_query != '' THEN
                ts_rank(ec.search_content, plainto_tsquery('english', p_search_query))
            ELSE 0
        END as search_rank,
        eav.thread_email_count
    FROM email_archive_view eav
    JOIN email_content ec ON eav.id = ec.id
    WHERE eav.case_id = p_case_id
    AND (p_search_query IS NULL OR p_search_query = '' OR 
         ec.search_content @@ plainto_tsquery('english', p_search_query))
    AND (p_sender_filter IS NULL OR eav.sender_email ILIKE '%' || p_sender_filter || '%')
    AND (p_date_from IS NULL OR eav.received_at >= p_date_from)
    AND (p_date_to IS NULL OR eav.received_at <= p_date_to)
    AND (p_has_attachments IS NULL OR eav.has_attachments = p_has_attachments)
    AND (p_importance_filter IS NULL OR eav.importance = p_importance_filter)
    AND (p_tags_filter IS NULL OR eav.custom_tags && p_tags_filter)
    ORDER BY 
        CASE 
            WHEN p_search_query IS NOT NULL AND p_search_query != '' THEN
                ts_rank(ec.search_content, plainto_tsquery('english', p_search_query)) DESC
            ELSE eav.received_at DESC
        END
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_content TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_content_attachments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_exports TO service_role;
GRANT SELECT, INSERT ON email_access_logs TO service_role;
GRANT SELECT ON email_archive_view TO service_role;
GRANT EXECUTE ON FUNCTION log_email_access TO service_role;
GRANT EXECUTE ON FUNCTION search_case_emails TO service_role;

-- Add helpful comments
COMMENT ON TABLE email_content IS 'Comprehensive email archive with full-text search and metadata';
COMMENT ON TABLE email_content_attachments IS 'Email attachments with preview and security scanning capabilities';
COMMENT ON TABLE email_exports IS 'Email export requests with access control and expiration';
COMMENT ON TABLE email_access_logs IS 'Audit trail for all email access activities';
COMMENT ON VIEW email_archive_view IS 'Complete email archive view with case and attachment information';
COMMENT ON FUNCTION search_case_emails IS 'Advanced search function for emails within a case with ranking';