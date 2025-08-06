--ADD COLUMNS TO CASE_TASKS TABLE

ALTER TABLE {{schema_name}}.case_tasks
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES private.users(id),
ADD COLUMN IF NOT EXISTS priority VARCHAR(50),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES {{schema_name}}.task_categories(id);
