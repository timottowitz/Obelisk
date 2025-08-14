-- Add columns to meeting_types for task categorization
ALTER TABLE {{schema_name}}.meeting_types
ADD COLUMN IF NOT EXISTS task_category TEXT CHECK (task_category IN ('case', 'project')),
ADD COLUMN IF NOT EXISTS context_id UUID;

-- Add an index on the new columns for performance
CREATE INDEX IF NOT EXISTS idx_meeting_types_task_category ON {{schema_name}}.meeting_types(task_category);
