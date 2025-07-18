-- Migration: Change foreign key for storage_folders.created_by to private.users(id)
-- This migration drops the old constraint and adds the new one.

-- Drop the existing foreign key constraint on created_by
ALTER TABLE {{schema_name}}.storage_folders
DROP CONSTRAINT IF EXISTS storage_folders_created_by_fkey;

-- Add the new foreign key constraint referencing private.users(id)
ALTER TABLE {{schema_name}}.storage_folders
ADD CONSTRAINT storage_folders_created_by_fkey
FOREIGN KEY (created_by) REFERENCES private.users(id) ON DELETE CASCADE;

-- Optionally, add a comment to document the change
COMMENT ON COLUMN {{schema_name}}.storage_folders.created_by IS 'References private.users(id)';