--Add the status column to the storage_files table
ALTER TABLE {{schema_name}}.storage_files
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'missing';