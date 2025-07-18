-- Add the "case" column to the "folders" table
ALTER TABLE {{schema_name}}.storage_folders
ADD COLUMN IF NOT EXISTS "case" UUID;
-- Add the foreign key constraint referencing the "id" column in the "folder_cases" table
ALTER TABLE {{schema_name}}.storage_folders
ADD CONSTRAINT folders_case_fkey FOREIGN KEY ("case") REFERENCES {{schema_name}}.folder_cases(id) ON DELETE
SET NULL;
-- Add an index for the "case" column
CREATE INDEX IF NOT EXISTS idx_folders_case ON {{schema_name}}.storage_folders("case");
