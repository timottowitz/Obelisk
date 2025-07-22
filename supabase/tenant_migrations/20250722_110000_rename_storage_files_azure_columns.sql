-- Migration: Rename azure_ columns to gcs_ in storage_files
-- Use {{schema_name}} as the schema placeholder

ALTER TABLE {{schema_name}}.storage_files
  RENAME COLUMN azure_blob_name TO gcs_blob_name;
ALTER TABLE {{schema_name}}.storage_files
  RENAME COLUMN azure_blob_url TO gcs_blob_url; 