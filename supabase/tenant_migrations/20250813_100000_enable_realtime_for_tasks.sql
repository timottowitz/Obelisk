-- Alter the 'supabase_realtime' publication to include task-related tables.
-- This enables real-time updates for tasks within each tenant's schema.

ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.case_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE {{schema_name}}.project_tasks;
