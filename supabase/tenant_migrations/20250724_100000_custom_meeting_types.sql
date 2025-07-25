-- Custom Meeting Types Migration
-- Allows users to create custom meeting types with system prompts
-- Replaces hardcoded meeting types with flexible user-defined types

-- Create meeting types table
CREATE TABLE IF NOT EXISTS {{schema_name}}.meeting_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    system_prompt TEXT NOT NULL,
    output_format TEXT DEFAULT 'json' CHECK (output_format IN ('json', 'text', 'markdown')),
    is_active BOOLEAN DEFAULT TRUE,
    member_id UUID NOT NULL, -- Reference to organization member who created this type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(member_id, name)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_meeting_types_member_active ON {{schema_name}}.meeting_types(member_id, is_active);

-- Update call_recordings table to reference meeting_types
ALTER TABLE {{schema_name}}.call_recordings 
DROP CONSTRAINT IF EXISTS call_recordings_meeting_type_check;

ALTER TABLE {{schema_name}}.call_recordings 
ADD COLUMN IF NOT EXISTS meeting_type_id UUID REFERENCES {{schema_name}}.meeting_types(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_call_recordings_meeting_type_id ON {{schema_name}}.call_recordings(meeting_type_id);

-- Create function to get meeting type system prompt
CREATE OR REPLACE FUNCTION {{schema_name}}.get_meeting_type_prompt(meeting_type_id_param UUID)
RETURNS TABLE(
    system_prompt TEXT,
    output_format TEXT,
    display_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt.system_prompt,
        mt.output_format,
        mt.display_name
    FROM {{schema_name}}.meeting_types mt
    WHERE mt.id = meeting_type_id_param
      AND mt.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON {{schema_name}}.meeting_types TO service_role;
GRANT USAGE ON SCHEMA {{schema_name}} TO service_role;
GRANT EXECUTE ON FUNCTION {{schema_name}}.get_meeting_type_prompt(UUID) TO service_role;
