-- Migration: Update call_recordings and user_settings to use private.organization_members
-- Use {{schema_name}} as the schema placeholder

-- First, drop the existing foreign key constraints
ALTER TABLE {{schema_name}}.call_recordings 
DROP CONSTRAINT IF EXISTS call_recordings_member_id_fkey;

ALTER TABLE {{schema_name}}.user_settings 
DROP CONSTRAINT IF EXISTS user_settings_member_id_fkey;

-- Add new foreign key constraints referencing private.organization_members
ALTER TABLE {{schema_name}}.call_recordings 
ADD CONSTRAINT call_recordings_member_id_fkey 
FOREIGN KEY (member_id) REFERENCES private.organization_members(id) ON DELETE CASCADE;

ALTER TABLE {{schema_name}}.user_settings 
ADD CONSTRAINT user_settings_member_id_fkey 
FOREIGN KEY (member_id) REFERENCES private.organization_members(id) ON DELETE CASCADE;

-- Update indexes to ensure they're optimized for the new references
-- (The existing indexes should still work, but we'll recreate them to be safe)
DROP INDEX IF EXISTS {{schema_name}}.idx_call_recordings_member_id;
CREATE INDEX idx_call_recordings_member_id ON {{schema_name}}.call_recordings(member_id);

-- Add a comment to document the change
COMMENT ON TABLE {{schema_name}}.call_recordings IS 'Call recordings linked to organization members via private.organization_members';
COMMENT ON TABLE {{schema_name}}.user_settings IS 'User settings linked to organization members via private.organization_members'; 