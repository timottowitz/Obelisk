-- Email assignment tracking for case management
-- This migration adds the email_assignments table to track which emails are assigned to which cases

-- Create email assignments table
CREATE TABLE IF NOT EXISTS email_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id TEXT NOT NULL, -- References the email in the Microsoft Graph API
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL, -- User ID from private.users who made the assignment
    assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    storage_location TEXT, -- GCS folder path where email content is stored
    email_subject TEXT, -- Cache email subject for quick reference
    email_from TEXT, -- Cache email sender for quick reference
    email_received_date TIMESTAMPTZ, -- Cache email received date
    error_message TEXT, -- Store error details if assignment fails
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Ensure one email can only be assigned to one case
    UNIQUE(email_id, case_id)
);

-- Create indexes for performance
CREATE INDEX idx_email_assignments_email_id ON email_assignments(email_id);
CREATE INDEX idx_email_assignments_case_id ON email_assignments(case_id);
CREATE INDEX idx_email_assignments_assigned_by ON email_assignments(assigned_by);
CREATE INDEX idx_email_assignments_status ON email_assignments(status);
CREATE INDEX idx_email_assignments_assigned_date ON email_assignments(assigned_date DESC);

-- Add updated_at trigger
CREATE TRIGGER update_email_assignments_updated_at
    BEFORE UPDATE ON email_assignments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Email attachments tracking table
CREATE TABLE IF NOT EXISTS email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES email_assignments(id) ON DELETE CASCADE,
    attachment_id TEXT NOT NULL, -- Microsoft Graph attachment ID
    filename TEXT NOT NULL,
    content_type TEXT,
    size_bytes BIGINT,
    gcs_blob_name TEXT, -- Storage location in GCS
    gcs_blob_url TEXT, -- Public URL for access
    download_status TEXT DEFAULT 'pending' CHECK (download_status IN ('pending', 'downloading', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for attachments
CREATE INDEX idx_email_attachments_assignment_id ON email_attachments(assignment_id);
CREATE INDEX idx_email_attachments_attachment_id ON email_attachments(attachment_id);
CREATE INDEX idx_email_attachments_status ON email_attachments(download_status);

-- Add updated_at trigger for attachments
CREATE TRIGGER update_email_attachments_updated_at
    BEFORE UPDATE ON email_attachments
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Email assignment log for audit trail
CREATE TABLE IF NOT EXISTS email_assignment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES email_assignments(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'status_changed', 'error_occurred', 'completed')),
    old_status TEXT,
    new_status TEXT,
    details TEXT,
    user_id UUID, -- User who performed the action
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for logs
CREATE INDEX idx_email_assignment_logs_assignment_id ON email_assignment_logs(assignment_id);
CREATE INDEX idx_email_assignment_logs_created_at ON email_assignment_logs(created_at DESC);

-- Function to log assignment changes
CREATE OR REPLACE FUNCTION log_email_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO email_assignment_logs (assignment_id, action, new_status, details)
        VALUES (NEW.id, 'created', NEW.status, 'Email assignment created');
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status != NEW.status THEN
            INSERT INTO email_assignment_logs (assignment_id, action, old_status, new_status, details)
            VALUES (NEW.id, 'status_changed', OLD.status, NEW.status, 'Status changed');
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic logging
CREATE TRIGGER log_email_assignment_changes
    AFTER INSERT OR UPDATE ON email_assignments
    FOR EACH ROW
    EXECUTE FUNCTION log_email_assignment_change();

-- Create view for easy assignment lookup with case details
CREATE OR REPLACE VIEW email_assignments_with_case_details AS
SELECT 
    ea.id,
    ea.email_id,
    ea.case_id,
    ea.assigned_by,
    ea.assigned_date,
    ea.status,
    ea.storage_location,
    ea.email_subject,
    ea.email_from,
    ea.email_received_date,
    ea.error_message,
    ea.created_at,
    ea.updated_at,
    c.case_number,
    c.full_name as case_title,
    c.status as case_status,
    ct.display_name as case_type_name,
    -- Count attachments
    (SELECT COUNT(*) FROM email_attachments WHERE assignment_id = ea.id) as attachment_count
FROM email_assignments ea
LEFT JOIN cases c ON ea.case_id = c.id
LEFT JOIN case_types ct ON c.case_type_id = ct.id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_attachments TO service_role;
GRANT SELECT, INSERT ON email_assignment_logs TO service_role;
GRANT SELECT ON email_assignments_with_case_details TO service_role;