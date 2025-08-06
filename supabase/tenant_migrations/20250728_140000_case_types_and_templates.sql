-- Create case_types table
CREATE TABLE IF NOT EXISTS {{schema_name}}.case_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for UI
    icon VARCHAR(50) DEFAULT 'folder', -- Icon name for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure name is unique per schema
    CONSTRAINT unique_case_type_name UNIQUE (name)
);

-- Create folder_templates table for case type folder structures
CREATE TABLE IF NOT EXISTS {{schema_name}}.folder_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_type_id UUID NOT NULL REFERENCES {{schema_name}}.case_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    path VARCHAR(500) NOT NULL, -- Full path like "/contracts/purchase-agreements"
    parent_path VARCHAR(500), -- Parent folder path for nested structures
    sort_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT true, -- Whether this folder is required for the case type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add case_type_id to existing folder_cases table
ALTER TABLE {{schema_name}}.folder_cases 
ADD COLUMN IF NOT EXISTS case_type_id UUID REFERENCES {{schema_name}}.case_types(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_case_types_name ON {{schema_name}}.case_types(name);
CREATE INDEX IF NOT EXISTS idx_case_types_active ON {{schema_name}}.case_types(is_active);
CREATE INDEX IF NOT EXISTS idx_folder_templates_case_type ON {{schema_name}}.folder_templates(case_type_id);
CREATE INDEX IF NOT EXISTS idx_folder_templates_path ON {{schema_name}}.folder_templates(path);
CREATE INDEX IF NOT EXISTS idx_folder_cases_case_type ON {{schema_name}}.folder_cases(case_type_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION {{schema_name}}.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_case_types_updated_at 
    BEFORE UPDATE ON {{schema_name}}.case_types 
    FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at_column();

CREATE TRIGGER update_folder_templates_updated_at 
    BEFORE UPDATE ON {{schema_name}}.folder_templates 
    FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at_column();

CREATE TRIGGER update_folder_cases_updated_at 
    BEFORE UPDATE ON {{schema_name}}.folder_cases 
    FOR EACH ROW EXECUTE FUNCTION {{schema_name}}.update_updated_at_column();