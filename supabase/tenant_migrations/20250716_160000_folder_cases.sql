--Create folder cases table
CREATE TABLE IF NOT EXISTS {{schema_name}}.folder_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--Create index for folder cases name
CREATE INDEX IF NOT EXISTS idx_folder_cases_name ON {{schema_name}}.folder_cases(name);