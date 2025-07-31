--ADD CASE TYPE ID TO STORAGE FOLDERS
ALTER TABLE {{schema_name}}.storage_folders 
ADD COLUMN IF NOT EXISTS case_type_id UUID REFERENCES {{schema_name}}.case_types(id);