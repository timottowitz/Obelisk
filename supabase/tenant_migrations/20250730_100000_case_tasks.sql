-- Create case_tasks table
CREATE TABLE IF NOT EXISTS {{schema_name}}.case_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES {{schema_name}}.cases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on case_id for better query performance
CREATE INDEX IF NOT EXISTS idx_case_tasks_case_id ON {{schema_name}}.case_tasks(case_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_case_tasks_status ON {{schema_name}}.case_tasks(status);

-- Create index on due_date for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_case_tasks_due_date ON {{schema_name}}.case_tasks(due_date);


