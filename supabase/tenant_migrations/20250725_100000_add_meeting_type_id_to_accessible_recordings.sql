-- Add meeting_type_id to accessible_recordings view
-- This migration updates the view to include meeting_type_id for frontend filtering and display

DROP VIEW IF EXISTS {{schema_name}}.accessible_recordings;
CREATE VIEW {{schema_name}}.accessible_recordings AS
SELECT 
    cr.*,
    -- Meeting type information
    CASE 
        WHEN cr.meeting_type = 'meeting' THEN 'Meeting'
        WHEN cr.meeting_type = 'interview' THEN 'Interview'
        WHEN cr.meeting_type = 'consultation' THEN 'Consultation'
        ELSE 'Call'
    END as recording_type_display,
    -- Existing fields
    'owner' as access_type,
    NULL as shared_by_member_id,
    NULL as permission_level,
    NULL as share_expires_at
FROM {{schema_name}}.call_recordings cr

UNION ALL

SELECT 
    cr.*,
    -- Meeting type information
    CASE 
        WHEN cr.meeting_type = 'meeting' THEN 'Meeting'
        WHEN cr.meeting_type = 'interview' THEN 'Interview'  
        WHEN cr.meeting_type = 'consultation' THEN 'Consultation'
        ELSE 'Call'
    END as recording_type_display,
    -- Shared recording fields
    'shared' as access_type,
    rs.shared_by_member_id,
    rs.permission_level,
    rs.expires_at as share_expires_at
FROM {{schema_name}}.call_recordings cr
JOIN {{schema_name}}.recording_shares rs ON cr.id = rs.recording_id
WHERE rs.expires_at IS NULL OR rs.expires_at > NOW();

-- Grant permissions
GRANT SELECT ON {{schema_name}}.accessible_recordings TO authenticated;
