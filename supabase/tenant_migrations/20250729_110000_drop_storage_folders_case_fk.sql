ALTER TABLE {{schema_name}}.storage_folders
DROP CONSTRAINT IF EXISTS folders_case_fkey;

ALTER TABLE {{schema_name}}.storage_folders
DROP COLUMN IF EXISTS "case";

ALTER TABLE {{schema_name}}.storage_folders
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES {{schema_name}}.cases(id) ON DELETE CASCADE;