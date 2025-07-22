-- Add the "case" column to the "folders" table
ALTER TABLE {{schema_name}}.storage_folders
ADD COLUMN IF NOT EXISTS "case" UUID;
-- Add an index for the "case" column
CREATE INDEX IF NOT EXISTS idx_folders_case ON {{schema_name}}.storage_folders("case");
