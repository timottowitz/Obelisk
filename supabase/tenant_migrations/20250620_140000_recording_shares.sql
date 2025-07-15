-- Tenant migration: recording_shares table
-- Use {{schema_name}} as the schema placeholder

-- Recording Shares Table
CREATE TABLE IF NOT EXISTS {{schema_name}}.recording_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID REFERENCES {{schema_name}}.call_recordings(id) ON DELETE CASCADE,
  shared_by_member_id UUID REFERENCES private.organization_members(id) ON DELETE CASCADE,
  shared_with_member_id UUID REFERENCES private.organization_members(id) ON DELETE CASCADE,
  permission_level VARCHAR(50) DEFAULT 'view' CHECK (permission_level IN ('view', 'edit', 'admin')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate shares
  UNIQUE(recording_id, shared_with_member_id)
);

-- Indexes for recording shares
CREATE INDEX IF NOT EXISTS idx_recording_shares_recording_id ON {{schema_name}}.recording_shares(recording_id);
CREATE INDEX IF NOT EXISTS idx_recording_shares_shared_with_member_id ON {{schema_name}}.recording_shares(shared_with_member_id);
CREATE INDEX IF NOT EXISTS idx_recording_shares_shared_by_member_id ON {{schema_name}}.recording_shares(shared_by_member_id);
CREATE INDEX IF NOT EXISTS idx_recording_shares_expires_at ON {{schema_name}}.recording_shares(expires_at);

-- Add sharing columns to call_recordings table
ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_settings JSONB DEFAULT '{}'::jsonb;

-- RLS Policy for recording shares
ALTER TABLE {{schema_name}}.recording_shares ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on recording shares
CREATE TRIGGER update_recording_shares_updated_at
  BEFORE UPDATE ON {{schema_name}}.recording_shares
  FOR EACH ROW
  EXECUTE FUNCTION {{schema_name}}.handle_updated_at();

-- View for shared recordings (includes owner and shared recordings)
CREATE OR REPLACE VIEW {{schema_name}}.accessible_recordings AS
SELECT 
  r.*,
  'owner' as access_type,
  NULL as shared_by_member_id,
  NULL as permission_level,
  NULL as share_expires_at
FROM {{schema_name}}.call_recordings r
UNION ALL
SELECT 
  r.*,
  'shared' as access_type,
  rs.shared_by_member_id,
  rs.permission_level,
  rs.expires_at as share_expires_at
FROM {{schema_name}}.call_recordings r
JOIN {{schema_name}}.recording_shares rs ON r.id = rs.recording_id
WHERE rs.expires_at IS NULL OR rs.expires_at > NOW();

-- Grant permissions
GRANT ALL ON {{schema_name}}.recording_shares TO authenticated;
GRANT ALL ON {{schema_name}}.accessible_recordings TO authenticated;

-- Add comment to document the sharing feature
COMMENT ON TABLE {{schema_name}}.recording_shares IS 'Manages sharing of call recordings between organization members';
COMMENT ON VIEW {{schema_name}}.accessible_recordings IS 'View that includes both owned and shared recordings for easier access control'; 