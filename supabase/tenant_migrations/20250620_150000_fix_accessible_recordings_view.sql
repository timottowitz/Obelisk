-- Fix accessible_recordings view to include shared_with_member_id column
-- This migration adds the missing shared_with_member_id column to the accessible_recordings view

-- Drop and recreate the view with the correct columns
DROP VIEW IF EXISTS {{schema_name}}.accessible_recordings;

CREATE OR REPLACE VIEW {{schema_name}}.accessible_recordings AS
SELECT 
  r.*,
  'owner' as access_type,
  NULL as shared_by_member_id,
  NULL as shared_with_member_id,
  NULL as permission_level,
  NULL as share_expires_at
FROM {{schema_name}}.call_recordings r
UNION ALL
SELECT 
  r.*,
  'shared' as access_type,
  rs.shared_by_member_id,
  rs.shared_with_member_id,
  rs.permission_level,
  rs.expires_at as share_expires_at
FROM {{schema_name}}.call_recordings r
JOIN {{schema_name}}.recording_shares rs ON r.id = rs.recording_id
WHERE rs.expires_at IS NULL OR rs.expires_at > NOW();

-- Grant permissions
GRANT ALL ON {{schema_name}}.accessible_recordings TO authenticated;

-- Update comment
COMMENT ON VIEW {{schema_name}}.accessible_recordings IS 'View that includes both owned and shared recordings for easier access control with shared_with_member_id column'; 