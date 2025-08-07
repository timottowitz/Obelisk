-- Enhanced Task Management Schema for AI Integration
-- This schema supports both manual and AI-generated tasks

-- Create projects table for non-case-specific tasks
CREATE TABLE IF NOT EXISTS {{schema_name}}.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by_id UUID REFERENCES private.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create case_projects table for case-specific project organization
CREATE TABLE IF NOT EXISTS {{schema_name}}.case_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES {{schema_name}}.cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by_id UUID REFERENCES private.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced case_tasks table with AI integration fields
ALTER TABLE {{schema_name}}.case_tasks
ADD COLUMN IF NOT EXISTS case_project_id UUID REFERENCES {{schema_name}}.case_projects(id),
ADD COLUMN IF NOT EXISTS assigner_id UUID REFERENCES private.users(id),
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_by_id UUID REFERENCES private.users(id),
-- AI Integration Fields
ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS foundation_ai_task_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ai_suggested_assignee UUID REFERENCES private.users(id),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS source_document_id UUID,
ADD COLUMN IF NOT EXISTS extracted_entities JSONB,
-- Chat Integration
ADD COLUMN IF NOT EXISTS chat_message_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_from_chat BOOLEAN DEFAULT FALSE;

-- Create general project_tasks table for non-case tasks
CREATE TABLE IF NOT EXISTS {{schema_name}}.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES {{schema_name}}.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    assignee_id UUID REFERENCES private.users(id),
    assigner_id UUID REFERENCES private.users(id),
    category_id UUID REFERENCES {{schema_name}}.task_categories(id),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by_id UUID REFERENCES private.users(id),
    -- AI Integration Fields
    ai_generated BOOLEAN DEFAULT FALSE,
    foundation_ai_task_id VARCHAR(255),
    ai_confidence_score DECIMAL(3,2),
    ai_suggested_assignee UUID REFERENCES private.users(id),
    ai_reasoning TEXT,
    -- Chat Integration
    chat_message_id VARCHAR(255),
    created_from_chat BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI insights table for Foundation AI processed data
CREATE TABLE IF NOT EXISTS {{schema_name}}.ai_task_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_type VARCHAR(20) NOT NULL, -- 'case_task' or 'project_task'
    task_id UUID NOT NULL,
    insight_type VARCHAR(50) NOT NULL, -- 'deadline_risk', 'workload_alert', 'priority_suggestion', etc.
    confidence_score DECIMAL(3,2),
    insight_data JSONB,
    foundation_ai_processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_tasks_case_project_id ON {{schema_name}}.case_tasks(case_project_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_assigner_id ON {{schema_name}}.case_tasks(assigner_id);
CREATE INDEX IF NOT EXISTS idx_case_tasks_ai_generated ON {{schema_name}}.case_tasks(ai_generated);
CREATE INDEX IF NOT EXISTS idx_case_tasks_chat_message_id ON {{schema_name}}.case_tasks(chat_message_id);
CREATE INDEX IF NOT EXISTS idx_case_projects_case_id ON {{schema_name}}.case_projects(case_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON {{schema_name}}.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assignee_id ON {{schema_name}}.project_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigner_id ON {{schema_name}}.project_tasks(assigner_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_insights_task ON {{schema_name}}.ai_task_insights(task_type, task_id);
