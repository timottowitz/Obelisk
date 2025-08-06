--Create Contacts table
CREATE TABLE IF NOT EXISTS {{schema_name}}.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT,
    suffix TEXT,
    prefix TEXT,
    nickname TEXT,
    company TEXT,
    department TEXT,
    job_title TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    contact_type_id UUID REFERENCES public.contact_types(id),
    tags TEXT,
    avatar_azure_blob_name TEXT,
    avatar_azure_blob_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--Create index for contacts name    
CREATE INDEX IF NOT EXISTS idx_contacts_name ON {{schema_name}}.contacts(first_name, last_name);