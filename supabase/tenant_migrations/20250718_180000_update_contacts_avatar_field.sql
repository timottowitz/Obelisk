-- Update contacts table to add avatar_azure_blob_name and avatar_azure_blob_url fields

ALTER TABLE {{schema_name}}.contacts
DROP COLUMN IF EXISTS avatar_azure_blob_name;
ALTER TABLE {{schema_name}}.contacts
DROP COLUMN IF EXISTS avatar_azure_blob_url;

ALTER TABLE {{schema_name}}.contacts
ADD COLUMN avatar_storage_url TEXT;






