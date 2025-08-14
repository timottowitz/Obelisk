ALTER TABLE {{schema_name}}.ai_task_insights
ADD COLUMN IF NOT EXISTS suggested_case_project_id UUID REFERENCES {{schema_name}}.case_projects(id);
