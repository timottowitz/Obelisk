--CREATE TABLE FOR TASK CATEGORIES

CREATE TABLE IF NOT EXISTS {{schema_name}}.task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--CREATE INDEX FOR TASK CATEGORIES NAME
CREATE INDEX IF NOT EXISTS idx_task_categories_name ON {{schema_name}}.task_categories (name);