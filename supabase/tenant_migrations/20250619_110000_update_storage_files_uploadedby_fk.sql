-- Migration: Change foreign key for storage_files.uploaded_by to private.organization_members(id)
-- This migration drops the old constraint and adds the new one.

-- Drop the existing foreign key constraint on uploaded_by
ALTER TABLE {{schema_name}}.storage_files
DROP CONSTRAINT IF EXISTS storage_files_uploaded_by_fkey;

-- Add the new foreign key constraint referencing private.organization_members(id)
ALTER TABLE {{schema_name}}.storage_files
ADD CONSTRAINT storage_files_uploaded_by_fkey
FOREIGN KEY (uploaded_by) REFERENCES private.organization_members(id) ON DELETE CASCADE;

-- Optionally, add a comment to document the change
COMMENT ON COLUMN {{schema_name}}.storage_files.uploaded_by IS 'References private.organization_members(id)';
